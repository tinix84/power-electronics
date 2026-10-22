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

Every push to `main` builds and checks an explicit release of nine files, validates internal links and anchors, checks consent and desktop/mobile rendering in Chromium, uploads a Pages artifact, and deploys it. Pull requests validate the build without deploying. The workflow can also be run manually from GitHub Actions. Failed validation prevents deployment. The pipeline publishes the reviewed HTML; it does not rerun the scientific examples or regenerate lessons from Markdown.

## Reading layout, mathematics and circuits

The offline builders share the teaching workspace's `reading.css` and use STIX math fonts. Web builds typeset the original TeX from each equation's accessible image label into static KaTeX HTML and MathML. The pinned renderer and embedded font files work without a CDN or runtime math scripts. Rendering errors fail the build instead of silently dropping a formula. Equation numbers and existing chapter anchors are preserved. The mobile contents menu and highlighted current chapter follow a book-style layout inspired by Quarto; this is not a Quarto project.

CircuiTikZ Designer JSON files are editable masters, not browser images. After a JSON correction, export the matching SVG from the Designer, reference it in the canonical Markdown and rebuild the offline reading copy before syncing. Figures 61 and 62 use the available exports in `figures/circuitikz/`. Other JSON files still need exported SVGs before their changes can appear on the site. Do not rerun generators over hand-edited JSON.

## Analytics

GA4 measurement ID: `G-H0BY8YR2Q8`. Google code loads only after analytics acceptance. Advertising consent stays denied; Google signals and ad personalization are disabled. Visitors can withdraw using the persistent settings button. Choices expire after 180 days; cookies are prefixed and scoped to this site's path. Query strings and URL fragments are excluded from configured page addresses.

Use GA4 Realtime to check opted-in visits. The property administrator should confirm the web stream URL, retention settings, enhanced measurement settings and privacy contact information before sharing the site broadly. This repository does not administer the Analytics property or promise personal visitor identification. The privacy page describes the implemented behavior and links to provider policies.
