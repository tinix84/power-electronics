// Render the existing original TeX as static, accessible HTML; no browser CDN.
const fs = require('node:fs');
const path = require('node:path');
const katex = require('katex');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const items = JSON.parse(input);
  const dist = path.dirname(require.resolve('katex/dist/katex.min.css'));
  let css = fs.readFileSync(path.join(dist, 'katex.min.css'), 'utf8');
  css = css.replace(/src:([^;]+);/g, (match, sources) => {
    const font = sources.match(/url\(([^)]+\.woff2)\)/);
    if (!font) return match;
    const bytes = fs.readFileSync(path.join(dist, font[1]));
    return `src:url(data:font/woff2;base64,${bytes.toString('base64')}) format("woff2");`;
  });
  const rendered = items.map(({tex, display}) => katex.renderToString(tex, {
    displayMode: display, output: 'htmlAndMathml', throwOnError: true,
    strict: 'ignore', trust: false
  }));
  process.stdout.write(JSON.stringify({css, rendered}));
});
