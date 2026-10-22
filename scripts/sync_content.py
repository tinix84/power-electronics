"""Copy only released reading copies from the adjacent course workspace."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "power-electronics-recap/recap.html",
    "power-electronics-recap/transformer-characterization.html",
    "lesson-01-buck/lesson-01.html",
)

if __name__ == "__main__":
    for relative in PAGES:
        source = ROOT.parent / relative
        destination = ROOT / "content" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        print(f"Synced {relative}: {source.stat().st_size:,} bytes")
