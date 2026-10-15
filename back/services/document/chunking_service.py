from typing import Any, Dict, List, Optional, Tuple

from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)


# These limits are measured in characters, not tokens. They are starting points
# and should be benchmarked against the embedding model used by the application.
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
MAX_TABLE_CHARS = 2500
MAX_ROWS_PER_CHUNK = 20

HEADERS_TO_SPLIT_ON = [
    ("#", "header_1"),
    ("##", "header_2"),
    ("###", "header_3"),
    ("####", "header_4"),
]

markdown_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=HEADERS_TO_SPLIT_ON,
    # The section path is injected into every chunk, so keeping raw headers
    # here would create a duplicate header-only text chunk.
    strip_headers=True,
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", " ", ""],
)


def _strip_pipe_edges(line: str) -> str:
    """Return a row without optional Markdown edge pipes."""
    value = line.strip()
    if value.startswith("|"):
        value = value[1:]
    if value.endswith("|"):
        value = value[:-1]
    return value


def _pipe_count(line: str) -> int:
    return line.count("|")


def _is_separator_row(line: str) -> bool:
    """Detect a Markdown separator without modifying the source line."""
    cells = [cell.strip() for cell in _strip_pipe_edges(line).split("|")]
    if not cells or any(not cell for cell in cells):
        return False

    for cell in cells:
        value = cell
        if value.startswith(":"):
            value = value[1:]
        if value.endswith(":"):
            value = value[:-1]
        if len(value) < 3 or any(char != "-" for char in value):
            return False
    return True


def _is_table_candidate(line: str) -> bool:
    """Recognize a possible row, including rows missing one edge pipe.

    A candidate is only classified as a table later when it belongs to a
    consecutive group. This keeps a prose line containing one pipe from being
    silently reclassified as a table.
    """
    value = line.strip()
    if not value or "|" not in value:
        return False
    # Two delimiters cover normal rows and rows missing either edge pipe. A
    # one-pipe prose line is intentionally left as text because it is too
    # ambiguous to classify safely.
    return _pipe_count(value) >= 2


def _flush_block(blocks: List[Dict[str, Any]], block_type: str, lines: List[str]) -> None:
    content = "\n".join(lines).strip()
    if content:
        blocks.append({"type": block_type, "content": content})


def extract_blocks_from_section(section_text: str) -> List[Dict[str, Any]]:
    """Split a section into text and conservative table blocks.

    Only consecutive table-like lines are classified as a table. A lone or
    ambiguous line remains text, so malformed OCR is retained rather than
    discarded or silently rewritten.
    """
    lines = section_text.splitlines()
    blocks: List[Dict[str, Any]] = []
    current_text: List[str] = []
    index = 0

    while index < len(lines):
        if not _is_table_candidate(lines[index]):
            current_text.append(lines[index])
            index += 1
            continue

        table_start = index
        table_lines: List[str] = []
        while index < len(lines) and _is_table_candidate(lines[index]):
            table_lines.append(lines[index])
            index += 1

        # A single candidate is too ambiguous to call a table. Keeping it in
        # the text block preserves OCR content and avoids false table chunks.
        if len(table_lines) < 2 and not any(_is_separator_row(line) for line in table_lines):
            current_text.extend(table_lines)
            continue

        _flush_block(blocks, "text", current_text)
        current_text = []
        _flush_block(blocks, "table", table_lines)

        # Defensive guard for unusual line iterables; normally index already
        # points at the first line after the table.
        if index <= table_start:
            index = table_start + 1

    _flush_block(blocks, "text", current_text)
    return blocks


def _table_layout(table_text: str) -> Tuple[List[str], List[str], List[str], List[str]]:
    """Return source lines, table rows, header lines and warnings.

    The source rows are never normalized. Header detection is only used to
    repeat existing lines in later chunks; it never changes the row content.
    """
    # Keep the original row text. Detection may trim a temporary view, but
    # emitted chunks must not rewrite OCR values or cell whitespace.
    source_lines = [line for line in table_text.splitlines() if line.strip()]
    table_lines = [line for line in source_lines if _is_table_candidate(line)]
    other_lines = [line for line in source_lines if not _is_table_candidate(line)]
    warnings: List[str] = []

    if not table_lines:
        return source_lines, [], [], ["no_recognizable_table_rows"]

    separator_index: Optional[int] = None
    for index, line in enumerate(table_lines):
        if _is_separator_row(line):
            separator_index = index
            break

    if separator_index is None:
        header_lines = table_lines[:1]
        data_rows = table_lines[1:]
        warnings.append("missing_markdown_separator")
    else:
        header_lines = table_lines[: separator_index + 1]
        data_rows = table_lines[separator_index + 1 :]

    if other_lines:
        warnings.append("unrecognized_lines_preserved")

    return source_lines, data_rows, header_lines, warnings


