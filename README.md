# Power electronics course website

Published at https://tinix84.github.io/power-electronics/.

This repository contains released, self-contained HTML reading copies. The canonical Markdown, figure generation and withheld solutions stay in the local teaching workspace. Only the three HTML files explicitly listed in `scripts/sync_content.py` are copied. No solutions companion, scratch files, third-party reference downloads or private course files are published.

## Update and publish

1. Edit the canonical lesson Markdown in the adjacent course folders and rebuild the affected offline HTML using those folders' existing build commands and the external `ntbees2` environment.
2. From this folder, sync the reading copies and validate the website:

```powershell
npm ci
& 'C:\Users\tinix\miniconda3\envs\ntbees2\python.exe' -X utf8 scripts/sync_content.py
& 'C:\Users\tinix\miniconda3\envs\ntbees2\python.exe' -X utf8 scripts/build_site.py
git diff --stat
git add content site scripts .github README.md .gitignore package.json package-lock.json
git commit -m 'Update public course reading'
git push origin main
```

Every push to `main` builds an explicit release containing the reading pages and 26 circuit SVGs, validates internal links and anchors, checks consent and desktop/mobile rendering in Chromium, uploads a Pages artifact, and deploys it. The circuit checks verify SVG hashes, component counts, symbol references and the 26-group combined JSON. Pull requests validate the build without deploying. The workflow can also be run manually from GitHub Actions. Failed validation prevents deployment. The pipeline does not rerun the scientific examples or regenerate lessons from Markdown.

## Reading layout, mathematics and circuits

The offline builders share the teaching workspace's `reading.css` and use STIX math fonts. Web builds typeset the original TeX from each equation's accessible image label into static KaTeX HTML and MathML. The pinned renderer and embedded font files work without a CDN or runtime math scripts. Rendering errors fail the build instead of silently dropping a formula. Equation numbers and existing chapter anchors are preserved. The mobile contents menu and highlighted current chapter follow a book-style layout inspired by Quarto; this is not a Quarto project.

CircuiTikZ Designer JSON files are editable masters, not browser images. The [circuit gallery](https://tinix84.github.io/power-electronics/figures.html) publishes all 26 regenerated layouts as individual vector SVGs, with a combined Designer JSON, combined SVG and manifest under `content/circuit-figures/`. Some base layouts contain overlapping labels; the gallery identifies them as layouts for review. Established lesson illustrations, including their plots and placement sketches, stay in place until corrected layouts are ready to replace them.

The teaching workspace's `power-electronics-recap/scripts/batch_circuitikz_exports.py merge` groups all 26 masters into a separated grid without rewriting the masters. It converts numeric text sizes to Designer 0.8.2's named sizes in the combined copy. Import `figures/circuitikz/batch/combined.json` into Designer with replacement enabled, then export the SVG once. Run the script's `split --svg PATH` command to split that export by its 26 native groups, measure tight bounds with Inkscape and retain each group's referenced symbols/glyphs. The manifest records source hashes, component counts and output hashes; an incomplete import/export fails the split. `sync_content.py` copies the explicit gallery assets into this repository. Do not rerun generators over hand-edited JSON.

## Analytics

GA4 measurement ID: `G-H0BY8YR2Q8`. Google code loads only after analytics acceptance. Advertising consent stays denied; Google signals and ad personalization are disabled. Visitors can withdraw using the persistent settings button. Choices expire after 180 days; cookies are prefixed and scoped to this site's path. Query strings and URL fragments are excluded from configured page addresses.

Use GA4 Realtime to check opted-in visits. The property administrator should confirm the web stream URL, retention settings, enhanced measurement settings and privacy contact information before sharing the site broadly. This repository does not administer the Analytics property or promise personal visitor identification. The privacy page describes the implemented behavior and links to provider policies.
