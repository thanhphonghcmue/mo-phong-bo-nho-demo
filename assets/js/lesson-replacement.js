/* A read-only teaching view. Decisions and order come from the engine snapshot. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pageLabel = page => page === null || page === undefined ? 'Trống' : `Trang ${esc(page)}`;


  window.MemoryLessonViews ||= {};
  window.MemoryLessonViews.r = function (e, position = {}) {
    const state = e.state || {}, runtime = state.runtime || {}, before = e.beforeState?.runtime || runtime;
    const frames = runtime.fr || [], refs = state.refs || [], alg = state.alg || 'FIFO';
    const phase = runtime.phase || 'start', t = Number.isInteger(runtime.t) ? runtime.t : -1;
    const incoming = t >= 0 ? refs[t] : null;
    const isApply = phase === 'apply', isHit = isApply && e.kind === 'read', isVictim = phase === 'victim';
    const selected = isApply || isVictim ? runtime.slot : -1;
    const hasEmpty = frames.some(p => p === null), found = incoming !== null && frames.includes(incoming);
    const ended = isApply && t === refs.length - 1;
    const clock = alg === 'CLOCK';
    const currentPointer = Number.isInteger(runtime.ptr) ? runtime.ptr : 0;
    const seedCount = state.initial?.fr?.filter(p => p !== null).length || (phase === 'start' ? frames.filter(p => p !== null).length : 0);
    const stamp = value => value < 0 ? 'đã có từ đầu' : `lượt ${value + 1}`;
    const referenceStrip = `<div class="replacement-sequence" aria-label="Dãy trang được yêu cầu theo thứ tự"><span class="lesson-label">Dãy yêu cầu · đọc từ trái sang phải</span><div class="replacement-refs">${refs.map((p, i) => `<span class="replacement-ref ${i === t ? 'lesson-active' : i < runtime.done ? 'replacement-past' : ''}" ${i === t ? 'aria-current="step"' : ''}>${esc(p)}<small>lượt ${i + 1}</small></span>`).join('')}</div></div>`;

    const frameHtml = `<div class="lesson-card replacement-ram"><div class="replacement-zone-heading"><strong>RAM · ${frames.length} khung</strong><span class="lesson-muted">Một khung chỉ chứa một trang</span></div><div class="lesson-memory replacement-frames">${frames.map((page, i) => {
      const victim = isVictim && i === selected;
      const changed = isApply && i === selected;
      const pointer = clock && i === currentPointer;
      const justCleared = clock && phase === 'clear' && i === before.ptr;
      const badge = victim ? 'Chọn ra' : changed ? isHit ? 'Dùng ngay' : `${before.fr?.[i] ?? 'trống'} → ${page}` : pointer ? (['inspect', 'clear', 'victim'].includes(phase) ? 'Kim đang xét' : 'Kim trỏ tới') : justCleared ? 'Vừa hạ R' : '';
      return `<div class="lesson-tile replacement-frame ${victim ? 'lesson-bad' : changed ? 'lesson-good' : pointer && ['inspect','clear'].includes(phase) ? 'lesson-active' : ''}" data-lesson-frame="${i}" ${victim ? 'data-chosen="true"' : ''}><span class="lesson-label">Khung ${i}</span><strong>${pageLabel(page)}</strong>${clock ? `<span class="replacement-bit">${page === null ? 'Chưa có trang' : `R = ${runtime.bit?.[i] ?? 0}`}</span>` : ''}<span class="replacement-tile-status">${badge || '&nbsp;'}</span></div>`;
    }).join('')}</div></div>`;

    let proof = '', title = '', why = '', next = '', result = '';
    const resident = frames.flatMap((page, i) => page === null ? [] : [{page, frame:i, loaded:runtime.load?.[i] ?? -1, last:runtime.last?.[i] ?? -1}]);
    if (alg === 'FIFO' || alg === 'LRU') {
      const fifo = alg === 'FIFO';
      const ordered = resident.slice().sort((a,b) => (fifo ? a.loaded-b.loaded : a.last-b.last) || a.frame-b.frame);
      proof = `<div class="replacement-proof"><div class="replacement-order-heading"><strong>${fifo ? 'Thứ tự vào RAM' : 'Thứ tự lần dùng gần nhất'}</strong><span>${fifo ? 'Vào sớm nhất → Mới vào' : 'Lâu chưa dùng → Vừa dùng'}</span></div><div class="lesson-queue replacement-queue" aria-label="${fifo ? 'Thứ tự nạp trang, đầu hàng ra trước khi cần thay' : 'Thứ tự sử dụng, đầu hàng lâu chưa dùng nhất'}">${ordered.length ? ordered.map((p, rank) => `<div class="lesson-queue-item replacement-order-item ${isVictim && p.frame === selected ? 'lesson-bad' : ''}" data-page="${esc(p.page)}"><strong>${pageLabel(p.page)}</strong><small>${fifo ? 'Nạp' : 'Dùng'} ${stamp(fifo ? p.loaded : p.last)}${isVictim && p.frame === selected ? ' · <b class="replacement-chosen">chọn ra</b>' : ''}</small></div>${rank < ordered.length-1 ? '<span class="lesson-flow-arrow" aria-hidden="true">→</span>' : ''}`).join('') : '<p class="lesson-muted">Chưa có trang nào trong RAM.</p>'}</div></div>`;
    } else if (alg === 'OPT') {
      proof = `<div class="replacement-proof"><strong>Nhìn các lượt sau lượt này</strong><div class="replacement-future">${refs.slice(t + 1).length ? refs.slice(t + 1).map(p=>`<span>${esc(p)}</span>`).join('<span class="replacement-small-arrow" aria-hidden="true">→</span>') : '<span class="lesson-muted">Không còn lượt nào phía sau.</span>'}</div><div class="replacement-next-use">${resident.map(p => {
        const future = refs.indexOf(p.page, t+1);
        return `<div class="replacement-future-page ${isVictim && p.frame === selected ? 'lesson-bad' : ''}"><strong>${pageLabel(p.page)}</strong><span>${future < 0 ? 'Không dùng lại' : `Dùng lại ở lượt ${future+1}`}</span>${isVictim && p.frame === selected ? '<b>Chọn ra</b>' : ''}</div>`;
      }).join('')}</div><p class="lesson-muted">OPT phải biết trước dãy yêu cầu; đây là chuẩn so sánh lý thuyết.</p></div>`;
    } else {
      proof = `<div class="replacement-proof"><div class="replacement-order-heading"><strong>Kim → Khung ${currentPointer}</strong><span>Xét khung theo vòng, không xếp lại trang</span></div><div class="replacement-clock-rule"><span><b>R = 1</b> · hạ về 0, đi tiếp</span><span><b>R = 0</b> · chọn trang ở khung này</span></div><p class="lesson-muted">R được đặt thành 1 khi nạp hoặc dùng trang. Dùng lại trang không làm kim quay.</p></div>`;
    }

    if (phase === 'start') {
      title = seedCount ? 'RAM đang có các trang ban đầu' : 'RAM trống, bắt đầu từ trang đầu tiên';
      why = 'Mỗi lần CPU cần một trang, ta tìm nó trong RAM trước; chỉ chọn trang ra khi không còn khung trống.';
      next = `Yêu cầu Trang ${refs[0]}.`;
    } else if (phase === 'request') {
      title = `CPU đang cần Trang ${incoming}`;
      why = found ? `Trang ${incoming} đã có trong RAM: dùng ngay, không phải loại trang nào.` : hasEmpty ? `Chưa có Trang ${incoming}, nhưng RAM còn khung trống nên chưa cần chọn trang ra.` : `Chưa có Trang ${incoming} và RAM đã đầy; cần chọn một trang ra theo ${alg === 'CLOCK' ? 'Clock' : alg}.`;
      next = found ? 'Dùng trang đang có trong RAM.' : hasEmpty ? 'Nạp trang vào một khung trống.' : clock ? `Bắt đầu xét từ Khung ${currentPointer}.` : 'Xem quy tắc bên dưới để chọn trang.';
    } else if (phase === 'inspect') {
      title = `Kim xét Khung ${currentPointer}: R = ${runtime.bit?.[currentPointer] ?? 0}`;
      why = `Trang ${frames[currentPointer]} có R=1 nên được một cơ hội nữa; chưa chọn trang này ra.`;
      next = `Hạ R của Khung ${currentPointer} từ 1 xuống 0 rồi chuyển kim.`;
    } else if (phase === 'clear') {
      const old = before.ptr;
      title = `Hạ R ở Khung ${old}; kim sang Khung ${currentPointer}`;
      why = `Trang ${before.fr?.[old]} vẫn ở nguyên chỗ. Chỉ bit R đổi 1 → 0; RAM chưa thay trang.`;
      next = `Kiểm tra R của Khung ${currentPointer}.`;
    } else if (isVictim) {
      title = `Chọn Trang ${runtime.victim} ra khỏi RAM`;
      if (alg === 'FIFO') why = `Trang ${runtime.victim} đứng đầu hàng vì được nạp sớm nhất. FIFO xét lúc nạp, không xét lần dùng gần nhất.`;
      else if (alg === 'LRU') why = `Trang ${runtime.victim} có lần dùng gần nhất cũ nhất; các trang khác được dùng gần đây hơn.`;
      else if (alg === 'OPT') {
        const victimNext = refs.indexOf(runtime.victim,t+1);
        const nextValues = resident.map(p=>refs.indexOf(p.page,t+1));
        const tied = nextValues.filter(v=>v===victimNext).length > 1;
        why = victimNext < 0 ? `Trang ${runtime.victim} không còn được dùng trong phần dãy phía sau.${tied ? ' Khi bằng nhau, mô hình chọn khung có số nhỏ hơn.' : ''}` : `Trang ${runtime.victim} sẽ dùng lại ở lượt ${victimNext+1}, muộn nhất trong các trang ở RAM.${tied ? ' Khi bằng nhau, chọn khung có số nhỏ hơn.' : ''}`;
      } else why = `Kim gặp R=0 ở Khung ${selected}, nên dừng và chọn Trang ${runtime.victim}; chưa xét các khung phía sau.`;
      next = `Thay Trang ${runtime.victim} bằng Trang ${incoming} ở chính Khung ${selected}.`;
    } else if (isApply) {
      title = isHit ? `Dùng ngay Trang ${incoming} trong RAM` : `Trang ${incoming} vào Khung ${selected}`;
      why = isHit ? alg === 'FIFO' ? `Không nạp lại Trang ${incoming}; hàng FIFO giữ nguyên. “Ra trước” dựa vào lúc vào RAM, không dựa vào lần vừa dùng.` : alg === 'LRU' ? `Lần dùng Trang ${incoming} được cập nhật thành mới nhất; lần thay sau sẽ xét trang lâu chưa dùng nhất.` : clock ? `Đặt R của Trang ${incoming} thành 1; kim vẫn ở Khung ${currentPointer}.` : `Trang ${incoming} đã có sẵn: không cần thay trang.` : runtime.victim === null ? 'Dùng khung trống nên không có trang nào phải ra.' : `Chỉ Khung ${selected} đổi ${runtime.victim} → ${incoming}; các khung còn lại giữ nguyên.`;
      next = ended ? 'Đã xử lý hết dãy yêu cầu.' : `Tiếp theo, CPU cần Trang ${refs[t+1]}.`;
      if (ended) result = `Kết thúc: ${runtime.faults} lần trang chưa có trong RAM (lỗi trang), ${runtime.hits} lần có sẵn (hit).`;
    }

    const requestCard = `<div class="replacement-request ${phase==='request' ? 'lesson-active' : ''}"><span class="lesson-label">CPU cần</span><strong>${incoming === null ? 'Chưa yêu cầu' : pageLabel(incoming)}</strong><small>${t >= 0 ? `Lượt ${t+1}/${refs.length}` : 'Bấm Bước tiếp'}</small></div>`;
    return {
      html: `${referenceStrip}<div class="replacement-model">${requestCard}<span class="lesson-flow-arrow" aria-hidden="true">→</span>${frameHtml}</div>${proof}<p class="replacement-counts">Có sẵn: <b>${runtime.hits || 0}</b> · Chưa có, cần nạp: <b>${runtime.faults || 0}</b></p>`,
      title, why, next, result,
    };
  };
})();
