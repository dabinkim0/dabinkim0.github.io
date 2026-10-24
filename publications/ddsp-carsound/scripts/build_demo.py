#!/usr/bin/env python3

"""Regenerate the DDSP demo samples (publications/ddsp-carsound/).

Writes only the marked regions of index.html (`ddsp-overview`, `ddsp-cases`);
the rest of the page, including its header and footer, is maintained by hand
and by scripts/build_site.py.

Full rebuild from the AES listening-test set (needs numpy, scipy, matplotlib):

    python3 publications/ddsp-carsound/scripts/build_demo.py --source /path/to/AES_ListeningTestset_v2

Markup only, reusing the committed audio and spectrograms (no dependencies):

    python3 publications/ddsp-carsound/scripts/build_demo.py --html-only
"""

from __future__ import annotations

import argparse
import html
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

PAGE_DIR = ROOT / "publications" / "ddsp-carsound"
AUDIO_DIR = PAGE_DIR / "audio"
SPEC_DIR = PAGE_DIR / "spectrograms"

# Set by load_media_libraries(); only needed when regenerating audio and spectrograms.
np = signal = wavfile = plt = None


def load_media_libraries() -> None:
    global np, signal, wavfile, plt
    os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".mplconfig"))
    import numpy
    from scipy import signal as scipy_signal
    from scipy.io import wavfile as scipy_wavfile
    import matplotlib

    matplotlib.use("Agg")
    from matplotlib import pyplot

    np, signal, wavfile, plt = numpy, scipy_signal, scipy_wavfile, pyplot


