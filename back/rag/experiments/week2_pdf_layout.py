import pymupdf
from collections import defaultdict


def extract_rows(pdf_path):

    doc = pymupdf.open(pdf_path)
    page = doc[0]

    words = page.get_text("words")

    # =========================
    # 1. TÌM CÁC ROW
    # =========================

    tt_positions = []

    for word in words:
        text = word[4]
        x = word[0]

        if text.isdigit() and x < 100:
            tt_positions.append(word)

    rows = []

    for i in range(len(tt_positions) - 1):

        current_tt = tt_positions[i]
        next_tt = tt_positions[i + 1]

        current_y = current_tt[1]
        next_y = next_tt[1]

        row_words = []

        for word in words:

            y = word[1]

            if current_y <= y < next_y:
                row_words.append(word)

        row_words.sort(key=lambda word: word[0])

        # =========================
        # 2. PHÂN CHIA CỘT
        # =========================

        columns = {
            "tt": [],
            "ma": [],
            "ten": [],
            "chi_tieu": [],
            "to_hop": []
        }

        for word in row_words:

            x = word[0]
            text = word[4]

            if x < 110:
                columns["tt"].append(text)

            elif x < 180:
                columns["ma"].append(text)

            elif x < 480:
                columns["ten"].append(text)

            elif x < 530:
                columns["chi_tieu"].append(text)

            else:
                columns["to_hop"].append(text)

        row_data = {
            "tt": " ".join(columns["tt"]),
            "ma": " ".join(columns["ma"]),
            "ten": " ".join(columns["ten"]),
            "chi_tieu": " ".join(columns["chi_tieu"]),
            "to_hop": " ".join(columns["to_hop"])
        }

        rows.append(row_data)

    doc.close()

    return rows


# =========================
# TEST
# =========================

if __name__ == "__main__":

    pdf_path = "../document/danh_muc_nganh_CTU_2026.pdf"

    rows = extract_rows(pdf_path)

    print("Số row:", len(rows))

    for row in rows[:5]:
        print(row)