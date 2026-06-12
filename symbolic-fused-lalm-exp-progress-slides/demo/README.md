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

All playable audio clips are copied from project-local Slakh artifacts to avoid
shipping AudioCaps/YouTube-derived audio assets.
