#!/usr/bin/env python3
"""Render piano-roll figures for the static demo page."""

from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/symbolic_lalm_demo_mpl")

import matplotlib.pyplot as plt
import pretty_midi
from matplotlib.patches import Rectangle


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "assets" / "figures"
CASES = [
    {
        "title": "Slakh Track01501 window 003 (90-120 s)",
        "midi": Path("/mnt/hdd4/dabin/music_dataset/datasets/slakh2100/redux/slakh/validation/Track01501/all_src.mid"),
        "start": 90.0,
        "end": 120.0,
        "out": "pianoroll_track01501_w003_target.png",
    },
    {
        "title": "Slakh Track01501 window 005 (150-180 s)",
        "midi": Path("/mnt/hdd4/dabin/music_dataset/datasets/slakh2100/redux/slakh/validation/Track01501/all_src.mid"),
        "start": 150.0,
        "end": 180.0,
        "out": "pianoroll_track01501_w005_target.png",
    },
]


FAMILY_COLORS = {
    "drum": "#6b7280",
    "bass": "#315f7d",
    "guitar": "#1f6b45",
    "piano": "#8a5b24",
    "strings": "#7a3b8f",
    "other": "#c62828",
}


def family_for_instrument(inst: pretty_midi.Instrument) -> str:
    if inst.is_drum:
        return "drum"
    name = (inst.name or "").lower()
    program_name = pretty_midi.program_to_instrument_name(inst.program).lower()
    text = f"{name} {program_name}"
    if "bass" in text:
        return "bass"
    if "guitar" in text:
        return "guitar"
    if "piano" in text or "keyboard" in text:
        return "piano"
    if "string" in text or "violin" in text or "cello" in text:
        return "strings"
    return "other"


def render_case(case: dict[str, object]) -> None:
    midi_path = Path(str(case["midi"]))
    start = float(case["start"])
    end = float(case["end"])
    pm = pretty_midi.PrettyMIDI(str(midi_path))

    fig, ax = plt.subplots(figsize=(11.5, 4.8), dpi=160)
    note_count = 0
    active_families: set[str] = set()

    for inst in pm.instruments:
        family = family_for_instrument(inst)
        color = FAMILY_COLORS[family]
        for note in inst.notes:
            if note.end <= start or note.start >= end:
                continue
            x0 = max(note.start, start) - start
            x1 = min(note.end, end) - start
            if x1 <= x0:
                continue
            alpha = 0.28 if inst.is_drum else 0.58
            height = 0.72 if inst.is_drum else 0.82
            ax.add_patch(Rectangle((x0, note.pitch - height / 2), x1 - x0, height, color=color, alpha=alpha, linewidth=0))
            note_count += 1
            active_families.add(family)

    ax.set_xlim(0, end - start)
    ax.set_ylim(24, 96)
    ax.set_xlabel("time in 30-second window (s)")
    ax.set_ylabel("MIDI pitch")
    ax.set_title(str(case["title"]), loc="left", fontsize=12, weight="bold")
    ax.grid(True, axis="x", color="#d9d9d1", linewidth=0.7)
    ax.grid(True, axis="y", color="#eeeeea", linewidth=0.5)
    ax.set_facecolor("#fbfbf7")
    fig.patch.set_facecolor("#ffffff")

    legend_items = []
    for family in ["drum", "bass", "guitar", "piano", "strings", "other"]:
        if family in active_families:
            legend_items.append(Rectangle((0, 0), 1, 1, color=FAMILY_COLORS[family], alpha=0.6, label=family))
    if legend_items:
        ax.legend(handles=legend_items, ncol=min(len(legend_items), 6), frameon=False, loc="upper right", fontsize=9)

    ax.text(
        0.01,
        0.02,
        f"{note_count} notes rendered from target MIDI window",
        transform=ax.transAxes,
        fontsize=9,
        color="#62666d",
        va="bottom",
    )
    fig.tight_layout()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_DIR / str(case["out"]), bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    for case in CASES:
        render_case(case)
        print(f"wrote {OUT_DIR / str(case['out'])}")


if __name__ == "__main__":
    main()
