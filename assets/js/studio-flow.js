/* Presentation only. Directions and focus follow the current teaching snapshot. */
(() => {
  "use strict";
  const api = window.MemoryTeaching;
  if (!api || window.StudioFlow) return;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const models = new Map();
  let frame;
  const sizes = typeof ResizeObserver === "function" ? new ResizeObserver(redraw) : null;

  function plan(id, s, e) {
    const title = e.title, p = s.plan;
    if (id === "x") {
      if (title.startsWith("CPU")) return [null,"x-cpu","CPU phát địa chỉ","start"];
      if (title.startsWith("Tách")) return ["x-cpu","x-mmu","Tách trang và độ lệch","local"];
      if (title.startsWith("Tra TLB")) return ["x-mmu","x-tlb",p.hit?"Tra TLB · tìm thấy bản dịch":"Tra TLB · chưa có bản dịch","lookup"];
      if (title.startsWith("Tra bảng")) return ["x-tlb","x-pt-focus","TLB miss → tra bảng trang","lookup"];
      if (e.kind === "trap") return ["x-processor","x-os",p.err?"Chặn địa chỉ ngoài miền":"Lỗi trang · RAM đã đầy","trap"];
      if (e.kind === "page-in") return ["x-os",`x-frame-${p.newF}`,`OS nạp trang ${p.p} → khung ${p.newF}`,"page-in"];
      if (title.startsWith("Điền")) return ["x-pt-focus","x-tlb","Lưu bản dịch từ bảng trang vào TLB","refill"];
      if (title.startsWith("Tạo địa chỉ")) return ["x-tlb","x-pa",p.hit?"TLB HIT → tính PA · bỏ qua bảng trang":"Dùng bản dịch để tính PA","translation"];
      if (e.kind === "read") return [`x-frame-${p.f}`,"x-cpu",`RAM trả byte +${p.d} về CPU`,"read"];
    }
    if (id === "v") {
      if (title.startsWith("CPU")) return [null,"v-cpu",`CPU yêu cầu trang ${s.page}`,"start"];
      if (e.kind === "trap") return ["v-cpu","v-os",p.oob?"Trap bảo vệ · không truy cập RAM":"Lỗi trang → hệ điều hành","trap"];
      if (title.startsWith("Định vị")) return ["v-os","v-store",`Tìm trang ${s.page} trên bộ nhớ phụ`,"lookup"];
      if (title.includes("chọn victim")) return ["v-os",`v-frame-${p.chosenFrame}`,`Chọn khung ${p.chosenFrame} · chưa nạp trang mới`,"selection"];
      if (e.kind === "page-out") return [`v-frame-${p.chosenFrame}`,"v-store",`Ghi trang bẩn ${p.victim}: RAM → đĩa`,"page-out"];
      if (e.kind === "page-in") return ["v-store",`v-frame-${p.chosenFrame}`,`Nạp trang ${s.page}: đĩa → RAM`,"page-in"];
      if (title.startsWith("Cập nhật")) return [`v-frame-${p.chosenFrame}`,"v-pt-focus","Nạp xong → cập nhật bảng trang","commit"];
      if (e.kind === "translation") return ["v-pt-focus",`v-frame-${p.chosenFrame}`,"Trang đã có → tìm khung RAM · bỏ qua đĩa","translation"];
      if (e.kind === "write") return ["v-cpu",`v-frame-${p.chosenFrame}`,"CPU ghi vào RAM · đặt Dirty = 1","write"];
      if (e.kind === "read") return [`v-frame-${p.chosenFrame}`,"v-cpu","RAM trả dữ liệu · CPU tiếp tục","read"];
    }
    if (id === "r") {
      const r = s.runtime;
      const decisionSource = $("#r-choice-details")?.open ? "r-evidence" : "r-choice-summary";
      if (r.phase === "start") return [null,"r-need","Bắt đầu tại CPU · RAM giữ trạng thái ban đầu","start"];
      if (r.phase === "request") return ["r-refs","r-need",`CPU cần trang ${s.refs[r.t]} · kiểm tra trong RAM`,"request"];
      if (r.phase === "victim") return [decisionSource,`r-frame-${r.slot}`,`Chọn trang ${r.victim} nhường chỗ · chưa nạp trang mới`,"selection"];
      if (r.phase === "inspect") return [decisionSource,`r-frame-${r.ptr}`,`Clock xét khung ${r.ptr} · R = ${r.bit[r.ptr]}`,"inspect"];
      if (r.phase === "clear") return [`r-frame-${e.beforeState.runtime.ptr}`,`r-frame-${r.ptr}`,`Hạ R = 0 · chuyển kim sang khung ${r.ptr}`,"clock"];
      if (r.phase === "apply" && e.kind === "read") return [`r-frame-${r.slot}`,"r-need",`HIT · đọc trang ${s.refs[r.t]} từ khung ${r.slot}`,"read"];
      if (r.phase === "apply") return ["studio-r-store",`r-frame-${r.slot}`,`Nạp trang ${s.refs[r.t]} từ bộ nhớ phụ vào khung ${r.slot}`,"page-in"];
    }
    if (id === "a") {
      const scan = s.runtime.scan, holes = [...document.querySelectorAll("#a-ram .hole")];
      holes.forEach((hole,i) => hole.id = `studio-a-hole-${i}`);
      const source = $("#a-req .req");
      if (source) source.id = "studio-a-request";
      if (title.startsWith("Hàng chờ")) return [null,"a-queue","Bắt đầu: lấy tiến trình đầu hàng chờ","start"];
      if (/^P\d+ yêu cầu/.test(title)) return ["a-queue","studio-a-request","Tiến trình gửi yêu cầu cấp phát","request"];
      if (title.includes("xét Lỗ")) return ["studio-a-request",`studio-a-hole-${scan}`,`Đang xét lỗ ${scan+1} · ${s.runtime.free[scan]} KB còn trống`,"lookup"];
      if (title.startsWith("Chọn")) return ["studio-a-request",`studio-a-hole-${scan}`,`Chọn lỗ ${scan+1} · chưa đặt tiến trình vào RAM`,"selection"];
      if (title.startsWith("Cập nhật")) {
        const changed = s.runtime.pieces.findIndex((pieces,i) => pieces.length > (e.beforeState.runtime.pieces[i]?.length || 0));
        return ["studio-a-request",changed<0?"a-queue":`studio-a-hole-${changed}`,changed<0?"Không cấp phát · RAM giữ nguyên":"Đặt tiến trình vào vùng đã chọn","commit"];
      }
      return ["studio-a-request","a-queue","Không có vùng liên tục đủ lớn · tiến trình chờ","trap"];
    }
    return [null,null,title,"request"];
  }

  function decorate(id) {
    const root = $(id === "r"?"#r-scene":id === "a"?"#a-lane":`#${id}-flow`);
    if (!root) return;
    const s = api.snapshot(id), e = api.event(id), position = api.position(id);
    const host = id === "r" ? root.parentElement : root;
    host.querySelectorAll(".studio-flow-action,.studio-flow-overlay,.studio-flow-badge,.studio-r-store,.studio-r-rank").forEach(el => el.remove());
    host.querySelectorAll(".studio-flow-current,.studio-flow-source,.studio-flow-current-node").forEach(el => el.classList.remove("studio-flow-current","studio-flow-source","studio-flow-current-node"));
    root.querySelectorAll(".teach-wire").forEach(el=>el.remove());
    host.classList.add("studio-flow-host");
    if (id === "r" && s.runtime.phase === "apply" && e.kind === "page-in") {
      const store = document.createElement("div");
      store.id = "studio-r-store"; store.className = "studio-r-store";
      store.innerHTML = `${MemoryScenes.icon("database")}<span>Bộ nhớ phụ<strong>Trang ${s.refs[s.runtime.t]}</strong></span>`;
      $("#r-need").after(store);
    }
    const [from,to,label,kind] = plan(id,s,e);
    root.dataset.flowFrom = from || ""; root.dataset.flowTo = to || "";
    root.dataset.flowLabel = label; root.dataset.flowKind = kind;
    const tone = kind === "trap" ? "danger" : ["lookup","selection","inspect","clock"].includes(kind) ? "warning" : "live";
    host.dataset.flowTone = tone;
    const action = document.createElement("div"); action.className = "studio-flow-action";
    action.innerHTML = `<span class="studio-flow-step">${position.cursor+1}</span><div><small>${position.cursor===0?"BẮT ĐẦU TẠI ĐÂY":"ĐANG THỰC HIỆN"}</small><strong>${esc(label)}</strong></div>`;
    host.prepend(action);
    const target = to ? document.getElementById(to) : null, source = from ? document.getElementById(from) : null;
    if (source) source.classList.add("studio-flow-source");
    if (target) {
      target.classList.add("studio-flow-current");
      const node = target.closest(".scene-node") || target.closest(".slot") || target;
      node.classList.add("studio-flow-current-node");
      const badge = document.createElement("span"); badge.className = "studio-flow-badge";
      badge.textContent = `Bước ${position.cursor+1} · ${kind==="start"?"Bắt đầu":"Đang xử lý"}`;
      if (id !== "a" && !(id === "r" && node.matches(".slot"))) node.prepend(badge);
    }
    if (id === "r") ranks(s);
    models.set(id,{id,root,host,from,to,kind});
    sizes?.observe(host);
    draw(models.get(id));
  }

  function ranks(s) {
    if (!["FIFO","LRU"].includes(s.alg)) return;
    const r = s.runtime, key = s.alg === "FIFO" ? "load" : "last";
    const frames = r.fr.map((page,i)=>({page,i,stamp:r[key][i]})).filter(item=>item.page!==null).sort((a,b)=>a.stamp-b.stamp);
    frames.forEach((item,index)=>{
      const slot = $(`#r-frame-${item.i}`)?.closest(".slot"); if (!slot) return;
      const rank = document.createElement("span"); rank.className = "studio-r-rank";
      rank.dataset.rank = index+1;
      rank.innerHTML = `<b>${index+1}</b> ${index===0?(s.alg==="FIFO"?"Nạp sớm nhất":"Lâu chưa dùng nhất"):(s.alg==="FIFO"?"Nạp sau":"Dùng gần hơn")}`;
      slot.append(rank);
    });
    $("#r-evidence .scene-order")?.querySelectorAll(".scene-token").forEach((token,index)=>{
      const rank = document.createElement("b"); rank.className = "studio-r-rank"; rank.textContent = index+1; token.prepend(rank);
    });
  }

  const rect = (el,host) => { const r=el.getBoundingClientRect(), h=host.getBoundingClientRect();return {left:r.left-h.left,top:r.top-h.top,right:r.right-h.left,bottom:r.bottom-h.top,width:r.width,height:r.height,cx:r.left+r.width/2-h.left,cy:r.top+r.height/2-h.top}; };
  const stage = el => el.closest(".scene-node") || el.closest(".slot") || el;
  function pathFor(model,source,target) {
    const {id,root,host} = model, a=rect(source,host), b=rect(target,host), sa=stage(source), sb=stage(target), as=rect(sa,host), bs=rect(sb,host);
    const mobile=matchMedia("(max-width:820px)").matches;
    if (id === "x" || id === "v") {
      if (sa === sb) {
        const x=as.left+6;
        return `M ${a.left} ${a.bottom-8} H ${x} V ${b.top+8} H ${b.left}`;
      }
      if (source.id === "x-os" || target.id === "x-os") {
        const upper=source.id==="x-os"?bs:as, lower=source.id==="x-os"?a:b, lane=(upper.bottom+lower.top)/2;
        return source.id==="x-os" ? `M ${lower.cx} ${lower.top} V ${lane} H ${upper.cx} V ${upper.bottom}` : `M ${upper.cx} ${upper.bottom} V ${lane} H ${lower.cx} V ${lower.top}`;
      }
      if (mobile) {
        const lane=8;
        return `M ${as.left} ${as.cy} H ${lane} V ${bs.cy} H ${bs.left}`;
      }
      const pipeline=root.querySelector(".scene-pipeline"), lane=rect(pipeline,host).top+20;
      return `M ${as.cx} ${as.top} V ${lane} H ${bs.cx} V ${bs.top}`;
    }
    if (id === "r") {
      if (model.kind === "clock") {
        if (b.left>a.right && Math.abs(a.cy-b.cy)<8) return `M ${a.right} ${a.cy} H ${b.left}`;
        const lane=Math.max(as.bottom,bs.bottom)+16;
        return `M ${a.right} ${a.cy} H ${a.right+8} V ${lane} H ${b.left-8} V ${b.cy} H ${b.left}`;
      }
      if (source.id === "r-evidence" || source.id === "r-choice-summary") {
        const lane=(bs.bottom+a.top)/2;
        const entry=b.left-14;
        const exit=source.id === "r-evidence" ? a.right-8 : a.cx;
        return `M ${exit} ${a.top} V ${lane} H ${entry} V ${b.cy} H ${b.left}`;
      }
      if (source.id === "r-refs") {
        const lane=(a.bottom+b.top)/2;
        return `M ${a.cx} ${a.bottom} V ${lane} H ${b.cx} V ${b.top}`;
      }
      if (source.id === "studio-r-store" && !mobile) {
        const ram=rect(root.querySelector(".ramzone"),host), x=(as.right+ram.left)/2, lane=ram.top+49, entry=b.left-14;
        return `M ${as.right} ${as.cy} H ${x} V ${lane} H ${entry} V ${b.cy} H ${b.left}`;
      }
      if (mobile) {
        const lane=rect(root,host).left+8;
        return `M ${a.left} ${a.cy} H ${lane} V ${b.cy} H ${b.left}`;
      }
      if (model.kind === "read") {
        const ram=rect(root.querySelector(".ramzone"),host), lane=ram.top+49, exit=a.left-14, x=(ram.left+b.right)/2;
        return `M ${a.left} ${a.cy} H ${exit} V ${lane} H ${x} V ${b.cy} H ${b.right}`;
      }
      const lane=rect(root,host).top+18;
      return `M ${as.cx} ${as.top} V ${lane} H ${bs.cx} V ${bs.top}`;
    }
    const lane=Math.max(a.bottom+16,b.top-20);
    return b.top>=a.bottom ? `M ${a.cx} ${a.bottom} V ${lane} H ${b.cx} V ${b.top}` : `M ${a.cx} ${a.top} V ${b.bottom+18} H ${b.cx} V ${b.bottom}`;
  }

  function draw(model) {
    const {root,host,from,to,kind,id}=model;
    host.querySelectorAll(".studio-flow-overlay").forEach(el=>el.remove());
    const source=from?document.getElementById(from):null, target=to?document.getElementById(to):null;
    if (!source || !target || !host.getBoundingClientRect().width || source===target) return;
    const r=host.getBoundingClientRect(), d=pathFor(model,source,target);
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.classList.add("studio-flow-overlay");svg.dataset.from=from;svg.dataset.to=to;svg.dataset.kind=kind;
    svg.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);svg.setAttribute("aria-hidden","true");
    const marker=`studio-flow-arrow-${id}`;
    svg.innerHTML=`<defs><marker id="${marker}" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L14 7 0 14Z" fill="currentColor"/></marker></defs><path class="studio-flow-underlay" d="${d}"/><path class="studio-flow-line" d="${d}" marker-end="url(#${marker})"/>`;
    host.append(svg);
  }
  function redraw() { cancelAnimationFrame(frame); frame=requestAnimationFrame(()=>models.forEach(draw)); }
  function refresh() { ["a","x","v","r"].forEach(decorate); redraw(); }
  window.addEventListener("memory-lesson-step",event=>{if(["a","x","v","r"].includes(event.detail.id)){decorate(event.detail.id);redraw();}});
  document.addEventListener("click",event=>{if(event.target.closest('[role="tab"],#a-mode'))requestAnimationFrame(refresh);});
  document.addEventListener("toggle",event=>{
    if(event.target.id === "r-choice-details") { decorate("r"); redraw(); }
  },true);
  window.addEventListener("resize",redraw);
  new MutationObserver(redraw).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  document.fonts.ready.then(redraw);
  window.StudioFlow=Object.freeze({refresh,version:"flow-emphasis-1"});
  refresh();
})();
