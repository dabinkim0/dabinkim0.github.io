#!/usr/bin/env python3
"""Fail if any page links to a local file or page that does not exist.

Checks href, src, srcset, and poster attributes in every published .html file.
External URLs are not fetched; only same-site targets are resolved on disk.
"""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "test-results", "playwright-report", "tests"}
SKIP_SCHEMES = ("http:", "https:", "mailto:", "tel:", "data:", "javascript:", "#")


class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.targets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if not value:
                continue
            if name in ("href", "src", "poster"):
                self.targets.append(value)
            elif name == "srcset":
                self.targets += [candidate.strip().split(" ")[0] for candidate in value.split(",") if candidate.strip()]


def resolve(page: Path, target: str) -> Path:
    path = unquote(urlsplit(target).path)
    resolved = (ROOT / path.lstrip("/")) if path.startswith("/") else (page.parent / path)
    if target.endswith("/") or resolved.is_dir():
        resolved = resolved / "index.html"
    return resolved


def main() -> None:
    pages = [p for p in ROOT.rglob("*.html") if not SKIP_DIRS.intersection(p.relative_to(ROOT).parts)]
    broken = []
    checked = 0
    for page in sorted(pages):
        collector = LinkCollector()
        collector.feed(page.read_text(encoding="utf-8"))
        for target in collector.targets:
            if target.startswith(SKIP_SCHEMES):
                continue
            checked += 1
            if not resolve(page, target).exists():
                broken.append(f"{page.relative_to(ROOT)}: {target}")

    if broken:
        print(f"{len(broken)} broken local link(s):\n  " + "\n  ".join(broken))
        sys.exit(1)
    print(f"Checked {checked} local links in {len(pages)} pages: all resolve.")


if __name__ == "__main__":
    main()
