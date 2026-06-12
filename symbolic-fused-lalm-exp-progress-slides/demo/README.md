# Symbolic-Aware LALM Demo

This is a static companion site for the experiment-progress presentation.

Recommended public URL after GitHub Pages is enabled for the slide repository:

```text
https://dabinkim0.github.io/symbolic-fused-lalm-exp-progress-slides/demo/
```

Sections:

1. Existing UniAudio behavior to preserve.
2. Existing music downstream proxy improvement.
3. New symbolic-related music downstream behavior.

The page intentionally distinguishes `S_plan` from `S_LLM`:

- `S_plan`: current learned symbolic planning token.
- `S_LLM`: planned LLM-supervised symbolic tokenizer/token stream, not trained yet.

Inference provenance:

- EXP001 UniAudio compatibility uses a Slakh test-split QA sample and held-out
  Slakh QA aggregate metrics.
- EXP029 stream-control reports held-out test aggregate metrics; its currently
  saved per-sample demo card uses validation fixed-example artifacts.
- EXP031A MIR recovery reports held-out test aggregate metrics; its currently
  saved per-sample demo cards use validation fixed-example artifacts.
- Output MIDI piano-roll comparison is not claimed yet because EXP031A outputs
  MIR JSON/caption proxies rather than generated MIDI.

All playable audio clips are copied from project-local Slakh artifacts to avoid
shipping AudioCaps/YouTube-derived audio assets. Piano-roll figures are rendered
from the corresponding project-local Slakh MIDI files with:

```bash
python doc/slide/demo/build_pianorolls.py
```
