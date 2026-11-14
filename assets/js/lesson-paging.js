/* Simple teaching scenes. These functions only read the current engine snapshot. */
(function () {
  "use strict";
  const views = window.MemoryLessonViews = window.MemoryLessonViews || {};
  const esc = value => String(value ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const pageClass = page => {
    if (window.MemoryHardware?.pageClass) return window.MemoryHardware.pageClass(page);
    if (page === null || page === undefined || !Number.isFinite(Number(page))) return "hw-page-empty";
    return `hw-page-${((Number(page) % 6) + 6) % 6}`;
  };
  const hardware = () => window.MemoryHardware || {
    cpu: ({label,value,detail,active,html}) => `<div class="paging-hardware-fallback ${active ? "is-active" : ""}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small>${html || ""}</div>`,
    ram: ({label,detail,html}) => `<div class="paging-hardware-fallback"><span>${esc(label)}</span><small>${esc(detail)}</small>${html || ""}</div>`,
    ssd: ({label,page,detail,html}) => `<div class="paging-hardware-fallback"><span>${esc(label)}</span><strong>${page == null ? "SSD" : `Trang ${esc(page)}`}</strong><small>${esc(detail)}</small>${html || ""}</div>`,
  };
  function bus(text, direction = "right", active = false) {
    return `<div class="paging-hardware-bus" aria-hidden="true"></div>`;
  }
  function bytes(size, offset, read) {
    if (!Number.isInteger(size) || size < 1) return "";
    if (size <= 12) return `<div class="paging-byte-row" aria-label="Các vị trí byte trong khung">${Array.from({length:size}, (_, i) => `<span data-flow-node="byte-${i}" class="paging-byte ${read && i === offset ? "paging-byte-selected" : ""}" ${read && i === offset ? 'aria-current="true"' : ""}>${i}</span>`).join("")}</div>`;
    return `<p class="lesson-muted">Các vị trí: 0 … ${esc(size - 1)}${read ? ` · đọc tại +${esc(offset)}` : ""}</p>`;
  }

  views.x = function (e) {
    const s = e.state || {}, p = s.plan || {}, title = e.title || "", lower = title.toLocaleLowerCase("vi"), size = s.pageSize || 4096;
    const request = lower.startsWith("cpu"), trap = e.kind === "trap", split = !request && !p.err;
    const tlbLookup = lower.startsWith("tra tlb"), tableLookup = lower.startsWith("tra bảng"), cache = lower.startsWith("điền");
    const address = lower.startsWith("tạo địa chỉ"), read = e.kind === "read", load = e.kind === "page-in";
    const hasLooked = !request && !lower.startsWith("tách") && !p.err;
    const knownFrame = !p.err && (address || read || cache || load || (p.hit && hasLooked) || (tableLookup && s.pt?.[p.p] !== null));
    const ready = address || read;
    const tableText = p.hit && hasLooked ? "Bỏ qua bảng trang" : tableLookup
      ? s.pt?.[p.p] == null ? `Trang ${p.p} chưa ở RAM` : `Trang ${p.p} → khung ${s.pt[p.p]}`
      : cache || ready ? "Đã tìm được bản dịch" : load ? "OS vừa nạp trang" : "Chưa tra bảng trang";
    let step = request ? 0 : lower.startsWith("tách") ? 0 : ready ? 2 : 1;
    let heading, why, next;
    if (p.err) {
      heading = request ? `Chương trình cần byte ${p.addr}` : "Dừng: địa chỉ nằm ngoài vùng cho phép";
      why = request ? "CPU gửi một địa chỉ cần đọc. Chưa có thao tác đọc RAM." : `Địa chỉ phải là số nguyên từ 0 đến ${(s.pt?.length || 0)*size - 1}; không nạp trang để sửa một địa chỉ sai.`;
      next = request ? "MMU kiểm tra địa chỉ trước khi vào RAM." : "Sửa địa chỉ rồi bắt đầu lại.";
    } else if (request) {
      heading = `Cần tìm byte ${p.addr}`;
      why = "Đây là địa chỉ trong chương trình, chưa phải địa chỉ thật trong RAM.";
      next = `Chia thành các trang, mỗi trang ${size} byte.`;
    } else if (lower.startsWith("tách")) {
      heading = `Byte ${p.addr} nằm ở trang ${p.p}, vị trí +${p.d}`;
      why = `${p.addr} ÷ ${size} = ${p.p}, dư ${p.d}. Số dư cho biết vị trí bên trong trang.`;
      next = `Tìm xem trang ${p.p} đang ở khung RAM nào.`;
    } else if (tlbLookup) {
      heading = p.hit ? "Sổ nhớ nhanh đã có đường đi" : "Sổ nhớ nhanh chưa có đường đi";
      why = p.hit ? `TLB nhớ trang ${p.p} ở khung ${p.f}; không cần tra bảng trang lần nữa.` : "TLB miss chỉ là chưa nhớ bản dịch. Chưa thể kết luận trang có thiếu trong RAM hay không.";
      next = p.hit ? "Giữ nguyên vị trí trong trang để tính địa chỉ thật." : "Mở bảng trang trong RAM để tìm khung.";
    } else if (tableLookup) {
      heading = p.fault ? `Trang ${p.p} chưa nằm trong RAM` : `Bảng trang chỉ đến khung ${p.f}`;
      why = p.fault ? "Trang hợp lệ nhưng chưa được nạp: cần hệ điều hành giúp đỡ." : `Dòng trang ${p.p} ghi khung ${p.f}. Đây là nơi chứa trang, không phải chính dữ liệu cần đọc.`;
      next = p.blocked ? "RAM không còn chỗ trống; cần cơ chế thay trang ở demo 4." : p.fault ? "OS lấy trang từ đĩa và đưa vào khung trống." : "Ghi nhớ đường đi trong TLB cho lần sau.";
    } else if (load) {
      heading = `Đưa trang ${p.p} vào khung ${p.newF}`;
      why = "OS nạp trang hợp lệ từ đĩa rồi cập nhật bảng trang. Demo này gộp hai việc trong một bước; Demo 4 tách riêng. CPU vẫn đọc dữ liệu từ RAM.";
      next = "Lưu bản dịch trong TLB, rồi tính địa chỉ thật.";
    } else if (cache) {
      heading = "Nhớ đường đi cho lần sau";
      why = `TLB vừa lưu trang ${p.p} → khung ${p.f}. Thay một bản ghi TLB không phải thay trang RAM.`;
      next = `Lấy khung ${p.f}, giữ nguyên vị trí +${p.d}.`;
    } else if (address) {
      heading = `Địa chỉ thật là ${p.phys}`;
      why = `Khung ${p.f} bắt đầu ở ${p.f} × ${size} = ${p.f*size}. Đi thêm ${p.d} byte: ${p.phys}.`;
      next = `Đọc đúng byte +${p.d} trong khung ${p.f}.`;
    } else if (read) {
      heading = `Đã đọc đúng byte ${p.phys} trong RAM`;
      why = `Chỉ số trang đổi thành số khung; vị trí +${p.d} bên trong vẫn giữ nguyên.`;
      next = "Thử lại cùng địa chỉ để thấy TLB nhớ đường đi.";
    } else {
      heading = p.blocked ? "RAM đầy: chưa thể đọc byte này" : title;
      why = p.blocked ? "Không có khung trống nên demo không tự tạo địa chỉ vật lý. Phải chọn trang nhường chỗ trước." : e.change;
      next = e.next;
    }
    const hw=hardware();
    const cpuDetail=split ? `Trang ${p.p} · vị trí +${p.d}` : "Địa chỉ logic · chưa phải vị trí trong RAM";
    const requestBody=split ? `<div class="paging-address-parts"><span>Trang <b>${esc(p.p)}</b></span><span>Vị trí <b>+${esc(p.d)}</b></span></div><p class="paging-formula">${esc(p.addr)} = ${esc(p.p)} × ${esc(size)} + ${esc(p.d)}</p>` : '<p class="paging-placeholder">Chờ tách trang và vị trí</p>';
    const cacheText=p.err ? "Địa chỉ bị từ chối" : !hasLooked ? "Chưa tra" : p.hit ? `Có: trang ${p.p} → khung ${p.f}` : cache || ready ? `Đã nhớ: ${p.p} → ${p.f}` : "Chưa nhớ · cần xem bảng trang";
    const lookupBody=`<div data-flow-node="tlb" class="paging-cache-tag ${tlbLookup || cache ? "is-active" : ""}"><span>TLB · sổ nhớ nhanh trong CPU</span><b>${esc(cacheText)}</b></div>`;
    const ramChip=p.err ? '<div class="paging-memory-chip paging-no-access"><span>Truy cập bị chặn</span><strong>Không đọc RAM</strong></div>' : knownFrame ? `<div data-flow-node="frame" class="paging-memory-chip ${pageClass(p.p)} ${read ? "paging-chip-read" : ""}"><span class="paging-chip-index">Khung ${esc(p.f)} · Frame</span><strong class="paging-page-tag">Trang ${esc(p.p)}</strong>${bytes(size,p.d,read)}<small>${read ? "CPU đang đọc đúng byte" : load ? "Vừa nạp trang" : "Đã tìm được khung; chưa đọc byte"}</small></div>` : '<div data-flow-node="frame" class="paging-memory-chip paging-chip-pending"><span>Chưa biết khung nào</span><strong>?</strong><small>Chưa có địa chỉ vật lý.</small></div>';
    const ramBody=hw.ram({label:"RAM · bộ nhớ làm việc", detail:`Mô phỏng trang/khung ${size} byte`, active:false, html:`<div class="paging-frames paging-one-frame">${ramChip}</div>`});
    const table=`<div data-flow-node="pte" class="paging-table-label ${tableLookup ? "is-active" : ""} ${p.hit && hasLooked ? "paging-bypassed" : ""}"><span>Bảng trang · sổ chỉ đường trong RAM</span><b>${p.err ? "Không dùng địa chỉ bị từ chối" : esc(tableText)}</b></div>`;
    const addressResult=ready ? `<p data-flow-node="address" class="paging-address-result"><span>Địa chỉ thật</span><b>${esc(p.f)} × ${esc(size)} + ${esc(p.d)} = ${esc(p.phys)}</b></p>` : '<p class="paging-address-result paging-address-wait">Chưa tạo địa chỉ vật lý</p>';
    const pageIn=load ? `<div class="paging-physical-io"><div data-flow-node="storage">${hw.ssd({label:"SSD · bản lưu trang",page:p.p,detail:"OS lấy trang hợp lệ từ bộ nhớ phụ",active:true})}</div>${bus(`Nạp Trang ${p.p} → Khung ${p.newF}`,"right",true)}</div>` : "";

    const cpuNode='.paging-processor-area .hw-cpu';
    const focus=trap ? {selector:cpuNode,label:'Chặn địa chỉ không hợp lệ',tone:'red'}
      : load ? {selector:'[data-flow-node="frame"]',label:`Nạp Trang ${p.p} vào Khung ${p.newF}`,tone:'green'}
      : read ? {selector:size<=12?`[data-flow-node="byte-${p.d}"]`:'[data-flow-node="frame"]',label:`Đọc byte +${p.d} trong Khung ${p.f}`,tone:'green'}
      : address ? {selector:'[data-flow-node="address"]',label:`Tính địa chỉ vật lý ${p.phys}`,tone:'blue'}
      : tableLookup ? {selector:'[data-flow-node="pte"]',label:`Tra bảng trang để tìm Trang ${p.p}`,tone:'violet'}
      : tlbLookup || cache ? {selector:'[data-flow-node="tlb"]',label:cache?'Lưu bản dịch vào TLB':p.hit?'TLB đã nhớ đúng khung':'Tra bản dịch trong TLB',tone:'blue'}
      : {selector:cpuNode,label:request?`CPU yêu cầu byte ${p.addr}`:`Tách trang ${p.p} và vị trí +${p.d}`,tone:'amber'};
    const side={mobileFromPort:'left',mobileToPort:'left'};
    const flows=trap||request||lower.startsWith('tách')?[]
      : load ? [{from:'[data-flow-node="storage"] .hw-ssd .hw-visual--ssd',to:'[data-flow-node="frame"]',label:'Nạp dữ liệu SSD → RAM',tone:'green',kind:'data',...side}]
      : read ? [{from:'[data-flow-node="frame"]',to:cpuNode+' .hw-visual--cpu',label:'RAM trả dữ liệu cho CPU',tone:'green',kind:'data',...side}]
      : address ? [{from:'[data-flow-node="tlb"]',to:'[data-flow-node="address"]',label:'Khung × cỡ trang + vị trí',tone:'blue',kind:'lookup',...side}]
      : tableLookup ? [{from:'[data-flow-node="tlb"]',to:'[data-flow-node="pte"]',label:'TLB miss → tra bảng trang',tone:'violet',kind:'lookup',...side}]
      : cache ? [{from:'[data-flow-node="pte"]',to:'[data-flow-node="tlb"]',label:'Ghi nhớ bản dịch',tone:'blue',kind:'lookup',...side}]
      : tlbLookup ? [{from:cpuNode+' .hw-visual--cpu',to:'[data-flow-node="tlb"]',label:'Tra cứu số khung',tone:'blue',kind:'lookup'}] : [];
    return {
      title: heading, why, next,focus,flows,
      html: `<div class="paging-scene paging-hardware-scene ${trap ? "paging-trap" : ""}"><div class="paging-hardware-bench"><div class="paging-processor-area">${hw.cpu({label:"CPU / MMU",value:`Byte ${p.addr}`,detail:cpuDetail,active:false,html:requestBody})}${lookupBody}</div>${bus(trap ? "Truy cập bị chặn" : read ? "Dữ liệu từ RAM" : "Địa chỉ cần tìm",read ? "left" : trap ? "pause" : "right",read || address)}<div class="paging-ram-area">${ramBody}${table}${addressResult}</div></div>${pageIn}<p class="paging-key">Trang = phần của chương trình; khung = vùng chứa một trang trong RAM. Ô màu là vùng nhớ được phóng to, không phải từng chip RAM.</p></div>`,
      result: read ? `LA ${p.addr} → trang ${p.p}, vị trí ${p.d} → khung ${p.f} → PA ${p.phys}` : undefined,
    };
  };

  views.v = function (e) {
    const s=e.state || {}, p=s.plan || {}, title=e.title || "", lower=title.toLocaleLowerCase("vi"), page=s.page;
    const request=lower.startsWith("cpu"), denied=lower.startsWith("từ chối"), fault=e.status === "page fault";
    const hit=p.hit && !request, locate=lower.startsWith("định vị"), choose=lower.includes("chọn victim"), writeBack=e.kind === "page-out", load=e.kind === "page-in";
    const update=lower.startsWith("cập nhật"), retry=lower.startsWith("khởi động"), read=e.kind === "read" || e.kind === "write";
    const selected=!request && !fault && !locate && !denied && (hit || choose || writeBack || load || update || retry);
    const frame=selected ? p.chosenFrame : null, victim=selected ? p.victim : null;
    const oldRam=e.beforeState?.ram || s.ram || [], oldPage=frame !== null ? oldRam[frame] : null;
    const inRam=s.pt?.[page]?.present;
    let heading,why,next,stage=0;
    if(request) {
      heading=`CPU cần trang ${page}`;
      why="Trước khi đọc dữ liệu, MMU phải kiểm tra trang đã có trong RAM hay chưa.";
      next="Nếu chưa có, CPU dừng lệnh và nhờ hệ điều hành nạp trang.";
    } else if(denied) {
      stage=1;heading="Dừng: không được phép truy cập trang này";
      why="Trang ngoài không gian hợp lệ hoặc thiếu quyền. Đây không phải một trang hợp lệ cần nạp thêm.";
      next="Không đọc đĩa, không nạp RAM. Hãy chọn yêu cầu hợp lệ.";
    } else if(fault) {
      stage=1;heading=`Trang ${page} còn ở đĩa: CPU phải chờ`;
      why="Trang được phép dùng nhưng chưa có trong RAM. Đây là Page Fault; OS sẽ xử lý, không phải lỗi gõ sai.";
      next=`OS tìm bản lưu trang ${page} trên đĩa.`;
    } else if(locate) {
      stage=2;heading=`Đã tìm thấy trang ${page} trên đĩa`;
      why="Đĩa giữ bản lưu; CPU không đọc dữ liệu trực tiếp từ đó. OS phải đưa trang vào một khung RAM.";
      next=s.freeFrames?.length ? "Dùng một khung đang trống." : `RAM đã đầy; chọn trang nhường chỗ theo ${s.policy}.`;
    } else if(choose) {
      stage=2;heading=`Trang ${victim} nhường khung ${frame}`;
      why=s.policy === "FIFO" ? `FIFO chọn trang ${victim} vì nó được nạp sớm nhất trong các trang còn ở RAM.` : s.policy === "LRU" ? `LRU chọn trang ${victim} vì nó lâu nhất chưa được dùng.` : `Clock chọn trang ${victim} vì bit R=0 tại vị trí kim sau khi cho cơ hội thứ hai.`;
      next=s.pt?.[victim]?.dirty ? "Trang cũ đã sửa: ghi lại trước khi dùng lại khung." : "Trang cũ sạch: nạp trang mới vào khung đã chọn.";
    } else if(writeBack) {
      stage=2;heading=`Lưu lại trang ${victim} đã bị sửa`;
      why=`Trang ${victim} trước đó có D=1. OS vừa ghi bản đã sửa về SSD nên D chuyển 1→0. RAM vẫn giữ trang cũ; bước nạp tiếp theo mới đổi dữ liệu trong khung.`;
      next=`Nạp trang ${page} vào khung ${frame}.`;
    } else if(load) {
      stage=2;heading=`Nạp trang ${page} vào khung ${frame}`;
      why=oldPage == null ? `Khung ${frame} đang trống, nên chưa phải đuổi trang nào.` : `Khung ${frame} được chọn để dùng lại: trang ${oldPage} ra, trang ${page} vào.`;
      next="Dữ liệu đã đến RAM. OS còn phải sửa bảng trang để CPU tìm được nó.";
    } else if(update) {
      stage=2;heading=`Sổ chỉ đường vừa ghi: trang ${page} ở khung ${frame}`;
      why="Chỉ sau khi nạp xong, OS mới đánh dấu trang có mặt và ghi số khung vào bảng trang.";
      next="CPU chạy lại đúng lệnh đang chờ; không tính thêm một lỗi trang.";
    } else if(retry) {
      stage=3;heading=`CPU tiếp tục: trang ${page} đã ở RAM`;
      why="CPU chạy lại lệnh cũ và dùng dữ liệu trong RAM. Lần thử lại này không phải một yêu cầu mới.";
      next="Chuyển đến yêu cầu tiếp theo để xem trang có sẵn được dùng ngay.";
    } else if(hit && !read) {
      stage=2;heading=`Có sẵn trang ${page}: dùng ngay`;
      why=`Bảng trang cho biết trang ${page} đang ở khung ${frame}. Không cần nạp từ đĩa, không có Page Fault mới.`;
      next="CPU đọc hoặc ghi dữ liệu trong khung RAM này.";
    } else if(read) {
      stage=3;heading=`Đã ${s.operation === "write" ? "ghi" : "đọc"} trang ${page} trong RAM`;
      why="Trang đã ở RAM, nên lượt này không phải đọc từ đĩa hay thay một trang khác.";
      next="Thử một trang khác hoặc lùi lại để xem thứ tự xử lý.";
    } else {
      heading=title;why=e.change;next=e.next;
    }
    const detailed=(s.sequence?.length||0)>1 && ((s.writes||0)>0 || (s.pt||[]).some(entry=>entry.dirty));
    const hw=hardware();
    const frames=(s.ram || []).map((contents,f) => `<div class="paging-memory-chip ${pageClass(contents)} ${selected && frame===f ? choose ? "paging-chip-victim" : load || read || retry || hit ? "paging-chip-read" : "" : ""}" data-paging-frame="${f}" data-flow-node="frame-${f}"><span class="paging-chip-index">Khung ${f}</span><strong class="${contents === null ? "paging-empty-page" : "paging-page-tag"}">${contents === null ? "Trống" : `Trang ${esc(contents)}`}</strong>${detailed && contents!==null ? `<span class="paging-dirty-bit" data-dirty="${s.pt[contents]?.dirty===true}">D=${s.pt[contents]?.dirty?1:0} · ${s.pt[contents]?.dirty?"đã sửa":"sạch"}</span>`:""}${selected && frame===f ? `<small>${choose ? "Sẽ nhường chỗ" : load ? "Vừa nạp vào" : read || retry ? "CPU đang dùng" : writeBack ? "Vừa ghi lại · D: 1 → 0" : update ? "Đã nạp · đang ghi bảng trang" : "Đã chọn"}</small>` : '<small>Vùng dữ liệu mô phỏng</small>'}</div>`).join("");
    const visibleTable=!request && !denied;
    const currentTable=visibleTable ? `<div data-flow-node="pte" class="paging-table-label paging-pte"><span>Bảng trang · sổ chỉ đường</span><b>Trang ${esc(page)} ${inRam ? `→ khung ${esc(s.pt[page].frame)}` : load ? "→ chưa ghi số khung" : "→ chưa có trong RAM"}</b>${load && !inRam ? '<small>Dữ liệu đã vào RAM; OS chưa cập nhật bản ghi này.</small>' : ""}</div>` : `<div data-flow-node="pte" class="paging-table-label paging-pte"><span>Bảng trang · sổ chỉ đường</span><b>${denied ? "Không có quyền dùng trang" : "Chờ MMU kiểm tra"}</b></div>`;
    const ledgerPages=[...new Set([...(s.ram||[]).filter(contents=>contents!==null),page,...(selected&&victim!==null?[victim]:[])])].sort((a,b)=>a-b);
    const ledger=detailed?`<div class="paging-state-ledger" data-flow-node="pte-ledger"><table><caption>Bản ghi của các trang đang liên quan</caption><thead><tr><th scope="col">Trang</th><th scope="col">Ở RAM</th><th scope="col">Khung</th><th scope="col">Đã sửa</th></tr></thead><tbody>${ledgerPages.map(p=>{
      const entry=s.pt[p];
      return `<tr data-pte-page="${p}" ${p===page?'aria-current="true"':''}><th scope="row">${p}</th><td>${entry?.present?'Có':'Chưa'}</td><td>${entry?.present?entry.frame:'—'}</td><td>${entry?.dirty?'D=1':'D=0'}</td></tr>`;
    }).join('')}</tbody></table></div>`:'';
    // Keep the current-entry anchor and the broader ledger separate: updating
    // one PTE does not update every row at once.
    const table=currentTable+ledger;
    const ioCounts=detailed?`<p class="paging-io-counts" data-flow-node="io-counts" aria-label="Các bộ đếm của ví dụ"><span>Có sẵn: <b>${s.hits||0}</b></span><span>Lỗi trang: <b>${s.faults||0}</b></span><span>Nạp từ SSD: <b>${s.reads||0}</b></span><span>Ghi lại SSD: <b>${s.writes||0}</b></span></p>`:'';
    const sequence=s.sequence || [page], seqIndex=s.seqIndex || 0;
    const sequenceHtml=sequence.length>1 ? `<div class="paging-reference-strip" aria-label="Thứ tự yêu cầu">${sequence.map((p,i)=>`<span class="${pageClass(p)}" ${i===seqIndex ? 'aria-current="step"' : ""}>Trang ${esc(p)}</span>`).join('<i aria-hidden="true">→</i>')}</div>` : "";
    const transfer=load ? `<div class="paging-transfer"><span>${oldPage == null ? "Khung trống" : `Trang ${esc(oldPage)}`}</span><b aria-hidden="true">→</b><strong>Trang ${esc(page)}</strong><span>tại khung ${esc(frame)}</span></div>` : "";
    const cpuState=denied ? "Truy cập bị chặn" : read || retry ? "Tiếp tục thực hiện lệnh" : hit ? "Đã tìm thấy trong RAM" : request ? "Muốn đọc dữ liệu" : "CPU đang chờ OS";
    const cpu=hw.cpu({label:"CPU / MMU",value:`Trang ${page}`,detail:cpuState,active:false});
    const fifoProof=choose && s.policy === "FIFO" ? `<p class="paging-fifo-proof"><b>Nạp trước → nạp sau:</b> ${(s.fifo || []).map(p=>`Trang ${esc(p)}`).join(" → ")}</p>` : "";
    const direct=hit || retry || read;
    const ram=hw.ram({label:"Thanh RAM · bộ nhớ làm việc",detail:`Mô hình ${s.ram?.length || 0} khung trang`,active:false,html:`<div class="paging-frames">${frames}</div>`});
    const ramArea=`<div class="paging-ram-area">${ram}${table}${fifoProof}</div>`;
    const ordinaryDirection=s.operation === "write" ? "right" : "left";
    const busText=direct ? s.operation === "write" ? "CPU ghi vào RAM" : "CPU dùng dữ liệu RAM" : denied ? "Truy cập bị chặn" : "CPU đang chờ";
    const routeHtml=`<div class="paging-hardware-bench ${direct ? "demand-hit-row" : "demand-main-row"}"><div class="paging-processor-area">${cpu}</div>${bus(busText,direct ? ordinaryDirection : "pause",direct)}${ramArea}</div>`;
    const osText=denied ? "OS từ chối yêu cầu sai; không nạp trang" : request ? "MMU kiểm tra trước khi nhờ OS" : fault ? "OS nhận báo thiếu trang" : locate ? "OS tìm bản lưu trên SSD" : choose ? "OS chọn trang nhường chỗ" : writeBack ? "OS ghi lại trang đã sửa" : load ? "OS nạp trang vào RAM" : update ? "OS cập nhật bảng trang" : "OS cho CPU thử lại";
    const source=denied ? undefined : writeBack ? victim : locate || load || update ? page : undefined;
    const sourceDetail=denied ? "Không đọc SSD cho yêu cầu bị từ chối" : request ? "Chưa cần đọc SSD" : writeBack ? `Nhận bản sửa của Trang ${victim}` : load ? `Chuyển Trang ${page} vào Khung ${frame}` : update ? "Dữ liệu đã nạp xong; cập nhật bản ghi" : locate ? "Đã tìm được bản lưu; chưa nạp vào RAM" : choose ? "Đợi khung được nhường" : "Chờ hệ điều hành yêu cầu nạp";
    const io=!direct ? `<div data-flow-node="os" class="paging-os-ribbon"><span>Hệ điều hành</span><b>${esc(osText)}</b></div>${denied?'':`<div data-flow-node="storage" class="demand-storage">${hw.ssd({label:"SSD · bản lưu ở bộ nhớ phụ",page:source,detail:sourceDetail,active:false})}${transfer}</div>`}` : `<p class="paging-bypass-note">${hit ? "Có sẵn trong RAM → bỏ qua OS và đĩa." : "OS đã xử lý xong. CPU chạy lại lệnh và dùng dữ liệu trong RAM."}</p>`;
    const cpuNode='.paging-processor-area .hw-cpu',frameNode=`[data-flow-node="frame-${frame}"]`,ssdNode='[data-flow-node="storage"] .hw-ssd',osNode='[data-flow-node="os"]',pteNode='[data-flow-node="pte"]';
    const side={mobileFromPort:'left',mobileToPort:'left'};
    const focus=denied?{selector:cpuNode,label:'Yêu cầu bị chặn · không đọc SSD',tone:'red'}
      : request?{selector:cpuNode,label:`CPU yêu cầu Trang ${page}`,tone:'amber'}
      : fault?{selector:osNode,label:'OS nhận lỗi trang · CPU đang chờ',tone:'red'}
      : locate?{selector:ssdNode,label:`Tìm bản lưu Trang ${page} trên SSD`,tone:'violet'}
      : choose?{selector:frameNode,label:`Chọn Trang ${victim} nhường Khung ${frame}`,tone:'red'}
      : writeBack?{selector:ssdNode,label:`Đã ghi lại Trang ${victim} · D: 1 → 0`,tone:'amber'}
      : load?{selector:frameNode,label:`Nạp Trang ${page} vào Khung ${frame}`,tone:'green'}
      : update?{selector:pteNode,label:`OS ghi Trang ${page} → Khung ${frame}`,tone:'violet'}
      : {selector:frameNode,label:`CPU dùng Trang ${page} trong RAM`,tone:'green'};
    const flows=denied||request?[]
      : fault?[{from:cpuNode+' .hw-visual--cpu',to:osNode,label:'Báo lỗi trang cho OS',tone:'red',kind:'signal'}]
      : locate?[{from:osNode,to:ssdNode+' .hw-visual--ssd',label:'OS tìm bản lưu',tone:'violet',kind:'lookup'}]
      : choose?[{from:osNode,to:frameNode,label:'Chọn khung cần nhường',tone:'red',kind:'signal',...side}]
      : writeBack?[{from:frameNode,to:ssdNode+' .hw-visual--ssd',label:'Ghi dữ liệu đã sửa về SSD',tone:'amber',kind:'data',...side}]
      : load?[{from:ssdNode+' .hw-visual--ssd',to:frameNode,label:'SSD nạp trang vào RAM',tone:'green',kind:'data',...side}]
      : update?[{from:osNode,to:pteNode,label:'Cập nhật bản ghi bảng trang',tone:'violet',kind:'lookup',...side}]
      : direct?[{from:s.operation==='write'?cpuNode+' .hw-visual--cpu':frameNode,to:s.operation==='write'?frameNode:cpuNode+' .hw-visual--cpu',label:s.operation==='write'?'CPU ghi vào RAM':'RAM trả dữ liệu cho CPU',tone:'green',kind:'data',...side}]:[];

    return {
      title:heading,why,next,focus,flows,
      html:`<div class="paging-scene demand-scene paging-hardware-scene ${denied ? "paging-trap" : ""}">${sequenceHtml}<div class="demand-hardware-layout ${direct?'is-direct':''}">${routeHtml}${io}</div>${ioCounts}<p class="paging-key">CPU chỉ dùng dữ liệu sau khi trang ở RAM và bảng trang đã được cập nhật. Ô màu là vùng nhớ phóng to, không phải từng chip RAM.</p></div>`,
      result:read || retry ? `Trang ${page} ở khung ${frame} · ${s.hits || 0} lượt có sẵn · ${s.faults || 0} lượt thiếu trang · ${s.reads || 0} lần nạp từ đĩa${detailed?` · ${s.writes||0} lần ghi lại đĩa`:""}` : undefined,
    };
  };
})();
