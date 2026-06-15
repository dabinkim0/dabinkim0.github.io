#!/usr/bin/env python3
"""Render EXP024 S_plan reconstruction figures for the static demo page."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/symbolic_lalm_demo_mpl")

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
OUT_DIR = ROOT / "assets" / "figures"
DATA_DIR = ROOT / "assets" / "data"
SAMPLE_IDS = (
    "Slakh_Track01501_w000_s0000000",
    "Slakh_Track01501_w001_s0003000",
    "Slakh_Track01501_w003_s0009000",
)
FEATURE_DIR = REPO / "exp_outputs/060528_uniaudio2-understanding-eval/exp024_splan_recon_vq/slakh_valid_features/features"
SCHEMA_PATH = REPO / "exp_outputs/060528_uniaudio2-understanding-eval/exp024_splan_recon_vq/slakh_valid_features/splan_feature_schema.json"
CKPT_PATH = REPO / "exp_outputs/060528_uniaudio2-understanding-eval/exp024_splan_recon_vq/train_full_bs512_forever_from8000_lr1e-5/best.pt"

sys.path.insert(0, str(REPO / "source"))

import matplotlib.pyplot as plt
import pretty_midi
import torch
from matplotlib.patches import Rectangle

from train.splan_recon_vq import SPlanRVQAutoEncoder, SPlanRVQConfig


FAMILY_COLORS = {
    "drums": "#6b7280",
    "bass": "#315f7d",
    "guitar": "#1f6b45",
    "piano": "#8a5b24",
    "strings": "#7a3b8f",
    "synth": "#346f9f",
    "brass": "#b7791f",
    "reed": "#8b5cf6",
    "organ": "#7c5c2f",
    "percussion": "#6b7280",
    "other": "#c62828",
}


def family_for_instrument(inst: pretty_midi.Instrument) -> str:
    if inst.is_drum:
        return "drums"
    name = pretty_midi.program_to_instrument_class(inst.program).lower()
    if "bass" in name:
        return "bass"
    if "guitar" in name:
        return "guitar"
    if "piano" in name:
        return "piano"
    if "string" in name or "ensemble" in name:
        return "strings"
    if "synth" in name or "pad" in name or "lead" in name:
        return "synth"
    if "brass" in name:
        return "brass"
    if "reed" in name or "pipe" in name:
        return "reed"
    if "organ" in name:
        return "organ"
    if "percussion" in name or "chromatic" in name:
        return "percussion"
    return "other"


def load_reconstruction(sample_id: str) -> tuple[dict, dict, torch.Tensor, torch.Tensor, torch.Tensor]:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    feature_path = FEATURE_DIR / f"{sample_id}_splan_features.pt"
    feature_obj = torch.load(feature_path, map_location="cpu")
    target = feature_obj["features"].float()
    metadata = dict(feature_obj["metadata"])
    ckpt = torch.load(CKPT_PATH, map_location="cpu")
    model = SPlanRVQAutoEncoder(SPlanRVQConfig(**ckpt["model_config"]))
    model.load_state_dict(ckpt["model"], strict=True)
    model.eval()
    with torch.no_grad():
        out = model(target.unsqueeze(0))
        pred = torch.sigmoid(out["logits"])[0].cpu()
        codes = out["codes"][0].cpu()
    return schema, metadata, target.cpu(), pred, codes


def draw_midi_roll(ax, metadata: dict) -> None:
    midi_path = Path(metadata["midi_path"])
    start = float(metadata["clip_start_sec"])
    end = float(metadata["clip_end_sec"])
    pm = pretty_midi.PrettyMIDI(str(midi_path))
    families = set()
    note_count = 0
    for inst in pm.instruments:
        family = family_for_instrument(inst)
        color = FAMILY_COLORS.get(family, FAMILY_COLORS["other"])
        for note in inst.notes:
            if note.end <= start or note.start >= end:
                continue
            x0 = max(note.start, start) - start
            x1 = min(note.end, end) - start
            if x1 <= x0:
                continue
            ax.add_patch(
                Rectangle(
                    (x0, note.pitch - 0.38),
                    x1 - x0,
                    0.76,
                    color=color,
                    alpha=0.28 if inst.is_drum else 0.62,
                    linewidth=0,
                )
            )
            families.add(family)
            note_count += 1
    ax.text(0.01, 0.04, f"GT MIDI: {note_count} rendered notes", transform=ax.transAxes, fontsize=9, color="#62666d")
    ax.set_title("GT MIDI piano roll", loc="left", fontsize=12, weight="bold")
    ax.set_xlim(0, 30)
    ax.set_ylim(24, 96)
    ax.set_ylabel("MIDI pitch")
    ax.grid(True, axis="x", color="#d9d9d1", linewidth=0.7)
    ax.grid(True, axis="y", color="#eeeeea", linewidth=0.5)
    legend_items = [
        Rectangle((0, 0), 1, 1, color=FAMILY_COLORS[f], alpha=0.6, label=f)
        for f in ["drums", "bass", "guitar", "piano", "strings", "synth", "reed", "other"]
        if f in families
    ]
    if legend_items:
        ax.legend(handles=legend_items, ncol=min(len(legend_items), 4), frameon=False, loc="upper right", fontsize=8)


def pitch_activity_roll(features: torch.Tensor, schema: dict, threshold: float = 0.5) -> list[tuple[float, int, float]]:
    groups = schema["groups"]
    pc_idx = groups["pitch_class_active"]
    octave_idx = groups["octave_active"]
    values: list[tuple[float, int, float]] = []
    for frame in range(features.shape[0]):
        pcs = [i for i, idx in enumerate(pc_idx) if float(features[frame, idx]) >= threshold]
        octaves = [i for i, idx in enumerate(octave_idx) if float(features[frame, idx]) >= threshold]
        for octave in octaves:
            for pc in pcs:
                pitch = octave * 12 + pc
                if 24 <= pitch <= 96:
                    strength = min(float(features[frame, pc_idx[pc]]), float(features[frame, octave_idx[octave]]))
                    values.append((float(frame), pitch, strength))
    return values


def draw_proxy_roll(ax, features: torch.Tensor, schema: dict, title: str) -> None:
    values = pitch_activity_roll(features, schema)
    for frame, pitch, strength in values:
        ax.add_patch(Rectangle((frame, pitch - 0.45), 1.0, 0.9, color="#315f7d", alpha=0.18 + 0.54 * strength, linewidth=0))
    ax.text(0.01, 0.04, f"{len(values)} pitch-activity cells from reconstructed features", transform=ax.transAxes, fontsize=9, color="#62666d")
    ax.set_title(title, loc="left", fontsize=12, weight="bold")
    ax.set_xlim(0, 30)
    ax.set_ylim(24, 96)
    ax.set_ylabel("proxy pitch")
    ax.grid(True, axis="x", color="#d9d9d1", linewidth=0.7)
    ax.grid(True, axis="y", color="#eeeeea", linewidth=0.5)


def render_pitch_roll(sample_id: str, schema: dict, metadata: dict, target: torch.Tensor, pred: torch.Tensor) -> Path:
    fig, axes = plt.subplots(3, 1, figsize=(12.5, 9.2), dpi=160, sharex=True)
    draw_midi_roll(axes[0], metadata)
    draw_proxy_roll(axes[1], target, schema, "Target symbolic feature proxy roll")
    draw_proxy_roll(axes[2], pred, schema, r"$S_{\mathrm{plan}}$ reconstruction proxy roll")
    axes[-1].set_xlabel("time in 30-second window (s)")
    for ax in axes:
        ax.set_facecolor("#fbfbf7")
    fig.suptitle(f"{sample_id}: GT MIDI vs $S_{{\\mathrm{{plan}}}}$ symbolic reconstruction", fontsize=13)
    fig.tight_layout()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"splan_recon_{sample_id.replace('Slakh_', '').lower()}_roll_comparison.png"
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)
    return out_path


def render_feature_heatmap(sample_id: str, schema: dict, target: torch.Tensor, pred: torch.Tensor) -> Path:
    names = schema["feature_names"]
    target_np = target.numpy().T
    pred_np = pred.numpy().T
    err_np = abs(pred_np - target_np)
    fig, axes = plt.subplots(3, 1, figsize=(12.5, 8.6), dpi=160, sharex=True)
    for ax, matrix, title, vmax in [
        (axes[0], target_np, "Target symbolic feature", 1.0),
        (axes[1], pred_np, r"$S_{\mathrm{plan}}$ reconstructed symbolic feature", 1.0),
        (axes[2], err_np, "Absolute reconstruction error", max(0.25, float(err_np.max()) if err_np.size else 0.25)),
    ]:
        im = ax.imshow(matrix, aspect="auto", origin="lower", interpolation="nearest", vmin=0.0, vmax=vmax)
        ax.set_title(title, loc="left", fontsize=12, weight="bold")
        ax.set_ylabel("feature")
        fig.colorbar(im, ax=ax, fraction=0.018, pad=0.01)
    ticks = list(range(0, len(names), 4))
    axes[0].set_yticks(ticks)
    axes[0].set_yticklabels([names[i] for i in ticks], fontsize=6)
    axes[-1].set_xlabel("frame index (1 frame = 1 s)")
    fig.suptitle(f"{sample_id}: EXP024 reconstruction heatmap", fontsize=13)
    fig.tight_layout()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"splan_recon_{sample_id.replace('Slakh_', '').lower()}_feature_heatmap.png"
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)
    return out_path


def summarize_reconstruction(sample_id: str, schema: dict, metadata: dict, target: torch.Tensor, pred: torch.Tensor, codes: torch.Tensor, heatmap_path: Path, roll_path: Path | None) -> dict:
    binary_indices = torch.as_tensor(schema["binary_indices"], dtype=torch.long)
    continuous_indices = torch.as_tensor(schema["continuous_indices"], dtype=torch.long)
    binary_target = target[:, binary_indices]
    binary_pred = pred[:, binary_indices] >= 0.5
    continuous_target = target[:, continuous_indices]
    continuous_pred = pred[:, continuous_indices]
    return {
        "sample_id": sample_id,
        "split": metadata.get("split", "validation"),
        "clip_start_sec": metadata.get("clip_start_sec"),
        "clip_end_sec": metadata.get("clip_end_sec"),
        "binary_feature_accuracy": float((binary_pred == (binary_target >= 0.5)).float().mean().item()),
        "continuous_feature_mse": float(torch.mean((continuous_pred - continuous_target) ** 2).item()),
        "unique_codes_per_book": [int(torch.unique(codes[:, i]).numel()) for i in range(codes.shape[-1])],
        "heatmap": str(heatmap_path.relative_to(ROOT)),
        "roll_comparison": str(roll_path.relative_to(ROOT)) if roll_path is not None else None,
        "claim_boundary": "Symbolic feature reconstruction, not waveform generation and not full MIDI transcription.",
    }


def main() -> None:
    rows = []
    for sample_id in SAMPLE_IDS:
        schema, metadata, target, pred, codes = load_reconstruction(sample_id)
        heatmap_path = render_feature_heatmap(sample_id, schema, target, pred)
        roll_path = render_pitch_roll(sample_id, schema, metadata, target, pred) if sample_id.endswith("w003_s0009000") else None
        row = summarize_reconstruction(sample_id, schema, metadata, target, pred, codes, heatmap_path, roll_path)
        rows.append(row)
        print(f"wrote {heatmap_path}")
        if roll_path is not None:
            print(f"wrote {roll_path}")
        print(f"{sample_id} codes unique per book: {row['unique_codes_per_book']}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = DATA_DIR / "exp024_splan_recon_gallery.json"
    summary_path.write_text(json.dumps({"experiment": "EXP024", "rows": rows}, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {summary_path}")


if __name__ == "__main__":
    main()
