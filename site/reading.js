(() => {
  const nav = document.querySelector('nav[aria-label="Chapter contents"]');
  if (!nav) return;
  const toggle = document.querySelector('#chapter-toggle');
  nav.addEventListener('click', event => {
    if (event.target.closest('a') && toggle) toggle.checked = false;
  });
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const headings = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
  function update() {
    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 140) active = heading;
    }
    for (const link of links) {
      if (active && link.hash === '#' + active.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  let scheduled = false;
  addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => { update(); scheduled = false; });
    }
  }, {passive: true});
  update();
})();
