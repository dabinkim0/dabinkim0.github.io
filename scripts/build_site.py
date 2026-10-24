#!/usr/bin/env python3
"""Regenerate the shared regions of the static HTML pages from data/*.json.

Pages stay plain, hand-editable HTML. Only blocks wrapped in marker comments
are rewritten, for example:

    <!-- build:header -->
    ...generated...
    <!-- /build:header -->

Run `python3 scripts/build_site.py` after editing data/ or this file, and
`python3 scripts/build_site.py --check` in CI to fail when a page is stale.
Edit generated blocks through data/ or the renderers below, never by hand.
"""

from __future__ import annotations

import argparse
import html
import json
import posixpath
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

# Page path -> nav entry (by href) highlighted as the current section.
PAGES = {
    "index.html": {"section": ""},
    "projects/index.html": {"section": "projects/"},
    "publications/index.html": {"section": "publications/"},
    "publications/adatt/index.html": {"section": "publications/", "publication": "adatt"},
    "publications/ddsp-carsound/index.html": {"section": "publications/", "publication": "ddsp-carsound"},
    # GitHub Pages serves 404.html for any missing path, so its links must be root-absolute.
    "404.html": {"section": None, "absolute": True},
}

# Regions owned by other generators; left untouched here.
EXTERNAL_REGIONS = {"ddsp-overview", "ddsp-cases"}

REGION_PATTERN = re.compile(
    r"^(?P<indent>[ \t]*)<!-- build:(?P<name>[\w-]+)(?P<args>(?: [\w-]+=\"[^\"]*\")*) -->\n"
    r"(?P<body>.*?)"
    r"^(?P=indent)<!-- /build:(?P=name) -->$",
    re.S | re.M,
)
ARG_PATTERN = re.compile(r"([\w-]+)=\"([^\"]*)\"")


def load_data() -> dict:
    return {name: json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))
            for name in ("site", "publications", "news", "background")}


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


class Page:
    def __init__(self, path: str, config: dict, data: dict):
        self.path = path
        self.config = config
        self.data = data
        self.dir = posixpath.dirname(path) or "."

    def href(self, target: str) -> str:
        """Resolve a site-root-relative target ("" = home, "x/" = directory) for this page."""
        if re.match(r"^([a-z]+:|#)", target):
            return target
        if self.config.get("absolute"):
            return "/" + target
        if target == "" or target.endswith("/"):
            rel = posixpath.relpath(target.rstrip("/") or ".", self.dir)
            return "./" if rel == "." else rel + "/"
        return posixpath.relpath(target, self.dir)


def find_publication(page: Page) -> dict | None:
    publication_id = page.config.get("publication")
    if not publication_id:
        return None
    return next(p for p in page.data["publications"] if p["id"] == publication_id)


def is_external(target: str) -> bool:
    return bool(re.match(r"^https?:", target))


def link_attrs(page: Page, target: str) -> str:
    attrs = f'href="{esc(page.href(target))}"'
    if is_external(target):
        attrs += ' target="_blank" rel="noreferrer"'
    return attrs


# ---------------------------------------------------------------- shared shell

def render_head_assets(page: Page, args: dict) -> list[str]:
    site = page.data["site"]
    return [
        f'<link rel="icon" type="image/svg+xml" href="{esc(page.href("favicon.svg"))}?v={esc(site["faviconVersion"])}">',
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        f'<link href="{esc(site["fonts"])}" rel="stylesheet">',
    ]


def render_header(page: Page, args: dict) -> list[str]:
    site = page.data["site"]
    section = page.config.get("section")
    lines = [
        '<header class="main-header">',
        '    <div class="shell header-shell">',
        f'        <a href="{esc(page.href(""))}" class="logo">{esc(site["name"])}</a>',
        '        <nav class="main-nav" aria-label="Primary">',
        "            <ul>",
    ]
    for item in site["nav"]:
        if item["href"] is None:
            lines.append(f'                <li><a href="#" class="nav-disabled" aria-disabled="true" tabindex="-1">{esc(item["label"])}</a></li>')
            continue
        current = ""
        if item["href"] == section:
            own_page = page.href(item["href"]) == "./"
            current = f' class="is-active" aria-current="{"page" if own_page else "true"}"'
        lines.append(f'                <li><a href="{esc(page.href(item["href"]))}"{current}>{esc(item["label"])}</a></li>')
    lines += [
        "            </ul>",
        "        </nav>",
        "    </div>",
        "</header>",
    ]
    return lines


