/* Physical presentation primitives. They never read or change algorithm state. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const chips = (count, className = '') => Array.from({length: count}, (_, i) => `<span class="hw-chip ${className}" data-chip="${i}" aria-hidden="true"></span>`).join('');

  function fallback(type) {
    if (type === 'cpu') return '<span class="hw-fallback hw-fallback--cpu"><span class="hw-cpu-substrate"><span class="hw-metal-lid"><b>CPU</b><i></i><small>PROCESSOR</small></span></span></span>';
    if (type === 'ram') return `<span class="hw-fallback hw-fallback--ram"><span class="hw-dimm-notches"></span><span class="hw-dimm-chips">${chips(8)}</span><span class="hw-gold-pins"></span></span>`;
    if (type === 'ssd') return '<span class="hw-fallback hw-fallback--ssd"><span class="hw-ssd-case"><span class="hw-ssd-sticker"><b>SSD</b><small>Solid State Drive</small></span><span class="hw-ssd-port"></span></span></span>';
    return `<span class="hw-fallback hw-fallback--gpu"><span class="hw-gpu-board"><span class="hw-fan"></span><span class="hw-fan"></span><span class="hw-gpu-port"></span><span class="hw-gold-pins"></span></span></span>`;
  }

  function visual(type, options = {}) {
    const allowed = ['cpu','ram','ssd','gpu'].includes(type) ? type : 'cpu';
    // A visible text label accompanies each decorative product image, so the
    // photo does not repeat the component name to assistive technology.
    return `<span class="hw-visual hw-visual--${allowed}" aria-hidden="true">${fallback(allowed)}<span class="hw-photo hw-photo--${allowed}"></span></span>`;
  }

  function cpu({label = 'CPU · bộ xử lý', value = '', detail = '', active = false, html = ''} = {}) {
    return `<section class="hw-component hw-cpu ${active ? 'is-active' : ''}" aria-label="${esc(label)}"><div class="hw-component-heading"><span class="hw-component-name">CPU</span><span>${esc(label.replace(/^CPU\s*[·—–:]?\s*/i,''))}</span></div>${visual('cpu')}<div class="hw-cpu-readout">${value !== '' ? `<strong>${esc(value)}</strong>` : ''}${detail ? `<p>${esc(detail)}</p>` : ''}${html}</div></section>`;
  }

  function ram({label = 'RAM · bộ nhớ đang làm việc', detail = '', active = false, html = '', slots = null, note = true} = {}) {
    const count = Number.isInteger(slots) && slots > 0 ? `<span class="hw-part-counter">${slots} vùng mô phỏng</span>` : '';
    return `<section class="hw-component hw-ram ${active ? 'is-active' : ''}" aria-label="${esc(label)}"><div class="hw-component-heading"><span class="hw-component-name">RAM</span><span>${esc(label.replace(/^RAM\s*[·—–:]?\s*/i,''))}</span>${count}</div><div class="hw-dimm-board">${visual('ram')}<div class="hw-ram-slots">${html}</div><div class="hw-ram-footer"><span class="hw-board-mark" aria-hidden="true">MEMORY MODULE</span><span class="hw-board-status">${active ? 'ĐANG XỬ LÝ' : 'BỘ NHỚ VẬT LÝ'}</span></div><span class="hw-contact-edge" aria-hidden="true"></span></div>${detail ? `<p class="hw-part-detail">${esc(detail)}</p>` : ''}${note ? '<p class="hw-simulation-note">Các vùng màu là lớp mô phỏng; không tương ứng từng chip trên thanh RAM.</p>' : ''}</section>`;
  }

  function ssd({label = 'SSD · nơi lưu bản trang', page = null, detail = '', active = false, html = ''} = {}) {
    return `<section class="hw-component hw-ssd ${active ? 'is-active' : ''}" aria-label="${esc(label)}"><div class="hw-component-heading"><span class="hw-component-name">SSD</span><span>${esc(label.replace(/^SSD\s*[·—–:]?\s*/i,''))}</span></div><div class="hw-ssd-content">${visual('ssd')}<div class="hw-ssd-readout">${page !== null && page !== undefined ? `<span class="hw-data-tag ${pageClass(page)}">Trang ${esc(page)}</span>` : ''}${detail ? `<p>${esc(detail)}</p>` : ''}${html}</div></div></section>`;
  }

  function gpu({label = 'GPU · bộ xử lý đồ họa', detail = 'Không tham gia các thuật toán trong mô hình này.', html = ''} = {}) {
    return `<section class="hw-component hw-gpu" aria-label="${esc(label)}"><div class="hw-component-heading"><span class="hw-component-name">GPU</span><span>${esc(label.replace(/^GPU\s*[·—–:]?\s*/i,''))}</span></div>${visual('gpu')}<p class="hw-part-detail">${esc(detail)}</p>${html}</section>`;
  }

  function pageClass(page) {
    if (page === null || page === undefined || !Number.isFinite(Number(page))) return 'hw-page-empty';
    return `hw-page-${((Number(page) % 6) + 6) % 6}`;
  }

  window.MemoryHardware = {cpu, ram, ssd, gpu, visual, pageClass};

  // The CSS illustration is a complete fallback. Real object imagery replaces
  // it once the optional atlas is loaded; missing images never leave a blank UI.
  const script = document.currentScript;
  if (typeof Image !== 'undefined' && script?.src) {
    const atlas = new Image();
    atlas.onload = () => { document.documentElement.dataset.hwPhotos = 'ready'; };
    atlas.src = new URL('../images/hardware/parts.png', script.src).href;
  }
})();
