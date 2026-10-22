(() => {
  'use strict';
  const id = 'G-H0BY8YR2Q8';
  const key = 'power-electronics-analytics-v1';
  const lifetime = 180 * 24 * 60 * 60;
  const base = new URL('.', document.currentScript.src);
  let enabled = false;
  let choice = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Date.now() - saved.time < lifetime * 1000) choice = saved.choice;
  } catch (_) { /* Reading still works when browser storage is unavailable. */ }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const denied = {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'};
  gtag('consent', 'default', denied);

  function start() {
    if (enabled) return;
    enabled = true;
    gtag('consent', 'update', {...denied, analytics_storage: 'granted'});
    gtag('js', new Date());
    const referrer = document.referrer ? new URL(document.referrer) : null;
    gtag('config', id, {
      cookie_prefix: 'pe_course', cookie_path: base.pathname,
      cookie_domain: location.hostname, cookie_expires: lifetime, cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure',
      allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: referrer ? referrer.origin + referrer.pathname : ''
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }

  function save(value) {
    choice = value;
    try { localStorage.setItem(key, JSON.stringify({choice, time: Date.now()})); } catch (_) {}
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    settings.focus();
    if (value === 'accepted') start();
    else if (enabled) {
      window['ga-disable-' + id] = true;
      gtag('consent', 'update', denied);
      for (const item of document.cookie.split(';')) {
        const name = item.split('=')[0].trim();
        if (name.startsWith('pe_course')) {
          for (const domain of ['', '; Domain=' + location.hostname]) {
            document.cookie = name + '=; Max-Age=0; Path=' + base.pathname + domain + '; SameSite=Lax; Secure';
          }
        }
      }
      location.reload();
    }
  }

  const settings = document.createElement('button');
  settings.id = 'analytics-settings';
  settings.textContent = 'Analytics settings';
  settings.setAttribute('aria-controls', 'analytics-panel');
  settings.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');
  panel.id = 'analytics-panel';
  panel.className = 'analytics-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'analytics-title');
  panel.innerHTML = '<h2 id="analytics-title">Optional visitor analytics</h2><p>Allow Google Analytics cookies to measure visits, returning browsers and reading engagement? You can read everything without accepting and change your choice here at any time.</p><p><a href="' + new URL('privacy.html', base).href + '">Privacy and analytics details</a></p><div class="analytics-actions"><button type="button" data-choice="rejected">Reject analytics</button><button type="button" data-choice="accepted">Accept analytics</button></div>';
  panel.hidden = choice === 'accepted' || choice === 'rejected';
  settings.setAttribute('aria-expanded', String(!panel.hidden));
  panel.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => save(button.dataset.choice)));
  settings.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    settings.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('button').focus();
  });
  document.body.append(settings, panel);
  if (choice === 'accepted') start();
  window.addEventListener('storage', event => {
    if (event.key === key) location.reload();
  });
})();
