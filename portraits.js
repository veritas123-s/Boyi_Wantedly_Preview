(() => {
  'use strict';
  const script = document.currentScript;
  if (!script?.src) return;
  const site = new URL('.', script.src);
  let manifest;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function picture(person, eager = false) {
    const frame = element('figure', 'boyi-person-portrait');
    if (person.src) {
      const image = element('img');
      image.src = new URL(person.src, site).href;
      image.alt = person.name + '的博医五期形象照';
      image.width = person.width;
      image.height = person.height;
      image.loading = eager ? 'eager' : 'lazy';
      image.decoding = 'async';
      frame.append(image);
    } else {
      const placeholder = element('span', 'boyi-person-placeholder', Array.from(person.name)[0]);
      placeholder.setAttribute('aria-hidden', 'true');
      frame.append(placeholder, element('figcaption', 'boyi-person-photo-note', '形象照待补'));
    }
    return frame;
  }
  function badge(person, parent, anchor) {
    if (!person.role || parent.querySelector('[data-portrait-role]')) return;
    const label = element('p', 'boyi-person-role', person.role);
    label.dataset.portraitRole = person.id;
    if (anchor) anchor.after(label); else parent.append(label);
  }
  function roster() {
    for (const row of document.querySelectorAll('.student-roster-row[data-student-id]')) {
      const person = manifest.get(row.dataset.studentId);
      if (!person || row.dataset.portraitReady) continue;
      const copy = element('div', 'boyi-person-roster-copy');
      while (row.firstChild) copy.append(row.firstChild);
      badge(person, copy, copy.querySelector('strong'));
      row.classList.add('boyi-person-roster-card');
      row.append(picture(person), copy);
      row.dataset.portraitReady = 'true';
    }
  }
  function detail() {
    const main = document.querySelector('main[data-student-id]');
    const person = main && manifest.get(main.dataset.studentId);
    if (!person) return;
    // Only decorate a rendered public profile. Loading, error and unpublished
    // responses remain controlled by the existing members privacy flow.
    const publicHero = main.querySelector('.member-profile-hero');
    if (publicHero) {
      decorateHero(publicHero, person);
      return;
    }
    const originalHero = main.querySelector('.student-hero');
    if (originalHero) {
      const copy = originalHero.querySelector('.student-hero-copy') || originalHero;
      badge(person, copy, copy.querySelector('h1'));
      if (!person.src || originalHero.dataset.portraitReady) return;
      const originalCard = originalHero.querySelector('figure.student-portrait');
      const image = originalCard?.querySelector('img');
      const frame = picture(person, true);
      if (image) {
        const source = element('a', 'boyi-person-original-link', '查看原人物卡片 ↗');
        source.href = image.src;
        source.target = '_blank';
        source.rel = 'noopener';
        const caption = element('figcaption');
        caption.append(source);
        frame.append(caption);
        originalCard.replaceWith(frame);
      } else originalHero.append(frame);
      originalHero.classList.add('boyi-person-original-hero');
      originalHero.dataset.portraitReady = 'true';
      return;
    }
    const summary = [...main.querySelectorAll('section.student-section')].find(section => section.querySelector('h1'));
    if (!summary || summary.dataset.portraitReady) return;
    const copy = element('div', 'boyi-person-profile-copy');
    while (summary.firstChild) copy.append(summary.firstChild);
    badge(person, copy, copy.querySelector('h1'));
    summary.classList.add('boyi-person-profile-summary');
    summary.append(picture(person, true), copy);
    summary.dataset.portraitReady = 'true';
  }
  function uploadedImage(image) {
    if (!image?.src) return false;
    try { return /\/api\/images\//.test(new URL(image.src, location.href).pathname); } catch { return false; }
  }
  function decorateHero(hero, person) {
    const heading = hero.querySelector('h1');
    badge(person, heading?.parentElement || hero, heading);
    const existing = hero.querySelector('img.member-avatar');
    if (uploadedImage(existing) || !person.src || hero.dataset.portraitReady) return;
    const frame = picture(person, true);
    const placeholder = hero.querySelector('.portal-avatar-placeholder');
    if (existing) existing.replaceWith(frame);
    else if (placeholder) placeholder.replaceWith(frame);
    else hero.prepend(frame);
    hero.classList.add('boyi-person-member-hero');
    hero.dataset.portraitReady = 'true';
  }
  function publicProfiles() {
    for (const host of document.querySelectorAll('[data-public-roster-id]')) {
      const person = manifest.get(host.dataset.publicRosterId);
      if (!person) continue;
      const hero = host.querySelector('.member-profile-hero');
      if (hero) decorateHero(hero, person);
      if (!host.matches('.member-person')) continue;
      badge(person, host, host.querySelector('h3'));
      if (uploadedImage(host.querySelector('img')) || !person.src || host.dataset.portraitReady) continue;
      const existing = host.querySelector(':scope > img');
      const frame = picture(person);
      if (existing) existing.replaceWith(frame); else host.prepend(frame);
      host.classList.add('boyi-person-directory-card');
      host.dataset.portraitReady = 'true';
    }
  }
  function apply() { if (manifest) { roster(); detail(); publicProfiles(); } }
  document.addEventListener('boyi:profile-ready', apply);
  document.addEventListener('boyi:public-profile-rendered', apply);
  fetch(new URL('portraits.json', site), { credentials: 'omit' })
    .then(response => { if (!response.ok) throw Error('Portrait manifest unavailable'); return response.json(); })
    .then(data => {
      if (data.version !== 1 || !Array.isArray(data.people) || !Array.isArray(data.missing)) return;
      const records = [...data.people, ...data.missing].filter(person =>
        person && /^[a-z0-9-]{1,80}$/.test(person.id) && typeof person.name === 'string' &&
        (!person.src || /^media\/portraits\/[a-z0-9-]+\.webp$/.test(person.src)));
      manifest = new Map(records.map(person => [person.id, person]));
      apply();
    }).catch(() => {});
})();
