/* Seven six-frame sprite animations. Loads only the action being used. */
(() => {
  'use strict';
  const script = document.currentScript;
  const assetBase = new URL('media/brand/companion/', script.src);
  const actions = {
    wave: {label: '打招呼', seconds: 1.2},
    jump: {label: '跳一跳', seconds: 1.05},
    nod: {label: '点点头', seconds: 1.3},
    think: {label: '思考中', seconds: 1.8},
    listen: {label: '认真听', seconds: 1.5},
    celebrate: {label: '庆祝一下', seconds: 1.25},
    tablet: {label: '翻阅 iPad', seconds: 1.8}
  };
  const cache = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const instances = [];
  function sheet(name) {
    if (!cache.has(name)) cache.set(name, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.src);
      image.onerror = () => { cache.delete(name); reject(new Error('Sprite unavailable')); };
      image.src = new URL(name + '.webp', assetBase).href;
    }));
    return cache.get(name);
  }
  for (const root of document.querySelectorAll('[data-boyi-companion]')) {
    const picture = root.querySelector('.boyi-companion-picture');
    const sprite = root.querySelector('.boyi-companion-sprite');
    const label = root.querySelector('.boyi-companion-label');
    const toggle = root.querySelector('.boyi-companion-toggle');
    const choices = root.querySelector('.boyi-companion-choices');
    let timer, request = 0, busy = false, visible = false, lastName = '', manual = 0;
    function pause() { root.classList.toggle('is-paused', !visible || document.hidden); }
    function close() { if (choices) choices.hidden = true; if (toggle) toggle.setAttribute('aria-expanded', 'false'); }
    async function play(name, options = {}) {
      if (!actions[name] || (busy && !options.work)) return;
      const nextBusy = options.work && options.busy === true;
      if (name === lastName && nextBusy === busy && options.work) return;
      busy = nextBusy; root.dataset.busy = String(busy);
      if (toggle) toggle.disabled = busy;
      const ticket = ++request;
      clearTimeout(timer); close();
      label.textContent = actions[name].label;
      picture.setAttribute('aria-label', '博医云伴：' + actions[name].label + (busy ? '' : '，点击换个动作'));
      try {
        const url = await sheet(name);
        if (ticket !== request) return;
        lastName = name; root.dataset.action = name;
        root.classList.remove('is-playing');
        sprite.style.backgroundImage = 'url("' + url + '")';
        sprite.style.setProperty('--companion-duration', actions[name].seconds + 's');
        sprite.style.setProperty('--companion-repeat', busy ? 'infinite' : '2');
        root.dataset.ready = 'true';
        void sprite.offsetWidth;
        if (!reduced.matches) root.classList.add('is-playing');
        pause();
        if (!busy) timer = setTimeout(() => root.classList.remove('is-playing'), actions[name].seconds * 2000);
      } catch {
        if (ticket === request) {
          root.classList.remove('is-playing'); root.dataset.ready = 'false';
          label.textContent = busy ? actions[name].label : '博医云伴';
        }
      }
    }
    picture.addEventListener('click', () => {
      if (busy) return;
      const names = Object.keys(actions);
      play(names[manual++ % names.length]);
    });
    if (choices && toggle) {
      choices.id = 'boyi-companion-actions-' + instances.length;
      toggle.setAttribute('aria-controls', choices.id);
      for (const button of choices.querySelectorAll('[data-companion-action]')) {
        button.addEventListener('click', () => { play(button.dataset.companionAction); picture.focus({preventScroll: true}); });
      }
      toggle.addEventListener('click', () => {
        const opening = choices.hidden; choices.hidden = !opening;
        toggle.setAttribute('aria-expanded', String(opening));
        if (opening) choices.querySelector('button').focus({preventScroll: true});
      });
      root.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); toggle.focus(); } });
      document.addEventListener('click', event => { if (!root.contains(event.target)) close(); });
    }
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; pause();
      if (visible && !lastName && !busy) play('wave');
    }, {threshold: 0.15});
    observer.observe(root);
    document.addEventListener('visibilitychange', pause);
    reduced.addEventListener('change', () => { if (reduced.matches) root.classList.remove('is-playing'); });
    instances.push({play, root});
  }
  document.addEventListener('boyi:companion', event => {
    const detail = event.detail;
    if (!detail || !actions[detail.state]) return;
    for (const instance of instances) instance.play(detail.state, {work: true, busy: detail.busy === true});
  });
  document.querySelector('#question')?.addEventListener('focus', () => {
    for (const instance of instances) instance.play('listen');
  });
})();
