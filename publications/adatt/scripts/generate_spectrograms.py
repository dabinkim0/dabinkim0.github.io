from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy import signal
from matplotlib.figure import Figure

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio"
OUT_DIR = ROOT / "spectrograms"
OUT_DIR.mkdir(parents=True, exist_ok=True)

EXPORT_WIDTH = 960
EXPORT_HEIGHT = 360
EXPORT_DPI = 160


def to_mono(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        return data.astype(np.float32)
    return data.mean(axis=1).astype(np.float32)


def normalize_audio(data: np.ndarray) -> np.ndarray:
    max_abs = np.max(np.abs(data)) if data.size else 0.0
    if max_abs > 0:
        return data / max_abs
    return data


def generate_one(wav_path: Path) -> Path:
    sr, data = wavfile.read(wav_path)
    mono = normalize_audio(to_mono(np.asarray(data)))

    _, _, zxx = signal.stft(
        mono,
        fs=sr,
        window="hann",
        nperseg=1024,
        noverlap=768,
        padded=False,
        boundary=None,
    )

    mag = np.abs(zxx)
    mag_db = 20.0 * np.log10(mag + 1e-8)

    lo, hi = np.percentile(mag_db, [5, 99])
    if hi <= lo:
        hi = lo + 1.0
    norm = np.clip((mag_db - lo) / (hi - lo), 0.0, 1.0)

    out_path = OUT_DIR / f"{wav_path.stem}.png"
    fig = Figure(
        figsize=(EXPORT_WIDTH / EXPORT_DPI, EXPORT_HEIGHT / EXPORT_DPI),
        dpi=EXPORT_DPI,
        frameon=False,
    )
    ax = fig.add_axes([0, 0, 1, 1])
    ax.imshow(norm, origin="lower", aspect="auto", cmap="magma", interpolation="bilinear")
    ax.set_axis_off()
    fig.savefig(out_path, dpi=EXPORT_DPI, bbox_inches=None, pad_inches=0)
    return out_path


def main() -> None:
    wav_files = sorted(AUDIO_DIR.glob("*.wav"))
    if not wav_files:
        raise SystemExit(f"No wav files found in {AUDIO_DIR}")

    for wav_path in wav_files:
        out_path = generate_one(wav_path)
        print(f"generated: {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
