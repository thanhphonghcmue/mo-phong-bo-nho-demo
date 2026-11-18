/* Read-only views. Every displayed value comes from the current timeline snapshot. */
window.MemoryScenes = (() => {
  const esc = value => String(value ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon = name => `<svg class="lab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="assets/icons/lucide.svg#${name}"></use></svg>`;
  const badge = (text, tone = "") => `<span class="scene-badge ${tone}">${esc(text)}</span>`;
  const nodeIcons = {'x-processor':'cpu','x-tlb':'scan-line','x-pt-focus':'list-ordered','x-pa-unit':'network','x-data':'memory-stick','v-processor':'cpu','v-os':'network','v-store':'database','v-ram':'memory-stick','v-commit':'list-ordered'};
  const card = (id, n, title, body, extra = "") => `<section id="${id}" class="scene-node ${extra}"><h3><span>${icon(nodeIcons[id])}</span><small class="lab-node-step">${n.padStart(2,'0')}</small><b class="lab-node-name">${title}</b></h3>${body}</section>`;
  const edge = (on = false) => `<span class="scene-edge ${on ? "is-flowing" : ""}" aria-hidden="true"><svg viewBox="0 0 32 24"><path d="M2 12h25m-7-7 7 7-7 7"/></svg></span>`;
  function paint(root, target) {
    root.querySelectorAll('[data-processing], .teach-spotlight').forEach(el => {
      el.removeAttribute('data-processing'); el.classList.remove('teach-spotlight');
    });
    root.querySelectorAll('.teach-wire').forEach(el => el.remove());
    const el = root.querySelector('#' + target);
    if (el) el.dataset.processing = 'true';
    root.dataset.activeTarget = target;
  }
  function translation(s, e) {
    const p = s.plan, title = e.title.toLocaleLowerCase('vi');
    const split = s.st >= 1 && !p.err, looked = s.st >= 2 && !p.err;
    const ready = title.startsWith('tạo địa chỉ') || e.kind === 'read';
    const ptRead = !p.hit && s.st >= 3 && !p.err;
    const known = !p.blocked && !p.err && (ready || (looked && p.hit) || (ptRead && s.pt[p.p] !== null));
    const loading = e.kind === 'page-in', faultKnown = ptRead && p.fault;
    const frame = known ? p.f : null;
    let target = 'x-cpu';
    if (title.startsWith('tách')) target = 'x-mmu';
    else if (title.startsWith('tra tlb') || title.startsWith('điền')) target = 'x-tlb';
    else if (title.startsWith('tra bảng')) target = 'x-pt-focus';
    else if (loading || e.kind === 'trap') target = 'x-os';
    else if (ready) target = e.kind === 'read' ? `x-frame-${frame}` : 'x-pa';
    const cpu = `<div id="x-cpu"><small>CPU gửi địa chỉ logic</small><strong class="scene-number">${esc(p.addr)}</strong></div><div id="x-mmu" class="scene-split"><div><small>Trang p</small><b>${split ? p.p : '?'}</b></div><div><small>Độ lệch d</small><b>${split ? p.d : '?'}</b></div></div><p class="scene-math">${split ? `${p.addr} = ${p.p} × ${s.pageSize} + ${p.d}` : `Mỗi trang ${s.pageSize} byte`}</p>`;
    const cached = split ? s.tlb.find(t => t.page === p.p) : null;
    const filled = title.startsWith('điền') || ready;
    const tlb = `${badge(!looked ? 'Chờ tra' : p.hit ? 'HIT · có bản dịch' : filled && cached ? 'Đã lưu bản dịch' : 'MISS · chưa có', !looked ? '' : p.hit ? 'good' : 'warn')}<div class="scene-value">${cached && looked ? `Trang ${p.p} → khung ${cached.frame}` : split ? `Tìm trang ${p.p}` : 'Tìm theo số trang'}</div><p>${looked && p.hit ? 'Bỏ qua tra bảng trang. Vẫn phải đọc dữ liệu trong RAM.' : 'Miss chỉ là thiếu bản dịch trong TLB; chưa kết luận lỗi trang.'}</p><small>${s.tlb.length}/${s.tlbCapacity} mục đang dùng</small>`;
    const pte = p.err ? badge('Ngoài miền', 'bad') : `<div class="scene-value">${split ? `Trang ${p.p}` : 'Mục đang cần tra'}</div>${ptRead ? `<div class="scene-pte" data-present="${+(s.pt[p.p] !== null)}"><span>Present <b>${+(s.pt[p.p] !== null)}</b></span><span>Khung <b>${s.pt[p.p] ?? '—'}</b></span></div>` : `<p>${split ? 'Chờ tra bảng trang' : 'Chờ tách số trang'}</p>`}${looked && p.hit ? badge('Bỏ qua bước này', 'muted') : ptRead ? badge(s.pt[p.p] === null ? 'Chưa ở RAM · lỗi trang' : 'Đã có khung trong RAM', s.pt[p.p] === null ? 'warn' : 'good') : '<p>Present = 1: đã có trong RAM.<br>Present = 0: cần nạp trang.</p>'}`;
    const pa = `<strong class="scene-number">${ready ? p.phys : '?'}</strong><p class="scene-math">${ready ? `${p.f} × ${s.pageSize} + ${p.d} = ${p.phys}` : `f × ${s.pageSize} + d`}</p>${badge(split ? `Giữ nguyên d = ${p.d}` : 'Giữ nguyên độ lệch', 'purple')}<small>${ready ? `Byte ${p.phys} nằm trong khung ${p.f}` : 'Chỉ tính khi đã biết khung f'}</small>`;
    const ram = `<div class="scene-frames">${Array.from({length:s.frameCount}, (_, f) => {
      const pg = s.pt.indexOf(f);
      return `<div id="x-frame-${f}" data-frame="${f}" class="scene-frame ${s.other.includes(f) ? 'other' : ''}"><small>Khung ${f}</small><b>${pg >= 0 ? `Trang ${pg}` : s.other.includes(f) ? 'Khác' : 'Trống'}</b>${e.kind === 'read' && f === frame ? `<span class="scene-byte">Đọc byte +${p.d}</span>` : ''}</div>`;
    }).join('')}</div><small>${s.frameCount} khung · ${s.pageSize} byte/khung</small>${ready ? `<small>Vị trí byte trong khung ${frame}</small><div class="scene-bytes">${(s.pageSize <= 8 ? Array.from({length:s.pageSize},(_,i)=>i) : [p.d]).map(d=>`<span data-byte-offset="${d}" class="${e.kind==='read' && d===p.d ? 'is-read' : ''}">${d}</span>`).join('')}</div>` : ''}`;
    const stages = [card('x-processor','1','CPU / MMU',cpu), card('x-tlb','2','TLB',tlb), card('x-pt-focus','3','Bảng trang',pte,looked && p.hit ? 'scene-skipped' : ''), card('x-pa-unit','4','Địa chỉ vật lý',`<div id="x-pa">${pa}</div>`),card('x-data','5','Đọc RAM',ram)];
    const index = target === 'x-cpu' || target === 'x-mmu' ? 0 : target === 'x-tlb' ? 1 : target === 'x-pt-focus' || target === 'x-os' ? 2 : target === 'x-pa' ? 3 : 4;
    const os = faultKnown || p.err ? `<aside id="x-os" class="scene-os"><b>${p.err ? 'Dừng · lỗi địa chỉ' : p.blocked ? 'Dừng · RAM đã đầy' : loading || s.pt[p.p] !== null ? `OS đã nạp trang ${p.p} → khung ${p.newF}` : `OS cần nạp trang ${p.p}`}</b><span>${p.err || p.blocked ? 'Không tạo địa chỉ vật lý, không đọc RAM.' : 'Nhánh lỗi trang · chi tiết chọn khung và I/O ở Demo 4.'}</span></aside>` : '';
    return {target, html:`<div class="scene-pipeline scene-translation">${stages.map((c,i) => c + (i<4 ? edge(i === index-1 && !(p.hit && index === 3)) : '')).join('')}</div>${looked && p.hit ? '<div class="scene-shortcut">TLB HIT → địa chỉ vật lý → RAM · không tra bảng trang</div>' : ''}${os}`};
  }
  function demand(s,e) {
    const p=s.plan, title=e.title, started=title.startsWith('CPU'), denied=p.oob, hit=p.hit;
    const chosen=!started && !denied && (hit || title.includes('chọn victim') || ['page-in','page-out','translation','read','write'].includes(e.kind));
    const frame=chosen ? p.chosenFrame : null, pte=s.pt[s.page];
    const committed=title.startsWith('Cập nhật') || ['read','write'].includes(e.kind);
    const selected=chosen && p.victim !== null && !hit;
    const active = started ? 'v-cpu' : e.kind==='trap' ? 'v-os' : title.startsWith('Định vị') || e.kind==='page-out' ? 'v-store' : title.includes('chọn victim') ? 'v-os' : e.kind==='page-in' ? `v-frame-${frame}` : title.startsWith('Cập nhật') || e.kind==='translation' ? 'v-pt-focus' : ['read','write'].includes(e.kind) ? 'v-cpu' : 'v-os';
    const cpu=`<div id="v-cpu"><small>CPU muốn ${s.operation==='write'?'ghi':'đọc'}</small><strong class="scene-number">Trang ${s.page}</strong></div><div id="v-mmu"><small>MMU kiểm tra quyền và hiện diện</small>${badge(started ? 'Trang đã ở RAM chưa?' : denied ? 'Từ chối truy cập' : hit ? 'Có · đọc ngay từ RAM' : 'Chưa · báo lỗi trang', started ? '' : denied ? 'bad' : hit ? 'good' : 'warn')}</div>`;
    const os=`<div class="scene-symbol" aria-hidden="true">OS</div><b>${denied && !started ? 'Chặn truy cập' : hit && !started ? 'Bỏ qua OS' : selected ? `Chọn khung ${frame}` : 'Xử lý lỗi trang'}</b><p>${selected ? `Trang ${p.victim} nhường chỗ theo ${s.policy}.` : 'Chọn khung trống; nếu hết, chọn trang thay thế.'}</p>${selected ? badge(e.kind==='page-out' ? 'Đã ghi lại · Dirty 1 → 0' : title.includes('chọn victim') ? s.pt[p.victim]?.dirty ? 'Dirty = 1 · phải ghi lại' : 'Sạch · bỏ qua ghi đĩa' : 'Trang cũ đã được xử lý', e.kind==='page-out' || s.pt[p.victim]?.dirty ? 'warn' : '') : ''}`;
    const disk=`<div class="scene-symbol disk-symbol" aria-hidden="true">SSD</div><b>${e.kind==='page-out' ? `Ghi lại trang ${p.victim}` : e.kind==='page-in' ? `Đọc trang ${s.page}` : 'Bản lưu trên đĩa'}</b><p class="scene-io" data-direction="${e.kind==='page-out' ? 'out' : e.kind==='page-in' ? 'in' : 'none'}">${e.kind==='page-out' ? `RAM · khung ${frame} → Đĩa` : e.kind==='page-in' ? `Đĩa → RAM · khung ${frame}` : 'Chưa truyền dữ liệu ở bước này'}</p>`;
    const ram=`<div class="scene-frames demand-frames">${s.ram.map((pg,f)=>`<div id="v-frame-${f}" data-frame="${f}" class="scene-frame ${selected && f===frame && pg!==s.page ? 'scene-replacing' : ''}"><small>Khung ${f}${chosen && f===frame ? ' · đã chọn' : ''}</small><b>${pg===null ? 'Trống' : `Trang ${pg}`}</b>${pg!==null ? `<small>Dirty ${+!!s.pt[pg]?.dirty}${s.policy==='CLOCK'?` · R=${s.replacement.bit[f]}`:''}</small>`:''}</div>`).join('')}</div>`;
    const pt=`<div id="v-pt-focus"><div class="scene-value">Trang ${s.page}</div>${pte ? `<div class="scene-pte" data-present="${+pte.present}"><span>Present <b>${+pte.present}</b></span><span>Khung <b>${pte.frame ?? '—'}</b></span></div>` : badge('Không có mục hợp lệ','bad')}</div><p>${denied && !started ? 'Dừng. Không nạp trang.' : !started && hit ? 'Bản dịch đã có. Không I/O.' : committed ? 'Bảng trang đã sẵn sàng.' : 'Chỉ cập nhật sau khi nạp xong.'}</p>${['read','write'].includes(e.kind) ? badge(hit ? 'CPU đã truy cập RAM' : 'Chạy lại lệnh · thành công','good') : ''}`;
    const nodes=[card('v-processor','1','CPU / MMU',cpu),card('v-os','2','Hệ điều hành',os),card('v-store','3','Ổ đĩa',disk),card('v-ram','4','RAM',ram),card('v-commit','5','Bảng trang / tiếp tục',pt)];
    const ix=active==='v-cpu'?0:active==='v-os'?1:active==='v-store'?2:active==='v-pt-focus'?4:3;
    const branch=started ? 'Kiểm tra: trang có trong RAM hay chưa?' : denied ? 'Không có quyền → OS chặn · không đọc đĩa, không đọc RAM' : hit ? `CÓ → Khung ${p.chosenFrame} trong RAM → CPU ${s.operation==='write'?'ghi':'đọc'} · bỏ qua OS và ổ đĩa` : e.kind==='page-out' ? `CHƯA CÓ → ghi lại trang bẩn ${p.victim} trước khi nạp trang ${s.page}` : `CHƯA CÓ → lỗi trang → ${selected?'chọn khung → ':''}nạp từ đĩa → cập nhật bảng trang → chạy lại lệnh`;
    return {target:active,html:`${s.sequence ? `<div class="scene-sequence" aria-label="Chuỗi truy cập">${s.sequence.map((pg,i)=>`<span ${i===s.seqIndex?'aria-current="step"':''}>${pg}</span>`).join('')}<small>Lượt ${s.seqIndex+1}/${s.sequence.length}</small></div>`:''}<div class="scene-branch ${!started && hit?'good':!started && denied?'bad':''}">${esc(branch)}</div><div class="scene-pipeline scene-demand ${!started && hit?'is-hit':''}">${nodes.map((n,i)=>n+(i<4?edge(i===ix-1 && !hit && e.kind!=='page-out'):'')).join('')}</div>`};
  }
  function replacement(s,e) {
    const r=s.runtime, decision=r.phase==='victim', hit=r.phase==='apply' && e.kind==='read';
    const name=s.alg==='FIFO'?'Thứ tự nạp · cũ → mới':s.alg==='LRU'?'Lần dùng · lâu → gần':s.alg==='OPT'?'Lần dùng tiếp theo':'Kim Clock và bit R';
    const order=s.alg==='FIFO' ? [...r.fr].filter(p=>p!==null).sort((a,b)=>r.load[r.fr.indexOf(a)]-r.load[r.fr.indexOf(b)]) : s.alg==='LRU' ? [...r.fr].filter(p=>p!==null).sort((a,b)=>r.last[r.fr.indexOf(a)]-r.last[r.fr.indexOf(b)]) : [];
    let body='', note='';
    if(s.alg==='FIFO' || s.alg==='LRU') {
      body=`<div class="scene-order">${order.map((p,i)=>`${i?' <span aria-hidden="true">→</span> ':''}<span class="scene-token ${decision && p===r.victim?'chosen':''}">Trang ${p}</span>`).join('') || '<span>RAM đang trống</span>'}</div>`;
      note=decision ? `Chọn trang ${r.victim}: ${s.alg==='FIFO'?'được nạp sớm nhất':'lâu chưa dùng nhất'}. Chưa thay nội dung RAM.` : hit ? s.alg==='FIFO'?'HIT: hàng đợi nạp giữ nguyên.':'HIT: trang vừa dùng chuyển về cuối thứ tự sử dụng.' : s.alg==='FIFO'?'Chỉ thay thứ tự khi nạp trang mới. Khung RAM giữ nguyên vị trí.':'Cập nhật lần dùng sau mỗi truy cập, kể cả HIT.';
    } else if(s.alg==='OPT') {
      body=decision ? `<div class="scene-order">${r.fr.map(p=>{const next=s.refs.indexOf(p,r.t+1);return `<span class="scene-token ${p===r.victim?'chosen':''}">Trang ${p}<small>${next<0?'Không dùng lại':`Dùng ở lượt ${next+1}`}</small></span>`;}).join('')}</div>` : '<p>Chỉ xét phần chuỗi phía sau khi RAM đầy và cần chọn trang thay.</p>';
      note=decision ? `Chọn trang ${r.victim}: lần dùng tiếp theo xa nhất. OPT là chuẩn lý thuyết vì biết trước tương lai.` : 'Chưa đưa ra quyết định thay trang.';
    } else {
      body=`<div class="scene-order">${badge(`Kim → khung ${r.ptr} · R=${r.bit[r.ptr]}`, 'purple')}${decision ? `<span class="scene-token chosen">Trang ${r.victim} nhường chỗ</span>` : ''}</div>`;
      note=r.phase==='inspect'?`Đang xét khung ${r.ptr}: R=1 → cho cơ hội thứ hai.`:r.phase==='clear'?`Khung ${e.beforeState.runtime.ptr}: R 1 → 0; kim chuyển tới khung ${r.ptr}. Chưa thay trang.`:decision?`Khung ${r.slot} có R=0 → chọn trang ${r.victim}; chưa nạp trang mới.`:hit?`HIT: đặt R=1. Kim giữ tại khung ${r.ptr}.`:`Kim ở khung ${r.ptr}. Chỉ dịch kim khi quét hoặc nạp trang mới.`;
    }
    return `<div class="scene-proof-heading"><b>${name}</b>${badge(decision?'Đang chọn trang':hit?'HIT · giữ trang':r.phase==='apply'?'Đã nạp trang':'Theo dõi trạng thái',decision?'warn':hit?'good':'')}</div>${body}<p class="scene-proof-note">${esc(note)}</p>`;
  }
  return {translation,demand,replacement,paint,icon};
})();
