"""Copy only released reading copies from the adjacent course workspace."""
from pathlib import Path
import shutil
import json
import re
import argparse

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "power-electronics-recap/recap.html",
    "power-electronics-recap/transformer-characterization.html",
    "lesson-01-buck/lesson-01.html",
    "lesson-02-boost/lesson-02.html",
    "lesson-magnetics/appendix-area-product.html",
    "lesson-control/lesson-control.html",
)


def foundation_files():
    """Accept only the public foundation reading files named by its builder."""
    manifest = ROOT / "content" / "power-electronics-recap" / "foundation-pages.json"
    entries = json.loads(manifest.read_text(encoding="utf-8"))
    files = [entry["file"] for entry in entries]
    if len(files) != len(set(files)) or not files or files[0] != "index.html":
        raise ValueError("Invalid foundation page list")
    if not all(re.fullmatch(r"(?:index|introduction|resources|chapter-\d{2}(?:-\d{2})?)\.html", name) for name in files):
        raise ValueError("Unexpected foundation release file")
    return tuple("power-electronics-recap/" + name for name in files)


def release_pages():
    return (*PAGES, *foundation_files())


def figure_assets():
    manifest = json.loads((ROOT / "content" / "circuit-figures" / "manifest.json").read_text(encoding="utf-8"))
    stems = [entry["stem"] for entry in manifest["figures"]]
    if len(stems) != 26 or len(set(stems)) != 26 or not all(re.fullmatch(r"\d{2}_[a-z0-9_]+", stem) for stem in stems):
        raise ValueError("Expected exactly 26 named circuit exports")
    return manifest, [*(stem + ".svg" for stem in stems), "combined.json", "combined.svg", "manifest.json"]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--foundations", action="store_true", help="Sync only foundation reading pages")
    args = parser.parse_args()
    manifest = "power-electronics-recap/foundation-pages.json"
    shutil.copyfile(ROOT.parent / manifest, ROOT / "content" / manifest)
    pages = ("power-electronics-recap/recap.html", *foundation_files()) if args.foundations else release_pages()
    for relative in pages:
        source = ROOT.parent / relative
        destination = ROOT / "content" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        print(f"Synced {relative}: {source.stat().st_size:,} bytes")
    if args.foundations:
        raise SystemExit(0)
    batch = ROOT.parent / "power-electronics-recap" / "figures" / "circuitikz" / "batch"
    destination = ROOT / "content" / "circuit-figures"
    destination.mkdir(exist_ok=True)
    shutil.copyfile(batch / "manifest.json", destination / "manifest.json")
    _, assets = figure_assets()
    for name in assets:
        if name == "manifest.json":
            continue
        source = batch / "exports" / name if name not in ("combined.json", "combined.svg") else batch / name
        shutil.copyfile(source, destination / name)
    print("Synced 26 circuit SVGs, the combined JSON/SVG and export manifest.")
