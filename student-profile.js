(() => {
'use strict';
const root = document.querySelector('.student-profile');
if (!root) return;
const filters = [...root.querySelectorAll('[data-profile-filter]')];
const cards = [...root.querySelectorAll('[data-profile-category]')];
const status = root.querySelector('.student-filter-status');
for (const button of filters) button.addEventListener('click', () => {
  const category = button.dataset.profileFilter;
  for (const filter of filters) filter.setAttribute('aria-pressed', String(filter === button));
  for (const card of cards) card.hidden = category !== 'all' && card.dataset.profileCategory !== category;
  status.textContent = category === 'all' ? '以下为栏目占位，项目资料待补' : `${button.textContent}栏目 · 项目资料待补`;
});
const dialog = document.querySelector('.student-detail-dialog');
const title = dialog?.querySelector('#student-detail-title');
let opener;
const labels = {research: '研究项目资料', digital: '数字作品资料', public: '实践项目资料'};
for (const button of root.querySelectorAll('[data-profile-detail]')) button.addEventListener('click', () => {
  if (!dialog || typeof dialog.showModal !== 'function') return;
  opener = button;
  title.textContent = labels[button.dataset.profileDetail] || '项目资料';
  dialog.showModal();
});
dialog?.querySelector('[data-profile-close]')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('close', () => opener?.focus());
})();