def _split_table_segments(
    table_text: str,
    max_rows_per_chunk: int = MAX_ROWS_PER_CHUNK,
    max_table_chars: int = MAX_TABLE_CHARS,
) -> List[Dict[str, Any]]:
    """Split a table in one pass while keeping complete source rows."""
    if max_rows_per_chunk < 1:
        raise ValueError("max_rows_per_chunk must be greater than zero")
    if max_table_chars < 1:
        raise ValueError("max_table_chars must be greater than zero")

    source_lines, data_rows, header_lines, warnings = _table_layout(table_text)
    if not source_lines:
        return []
    if "unrecognized_lines_preserved" in warnings:
        return [
            {
                "content": table_text.strip(),
                "row_start": None,
                "row_end": None,
                "warnings": warnings,
            }
        ]
    if not data_rows:
        return [
            {
                "content": table_text.strip(),
                "row_start": None,
                "row_end": None,
                "warnings": warnings,
            }
        ]

    header_text = "\n".join(header_lines)
    segments: List[Dict[str, Any]] = []
    current_rows: List[str] = []
    current_start = 1

    def emit(rows: List[str], row_start: int) -> None:
        if not rows:
            return
        content = "\n".join([header_text, *rows]).strip()
        row_warnings = list(warnings)
        if len(content) > max_table_chars:
            row_warnings.append("table_chunk_exceeds_char_limit_due_to_row_size")
        segments.append(
            {
                "content": content,
                "row_start": row_start,
                "row_end": row_start + len(rows) - 1,
                "warnings": row_warnings,
            }
        )

    for row_index, row in enumerate(data_rows, start=1):
        proposed_rows = [*current_rows, row]
        proposed_content = "\n".join([header_text, *proposed_rows]).strip()
        exceeds_rows = len(proposed_rows) > max_rows_per_chunk
        exceeds_chars = len(proposed_content) > max_table_chars

        if current_rows and (exceeds_rows or exceeds_chars):
            emit(current_rows, current_start)
            current_rows = [row]
            current_start = row_index
        else:
            current_rows = proposed_rows

    emit(current_rows, current_start)
    return segments


def split_table_if_needed(
    table_text: str,
    max_rows_per_chunk: int = MAX_ROWS_PER_CHUNK,
    max_table_chars: int = MAX_TABLE_CHARS,
) -> List[str]:
    """Split a table by complete rows, repeating its existing header.

    The public return type remains ``List[str]`` for compatibility with the
    previous service. Internal metadata such as row ranges is added later by
    ``process_markdown_chunking``.
    """
    return [
        segment["content"]
        for segment in _split_table_segments(
            table_text,
            max_rows_per_chunk=max_rows_per_chunk,
            max_table_chars=max_table_chars,
        )
    ]


def _section_path(header_metadata: Dict[str, Any]) -> str:
    return " > ".join(
        filter(
            None,
            [
                header_metadata.get("header_1"),
                header_metadata.get("header_2"),
                header_metadata.get("header_3"),
                header_metadata.get("header_4"),
            ],
        )
    )


def build_chunk_item(
    content: str,
    chunk_index: int,
    base_metadata: Dict[str, Any],
    header_metadata: Dict[str, Any],
    is_table: bool,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    section_path = _section_path(header_metadata)
    enriched_content = f"[Mục: {section_path}]\n{content}" if section_path else content

    metadata: Dict[str, Any] = {
        **base_metadata,
        **header_metadata,
        "section_path": section_path or None,
        "is_table": is_table,
        "chunk_type": "table" if is_table else "text",
        "character_count": len(enriched_content),
    }
    if extra_metadata:
        metadata.update(extra_metadata)
    if not metadata.get("warnings"):
        metadata.pop("warnings", None)

    return {
        "chunk_index": chunk_index,
        "content": enriched_content,
        "metadata": metadata,
    }


def process_markdown_chunking(
    markdown_content: str, base_metadata: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Create heading-aware text chunks and row-safe table chunks."""
    if not markdown_content or not markdown_content.strip():
        return []

    header_splits = markdown_splitter.split_text(markdown_content)
    final_chunks: List[Dict[str, Any]] = []
    chunk_index = 0

    for split in header_splits:
        blocks = extract_blocks_from_section(split.page_content)
        for block in blocks:
            header_metadata = split.metadata
            if block["type"] == "table":
                table_segments = _split_table_segments(block["content"])
                for segment in table_segments:
                    chunk_data = build_chunk_item(
                        content=segment["content"],
                        chunk_index=chunk_index,
                        base_metadata=base_metadata,
                        header_metadata=header_metadata,
                        is_table=True,
                        extra_metadata={
                            "row_start": segment["row_start"],
                            "row_end": segment["row_end"],
                            "warnings": segment["warnings"],
                        },
                    )
                    final_chunks.append(chunk_data)
                    chunk_index += 1
                continue

            text_content = block["content"]
            text_chunks = (
                text_splitter.split_text(text_content)
                if len(text_content) > CHUNK_SIZE
                else [text_content]
            )
            text_warnings = (
                ["ambiguous_table_lines_preserved"]
                if "|" in text_content
                else None
            )
            for text_chunk in text_chunks:
                final_chunks.append(
                    build_chunk_item(
                        content=text_chunk,
                        chunk_index=chunk_index,
                        base_metadata=base_metadata,
                        header_metadata=header_metadata,
                        is_table=False,
                        extra_metadata={"warnings": text_warnings}
                        if text_warnings
                        else None,
                    )
                )
                chunk_index += 1

    return final_chunks