N_FFT = 256
HOP_LENGTH = 32
SEC_START = 0.0
SEC_END = 4.0
SOURCE_SAMPLE_RATE = 2000
PLAYBACK_SAMPLE_RATE = 16000
SPEC_IMAGE_WIDTH = int((int(round((SEC_END - SEC_START) * SOURCE_SAMPLE_RATE)) - N_FFT) / HOP_LENGTH + 1)
SPEC_IMAGE_HEIGHT = N_FFT // 2 + 1
DISPLAY_SAMPLE_IDS = ["024", "031", "052", "080", "095", "099", "104", "112", "172", "179"]
DISPLAY_SAMPLE_LABELS = {sample_id: f"{index:02d}" for index, sample_id in enumerate(DISPLAY_SAMPLE_IDS, start=1)}
CASES = [
    {
        "slug": "f0-definition",
        "title": "F0 Definition",
        "card_title": "Demo A: F0 Definition",
        "card_title_html": "Demo A: F<sub>0</sub> Definition",
        "heading_html": "Demo A: F<sub>0</sub> Definition",
        "description": (
            "Compares synthesized vehicle sounds using crank-based and firing-based "
            "F0 definitions under direct and encoded conditioning."
        ),
        "description_html": (
            "Compares synthesized vehicle sounds using crank-based and firing-based "
            "F<sub>0</sub> definitions under direct and encoded conditioning."
        ),
        "source_subdir": "TestA_F0/mainset/processed/selected/2kHz",
        "methods": [
            {
                "label": "Ground Truth",
                "display_html": "Ground Truth<br>",
                "pattern": "GroundTruth",
                "description": "The reference audio.",
                "emphasize": True,
            },
            {
                "label": "Direct Firing-based",
                "legend_html": "Direct<br>Firing-based",
                "display_html": "Direct<br>Firing-based",
                "pattern": "TestA_01_C2_Direct",
                "description": "Synthesized audio using direct conditioning with the firing-based F0 definition.",
                "description_html": "Synthesized audio using direct conditioning with the firing-based F<sub>0</sub> definition.",
            },
            {
                "label": "Direct Crank-based",
                "legend_html": "Direct<br>Crank-based",
                "display_html": "Direct<br>Crank-based",
                "pattern": "TestA_02_C1_Direct",
                "description": "Synthesized audio using direct conditioning with the crank-based F0 definition.",
                "description_html": "Synthesized audio using direct conditioning with the crank-based F<sub>0</sub> definition.",
            },
            {
                "label": "Encoded Firing-based",
                "legend_html": "Encoded<br>Firing-based",
                "display_html": "Encoded<br>Firing-based",
                "pattern": "TestA_03_C2_Encoder",
                "description": "Synthesized audio using encoded conditioning with the firing-based F0 definition.",
                "description_html": "Synthesized audio using encoded conditioning with the firing-based F<sub>0</sub> definition.",
            },
            {
                "label": "Encoded Crank-based",
                "legend_html": "Encoded<br>Crank-based",
                "display_html": "Encoded<br>Crank-based",
                "pattern": "TestA_04_C1_Encoder",
                "description": "Synthesized audio using encoded conditioning with the crank-based F0 definition.",
                "description_html": "Synthesized audio using encoded conditioning with the crank-based F<sub>0</sub> definition.",
            },
        ],
    },
    {
        "slug": "driving-signal-configuration",
        "title": "Driving Signal Configuration",
        "card_title": "Demo B: Driving Signal Configuration",
        "heading_html": "Demo B: Driving Signal Configuration",
        "description": (
            "Compares synthesized vehicle sounds across driving signal configurations: "
            "(RPM), (RPM, Gear Level, Pedal Position) and (RPM, Gear Level, Pedal "
            "Position, Speed, Acceleration), under direct and encoded conditioning."
        ),
        "description_html": (
            "Compares synthesized vehicle sounds across driving signal configurations: "
            "(RPM), (RPM, Gear Level, Pedal Position) and (RPM, Gear Level, Pedal "
            "Position, Speed, Acceleration), under direct and encoded conditioning."
        ),
        "source_subdir": "TestB_CAN/mainset/processed/selected/2kHz",
        "methods": [
            {
                "label": "Ground Truth",
                "display_html": "Ground Truth<br>",
                "pattern": "GroundTruth",
                "description": "The reference audio.",
                "emphasize": True,
            },
            {
                "label": "Direct RPM",
                "legend_html": "Direct<br>(RPM)",
                "display_html": "Direct<br>(RPM)",
                "pattern": "TestB_01_C1_Direct_RPM",
                "description": "Synthesized audio using direct conditioning with (RPM).",
            },
            {
                "label": "Direct RPM + 2 Signals",
                "legend_html": "Direct<br>(RPM, Gear Level, Pedal Position)",
                "display_html": "Direct<br>(RPM, Gear Level, Pedal Position)",
                "pattern": "TestB_03_C1_Direct_RPM,PedalPosition,GearLevel",
                "description": "Synthesized audio using direct conditioning with (RPM, Gear Level, Pedal Position).",
            },
            {
                "label": "Direct RPM + 4 Signals",
                "legend_html": "Direct<br>(RPM, Gear Level, Pedal Position, Speed, Acceleration)",
                "display_html": "Direct<br>(RPM, Gear Level, Pedal Position, Speed, Acceleration)",
                "pattern": "TestB_05_C1_Direct_RPM,PedalPosition,GearLevel,Velocity,Acceleration",
                "description": "Synthesized audio using direct conditioning with (RPM, Gear Level, Pedal Position, Speed, Acceleration).",
            },
            {
                "label": "Encoded RPM",
                "legend_html": "Encoded<br>(RPM)",
                "display_html": "Encoded<br>(RPM)",
                "pattern": "TestB_02_C1_Encoder_RPM",
                "description": "Synthesized audio using encoded conditioning with (RPM).",
            },
            {
                "label": "Encoded RPM + 2 Signals",
                "legend_html": "Encoded<br>(RPM, Gear Level, Pedal Position)",
                "display_html": "Encoded<br>(RPM, Gear Level, Pedal Position)",
                "pattern": "TestB_04_C1_Encoder_RPM,PedalPosition,GearLevel",
                "description": "Synthesized audio using encoded conditioning with (RPM, Gear Level, Pedal Position).",
            },
            {
                "label": "Encoded RPM + 4 Signals",
                "legend_html": "Encoded<br>(RPM, Gear Level, Pedal Position, Speed, Acceleration)",
                "display_html": "Encoded<br>(RPM, Gear Level, Pedal Position, Speed, Acceleration)",
                "pattern": "TestB_06_C1_Encoder_RPM,PedalPosition,GearLevel,Velocity,Acceleration",
                "description": "Synthesized audio using encoded conditioning with (RPM, Gear Level, Pedal Position, Speed, Acceleration).",
            },
        ],
    },
]


