"""Copy only released reading copies from the adjacent course workspace."""
from pathlib import Path
import shutil
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "power-electronics-recap/recap.html",
    "power-electronics-recap/transformer-characterization.html",
    "lesson-01-buck/lesson-01.html",
    "lesson-02-boost/lesson-02.html",
    "lesson-magnetics/appendix-area-product.html",
)


def figure_assets():
    manifest = json.loads((ROOT / "content" / "circuit-figures" / "manifest.json").read_text(encoding="utf-8"))
    stems = [entry["stem"] for entry in manifest["figures"]]
    if len(stems) != 26 or len(set(stems)) != 26 or not all(re.fullmatch(r"\d{2}_[a-z0-9_]+", stem) for stem in stems):
        raise ValueError("Expected exactly 26 named circuit exports")
    return manifest, [*(stem + ".svg" for stem in stems), "combined.json", "combined.svg", "manifest.json"]

if __name__ == "__main__":
    for relative in PAGES:
        source = ROOT.parent / relative
        destination = ROOT / "content" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        print(f"Synced {relative}: {source.stat().st_size:,} bytes")
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