def render_footer(page: Page, args: dict) -> list[str]:
    publication = find_publication(page)
    if publication:
        # Demo pages credit the paper instead of the generic site notice.
        copyright_html = f'&copy; {publication["year"]} {esc(page.data["site"]["name"])}. {esc(publication["title"])}.'
    else:
        copyright_html = page.data["site"]["copyrightHtml"]
    return [
        '<footer class="main-footer">',
        '    <div class="shell footer-shell">',
        f'        <p class="copyright">{copyright_html}</p>',
        "    </div>",
        "</footer>",
    ]


def render_analytics(page: Page, args: dict) -> list[str]:
    token = esc(page.data["site"]["analyticsToken"])
    return [
        "<!-- Cloudflare Web Analytics -->"
        f"<script type=\"module\" src=\"https://static.cloudflareinsights.com/beacon.min.js\" data-cf-beacon='{{\"token\":\"{token}\"}}'></script>"
        "<!-- End Cloudflare Web Analytics -->"
    ]


def render_profile_links(page: Page, args: dict) -> list[str]:
    site = page.data["site"]
    lines = [f'<a href="mailto:{esc(site["email"])}">Email</a>']
    lines += [f'<a {link_attrs(page, profile["href"])}>{esc(profile["label"])}</a>' for profile in site["profiles"]]
    lines.append(f'<a href="{esc(page.href(site["cv"]))}" target="_blank" rel="noreferrer">Download CV</a>')
    return lines


# ---------------------------------------------------------------- home entries

def render_entries(page: Page, items: list[dict], item_class: str) -> list[str]:
    lines = []
    for item in items:
        mark = item["mark"]
        mark_class = "entry-brand-mark" + (f' entry-brand-mark--{mark["variant"]}' if mark.get("variant") else "")
        lines += [
            f'<li class="{item_class}">',
            f'    <a class="{mark_class}" href="{esc(mark["href"])}" target="_blank" rel="noopener" aria-label="{esc(mark["label"])}">',
            f'        <img src="{esc(page.href(mark["src"]))}" alt="" width="{mark["width"]}" height="{mark["height"]}" loading="lazy" decoding="async">',
            "    </a>",
            '    <div class="entry-head">',
            f'        <p class="entry-title">{item["titleHtml"]}</p>',
            f'        <p class="entry-meta">{esc(item["date"])}</p>',
        ]
        if item.get("detail"):
            lines.append(f'        <p class="entry-detail">{esc(item["detail"])}</p>')
        lines += ["    </div>", "</li>"]
    return lines


def render_news(page: Page, args: dict) -> list[str]:
    return render_entries(page, page.data["news"], "entry-item entry-item--news-event entry-item--branded")


def render_background(page: Page, args: dict) -> list[str]:
    return render_entries(page, page.data["background"], "entry-item entry-item--branded")


# ---------------------------------------------------------------- publications

def primary_target(publication: dict) -> str:
    links = publication["links"]
    return links.get("demo") or links["paper"]


def authors_html(publication: dict) -> str:
    parts = []
    for author in publication["authors"]:
        name = esc(author["name"])
        if author.get("self"):
            name = f'<span class="author-self">{name}</span>'
        parts.append(name + esc(author.get("mark", "")))
    return ", ".join(parts)


def render_publication_body(page: Page, publication: dict) -> list[str]:
    lines = [
        f'<h3><a {link_attrs(page, primary_target(publication))}>{esc(publication["title"])}</a></h3>',
        f'<p class="authors">{authors_html(publication)}</p>',
        f'<p class="venue"><em>{esc(publication["venue"])}</em>, {publication["year"]}.</p>',
    ]
    if publication.get("award"):
        lines.append(f'<p class="award-note">{esc(publication["award"])}</p>')
    lines.append('<div class="links">')
    for key, label in (("paper", "Paper"), ("demo", "Demo"), ("code", "Code")):
        target = publication["links"].get(key)
        if target:
            lines.append(f"    <a {link_attrs(page, target)}>{label}</a>")
        else:
            lines.append(f'    <a href="#" class="disabled-link" aria-disabled="true" tabindex="-1">{label}</a>')
    lines.append("</div>")
    return lines


def render_home_publications(page: Page, args: dict) -> list[str]:
    lines = []
    for publication in page.data["publications"]:
        lines.append("<li>")
        lines += ["    " + line for line in render_publication_body(page, publication)]
        lines.append("</li>")
    return lines


