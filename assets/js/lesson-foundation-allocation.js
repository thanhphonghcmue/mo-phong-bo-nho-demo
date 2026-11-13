/* Presentation only: these views read the engine's immutable timeline events. */
(function () {
  "use strict";
  const views = window.MemoryLessonViews = window.MemoryLessonViews || {};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const number = value => Number(value).toLocaleString("vi-VN");

  views.b = function (e) {
    const s = e.state, stage = s.st || 0, translate = s.mode === "translate";
    const upper = s.base + s.limit, last = upper - 1;
    const input = translate ? s.offset : s.addr;
    const lowerOK = input >= (translate ? 0 : s.base);
    const upperOK = input < (translate ? s.limit : upper);
    const complete = stage === 3;
    const allowed = lowerOK && upperOK;
    const lowerSeen = stage >= 1;
    const upperSeen = translate ? stage >= 1 : stage >= 2;
    const addressKnown = !translate || stage >= 2 && allowed;
    const address = translate ? s.pa : s.addr;
    const location = address < s.base ? "before" : address >= upper ? "after" : "inside";
    const zone = (id, title, range) => `<div class="foundation-zone ${id === location && addressKnown ? "foundation-address-zone" : ""} ${complete && addressKnown && id === location ? allowed ? "lesson-good" : "lesson-bad" : ""}"><span class="lesson-label">${title}</span><strong>${range}</strong>${id === location && addressKnown ? `<span class="foundation-address">Địa chỉ đang hỏi: <b>${number(address)}</b></span>` : ""}</div>`;
    const outcome = complete ? allowed ? `Cho phép truy cập RAM tại ${number(address)}` : "Chặn truy cập → báo lỗi cho hệ điều hành (Trap)" : "Chưa truy cập RAM — cần kiểm tra trước";
    let title, why, next;
    if (translate) {
      title = ["Chương trình hỏi một vị trí trong vùng của mình", "Kiểm tra vị trí có nằm trong vùng không", allowed ? "Cộng vị trí với địa chỉ đầu vùng" : "Dừng: vị trí không thuộc vùng được cấp", allowed ? "RAM nhận đúng địa chỉ đã dịch" : "Truy cập bị chặn"][stage];
      why = stage === 0 ? `L = ${number(input)} là vị trí tính từ đầu chương trình, chưa phải địa chỉ trong RAM.`
        : stage === 1 ? `Vùng dài ${number(s.limit)} byte nên vị trí phải từ 0 đến ${number(s.limit - 1)}. ${lowerOK && upperOK ? "Vị trí này nằm trong vùng." : "Vị trí này ở ngoài vùng."}`
        : stage === 2 ? allowed ? `Đầu vùng ở ${number(s.base)}. Đi thêm ${number(input)} byte: ${number(s.base)} + ${number(input)} = ${number(s.pa)}.` : "Một vị trí sai không được biến thành địa chỉ truy cập RAM."
        : allowed ? "Địa chỉ logic và địa chỉ vật lý khác nhau; dữ liệu nằm tại địa chỉ vừa tính trong RAM." : "Phần cứng chuyển lỗi cho hệ điều hành; RAM không đọc hoặc ghi dữ liệu.";
      next = stage === 0 ? "Kiểm tra 0 ≤ L < Limit." : stage === 1 ? allowed ? "Cộng Base với L để tìm địa chỉ thật." : "Chặn yêu cầu, không cộng để truy cập." : stage === 2 ? "Đưa ra quyết định cuối cùng." : "Đổi địa chỉ để thử lại.";
    } else {
      title = ["Chương trình muốn vào địa chỉ nào?", "Kiểm tra: có đi trước đầu vùng không?", lowerOK ? "Kiểm tra: có vượt cuối vùng không?" : "Cận dưới sai: không cần kiểm tra tiếp", allowed ? "Địa chỉ nằm trong vùng — cho vào RAM" : "Địa chỉ ngoài vùng — chặn lại"][stage];
      why = stage === 0 ? `Chương trình chỉ được dùng ${number(s.limit)} byte, từ địa chỉ ${number(s.base)} đến ${number(last)}.`
        : stage === 1 ? `${number(input)} ${lowerOK ? "≥" : "<"} ${number(s.base)}: ${lowerOK ? "qua cận dưới, nhưng chưa đủ để kết luận." : "đang ở trước vùng được cấp nên không được truy cập."}`
        : stage === 2 ? !lowerOK ? "Cận dưới đã sai. Dù cận trên đúng, địa chỉ vẫn không thuộc vùng được cấp." : `${number(input)} ${upperOK ? "<" : "≥"} ${number(upper)}: ${upperOK ? "chưa vượt cuối vùng." : `đã ở ngoài vùng; địa chỉ cuối được phép là ${number(last)}.`}`
        : allowed ? `Cả hai điều kiện đều đúng: ${number(s.base)} ≤ ${number(input)} < ${number(upper)}.` : "Chỉ cần một điều kiện sai là phải chặn để bảo vệ dữ liệu của hệ điều hành và chương trình khác.";
      next = stage === 0 ? "So sánh địa chỉ với đầu vùng (Base)." : stage === 1 ? lowerOK ? "So sánh với cận trên Base + Limit." : "Giữ RAM nguyên trạng và chặn yêu cầu." : stage === 2 ? "Cho phép hoặc chặn truy cập." : "Thử địa chỉ khác để thấy hai kết quả.";
    }
    const check = (label, expression, seen, passed, active, skipped) => `<div class="foundation-check lesson-card ${active ? "lesson-active" : ""} ${seen && !skipped ? passed ? "lesson-good" : "lesson-bad" : ""}"><span class="lesson-label">${label}</span><strong>${esc(expression)}</strong><span>${skipped ? "Bỏ qua: cận dưới đã sai" : !seen ? "Chưa kiểm tra" : passed ? "Đúng · qua bước này" : "Sai · không được truy cập"}</span></div>`;
    const checks = translate
      ? check("Kiểm tra giới hạn", `0 ≤ ${number(input)} < ${number(s.limit)}`, stage >= 1, allowed, stage === 1, false) + `<div class="foundation-check lesson-card ${stage === 2 ? "lesson-active" : ""}"><span class="lesson-label">Dịch địa chỉ nếu hợp lệ</span><strong>${stage >= 2 && allowed ? `${number(s.base)} + ${number(input)} = ${number(s.pa)}` : "Base + vị trí trong vùng"}</strong><span>${stage >= 2 && !allowed ? "Không tạo địa chỉ hợp lệ" : "Địa chỉ đầu vùng + độ lệch"}</span></div>`
      : check("1. Không nằm trước vùng", `${number(input)} ≥ ${number(s.base)} ?`, lowerSeen, lowerOK, stage === 1, false) + check("2. Không vượt cuối vùng", `${number(input)} < ${number(upper)} ?`, upperSeen && lowerOK, upperOK, stage === 2, stage >= 2 && !lowerOK);
    return {
      title, why, next,
      result: complete ? outcome : "",
      html: `<div class="foundation-request lesson-row"><div class="lesson-card ${stage === 0 ? "lesson-active" : ""}"><span class="lesson-label">CPU hỏi địa chỉ ${translate ? "logic L" : "vật lý A"}</span><strong>${number(input)}</strong></div><span class="lesson-flow-arrow" aria-hidden="true">→</span><p>Vùng được cấp: <strong>${number(s.base)}…${number(last)}</strong><br><span class="lesson-muted">Base = đầu vùng · Limit = ${number(s.limit)} byte, không phải địa chỉ cuối.</span></p></div>
        <div class="foundation-checks">${checks}</div>
        <div class="foundation-ram-label"><strong>RAM · địa chỉ vật lý</strong><span>địa chỉ nhỏ → lớn</span></div>
        <div class="foundation-ram">${s.base > 0 ? zone("before", "Vùng của OS / chương trình khác", `0…${number(s.base - 1)}`) : ""}${zone("inside", "Vùng của chương trình", `${number(s.base)}…${number(last)}`)}${zone("after", "Ngoài vùng được cấp", `từ ${number(upper)}`)}</div>
        <p class="foundation-outcome ${complete ? allowed ? "lesson-good" : "lesson-bad" : "lesson-muted"}">${esc(outcome)}</p>`,
    };
  };

  views.a = function (e, position) {
    const s = e.state, rt = s.runtime || {free:s.holes, pieces:s.holes.map(()=>[]), scan:-1};
    const name = {first:"First-fit",best:"Best-fit",worst:"Worst-fit"}[s.alg] || s.alg;
    const rule = s.alg === "first" ? "Chọn lỗ đầu tiên đủ lớn, rồi dừng." : s.alg === "best" ? "Xem hết các lỗ; chọn lỗ nhỏ nhất nhưng vẫn đủ." : "Xem hết các lỗ; chọn lỗ lớn nhất.";
    const text = e.title || "", updating = text.startsWith("Cập nhật RAM"), choosing = text.startsWith("Chọn Lỗ"), scanning = text.includes("· xét Lỗ"), failed = text.includes("không cấp phát") || e.status === "không cấp phát";
    const match = text.match(/P(\d+)/), k = match ? Number(match[1])-1 : Math.min(Math.floor(s.s/2),s.reqs.length-1);
    const req = s.reqs[k], previous = e.beforeState?.runtime;
    const changed = updating ? rt.pieces.findIndex((pieces,i)=>pieces.length > (previous?.pieces?.[i]?.length || 0)) : -1;
    const selected = choosing ? rt.scan : changed;
    const current = scanning ? rt.scan : -1;
    const beforeFree = updating && previous ? previous.free : rt.free;
    const requestLabel = position?.cursor === 0 ? "Hàng chờ" : `P${k+1} cần ${req} KB`;
    const queue = s.reqs.map((r,i)=>`<span class="allocation-request-chip ${i === k ? "lesson-active" : ""}">P${i+1} · ${r} KB</span>`).join("");
    const holes = s.holes.map((original,i)=>{
      const pieces = rt.pieces[i] || [], used = pieces.reduce((total,p)=>total+p.r,0), free = rt.free[i];
      const enough = free >= req, inspected = scanning && i < current && free > 0;
      const stateLabel = i === current ? "ĐANG XÉT" : i === selected ? updating ? "VỪA CẤP CHỖ" : "ĐÃ CHỌN" : inspected ? enough && s.alg !== "first" ? "Ứng viên đã xét" : "Đã bỏ qua" : "";
      const stateClass = i === current ? "lesson-active" : i === selected ? "lesson-good" : "";
      let address = Number(s.gap || 0);
      for(let j=0;j<i;j++) address += s.holes[j] + Number(s.gap || 0);
      return `${i ? '<div class="allocation-divider" aria-label="Vùng RAM đã dùng">đã<br>dùng</div>' : ''}<div class="allocation-hole ${stateClass}" data-hole="${i+1}"><div class="allocation-hole-title"><strong>Lỗ ${i+1}</strong><span>${stateLabel || " "}</span></div><div class="allocation-pieces">${pieces.map(p=>`<div class="allocation-piece ${updating && p.k===k ? "allocation-new" : ""}" style="flex-grow:${p.r}"><b>P${p.k+1}</b><span>${p.r} KB</span></div>`).join("")}${free > 0 ? `<div class="allocation-free" style="flex-grow:${free}"><strong>${free} KB</strong><span>còn trống</span></div>` : ""}</div><span class="allocation-address">Vùng ban đầu ${original} KB · từ ${address} KB</span>${i === current ? `<p class="allocation-test">${free} ${enough ? "≥" : "<"} ${req} → ${enough ? "đủ chỗ" : "không đủ"}</p>` : i === selected && updating ? `<p class="allocation-test">${beforeFree[i]} − ${req} = ${free} KB trống</p>` : ""}</div>`;
    }).join("");
    let title = "Các chương trình đang chờ chỗ trong RAM", why = `Mỗi chương trình cần một vùng trống liền nhau. ${rule}`, next = "Đưa yêu cầu P1 tới bộ cấp phát.";
    if(scanning){
      const free = rt.free[current], fit = free >= req;
      title = `Đang xét Lỗ ${current+1}: ${free} KB`;
      why = !fit ? `${free} KB nhỏ hơn ${req} KB nên P${k+1} không thể nằm vừa ở đây.` : s.alg === "first" ? `Đây là lỗ đầu tiên có ít nhất ${req} KB. First-fit dừng tìm tại đây.` : `${free} KB đủ chứa ${req} KB, nhưng ${name} cần xem các lỗ còn lại trước khi chọn.`;
      next = fit && s.alg === "first" ? `Chọn Lỗ ${current+1}. RAM vẫn chưa thay đổi.` : e.next;
    } else if(choosing){
      title = `Chọn Lỗ ${selected+1} cho P${k+1}`;
      why = `${rt.free[selected]} KB đủ chứa ${req} KB. ${rule} Còn dư ${rt.free[selected]-req} KB sau khi cấp.`;
      next = `Đặt P${k+1} vào đầu Lỗ ${selected+1}.`;
    } else if(updating){
      title = changed >= 0 ? `P${k+1} đã có chỗ trong Lỗ ${changed+1}` : `P${k+1} vẫn phải chờ`;
      why = changed >= 0 ? `Lỗ ${changed+1} trước có ${beforeFree[changed]} KB trống. Cấp ${req} KB cho P${k+1}, còn ${rt.free[changed]} KB.` : "RAM không đổi vì không có một lỗ liên tục đủ lớn.";
      next = k === s.reqs.length-1 ? "Đã xử lý hết các yêu cầu. Có thể đổi thuật toán để so sánh." : `Tiếp tục tìm chỗ cho P${k+2}.`;
    } else if(failed){
      const total = rt.free.reduce((n,v)=>n+v,0), max = Math.max(...rt.free);
      title = `Chưa tìm được chỗ cho P${k+1}`;
      why = total < req ? `Tổng trống ${total} KB nhỏ hơn yêu cầu ${req} KB: thiếu dung lượng.` : `Tổng trống ${total} KB đủ, nhưng lỗ lớn nhất chỉ ${max} KB. Không ghép các lỗ cách nhau: đây là phân mảnh ngoài.`;
      next = "Giữ nguyên RAM; yêu cầu phải chờ.";
    } else if(position?.cursor > 0){
      title = `P${k+1} hỏi: có chỗ cho ${req} KB không?`;
      why = `Cần một lỗ liên tục có ít nhất ${req} KB. ${rule}`;
      next = "Xét lần lượt các lỗ từ địa chỉ nhỏ đến lớn.";
    }
    return {title,why,next,
      result:updating && k === s.reqs.length-1 ? `Đã xử lý ${s.reqs.length} yêu cầu; còn ${rt.free.reduce((n,v)=>n+v,0)} KB trống.` : "",
      html:`<div class="allocation-intro"><div><span class="lesson-label">Yêu cầu theo thứ tự</span><div class="allocation-request-queue">${queue}</div></div><div class="allocation-rule"><b>${esc(name)}</b><span>${esc(rule)}</span></div></div><div class="allocation-current lesson-card ${scanning || choosing ? "lesson-active" : ""}"><strong>${esc(requestLabel)}</strong><span>${scanning ? `Bộ cấp phát đang nhìn Lỗ ${current+1}` : choosing ? `Đã chọn Lỗ ${selected+1}; bước sau mới đặt vào` : updating ? "RAM vừa cập nhật" : "RAM chưa đổi"}</span></div><div class="allocation-ram-label"><strong>RAM · các lỗ theo vị trí</strong><span>địa chỉ nhỏ → lớn</span></div><div class="allocation-holes">${holes}</div><p class="allocation-scale-note">Ô biểu diễn vùng ban đầu; số KB cho biết chỗ trống thật. Vùng “đã dùng” ngăn các lỗ nối với nhau.</p>`};
  };
})();