def to_mono(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        return data.astype(np.float32)
    return data.mean(axis=1).astype(np.float32)


def normalize_audio(data: np.ndarray) -> np.ndarray:
    if np.issubdtype(data.dtype, np.integer):
        max_value = max(abs(np.iinfo(data.dtype).min), np.iinfo(data.dtype).max)
        return data.astype(np.float32) / float(max_value)
    return data.astype(np.float32)


def load_audio_segment(filepath: Path, sec_start: float, sec_end: float, sr: int | None = None) -> tuple[np.ndarray, int]:
    actual_sr, data = wavfile.read(filepath)
    if sr is not None and sr != actual_sr:
        raise ValueError(f"Unexpected sample rate for {filepath.name}: {actual_sr} (expected {sr})")

    y = to_mono(normalize_audio(np.asarray(data)))
    start_sample = int(sec_start * actual_sr)
    end_sample = int(sec_end * actual_sr)
    return y[start_sample:end_sample], actual_sr


def get_spec(y: np.ndarray, sr: int, n_fft: int = N_FFT, hop_length: int = HOP_LENGTH) -> np.ndarray:
    _, _, zxx = signal.stft(
        y,
        fs=sr,
        window="hann",
        nperseg=n_fft,
        noverlap=n_fft - hop_length,
        nfft=n_fft,
        boundary=None,
        padded=False,
    )
    magnitude = np.abs(zxx)
    ref = np.max(magnitude) if magnitude.size else 1.0
    spec_db = 20.0 * np.log10(np.maximum(magnitude, 1e-10))
    ref_db = 20.0 * np.log10(max(ref, 1e-10))
    return spec_db - ref_db


def save_spectrogram(source_path: Path, output_stem: str) -> Path:
    audio, sr = load_audio_segment(source_path, SEC_START, SEC_END, sr=SOURCE_SAMPLE_RATE)
    spec_db = get_spec(audio, sr)
    out_path = SPEC_DIR / f"{output_stem}.png"
    plt.imsave(out_path, spec_db, cmap="magma", origin="lower", vmin=-80, vmax=0)
    return out_path


def list_sample_ids(source_dir: Path | None) -> list[str]:
    available_ids = set()
    for path in sorted((source_dir or AUDIO_DIR).glob("2kHz_*_GroundTruth.wav")):
        match = re.match(r"2kHz_(\d+)_GroundTruth\.wav$", path.name)
        if match:
            available_ids.add(match.group(1))

    return [sample_id for sample_id in DISPLAY_SAMPLE_IDS if sample_id in available_ids]


def find_source_file(source_dir: Path, sample_id: str, pattern: str) -> Path:
    target = source_dir / f"2kHz_{sample_id}_{pattern}.wav"
    if not target.exists():
        raise FileNotFoundError(f"Missing expected file: {target}")
    return target


def to_pcm16(audio: np.ndarray) -> np.ndarray:
    clipped = np.clip(audio, -1.0, 1.0)
    return np.round(clipped * 32767.0).astype(np.int16)


def write_playback_audio(source_path: Path) -> Path:
    destination = AUDIO_DIR / source_path.name
    audio, sr = load_audio_segment(source_path, SEC_START, SEC_END, sr=SOURCE_SAMPLE_RATE)

    if sr != PLAYBACK_SAMPLE_RATE:
        resampled = signal.resample_poly(audio, PLAYBACK_SAMPLE_RATE, sr)
        expected_length = int(round(len(audio) * PLAYBACK_SAMPLE_RATE / sr))
        if len(resampled) > expected_length:
            resampled = resampled[:expected_length]
        elif len(resampled) < expected_length:
            resampled = np.pad(resampled, (0, expected_length - len(resampled)))
        audio = resampled.astype(np.float32, copy=False)
        sr = PLAYBACK_SAMPLE_RATE

    wavfile.write(destination, sr, to_pcm16(audio))
    return destination


def build_label(method: dict[str, str], emphasize: bool = False) -> str:
    label_html = method.get("display_html")
    if label_html is None:
        label_html = html.escape(method["label"])
    if emphasize:
        return f"<strong>{label_html}</strong>"
    return label_html


def build_legend_label(method: dict[str, str]) -> str:
    legend_html = method.get("legend_html")
    if legend_html is not None:
        return legend_html
    return html.escape(method["label"])


def build_legend_table(case: dict[str, object]) -> str:
    rows = []
    for method in case["methods"]:
        rows.append(
            "                        <tr>\n"
            f"                            <td>{build_legend_label(method)}</td>\n"
            f"                            <td>{method.get('description_html', html.escape(method['description']))}</td>\n"
            "                        </tr>"
        )
    return "\n".join(rows)


def format_sample_title(sample_id: str) -> str:
    display_label = DISPLAY_SAMPLE_LABELS.get(sample_id)
    if display_label is not None:
        return display_label
    if len(sample_id) == 3 and sample_id.startswith("0"):
        return sample_id[1:]
    return sample_id


def infer_group_key(method: dict[str, str]) -> str:
    label = method["label"].lower()
    if label.startswith("direct"):
        return "direct"
    if label.startswith("encoded"):
        return "encoded"
    return "reference"


def render_sample_item(case: dict[str, object], sample_id: str, method: dict[str, str]) -> str:
    if case["source_dir"] is None:
        audio_file = find_source_file(AUDIO_DIR, sample_id, method["pattern"])
        if not (SPEC_DIR / f"{audio_file.stem}.png").exists():
            raise FileNotFoundError(f"Missing spectrogram for {audio_file.name}")
    else:
        source_file = find_source_file(case["source_dir"], sample_id, method["pattern"])
        audio_file = write_playback_audio(source_file)
        save_spectrogram(source_file, audio_file.stem)

    label_html = build_label(method, emphasize=bool(method.get("emphasize")))
    # Alt text uses the full legend wording ("Direct (RPM, Gear Level, ...)") rather than the short label.
    method_name = re.sub(r"<[^>]+>", "", method.get("legend_html", html.escape(method["label"])).replace("<br>", " "))
    alt_text = f"Spectrogram for {html.escape(case['title'])} sample {sample_id} - {method_name}"
    audio_label = f"{html.escape(case['title'])}, Sample {format_sample_title(sample_id)}: {method_name}"

    return (
        "                        <div class=\"sample-item\">\n"
        f"                            <audio controls preload=\"none\" class=\"audio-player\" aria-label=\"{audio_label}\">\n"
        f"                                <source src=\"audio/{html.escape(audio_file.name)}\" type=\"audio/wav\">\n"
        "                            </audio>\n"
        f"                            <img class=\"spectrogram-preview\" src=\"spectrograms/{html.escape(audio_file.stem)}.png\" alt=\"{alt_text}\" loading=\"lazy\" width=\"{SPEC_IMAGE_WIDTH}\" height=\"{SPEC_IMAGE_HEIGHT}\">\n"
        f"                            <p class=\"sample-label\">{label_html}</p>\n"
        "                        </div>"
    )


def render_method_group(title: str, methods: list[dict[str, str]], case: dict[str, object], sample_id: str) -> str:
    items_html = "\n".join(render_sample_item(case, sample_id, method) for method in methods)
    return (
        "                        <div class=\"sample-method-group\">\n"
        f"                            <div class=\"sample-method-group-title\">{html.escape(title)}</div>\n"
        f"                            <div class=\"sample-method-group-grid cols-{len(methods)}\">\n"
        f"{items_html}\n"
        "                            </div>\n"
        "                        </div>"
    )


def build_sample_card(case: dict[str, object], sample_id: str) -> str:
    slug = case["slug"]
    reference_methods = [method for method in case["methods"] if infer_group_key(method) == "reference"]
    direct_methods = [method for method in case["methods"] if infer_group_key(method) == "direct"]
    encoded_methods = [method for method in case["methods"] if infer_group_key(method) == "encoded"]

    group_blocks = []
    if reference_methods:
        group_blocks.append(render_method_group("Reference", reference_methods, case, sample_id))
    if direct_methods:
        group_blocks.append(render_method_group("Direct", direct_methods, case, sample_id))
    if encoded_methods:
        group_blocks.append(render_method_group("Encoded", encoded_methods, case, sample_id))

    return (
        f"                <article class=\"sample-card\" id=\"{slug}-sample-{sample_id}\">\n"
        "                    <div class=\"sample-card-header\">\n"
        f"                        <h3>Sample {format_sample_title(sample_id)}</h3>\n"
        "                    </div>\n"
        f"                    <div class=\"sample-row-scroll\" role=\"region\" aria-label=\"{html.escape(case['title'])}, Sample {format_sample_title(sample_id)} samples\" tabindex=\"0\">\n"
        "                        <div class=\"sample-groups-layout\">\n"
        f"{chr(10).join(group_blocks)}\n"
        "                        </div>\n"
        "                    </div>\n"
        "                </article>"
    )


def build_case_section(case: dict[str, object]) -> str:
    sample_ids = list_sample_ids(case["source_dir"])
    sample_cards = "\n".join(build_sample_card(case, sample_id) for sample_id in sample_ids)
    slug = case["slug"]
    return (
        f"        <section id=\"{slug}-section\" class=\"post-section\">\n"
        f"            <h2 class=\"section-title centered-title\">{case.get('heading_html', html.escape(case['title']))}</h2>\n"
        f"            <p class=\"section-intro\">{case.get('description_html', html.escape(case['description']))}</p>\n"
        "            <div class=\"legend-table-wrap\">\n"
        "                <table class=\"legend-table\">\n"
        "                    <thead>\n"
        "                        <tr>\n"
        "                            <th style=\"width: 32%;\">Candidate</th>\n"
        "                            <th>Description</th>\n"
        "                        </tr>\n"
        "                    </thead>\n"
        "                    <tbody>\n"
        f"{build_legend_table(case)}\n"
        "                    </tbody>\n"
        "                </table>\n"
        "            </div>\n"
        "            <div class=\"demo-section\">\n"
        f"{sample_cards}\n"
        "            </div>\n"
        "        </section>"
    )


def build_regions() -> dict[str, str]:
    overview_cards = "\n".join(
        f"                <a href=\"#{case['slug']}-section\" class=\"case-card-link\">\n"
        "                    <div class=\"case-card\">\n"
        f"                        <h3>{case.get('card_title_html', html.escape(case.get('card_title', case['title'])))}</h3>\n"
        f"                        <p>{case.get('description_html', html.escape(case['description']))}</p>\n"
        "                    </div>\n"
        "                </a>"
        for case in CASES
    )
    return {
        "ddsp-overview": overview_cards,
        "ddsp-cases": "\n".join(build_case_section(case) for case in CASES),
    }


def write_regions(page: Path, regions: dict[str, str]) -> None:
    text = page.read_text(encoding="utf-8")
    for name, body in regions.items():
        pattern = re.compile(
            rf"^(?P<open>[ \t]*<!-- build:{name} -->\n).*?^(?P<close>[ \t]*<!-- /build:{name} -->)$",
            re.S | re.M,
        )
        text, count = pattern.subn(lambda match: f"{match.group('open')}{body}\n{match.group('close')}", text)
        if count != 1:
            raise SystemExit(f"{page}: expected one '{name}' region, found {count}")
    page.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenerate the DDSP demo sample regions.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--source", type=Path, help="AES_ListeningTestset_v2 directory; regenerates audio and spectrograms")
    group.add_argument("--html-only", action="store_true", help="reuse the committed audio and spectrograms")
    args = parser.parse_args()

    for case in CASES:
        case["source_dir"] = None if args.html_only else args.source / case["source_subdir"]
    if not args.html_only:
        load_media_libraries()
        AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        SPEC_DIR.mkdir(parents=True, exist_ok=True)

    output_path = PAGE_DIR / "index.html"
    write_regions(output_path, build_regions())

    print(f"Updated {output_path.relative_to(ROOT)}")
    print(f"Audio files: {len(list(AUDIO_DIR.glob('*.wav')))}")
    print(f"Spectrogram files: {len(list(SPEC_DIR.glob('*.png')))}")


if __name__ == "__main__":
    main()
