import unittest

try:
    from back.services.document.chunking_service import (
        MAX_TABLE_CHARS,
        extract_blocks_from_section,
        process_markdown_chunking,
        split_table_if_needed,
    )
except ModuleNotFoundError:
    from services.document.chunking_service import (
        MAX_TABLE_CHARS,
        extract_blocks_from_section,
        process_markdown_chunking,
        split_table_if_needed,
    )


BASE_METADATA = {"document_id": 42, "source": "admissions.md"}


def make_table(row_count=13, long_rows=False, separator=True):
    lines = ["| Mã ngành | Tên ngành | Điểm |", "| --- | --- | --- |"]
    if not separator:
        lines = lines[:1]
    for row_id in range(1, row_count + 1):
        value = "x" * 220 if long_rows else f"Ngành {row_id}"
        lines.append(f"| CTU-{row_id:03d} | {value} | 25,50 |")
    return "\n".join(lines)


def data_row_ids(chunks):
    ids = []
    for chunk in chunks:
        text = chunk if isinstance(chunk, str) else chunk["content"]
        for line in text.splitlines():
            if line.startswith("| CTU-"):
                ids.append(line.split("|", 2)[1].strip())
    return ids


class ChunkingServiceTests(unittest.TestCase):
    def test_empty_markdown_returns_no_chunks(self):
        self.assertEqual(process_markdown_chunking("   \n\n", BASE_METADATA), [])

    def test_short_text_stays_in_one_text_chunk(self):
        chunks = process_markdown_chunking("Nội dung tuyển sinh ngắn.", BASE_METADATA)

        self.assertEqual(len(chunks), 1)
        self.assertFalse(chunks[0]["metadata"]["is_table"])
        self.assertEqual(chunks[0]["metadata"]["chunk_type"], "text")
        self.assertIn("Nội dung tuyển sinh", chunks[0]["content"])

    def test_long_text_uses_recursive_character_splitter(self):
        content = " ".join(f"từ-{index}" for index in range(500))
        chunks = process_markdown_chunking(content, BASE_METADATA)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(not chunk["metadata"]["is_table"] for chunk in chunks))
        self.assertTrue(all(len(chunk["content"]) <= 800 for chunk in chunks))

    def test_small_and_thirteen_row_tables_stay_in_one_chunk(self):
        for row_count in (2, 13):
            chunks = split_table_if_needed(make_table(row_count))

            self.assertEqual(len(chunks), 1)
            self.assertIn("| Mã ngành | Tên ngành | Điểm |", chunks[0])
            self.assertIn("| --- | --- | --- |", chunks[0])
            self.assertEqual(len(data_row_ids(chunks)), row_count)

    def test_one_hundred_short_rows_are_split_without_loss_or_reordering(self):
        chunks = split_table_if_needed(make_table(100), max_rows_per_chunk=20)

        self.assertEqual(len(chunks), 5)
        self.assertEqual(
            data_row_ids(chunks),
            [f"CTU-{index:03d}" for index in range(1, 101)],
        )
        self.assertTrue(all(len(chunk) <= MAX_TABLE_CHARS for chunk in chunks))

    def test_five_hundred_long_rows_are_split_by_chars(self):
        chunks = split_table_if_needed(make_table(500, long_rows=True))
        ids = data_row_ids(chunks)

        self.assertGreater(len(chunks), 20)
        self.assertEqual(ids, [f"CTU-{index:03d}" for index in range(1, 501)])
        self.assertTrue(all(len(chunk) <= MAX_TABLE_CHARS for chunk in chunks))

    def test_single_oversized_row_is_kept_and_marked(self):
        oversized_value = "x" * (MAX_TABLE_CHARS + 100)
        markdown = "\n".join(
            [
                "| Mã ngành | Tên ngành | Điểm |",
                "| --- | --- | --- |",
                f"| CTU-001 | {oversized_value} | 25,50 |",
            ]
        )
        chunks = process_markdown_chunking(markdown, BASE_METADATA)

        self.assertEqual(len(chunks), 1)
        self.assertIn("CTU-001", chunks[0]["content"])
        self.assertIn(
            "table_chunk_exceeds_char_limit_due_to_row_size",
            chunks[0]["metadata"]["warnings"],
        )

    def test_missing_separator_is_preserved_and_warned(self):
        chunks = process_markdown_chunking(
            make_table(3, separator=False), BASE_METADATA
        )

        self.assertEqual(len(chunks), 1)
        self.assertEqual(
            data_row_ids([chunks[0]["content"]]),
            ["CTU-001", "CTU-002", "CTU-003"],
        )
        self.assertIn(
            "missing_markdown_separator",
            chunks[0]["metadata"]["warnings"],
        )

    def test_row_with_one_missing_edge_pipe_is_not_dropped(self):
        markdown = "\n".join(
            [
                "| Mã | Tên |",
                "| --- | --- |",
                "CTU-001 | Công nghệ thông tin |",
                "| CTU-002 | Kinh doanh quốc tế",
            ]
        )
        chunks = process_markdown_chunking(markdown, BASE_METADATA)

        self.assertEqual(len(chunks), 1)
        self.assertIn("CTU-001 | Công nghệ thông tin |", chunks[0]["content"])
        self.assertIn("| CTU-002 | Kinh doanh quốc tế", chunks[0]["content"])

    def test_multiple_header_rows_are_repeated_without_separator_as_data(self):
        markdown = "\n".join(
            [
                "| Nhóm | Tuyển sinh 2026 | |",
                "| Mã | Tên ngành | Điểm |",
                "| --- | --- | --- |",
                "| CTU-001 | Kế toán | 24,00 |",
                "| CTU-002 | Luật | 25,00 |",
            ]
        )
        chunks = split_table_if_needed(markdown, max_rows_per_chunk=1)

        self.assertEqual(len(chunks), 2)
        self.assertTrue(
            all("| Nhóm | Tuyển sinh 2026 | |" in chunk for chunk in chunks)
        )
        self.assertTrue(all("| --- | --- | --- |" in chunk for chunk in chunks))
        self.assertEqual(data_row_ids(chunks), ["CTU-001", "CTU-002"])

    def test_vietnamese_decimal_url_and_special_characters_are_preserved(self):
        markdown = "\n".join(
            [
                "| Mã | Tên ngành | Ghi chú |",
                "| --- | --- | --- |",
                "| CTU-001 | Kỹ thuật phần mềm | 25,50; https://example.com/a?x=1&y=2 |",
            ]
        )
        chunks = process_markdown_chunking(markdown, BASE_METADATA)

        self.assertEqual(len(chunks), 1)
        self.assertIn("Kỹ thuật phần mềm", chunks[0]["content"])
        self.assertIn("25,50", chunks[0]["content"])
        self.assertIn("https://example.com/a?x=1&y=2", chunks[0]["content"])

    def test_text_before_and_after_table_remains_ordered(self):
        markdown = "\n".join(
            [
                "Mở đầu bảng.",
                make_table(2),
                "Kết luận sau bảng.",
            ]
        )
        chunks = process_markdown_chunking(markdown, BASE_METADATA)

        self.assertEqual(
            [chunk["metadata"]["is_table"] for chunk in chunks],
            [False, True, False],
        )
        self.assertIn("Mở đầu bảng", chunks[0]["content"])
        self.assertIn("CTU-001", chunks[1]["content"])
        self.assertIn("Kết luận sau bảng", chunks[2]["content"])

    def test_metadata_and_section_context_are_preserved(self):
        markdown = "# Tuyển sinh\n\n## Ngành đào tạo\n\n" + make_table(2)
        chunks = process_markdown_chunking(markdown, BASE_METADATA)

        self.assertEqual(len(chunks), 1)
        metadata = chunks[0]["metadata"]
        self.assertEqual(metadata["document_id"], 42)
        self.assertEqual(metadata["source"], "admissions.md")
        self.assertEqual(metadata["section_path"], "Tuyển sinh > Ngành đào tạo")
        self.assertEqual(metadata["row_start"], 1)
        self.assertEqual(metadata["row_end"], 2)
        self.assertEqual(metadata["character_count"], len(chunks[0]["content"]))

    def test_ambiguous_single_pipe_line_is_kept_as_text(self):
        blocks = extract_blocks_from_section("Đây là câu văn A | B, không chắc là bảng.")

        self.assertEqual(
            blocks,
            [{"type": "text", "content": "Đây là câu văn A | B, không chắc là bảng."}],
        )

    def test_unrecognized_line_makes_splitter_keep_original_block(self):
        table = "\n".join(
            [
                "| Mã | Tên |",
                "| --- | --- |",
                "| CTU-001 | A |",
                "ghi chú OCR chưa xác định",
                "| CTU-002 | B |",
            ]
        )

        self.assertEqual(split_table_if_needed(table, max_rows_per_chunk=1), [table])

    def test_unrecognized_table_line_is_retained_with_a_warning(self):
        markdown = "\n".join(
            [
                "| Mã | Tên |",
                "| --- | --- |",
                "| CTU-001 | A |",
                "ghi chú OCR",
                "| CTU-002 | B |",
            ]
        )
        chunks = process_markdown_chunking(markdown, BASE_METADATA)
        combined = "\n".join(chunk["content"] for chunk in chunks)

        self.assertIn("CTU-001", combined)
        self.assertIn("ghi chú OCR", combined)
        self.assertIn("CTU-002", combined)
        self.assertTrue(
            any(
                "ambiguous_table_lines_preserved"
                in chunk["metadata"].get("warnings", [])
                for chunk in chunks
            )
        )


if __name__ == "__main__":
    unittest.main()