def render_publication_archive(page: Page, args: dict) -> list[str]:
    lines = []
    for index, publication in enumerate(page.data["publications"]):
        figure = publication["figure"]
        target = primary_target(publication)
        kind = "demo" if publication["links"].get("demo") else "paper"
        image = [f'src="{esc(page.href(figure.get("thumb", figure["src"])))}"']
        if figure.get("thumb"):
            image.append(
                f'srcset="{esc(page.href(figure["thumb"]))} {figure["thumbWidth"]}w, {esc(page.href(figure["src"]))} {figure["width"]}w" '
                'sizes="(max-width: 720px) 100vw, (max-width: 920px) 50vw, 600px"'
            )
        image.append(f'alt="{esc(figure["alt"])}" width="{figure["width"]}" height="{figure["height"]}"')
        # The first card is above the fold on every layout; the rest load lazily.
        image.append('decoding="async" fetchpriority="high"' if index == 0 else 'loading="lazy" decoding="async"')
        lines += [
            f'<li class="publication-item archive-card archive-card--publication" data-publication-category="{esc(publication["category"])}">',
            f'    <a class="publication-figure archive-card__media" {link_attrs(page, target)} aria-label="Open {esc(publication["shortName"])} {kind}">',
            f'        <img {" ".join(image)}>',
            "    </a>",
            '    <div class="publication-copy archive-card__copy">',
        ]
        lines += ["        " + line for line in render_publication_body(page, publication)]
        lines += ["    </div>", "</li>"]
    return lines


# ---------------------------------------------------------------- structured data

def json_ld(value: dict) -> list[str]:
    body = json.dumps(value, indent=4, ensure_ascii=False)
    return ['<script type="application/ld+json">', *body.splitlines(), "</script>"]


def absolute_url(page: Page, target: str) -> str:
    return target if is_external(target) else page.data["site"]["url"] + target


def render_jsonld_person(page: Page, args: dict) -> list[str]:
    site = page.data["site"]
    return json_ld({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": site["name"],
        "url": site["url"],
        "image": absolute_url(page, site["image"]),
        "jobTitle": site["jobTitle"],
        "email": f'mailto:{site["email"]}',
        "affiliation": {"@type": "Organization", **site["affiliation"]},
        "knowsAbout": site["researchInterests"],
        "sameAs": [profile["href"] for profile in site["profiles"]],
    })


def render_jsonld_article(page: Page, args: dict) -> list[str]:
    site = page.data["site"]
    publication = find_publication(page)
    authors = []
    for author in publication["authors"]:
        person = {"@type": "Person", "name": author["name"]}
        if author["name"] in site["people"]:
            person["url"] = site["people"][author["name"]]
        authors.append(person)
    article = {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        "headline": publication["title"],
        "author": authors,
        "datePublished": str(publication["year"]),
        "isPartOf": {"@type": "CreativeWork", "name": publication["venue"]},
    }
    if publication.get("award"):
        article["award"] = publication["award"]
    article.update({
        "url": absolute_url(page, publication["links"]["demo"]),
        "sameAs": publication["links"]["paper"],
        "image": absolute_url(page, publication["figure"]["src"]),
    })
    return json_ld(article)


RENDERERS = {
    "head-assets": render_head_assets,
    "header": render_header,
    "footer": render_footer,
    "analytics": render_analytics,
    "profile-links": render_profile_links,
    "news": render_news,
    "background": render_background,
    "home-publications": render_home_publications,
    "publication-archive": render_publication_archive,
    "jsonld-person": render_jsonld_person,
    "jsonld-article": render_jsonld_article,
}


def build_page(page: Page, source: str) -> str:
    def replace(match: re.Match) -> str:
        name = match.group("name")
        if name in EXTERNAL_REGIONS:
            return match.group(0)
        if name not in RENDERERS:
            raise SystemExit(f"{page.path}: unknown build region '{name}'")
        indent = match.group("indent")
        args = dict(ARG_PATTERN.findall(match.group("args")))
        body = "".join(f"{indent}{line}\n" if line else "\n" for line in RENDERERS[name](page, args))
        return f"{indent}<!-- build:{name}{match.group('args')} -->\n{body}{indent}<!-- /build:{name} -->"

    return REGION_PATTERN.sub(replace, source)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--check", action="store_true", help="exit 1 if any page is out of date instead of writing")
    args = parser.parse_args()

    data = load_data()
    stale = []
    for path, config in PAGES.items():
        file = ROOT / path
        source = file.read_text(encoding="utf-8")
        output = build_page(Page(path, config, data), source)
        if output == source:
            continue
        stale.append(path)
        if not args.check:
            file.write_text(output, encoding="utf-8")

    if args.check and stale:
        print("Out of date (run python3 scripts/build_site.py):\n  " + "\n  ".join(stale))
        sys.exit(1)
    if stale and not args.check:
        print(f"Updated {len(stale)} page(s): " + ", ".join(stale))
    else:
        print("Up to date")


if __name__ == "__main__":
    main()
