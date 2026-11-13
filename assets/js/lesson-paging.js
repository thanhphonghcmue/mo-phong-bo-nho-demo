/* Simple teaching scenes. These functions only read the current engine snapshot. */
(function () {
  "use strict";
  const views = window.MemoryLessonViews = window.MemoryLessonViews || {};
  const esc = value => String(value ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const label = (number, text) => `<span class="lesson-label"><span class="paging-step-number">${number}</span>${esc(text)}</span>`;
  const arrow = `<span class="lesson-flow-arrow paging-arrow" aria-hidden="true">→</span>`;
  function card(number, heading, body, active = false, more = "") {
    return `<div class="lesson-card ${active ? "lesson-active" : ""} ${more}">${label(number, heading)}${body}</div>`;
  }
  function bytes(size, offset, read) {
    if (!Number.isInteger(size) || size < 1) return "";
    if (size <= 12) return `<div class="paging-byte-row" aria-label="Các vị trí byte trong khung">${Array.from({length:size}, (_, i) => `<span class="paging-byte ${read && i === offset ? "paging-byte-selected" : ""}" ${read && i === offset ? 'aria-current="true"' : ""}>${i}</span>`).join("")}</div>`;
    return `<p class="lesson-muted">Các vị trí: 0 … ${esc(size - 1)}${read ? ` · đọc tại +${esc(offset)}` : ""}</p>`;
  }
  function rail(labels, current) {
    return `<ol class="paging-rail" aria-label="Thứ tự xử lý">${labels.map((text,i) => `<li ${i === current ? 'aria-current="step"' : ""}><span>${i+1}</span>${esc(text)}</li>`).join("")}</ol>`;
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
      why = "OS nạp trang hợp lệ từ đĩa rồi cập nhật bảng trang. CPU vẫn sẽ đọc dữ liệu từ RAM.";
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
    const requestBody = `<p class="paging-big">Byte ${esc(p.addr)}</p><p class="lesson-muted">Địa chỉ logic · LA</p>${split ? `<div class="paging-split"><span>Trang <b>${esc(p.p)}</b></span><span>Vị trí <b>+${esc(p.d)}</b></span></div><p class="paging-formula">${esc(p.addr)} = ${esc(p.p)} × ${esc(size)} + ${esc(p.d)}</p>` : `<p class="paging-placeholder">Chờ tách trang và vị trí</p>`}`;
    const lookupBody = `<div class="paging-lookup"><span class="lesson-label">TLB · sổ nhớ nhanh</span><b>${!hasLooked ? "Chưa tra" : p.hit ? `Có: trang ${esc(p.p)} → khung ${esc(p.f)}` : cache || ready ? `Đã nhớ: ${esc(p.p)} → ${esc(p.f)}` : "Chưa nhớ · cần xem bảng trang"}</b></div><div class="paging-lookup ${p.hit && hasLooked ? "paging-bypassed" : ""}"><span class="lesson-label">Bảng trang · sổ chỉ đường</span><b>${esc(tableText)}</b></div>`;
    const ramBody = knownFrame ? `<div class="lesson-tile ${read ? "lesson-good" : ""}"><span class="lesson-label">Khung ${esc(p.f)} · Frame</span><strong>Trang ${esc(p.p)}</strong>${bytes(size, p.d, read)}</div>${ready ? `<p class="paging-formula">${esc(p.f)} × ${esc(size)} + ${esc(p.d)} = <b>${esc(p.phys)}</b></p>` : '<p class="lesson-muted">Đã tìm được khung; chưa đọc byte.</p>'}` : '<div class="lesson-tile paging-placeholder">Chưa biết khung nào</div><p class="lesson-muted">Chưa có địa chỉ vật lý.</p>';
    return {
      title: heading, why, next,
      html: `<div class="paging-scene ${trap ? "paging-trap" : ""}">${rail(["Tách địa chỉ", "Tìm khung RAM", "Đọc đúng byte"],step)}<div class="lesson-row paging-main-row">${card(1,"Chương trình muốn đọc",requestBody,step===0)}${arrow}${card(2,"Tìm đường đi",p.err ? '<p>Địa chỉ bị từ chối.</p>' : lookupBody,step===1)}${arrow}${card(3,"RAM · nơi đọc dữ liệu",p.err ? '<p>Không đọc hoặc ghi RAM.</p>' : ramBody,step===2)}</div><p class="paging-key">Trang = phần của chương trình. Khung = ngăn chứa một trang trong RAM. Mỗi trang/khung có ${esc(size)} byte.</p></div>`,
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
      why="Trang bẩn (dirty) cần được ghi về đĩa trước khi khung của nó bị dùng lại; nếu không sẽ mất dữ liệu.";
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
    const frames=(s.ram || []).map((contents,f) => `<div class="lesson-tile ${selected && frame===f ? choose ? "lesson-bad" : "lesson-active" : ""}"><span class="lesson-label">Khung ${f}</span><strong>${contents === null ? "Trống" : `Trang ${esc(contents)}`}</strong>${selected && frame===f ? `<small>${choose ? "Sẽ nhường chỗ" : load ? "Vừa nạp vào" : read || retry ? "CPU đang dùng" : "Đã chọn"}</small>` : ""}</div>`).join("");
    const visibleTable=!request && !denied;
    const table=visibleTable ? `<div class="paging-pte"><span class="lesson-label">Bảng trang · sổ chỉ đường</span><b>Trang ${esc(page)} ${inRam ? `→ khung ${esc(s.pt[page].frame)}` : load ? "→ chưa ghi số khung" : "→ chưa có trong RAM"}</b>${load && !inRam ? '<small>Dữ liệu đã vào RAM; OS chưa cập nhật bản ghi này.</small>' : ""}</div>` : `<div class="paging-pte"><span class="lesson-label">Bảng trang · sổ chỉ đường</span><b>${denied ? "Không có quyền dùng trang" : "Chờ MMU kiểm tra"}</b></div>`;
    const sequence=s.sequence || [page], seqIndex=s.seqIndex || 0;
    const sequenceHtml=sequence.length>1 ? `<div class="paging-reference-strip" aria-label="Thứ tự yêu cầu">${sequence.map((p,i)=>`<span ${i===seqIndex ? 'aria-current="step"' : ""}>Trang ${esc(p)}</span>`).join('<i aria-hidden="true">→</i>')}</div>` : "";
    const transfer=load ? `<div class="paging-transfer"><span>${oldPage == null ? "Khung trống" : `Trang ${esc(oldPage)}`}</span><b aria-hidden="true">→</b><strong>Trang ${esc(page)}</strong><span>tại khung ${esc(frame)}</span></div>` : "";
    const sourceBody=denied ? '<b>Không nạp trang bị từ chối</b>' : request ? '<b>Chưa cần đọc đĩa</b>' : hit ? '<b>Không đọc đĩa</b><p class="lesson-muted">Trang đã có trong RAM.</p>' : `<b>Trang ${esc(page)}</b><p class="lesson-muted">${writeBack ? `Nhận bản sửa của trang ${esc(victim)}` : load ? `Đĩa → khung ${esc(frame)}` : update || retry ? "Đã chuyển trang vào RAM" : locate ? "Đã tìm được bản lưu" : "Chờ OS yêu cầu nạp"}</p>`;
    const cpu=card(1,"CPU / MMU · yêu cầu",`<p class="paging-big">Trang ${esc(page)}</p><p class="lesson-muted">${denied ? "Bị từ chối" : read || retry ? "Tiếp tục thực hiện lệnh" : hit ? "Đã tìm thấy trong RAM" : request ? "Muốn đọc dữ liệu" : "Đang chờ OS"}</p>`,stage===0 || stage===3);
    const fifoProof=choose && s.policy === "FIFO" ? `<p class="paging-formula"><b>Nạp trước → nạp sau:</b><br>${(s.fifo || []).map(p=>`Trang ${esc(p)}`).join(" → ")}</p>` : "";
    const direct = hit || retry || read;
    const ram=card(direct ? 2 : 3,"RAM · nơi CPU dùng dữ liệu",`<div class="lesson-memory paging-frames">${frames}</div>${table}${fifoProof}`,stage===3 || load || choose || update || hit);
    const routeHtml=direct
      ? `<div class="lesson-row demand-hit-row">${cpu}${arrow}${ram}</div><p class="paging-bypass-note">${hit ? "Có sẵn trong RAM → bỏ qua OS và đĩa." : "OS đã xử lý xong. CPU chạy lại lệnh và dùng dữ liệu trong RAM."}</p>`
      : `<div class="lesson-row demand-main-row">${cpu}${arrow}${card(2,"OS · người quản lý RAM",`<p class="paging-os-message">${denied ? "Chặn yêu cầu sai" : request ? "Chờ báo thiếu trang" : fault ? "Nhận báo thiếu trang" : locate ? "Tìm bản lưu trên đĩa" : choose ? "Chọn trang nhường chỗ" : writeBack ? "Lưu trang đã sửa" : load ? "Nạp trang vào RAM" : update ? "Cập nhật bảng trang" : "Cho CPU thử lại"}</p>`,stage===1 || stage===2)}${arrow}${ram}</div>`;
    return {
      title:heading,why,next,
      html:`<div class="paging-scene demand-scene ${denied ? "paging-trap" : ""}">${sequenceHtml}${rail(["CPU yêu cầu", "Kiểm tra có sẵn", "Trang sẵn sàng", "CPU dùng dữ liệu"],stage)}${routeHtml}${!direct ? `<div class="paging-disk-row"><div class="paging-disk ${locate || load || writeBack ? "lesson-active" : ""}"><span class="lesson-label">Đĩa · nơi giữ bản lưu</span>${sourceBody}</div>${transfer}</div>` : ""}<p class="paging-key">Mỗi khung chứa tối đa một trang. CPU chỉ dùng dữ liệu sau khi trang ở RAM và bảng trang đã được cập nhật.</p></div>`,
      result:read || retry ? `Trang ${page} ở khung ${frame} · ${s.hits || 0} lượt có sẵn · ${s.faults || 0} lượt thiếu trang · ${s.reads || 0} lần nạp từ đĩa` : undefined,
    };
  };
})();
