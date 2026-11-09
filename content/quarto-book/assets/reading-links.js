(() => {
  const element = document.getElementById('legacy-reading-links');
  if (!element) return;
  const data = JSON.parse(element.textContent);
  const go = () => {
    const key = decodeURIComponent(location.hash.slice(1));
    const target = key ? data.anchors[key] : data.default;
    if (!target) return;
    const url = new URL(target, location.href);
    if (url.pathname !== location.pathname) location.replace(url.href);
  };
  addEventListener('hashchange', go); go();
})();
