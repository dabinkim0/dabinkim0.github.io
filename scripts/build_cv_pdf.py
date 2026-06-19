from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "docs" / "dabin-kim-cv.pdf"


SECTIONS = [
    (
        "Profile",
        [
            "An ML/DL researcher focused on music generation, editing, and representation learning. My work explores how learned representations can expand both what can be edited in music and how flexibly those edits can be controlled. I build models that connect musical structure, timbre, and expressive intent, and extend these capabilities through grounded relationships with text, image, and video. My goal is to develop controllable music AI systems that are technically rigorous, perceptually meaningful, and useful in creative workflows.",
            "Affiliation: Music and Audio Computing (MAC) Lab, KAIST",
            "Research Interests: controllable audio generation, music generation and editing, musical representation learning",
        ],
    ),
    (
        "Education",
        [
            "Mar 2026 - Present | Ph.D. in Music and Audio Computing (MAC) Lab, KAIST",
            "Aug 2023 - Aug 2025 | M.S. in Music and Audio Computing (MAC) Lab, KAIST",
            "Feb 2017 - Feb 2023 | B.S. in Art & Technology, Sogang University; Double major in Big Data Science",
        ],
    ),
    (
        "Experience",
        [
            "Jul 2025 - Oct 2025 | Assistant Researcher, Sony Computer Science Laboratories (Sony CSL)",
        ],
    ),
    (
        "Publications",
        [
            "AdaTT: Text-Guided Instrument Timbre Transfer with Target-Adaptive Structural Control. Dabin Kim, Junwon Lee, Juhan Nam. 27th Annual Conference of the International Speech Communication Association (INTERSPEECH), 2026. Paper: https://arxiv.org/abs/2606.15813 | Demo: https://dabinkim0.github.io/publications/adatt/",
            "DDSP-Based Neural Vehicle Sound Synthesis from Driving Signals. Minsuk Choi, Dabin Kim, Daehun Song, Juhan Nam. 6th AES International Conference on Automotive Audio, 2026. Demo: https://dabinkim0.github.io/publications/ddsp-carsound/",
            "Video-Foley: Two-Stage Video-To-Sound Generation via Temporal Event Condition for Foley Sound. Junwon Lee, Jaekwon Im, Dabin Kim, Juhan Nam. IEEE/ACM Transactions on Audio, Speech, and Language Processing (TASLP), 2025. Paper: https://arxiv.org/abs/2408.11915 | Demo: https://jnwnlee.github.io/video-foley-demo/ | Code: https://github.com/jnwnlee/video-foley",
            "Pitch-ControlNet: Continuous Pitch Control for Monophonic Instrument Sound Generation. Dabin Kim*, Junwon Lee*, Minseo Kim*, Juhan Nam (*equal contribution). Late-Breaking/Demo (LBD), 25th International Society for Music Information Retrieval Conference (ISMIR), 2024. Paper: https://ismir2024program.ismir.net/lbd_480.html",
        ],
    ),
    (
        "Selected Presentations",
        [
            "May 30, 2026 | AdaTT: Text-Guided Instrument Timbre Transfer with Target-Adaptive Structural Control. Short Oral and Poster Sessions, Korean Society for Music Informatics (KSMI) 2026. Jeong Ha Sang Hall, Sogang University, Seoul, South Korea.",
            "May 12, 2026 | AI generative models for controllable music and Foley sound synthesis. KOBA 2026 AI Audio/Sound Day. COEX Conference Room, Seoul, South Korea.",
        ],
    ),
    (
        "Skills",
        [
            "Programming Languages: Python",
            "ML/DL Frameworks: PyTorch, PyTorch Lightning",
            "Creative & Audio Tools: Ableton Live, Logic Pro, Max/MSP, SuperCollider",
        ],
    ),
]


PAGE_W, PAGE_H = 612, 792
LEFT, TOP, BOTTOM = 54, 58, 56
LINE = 14
BODY_SIZE = 10
HEAD_SIZE = 12
TITLE_SIZE = 24
SUB_SIZE = 10
MAX_CHARS = 96


def build_lines():
    pages = []
    lines = []
    y = PAGE_H - TOP

    def add_line(text="", size=BODY_SIZE, font="F1", leading=LINE, gap_after=0):
        nonlocal y, lines
        if y < BOTTOM + leading:
            pages.append(lines)
            lines = []
            y = PAGE_H - TOP
        lines.append((LEFT, y, size, font, text))
        y -= leading + gap_after

    def add_wrapped(text, prefix="", subsequent=""):
        nonlocal y
        width = MAX_CHARS - len(prefix)
        wrapped = textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [""]
        for index, line in enumerate(wrapped):
            add_line((prefix if index == 0 else subsequent) + line)
        y -= 3

    add_line("Dabin Kim", TITLE_SIZE, "F2", 26, 2)
    add_line("ML / DL Researcher", SUB_SIZE, "F1", 14, 2)
    add_line(
        "Daejeon, South Korea | dabinchi9598@kaist.ac.kr | https://dabinkim0.github.io | https://github.com/dabinkim0",
        9,
        "F1",
        12,
        8,
    )

    for title, items in SECTIONS:
        add_line(title, HEAD_SIZE, "F2", 16, 2)
        for item in items:
            add_wrapped(item, prefix="- ", subsequent="  ")
        y -= 5

    if lines:
        pages.append(lines)
    return pages


def escape_pdf_text(value):
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(pages):
    objects = []

    def obj(data):
        objects.append(data)
        return len(objects)

    font_regular = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    content_ids = []
    page_ids = []

    for page in pages:
        stream_lines = ["BT"]
        for x, y, size, font, text in page:
            stream_lines.append(f"/{font} {size} Tf")
            stream_lines.append(f"1 0 0 1 {x} {y} Tm")
            stream_lines.append(f"({escape_pdf_text(text)}) Tj")
        stream_lines.append("ET")
        stream = "\n".join(stream_lines).encode("latin-1")
        content_id = obj(f"<< /Length {len(stream)} >>\nstream\n" + stream.decode("latin-1") + "\nendstream")
        content_ids.append(content_id)

    pages_id_placeholder = len(objects) + len(pages) + 1
    for content_id in content_ids:
        page_id = obj(
            f"<< /Type /Page /Parent {pages_id_placeholder} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        )
        page_ids.append(page_id)

    pages_id = obj("<< /Type /Pages /Kids [" + " ".join(f"{page_id} 0 R" for page_id in page_ids) + f"] /Count {len(page_ids)} >>")
    catalog_id = obj(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
    info_id = obj("<< /Title (Dabin Kim CV) /Author (Dabin Kim) /Subject (Curriculum Vitae) >>")

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, data in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin-1"))
        pdf.extend(data.encode("latin-1"))
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R /Info {info_id} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n".encode("latin-1")
    )
    return pdf


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pages = build_lines()
    OUT.write_bytes(make_pdf(pages))
    print(f"wrote {OUT.relative_to(ROOT)} ({len(pages)} pages)")


if __name__ == "__main__":
    main()
