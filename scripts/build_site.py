"""Build public HTML from the explicit release list and check local links."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import shutil
from sync_content import PAGES

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if key in attrs:
                self.links.append(attrs[key])


def build():
    OUTPUT.mkdir(exist_ok=True)
    # Do not publish arbitrary directories or the solutions companion.
    for name in ("index.html", "privacy.html", "analytics.js", "site.css"):
        shutil.copyfile(ROOT / "site" / name, OUTPUT / name)
    (OUTPUT / ".nojekyll").write_text("", encoding="utf-8")
    for relative in PAGES:
        text = (ROOT / "content" / relative).read_text(encoding="utf-8")
        text = text.replace("</head>", '<link rel="stylesheet" href="../site.css">\n<script defer src="../analytics.js"></script>\n</head>')
        destination = OUTPUT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(text, encoding="utf-8")
    expected = {"index.html", "privacy.html", "analytics.js", "site.css", ".nojekyll", *PAGES}
    actual = {p.relative_to(OUTPUT).as_posix() for p in OUTPUT.rglob("*") if p.is_file()}
    if actual != expected:
        raise ValueError(f"Unexpected release contents: {actual ^ expected}. Inspect before publishing.")
    pages = {p.resolve(): Page(p.read_text(encoding="utf-8")) for p in OUTPUT.rglob("*.html")}
    errors = []
    for path, page in pages.items():
        for link in page.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if not target.is_relative_to(OUTPUT.resolve()) or not target.is_file():
                errors.append(f"{path.name}: missing or escaped {link}")
            elif parsed.fragment and target in pages and unquote(parsed.fragment) not in pages[target].ids:
                errors.append(f"{path.name}: missing anchor {link}")
    if errors:
        raise ValueError("\n".join(errors))
    print(f"Validated {len(pages)} pages; release contains exactly {len(expected)} files.")


if __name__ == "__main__":
    build()
