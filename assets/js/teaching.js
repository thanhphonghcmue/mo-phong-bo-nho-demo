/* Teaching layer: immutable event snapshots; original allocation/replacement engines are reused. */
window.enhanceMemoryDemo = function (api) {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const copy = (x) => structuredClone(x),
    esc = (x) =>
      String(x ?? "—").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const restore = (target, s) => {
    const saved = copy(s);
    Object.keys(target).forEach((k) => delete target[k]);
    Object.assign(target, saved);
  };
  const { B, A, F, X, V, R } = api,
    timelines = {};
  let playing = null,
    timer = null;
  function pause() {
    clearTimeout(timer);
    timer = null;
    playing = null;
    api.stopAll();
    $$("[data-teach-play]").forEach((b) => (b.textContent = "⏵ Tự chạy"));
  }
  function play(t) {
    if (playing === t) {
      pause();
      return;
    }
    pause();
    playing = t;
    const tick = () => {
      if (playing !== t) return;
      if (!t.canNext()) {
        pause();
        return;
      }
      t.next();
      const b = $("#" + t.id + "-play");
      if (b) b.textContent = "⏸ Tạm dừng";
      const sp = (t && t.speed && t.speed.value) ? Number(t.speed.value) : 1;
      timer = setTimeout(tick, 1300 / (sp || 1));
    };
    const b = $("#" + t.id + "-play");
    if (b) b.textContent = "⏸ Tạm dừng";
    const sp = (t && t.speed && t.speed.value) ? Number(t.speed.value) : 1;
    timer = setTimeout(tick, 1300 / (sp || 1));
  }
  function event(
    state,
    title,
    actor,
    condition,
    change,
    next,
    path = "",
    kind = "request",
    status = "kiểm tra",
    note = "",
  ) {
    return {
      state: copy(state),
      title,
      actor,
      condition,
      change,
      next,
      path,
      kind,
      status,
      note,
    };
  }

  /* HÀM GIẢI THÍCH NGUYÊN LÝ HOẠT ĐỘNG TINH GỌN (1-2 CÂU, KHÔNG DẪN NGUỒN) */
  function renderDeepExplanation(id, e, stepIndex) {
    const s = e.state || {};
    const title = e.title || "";
    let mech = "";

    if (id === "b") {
      if (B.mode === "translate") {
        if (stepIndex === 0) {
          mech = `CPU phát độ lệch logic L = ${B.offset}. Độ lệch này tương đối tính từ đầu vùng nhớ của tiến trình.`;
        } else if (stepIndex === 1) {
          mech = B.isValid
            ? `MMU so sánh: 0 ≤ ${B.offset} < Limit (${B.limit}). Độ lệch hợp lệ, nằm trong kích thước vùng nhớ được cấp phát.`
            : `Độ lệch L = ${B.offset} vượt giới hạn Limit (${B.limit}) hoặc âm! MMU kích hoạt ngắt bảo vệ TRAP.`;
        } else if (stepIndex === 2) {
          mech = B.isValid
            ? `Bộ cộng MMU tính địa chỉ vật lý: PA = Base + L = ${B.base} + ${B.offset} = ${B.pa}.`
            : `MMU chặn bộ cộng Adder và kích hoạt bẫy ngắt TRAP chuyển điều khiển về Hệ điều hành.`;
        } else {
          mech = B.isValid
            ? `MMU phát tín hiệu địa chỉ vật lý PA = ${B.pa} lên bus RAM. Truy cập bộ nhớ thành công.`
            : `Hệ điều hành nhận bẫy ngắt TRAP và báo lỗi truy cập bộ nhớ (Segmentation Fault).`;
        }
      } else {
        if (stepIndex === 0) {
          mech = `CPU phát địa chỉ ô nhớ A = ${s.addr}. MMU chặn tín hiệu để kiểm tra an toàn trước khi cho phép vào RAM.`;
        } else if (stepIndex === 1) {
          mech = s.addr >= s.base
            ? `Thỏa mãn điều kiện A ≥ Base (${s.addr} ≥ ${s.base}). Địa chỉ nằm phía trên vùng nhớ của Hệ điều hành.`
            : `Vi phạm cận dưới! A < Base (${s.addr} < ${s.base}) chạm vào vùng nhớ bảo mật của Hệ điều hành.`;
        } else if (stepIndex === 2) {
          mech = s.addr < s.base + s.limit
            ? `Thỏa mãn điều kiện A < Base + Limit. Địa chỉ nằm trong kích thước được cấp phép của tiến trình.`
            : `Vi phạm biên trên! A ≥ Base + Limit vượt quá dung lượng cho phép, có nguy cơ ghi đè sang tiến trình khác.`;
        } else {
          mech = s.isValid
            ? `Địa chỉ A = ${s.addr} nằm trong miền an toàn. MMU cho phép truy cập RAM an toàn.`
            : `Địa chỉ ngoài miền! MMU phát sinh ngắt phần cứng TRAP báo lỗi bảo vệ bộ nhớ (Segmentation Fault).`;
        }
      }
    } else if (id === "f" || id === "a") {
      if (title.includes("xin") || title.includes("Yêu cầu")) {
        mech = `Tiến trình yêu cầu cấp phát bộ nhớ trong RAM. Hệ điều hành chuẩn bị duyệt các lỗ trống.`;
      } else if (title.includes("Xét lỗ") || title.includes("Tìm")) {
        mech = `Hệ điều hành kiểm tra kích thước lỗ trống theo chiến lược đang chọn để xác định vị trí phù hợp.`;
      } else if (title.includes("Cấp phát") || title.includes("Đặt")) {
        mech = `HĐH đặt tiến trình vào lỗ trống đã chọn, tách phần dư thành lỗ trống mới và cập nhật RAM.`;
      } else if (title.includes("Giải phóng") || title.includes("Tắt")) {
        mech = `Tiến trình kết thúc, vùng nhớ được hoàn trả thành lỗ trống và tự động hợp nhất với lỗ kề cận.`;
      } else if (title.includes("Dồn nén")) {
        mech = `Dồn tất cả tiến trình về một đầu RAM để gom các lỗ trống nhỏ rải rác thành một khối bộ nhớ trống lớn.`;
      } else {
        mech = `Hệ điều hành cập nhật danh sách phân vùng và các lỗ trống trong RAM.`;
      }
    } else if (id === "x") {
      if (title.includes("phát")) {
        mech = `CPU phát địa chỉ logic trong không gian địa chỉ ảo của chương trình.`;
      } else if (title.includes("tách")) {
        mech = `MMU tách địa chỉ logic thành số hiệu trang (Page number p) và độ lệch trong trang (Offset d).`;
      } else if (title.includes("TLB")) {
        mech = title.includes("Hit")
          ? `Tìm thấy ánh xạ trang trong bộ nhớ đệm nhanh TLB (TLB Hit). Lấy ngay số khung vật lý.`
          : `Không tìm thấy trong TLB (TLB Miss). MMU truy xuất Bảng trang trong RAM để tra cứu khung.`;
      } else if (title.includes("Bảng trang") || title.includes("PTE")) {
        mech = `MMU đọc mục trong Bảng trang (PTE), kiểm tra bit hiện diện và lấy số khung vật lý (frame).`;
      } else if (title.includes("Ghép") || title.includes("Địa chỉ")) {
        mech = `MMU ghép số khung vật lý (frame) với độ lệch (offset d) để tạo thành địa chỉ vật lý PA hoàn chỉnh.`;
      } else {
        mech = `Truy cập trực tiếp vào ô nhớ RAM tại địa chỉ vật lý PA vừa dịch được.`;
      }
    } else if (id === "v") {
      if (title.includes("Phát hiện") || title.includes("Trap")) {
        mech = `Phần cứng phát hiện bit present = 0, phát tín hiệu ngắt Page Fault Trap chuyển về Hệ điều hành.`;
      } else if (title.includes("Xác thực") || title.includes("tìm")) {
        mech = `Bộ xử lý lỗi trang của HĐH kiểm tra tính hợp lệ và định vị khối trang trên bộ nhớ phụ.`;
      } else if (title.includes("Chọn khung") || title.includes("khung trống")) {
        mech = `HĐH chọn một khung RAM trống để nạp; nếu RAM đầy, thuật toán thay thế sẽ chọn một nạn nhân.`;
      } else if (title.includes("I/O") || title.includes("Nạp")) {
        mech = `Bộ điều khiển thiết bị đọc khối trang từ bộ nhớ phụ nạp vào khung RAM đã chọn.`;
      } else if (title.includes("Cập nhật") || title.includes("PTE")) {
        mech = `HĐH cập nhật Bảng trang: ghi nhận số khung vừa nạp và bật bit present = 1 sẵn sàng trong RAM.`;
      } else {
        mech = `Khôi phục trạng thái tiến trình và CPU chạy lại lệnh. Lần này truy cập thành công (Hit).`;
      }
    } else if (id === "r") {
      if (title.includes("Hit") || title.includes("trúng")) {
        mech = `Trang yêu cầu đã nằm sẵn trong một khung RAM (Page Hit). Cập nhật mốc thời gian hoặc bit tham chiếu.`;
      } else if (title.includes("trống") || title.includes("nạp")) {
        mech = `RAM còn khung trống. Trang mới được nạp trực tiếp vào khung mà không cần loại bỏ trang nào.`;
      } else if (title.includes("Thay") || title.includes("Victim") || title.includes("nạn nhân")) {
        mech = `RAM đầy, thuật toán chọn một trang nạn nhân trong RAM để hoán đổi ra bộ nhớ phụ nhường chỗ.`;
      } else {
        mech = `Thuật toán cập nhật con trỏ và dữ liệu thống kê để tối ưu quyết định thay thế tiếp theo.`;
      }
    }

    return `<div style="font-size:13px;line-height:1.55;color:var(--fg);padding:8px 12px;background:var(--free);border-left:4px solid var(--accent);border-radius:6px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.03)">${esc(mech || e.change || "Hệ điều hành thực hiện thao tác theo giải thuật.")}</div>`;
  }

  function route(e) {
    return `<div class="teach-path" data-kind="${esc(e.kind)}"><span>${esc({ request: "Yêu cầu / điều khiển", translation: "Dịch địa chỉ", read: "Đọc RAM", write: "Ghi RAM", "page-in": "Dữ liệu nạp trang", "page-out": "Dữ liệu ghi trang", trap: "TRAP → hệ điều hành" }[e.kind])}</span><span class="teach-packet">${esc(e.path || e.actor)}</span></div>`;
  }
  // Connect the actual components with one active, typed edge per event.
  function connect(root, from, to, e, speed = 1) {
    if (!root || !from || !to || from === to) return;
    root.querySelector(".teach-wire")?.remove();
    const r = root.getBoundingClientRect(),
      a = from.getBoundingClientRect(),
      b = to.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ac = {
        x: a.left + a.width / 2 - r.left,
        y: a.top + a.height / 2 - r.top,
      },
      bc = {
        x: b.left + b.width / 2 - r.left,
        y: b.top + b.height / 2 - r.top,
      };
    if (to && to.id && (to.id === "f-ram" || to.id === "a-ram")) {
      ac.x += 50;
      bc.x += 50;
    }
    const horizontal = Math.abs(ac.x - bc.x) > Math.abs(ac.y - bc.y);
    const x1 = horizontal
      ? ac.x < bc.x
        ? a.right - r.left
        : a.left - r.left
      : ac.x;
    const y1 = horizontal
      ? ac.y
      : ac.y < bc.y
        ? a.bottom - r.top
        : a.top - r.top;
    const x2 = horizontal
      ? ac.x < bc.x
        ? b.left - r.left
        : b.right - r.left
      : bc.x;
    const y2 = horizontal
      ? bc.y
      : ac.y < bc.y
        ? b.top - r.top
        : b.bottom - r.top;
    const mid = horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2;
    const d = horizontal
      ? `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`
      : `M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2}`;
    const color =
      e.kind === "trap"
        ? "var(--bad)"
        : e.kind === "page-out"
          ? "var(--c2)"
          : e.kind === "page-in"
            ? "var(--ok)"
            : "var(--accent)";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("teach-wire");
    svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    svg.setAttribute("aria-hidden", "true");
    const id = "wire-" + root.id;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? ""
      : `<circle r="5" fill="${color}"><animateMotion dur="${0.8 / speed}s" path="${d}" repeatCount="1" fill="freeze"/></circle>`;
    svg.innerHTML = `<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="${color}"/></marker></defs><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" ${["trap", "request"].includes(e.kind) ? 'stroke-dasharray="5 4"' : ""} marker-end="url(#${id})"/>${motion}`;
    root.append(svg);
  }
  function drawEvent(t, e) {
    const id = t.id;
    if (id === "v") {
      const root = $("#v-flow");
      root.dataset.demo = "v";
      const [cpu, ram, store, os] = [...root.children].filter(
        (c) => !c.classList.contains("teach-wire"),
      );
      let from = cpu,
        to = ram;
      if (e.kind === "trap") {
        from = cpu;
        to = os;
      } else if (e.kind === "page-in") {
        from = store;
        to = ram.querySelector(`[data-frame="${V.plan.chosenFrame}"]`) || ram;
      } else if (e.kind === "page-out") {
        from = ram;
        to = store;
      } else if (e.kind === "read") {
        from = ram;
        to = cpu;
      } else if (e.title.includes("Định vị")) {
        from = os;
        to = store;
      } else if (e.kind === "translation") {
        from = os;
        to = ram.querySelector(".teach-table") || ram;
      }
      connect(root, from, to, e, ((t && t.speed && t.speed.value) ? Number(t.speed.value) : 1));
    } else if (id === "x") {
      const root = $("#x-flow"),
        cpu = root.children[0],
        ram = root.children[1],
        output = root.children[2];
      const to =
        e.kind === "read"
          ? cpu
          : e.title.includes("vật lý")
            ? output
            : e.title.includes("Tách")
              ? null
              : ram;
      connect(
        root,
        e.kind === "read" ? ram : cpu,
        to,
        e,
        ((t && t.speed && t.speed.value) ? Number(t.speed.value) : 1),
      );
    } else if (id === "r") {
      const root = $("#p3 .scene");
      root.id = "r-scene";
      connect(
        root,
        e.kind === "page-in"
          ? root.querySelector(".disk")
          : e.kind === "read"
            ? root.querySelector(".ramzone")
            : $("#r-need"),
        e.kind === "read" ? $("#r-need") : root.querySelector(".ramzone"),
        e,
        ((t && t.speed && t.speed.value) ? Number(t.speed.value) : 1),
      );
    } else if (id === "a" || id === "f") {
      const root = $("#" + id + "-ram").parentElement;
      root.id = id + "-lane";
      connect(
        root,
        $("#" + id + "-req"),
        root.querySelector(".teach-scan") || $("#" + id + "-ram"),
        e,
        ((t && t.speed && t.speed.value) ? Number(t.speed.value) : 1),
      );
    }
  }
  function node(title, body, active = false, bad = false) {
    return `<div class="teach-node ${active ? "teach-active" : ""} ${active && bad ? "teach-fault" : ""}"><h3>${title}</h3>${body}</div>`;
  }
  function table(headers, rows) {
    return `<table class="teach-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }
  function error(id, msg) {
    let el = $("#" + id + "-error");
    if (!el) {
      el = document.createElement("p");
      el.id = id + "-error";
      el.className = "teach-error";
      el.setAttribute("role", "alert");
      $("#" + id + "-cap").before(el);
    }
    el.textContent = msg;
    return false;
  }
  function clearError(id) {
    const e = $("#" + id + "-error");
    if (e) e.textContent = "";
  }
  const names = {
    first: "First-fit",
    best: "Best-fit",
    worst: "Worst-fit",
    CLOCK: "Clock",
    FIFO: "FIFO",
    LRU: "LRU",
    OPT: "OPT",
  };
  const configs = {};
  function integer(raw, label, min = 0, max = 1e9) {
    const text = String(raw).trim(),
      value = Number(text);
    if (
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    )
      throw Error(`${label}: nhập số nguyên ${min}..${max}.`);
    return value;
  }
  function numbers(
    raw,
    label,
    { nullable = false, empty = false, max = 9999, min = 0 } = {},
  ) {
    const text = String(raw).trim();
    if (!text) {
      if (empty) return [];
      throw Error(`${label}: chưa có dữ liệu.`);
    }
    return text
      .split(/[\s,;]+/)
      .map((token) =>
        nullable && token === "-" ? null : integer(token, label, min, max),
      );
  }
  function unique(items, label) {
    if (new Set(items).size !== items.length)
      throw Error(`${label}: không được trùng giá trị.`);
  }
  function orderFor(raw, frames, label) {
    const resident = frames.filter((p) => p !== null),
      order = numbers(raw, label, { empty: true });
    if (!order.length) return resident;
    unique(order, label);
    if (
      order.length !== resident.length ||
      order.some((p) => !resident.includes(p))
    )
      throw Error(
        `${label}: phải liệt kê đúng các trang đang ở RAM, mỗi trang một lần.`,
      );
    return order;
  }
  function seedFor(frames, bits, hand, order, recent) {
    unique(
      frames.filter((p) => p !== null),
      "Các trang trong RAM",
    );
    const bit = numbers(bits, "Bit R", { empty: true, max: 1 });
    if (bit.length && bit.length !== frames.length)
      throw Error("Bit R: cần đúng một bit cho mỗi khung.");
    if (bit.some((b, i) => frames[i] === null && b !== 0))
      throw Error("Khung trống phải có R=0.");
    return {
      fr: copy(frames),
      bit: bit.length ? bit : frames.map((p) => +(p !== null)),
      ptr: integer(hand, "Vị trí kim", 0, frames.length - 1),
      order: orderFor(order, frames, "Thứ tự nạp"),
      recent: orderFor(recent, frames, "Thứ tự sử dụng"),
      time: 0,
    };
  }
  function field(id, label, value, type = "text", help = "") {
    return `<label class="field"><span>${label}</span><${type === "textarea" ? "textarea" : "input"} id="${id}" ${type === "textarea" ? 'rows="3"' : `type="${type}" value="${esc(value)}"`} ${type === "number" ? 'step="1"' : ""}>${type === "textarea" ? esc(value) + "</textarea>" : ""}${help ? `<small>${help}</small>` : ""}</label>`;
  }
  function configPanel(id, anchor, fields, onApply, onSample) {
    const el = document.createElement("details");
    el.className = "teach-config";
    el.id = id + "-config";
    el.innerHTML = `<summary>Đổi đề bài & trạng thái ban đầu</summary><form class="teach-config-form"><p class="teach-config-help">Sửa số liệu rồi bấm <b>Áp dụng & bắt đầu lại</b>. Nút Làm lại giữ đề đã áp dụng.</p><div class="teach-config-grid">${fields}</div><div class="bar"><button class="btn primary" type="submit" id="${id}-config-apply">Áp dụng & bắt đầu lại</button><button class="btn" type="button" id="${id}-config-sample">Khôi phục mẫu mặc định</button></div><p class="teach-config-status" role="status"></p></form>`;
    anchor.before(el);
    configs[id] = el;
    const status = el.querySelector(".teach-config-status"),
      form = el.querySelector("form");
    form.noValidate = true;
    form.addEventListener("input", () => {
      status.className = "teach-config-status";
      status.textContent = "Chưa áp dụng: mô hình vẫn dùng đề đang chạy.";
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      try {
        onApply();
        clearError(id);
        status.className = "teach-config-status";
        status.textContent =
          "Đã áp dụng đề mới; lịch sử bắt đầu lại từ trạng thái ban đầu.";
      } catch (err) {
        status.className = "teach-config-status teach-error";
        status.textContent = err.message;
      }
    };
    $("#" + id + "-config-sample").onclick = () => {
      onSample();
      status.className = "teach-config-status";
      status.textContent = "Đã khôi phục mẫu mặc định.";
    };
    return el;
  }
  function activeSetup(id, text) {
    let el = $("#" + id + "-active-setup");
    if (!el) {
      el = document.createElement("p");
      el.id = id + "-active-setup";
      el.className = "teach-active-setup";
      const anchor = configs[id] || $("#" + id + "-cap");
      if (configs[id]) anchor.after(el);
      else anchor.before(el);
    }
    el.textContent = "Đề đang chạy · " + text;
  }
  function resetConfigNotice(id) {
    const status = configs[id]?.querySelector(".teach-config-status");
    if (status) {
      status.className = "teach-config-status";
      status.textContent = "Đang dùng đề đã áp dụng.";
    }
  }
  const read = (id) => $("#" + id).value;
  const set = (id, value) => {
    if ($("#" + id)) $("#" + id).value = value;
  };
  const joined = (items) => items.map((x) => x ?? "-").join(", ");
  class Timeline {
    constructor(id, panel, target, render, note) {
      this.id = id;
      this.panel = panel;
      this.target = target;
      this.renderModel = render;
      this.note = note;
      this.events = [];
      this.cursor = 0;
      this.seen = 0;
      this.duration = 0;
      timelines[id] = this;
      const bar = $("#" + id + "-next").parentElement;
      const options = document.createElement("div");
      options.className = "teach-options";
      options.innerHTML = `<strong>TÙY CHỌN HIỂN THỊ</strong>${[
        ["explain", "Hiện giải thích bước", true],
        ["path", "Hiện đường đi dữ liệu", true],
        ["history", "Hiện lịch sử các bước", true],
      ]
        .map(
          ([key, label, on]) =>
            `<label><input type="checkbox" data-option="${key}" ${on ? "checked" : ""}>${label}</label>`,
        )
        .join("")}`;
      bar.after(options);
      this.options = options;
      // Speed removed
      const history = document.createElement("details");
      history.className = "teach-history";
      history.open = false;
      history.innerHTML =
        "<summary>LỊCH SỬ CÁC BƯỚC ĐÃ THỰC HIỆN</summary><ol></ol>";
      options.after(history);
      this.history = history;
      const noteEl = document.createElement("div");
      noteEl.className = "teach-note";
      noteEl.hidden = true;
      history.after(noteEl);
      this.noteEl = noteEl;
      const root = bar.closest(".stage");
      this.root = root;
      this.speed = { value: "1" };
      const histToggleBtn = $("#" + id + "-hist-toggle");
      if (histToggleBtn) {
        histToggleBtn.onclick = () => {
          this.history.open = !this.history.open;
        };
      }
      options.addEventListener("change", () => this.applyOptions());
      $("#" + id + "-next").onclick = () => this.next();
      $("#" + id + "-prev").onclick = () => {
        pause();
        this.go(this.cursor - 1);
      };
      const all = $("#" + id + "-all");
      if (all)
        all.onclick = () => {
          pause();
          let guard = 0;
          while (this.canNext() && guard++ < 500) this.next();
        };
      let pb = $("#" + id + "-play");
      if (!pb) {
        pb = document.createElement("button");
        pb.id = id + "-play";
        pb.className = "btn";
        pb.textContent = "⏵ Tự chạy";
        bar.append(pb);
      }
      pb.dataset.teachPlay = "true";
      pb.onclick = () => play(this);
    }
    applyOptions() {
      const on = (k) => {
        const inp = this.options.querySelector(`[data-option="${k}"]`);
        return inp ? inp.checked : true;
      };
      this.root.classList.toggle("teach-no-explain", !on("explain"));
      this.root.classList.toggle("teach-no-path", !on("path"));
      if (this.history) this.history.hidden = !on("history");
    }
    load(events, duration = 0) {
      pause();
      this.scenario = (this.scenario || 0) + 1;
      events.forEach((e, i) => {
        e.scenarioId = this.id + "-" + this.scenario;
        e.stepId = i;
        e.beforeState = copy(i ? events[i - 1].state : e.state);
      });
      this.events = events;
      this.cursor = 0;
      this.seen = 0;
      this.duration = duration;
      this.go(0);
    }
    canNext() {
      return (
        this.cursor < this.events.length - 1 || !!(this.generate && this.more())
      );
    }
    next() {
      if (
        this.cursor === this.events.length - 1 &&
        this.generate &&
        this.more()
      ) {
        const started = performance.now();
        const e = this.generate();
        this.duration = performance.now() - started;
        if (e) {
          e.beforeState = copy(this.events[this.cursor].state);
          e.stepId = this.events.length;
          e.scenarioId = this.id + "-" + this.scenario;
          this.events.push(e);
        }
      }
      this.go(Math.min(this.cursor + 1, this.events.length - 1));
    }
    append(e) {
      pause();
      this.events = this.events.slice(0, this.cursor + 1);
      this.seen = this.cursor;
      e.beforeState = copy(this.events[this.cursor].state);
      e.stepId = this.events.length;
      e.scenarioId = this.id + "-" + this.scenario;
      this.events.push(e);
      this.go(this.events.length - 1);
    }
    go(i) {
      if (i < 0 || i >= this.events.length) return;
      this.cursor = i;
      this.seen = Math.max(this.seen, i);
      const e = this.events[i];
      restore(this.target, e.state);
      const t0 = performance.now();
      this.renderModel(e, this);
      drawEvent(this, e);
      const cap = $("#" + this.id + "-cap");
      if (cap) {
        cap.classList.add("teach-narrator");
        const deepExp = renderDeepExplanation(this.id, e, i);
        cap.innerHTML = `<div style="font-size:14.5px;font-weight:800;color:var(--accent);margin-bottom:4px;letter-spacing:0.2px">Bước ${i + 1} · ${esc(e.title)}</div>
          <div style="font-size:13.5px;margin:3px 0;line-height:1.45;color:var(--fg)"><b>${esc(e.actor)}:</b> ${esc(e.condition)}</div>
          <div style="font-size:13.5px;margin-bottom:8px;line-height:1.45;color:var(--fg)">${esc(e.change)}</div>
          <details class="teach-next" open style="margin-top:6px">
            <summary style="font-weight:800;color:var(--accent);cursor:pointer;padding:4px 0;font-size:13px">▼ Giải thích nguyên lý hoạt động</summary>
            ${deepExp}
          </details>`;
      }
      this.noteEl.textContent = e.note || this.note;
      this.history.querySelector("ol").innerHTML = this.events
        .slice(0, this.seen + 1)
        .map(
          (x, j) =>
            `<li><button type="button" data-step="${j}" aria-current="${j === i ? "step" : "false"}"><b>${j + 1}. ${esc(x.title)}</b> · ${esc(x.actor)} · ${esc(x.status)}<small>${esc(x.change)}</small></button></li>`,
        )
        .join("");
      this.history.querySelectorAll("button").forEach(
        (b) =>
          (b.onclick = () => {
            pause();
            this.go(Number(b.dataset.step));
          }),
      );
      $("#" + this.id + "-prev").disabled = i === 0;
      $("#" + this.id + "-next").disabled = !this.canNext();
      const all = $("#" + this.id + "-all");
      if (all) all.disabled = !this.canNext();
      this.applyOptions();
      const list = this.history.querySelector("ol"),
        current = list.querySelector('[aria-current="step"]');
      if (current && !this.history.hidden) {
        const a = current.getBoundingClientRect(),
          b = list.getBoundingClientRect();
        if (a.bottom > b.bottom) list.scrollTop += a.bottom - b.bottom;
        if (a.top < b.top) list.scrollTop -= b.top - a.top;
      }
      if (api.updateTelemetry) api.updateTelemetry(this.panel, 0.05);
    }
    updateTelemetry(renderTime) {
      const panel = this.panel;
      api.updateTelemetry(panel, this.duration);
      const rows = $$("#tele-" + panel + " .tele-col:first-child tbody tr");
      if (rows[4])
        rows[4].children[1].textContent = renderTime.toFixed(3) + " ms";
      const box = $("#tele-" + panel + " .tele-sim-box");
      let metrics;
      if (this.id === "v")
        metrics = {
          "Số trang / khung": `${V.pt.length} / ${V.ram.length}`,
          "Chính sách": names[V.policy],
          "Trang yêu cầu": V.page,
          "Trạng thái": this.events[this.cursor].status,
          "Page Hit": V.hits,
          "Page Fault": V.faults,
          "I/O đọc / ghi": `${V.reads} / ${V.writes}`,
          "Khung trống": V.freeFrames.length,
          "Truy cập bị từ chối": V.denied,
        };
      if (this.id === "x")
        metrics = {
          "Kích thước trang (B)": X.pageSize,
          "Số trang / số khung": `${X.pt.length} / ${X.frameCount}`,
          "Địa chỉ logic": X.plan.addr,
          "Trang / độ lệch": X.plan.err ? "—" : `${X.plan.p} / ${X.plan.d}`,
          "TLB hit / miss": `${X.hit} / ${X.miss}`,
          "Page Fault": X.faults,
          "Địa chỉ vật lý":
            this.events[this.cursor].kind === "read"
              ? X.plan.phys
              : "chưa tạo PA",
        };
      if (this.id === "r")
        metrics = {
          "Thuật toán": R.alg,
          "Tham chiếu đã hoàn tất": `${R.runtime.done} / ${R.refs.length}`,
          "Số khung": R.n,
          "Page Fault": R.runtime.faults,
          "Page Hit": R.runtime.hits,
          "Kim Clock": R.runtime.ptr,
        };
      if (this.id === "f") {
        const holes = F.segs.filter((s) => !s.name);
        metrics = {
          "Thuật toán": names[A.alg],
          "RAM (KB)": F.capacity,
          "Đã dùng (KB)": F.capacity - holes.reduce((n, s) => n + s.size, 0),
          "Tổng trống (KB)": holes.reduce((n, s) => n + s.size, 0),
          "Lỗ lớn nhất (KB)": Math.max(0, ...holes.map((s) => s.size)),
          "Đang chờ": F.waiting.length,
        };
      }
      if (this.id === "a")
        metrics = {
          "Thuật toán": A.alg,
          "Tiến trình đã xử lý": Math.floor(A.s / 2),
          "Tổng trống (KB)": A.runtime.free.reduce((a, b) => a + b, 0),
          "Lỗ lớn nhất (KB)": Math.max(0, ...A.runtime.free),
        };
      if (metrics)
        box.innerHTML = Object.entries(metrics)
          .map(
            ([k, v]) =>
              `<div class="sim-row"><span class="sim-k">${esc(k)}</span><span class="sim-v">${esc(v)}</span></div>`,
          )
          .join("");
    }
  }
  $$(".dash-tab").forEach((b) =>
    b.addEventListener("click", () => {
      pause();
      const panel = b.getAttribute("aria-controls");
      const id =
        panel === "p1"
          ? $("#e-wrap").hidden
            ? "f"
            : "a"
          : { p0: "b", p2: "x", p4: "v", p3: "r" }[panel];
      const t = timelines[id];
      if (t) t.go(t.cursor);
    }),
  );
  // DEMO 4: actual page-in and PTE commits are separate, reversible events.
  function initialV(full = false, dirty = false) {
    const ram = full
      ? [2, 8, 0, 9, 1, 10, 4, 11]
      : [2, null, 0, null, 1, null, 4, null];
    const pt = Array.from({ length: full ? 12 : 8 }, (_, page) => ({
      page,
      mapped: true,
      permission: page !== 7,
      present: ram.includes(page),
      valid: ram.includes(page),
      frame: ram.includes(page) ? ram.indexOf(page) : null,
      dirty: dirty && page === 2,
    }));
    return {
      pt,
      ram,
      freeFrames: ram.flatMap((p, f) => (p === null ? [f] : [])),
      fifo: ram.filter((p) => p !== null),
      replacement: seedFor(ram, "", 0, "", ""),
      policy: "FIFO",
      operation: "read",
      page: 3,
      st: 0,
      plan: null,
      accesses: 0,
      hits: 0,
      faults: 0,
      reads: 0,
      writes: 0,
      denied: 0,
    };
  }
  let vBase = initialV(),
    vOrigin = copy(vBase),
    vRefs = [3];
  function commitReplacement(s, selection) {
    s.replacement = copy(selection.after);
    s.fifo = selection.after.fr
      .flatMap((p, f) =>
        p === null ? [] : [{ page: p, load: selection.after.load[f] }],
      )
      .sort((a, b) => a.load - b.load)
      .map((e) => e.page);
  }
  function buildV(page, base) {
    const s = copy(base),
      events = [];
    s.page = page;
    s.accesses++;
    const pte = s.pt[page],
      denied = !pte || !pte.mapped || !pte.permission;
    const initiallyResident = !!pte?.present;
    const selection = denied
      ? null
      : api.simR([page], s.ram.length, s.policy, s.replacement)[0];
    const instruction = s.operation === "write" ? "STORE M" : "LOAD M";
    let frame = pte?.frame;
    const add = (
      title,
      actor,
      condition,
      change,
      next,
      path,
      kind = "request",
      status = "kiểm tra",
      mutate = () => {},
    ) => {
      mutate();
      s.st = events.length;
      s.plan = {
        page,
        hit: initiallyResident,
        oob: denied,
        frame,
        chosenFrame: frame,
        victim: selection?.victim ?? null,
      };
      events.push(
        event(
          s,
          title,
          actor,
          condition,
          change,
          next,
          path,
          kind,
          status,
          `mapped/quyền khác present. Chính sách ${names[s.policy]}; chỉ trang dirty cần ghi lại. CPU đọc/ghi dữ liệu trong RAM.`,
        ),
      );
    };
    add(
      "CPU tham chiếu trang",
      "CPU → MMU",
      `${instruction} cần trang ${page}.`,
      `PTE[${page}]: ${denied ? "ngoài miền / không có quyền" : `present=${+pte.present}`}. RAM chưa thay đổi.`,
      denied
        ? "Trap lỗi truy cập."
        : pte.present
          ? "Dịch địa chỉ và đọc RAM."
          : "Phát sinh Page Fault.",
      `CPU → MMU → RAM / PTE[${page}]`,
    );
    if (denied) {
      add(
        "Từ chối truy cập",
        "MMU → OS",
        !pte
          ? "Trang ngoài không gian địa chỉ."
          : !pte.mapped
            ? `Trang ${page} không được ánh xạ.`
            : `Trang ${page} không có quyền truy cập.`,
        "denied tăng 1; không tăng fault, không thực hiện I/O.",
        "Dừng lệnh; không nạp trang.",
        "MMU ⇢ TRAP quyền truy cập ⇢ OS",
        "trap",
        "lỗi truy cập",
        () => s.denied++,
      );
      return events;
    }
    if (pte.present) {
      add(
        "Page Hit · dịch địa chỉ",
        "MMU",
        `PTE[${page}].present=1.`,
        `Trang ${page} → khung ${frame}; hit +1.`,
        s.operation === "write"
          ? "CPU ghi vào khung RAM và đặt dirty=1."
          : "CPU đọc khung dữ liệu trong RAM.",
        `MMU → RAM / PTE → khung ${frame}`,
        "translation",
        "thành công",
        () => s.hits++,
      );
      add(
        s.operation === "write" ? "Ghi RAM · hoàn tất" : "Đọc RAM · hoàn tất",
        "CPU / RAM",
        "Trang đã hiện diện, không cần I/O.",
        s.operation === "write"
          ? `Ghi trang ${page} ở khung ${frame}; dirty → 1, không I/O.`
          : `Đọc trang ${page} tại khung ${frame}; không I/O.`,
        "Chọn trang khác để thử.",
        s.operation === "write"
          ? `CPU → RAM / khung ${frame}`
          : `CPU ← RAM / khung ${frame}`,
        s.operation === "write" ? "write" : "read",
        "thành công",
        () => {
          commitReplacement(s, selection);
          if (s.operation === "write") s.pt[page].dirty = true;
        },
      );
      return events;
    }
    add(
      "Page Fault · trap sang OS",
      "MMU → OS",
      `Trang ${page} được cấp quyền nhưng present=0.`,
      `Fault +1; CPU tạm dừng ${instruction}; RAM chưa đổi.`,
      "OS xác định vị trí trang trên bộ nhớ phụ.",
      "MMU ⇢ TRAP Page Fault ⇢ OS",
      "trap",
      "page fault",
      () => s.faults++,
    );
    add(
      "Định vị trang trên bộ nhớ phụ",
      "OS / Page Fault Handler",
      `mapped=1, permission=1; trang ${page} chưa resident.`,
      `Tìm thấy bản lưu Trang ${page} trong Backing Store.`,
      "Lấy khung trống hoặc chọn nạn nhân.",
      `OS → yêu cầu I/O → Backing Store / Trang ${page}`,
    );
    if (!s.freeFrames.length) {
      const victim = selection.victim;
      frame = s.pt[victim].frame;
      add(
        `RAM đầy · chọn victim ${names[s.policy]}`,
        "OS / Bộ chọn nạn nhân",
        `Không còn khung trống. ${names[s.policy]} chọn trang để thay.`,
        `Chọn Trang ${victim}, khung ${frame}; ${s.policy === "FIFO" ? "nạp sớm nhất" : s.policy === "LRU" ? "lâu chưa dùng nhất" : `R=0 sau ${selection.skipped.length} lần cho cơ hội thứ hai`}; dirty=${+s.pt[victim].dirty}.`,
        s.pt[victim].dirty
          ? "Ghi trang dirty trước khi nạp."
          : "Trang sạch: bỏ qua ghi, nạp trang mới.",
        `OS → RAM / victim Trang ${victim}`,
        "request",
        "kiểm tra",
        () => {
          if (s.policy === "CLOCK") {
            const runtime = copy(selection.before);
            let pointer = runtime.ptr;
            for (const ignored of selection.skipped) {
              runtime.bit[pointer] = 0;
              pointer = (pointer + 1) % s.ram.length;
            }
            runtime.ptr = selection.slot;
            s.replacement = runtime;
          }
        },
      );
      if (s.pt[victim].dirty)
        add(
          "Ghi lại trang dirty",
          "OS / I/O",
          `Trang ${victim} đã sửa đổi (dirty=1).`,
          `Trang ${victim}: dirty 1 → 0; I/O ghi +1.`,
          "Khung có thể dùng cho trang mới.",
          `RAM / Trang ${victim} → Backing Store`,
          "page-out",
          "thành công",
          () => {
            s.writes++;
            s.pt[victim].dirty = false;
          },
        );
      add(
        "Nạp trang vào khung nạn nhân",
        "OS / I/O",
        `Khung ${frame} được chọn; nội dung cũ đã an toàn.`,
        `RAM[${frame}]: Trang ${victim} → Trang ${page}; I/O đọc +1. PTE cũ bị vô hiệu hóa.`,
        `Cập nhật PTE[${page}].`,
        `Backing Store / Trang ${page} → RAM / khung ${frame}`,
        "page-in",
        "thành công",
        () => {
          s.pt[victim].present = s.pt[victim].valid = false;
          s.pt[victim].frame = null;
          s.ram[frame] = page;
          s.reads++;
          commitReplacement(s, selection);
        },
      );
    } else {
      frame = selection.slot;
      add(
        "Chọn khung trống và nạp trang",
        "OS / I/O",
        `Free-frame List = [${s.freeFrames}].`,
        `RAM[${frame}]: trống → Trang ${page}; I/O đọc +1; loại khung ${frame} khỏi free list.`,
        `Cập nhật PTE[${page}] sau khi I/O hoàn tất.`,
        `Backing Store / Trang ${page} → RAM / khung ${frame}`,
        "page-in",
        "thành công",
        () => {
          s.ram[frame] = page;
          s.freeFrames = s.freeFrames.filter((f) => f !== frame);
          commitReplacement(s, selection);
          s.reads++;
        },
      );
    }
    add(
      "Cập nhật bảng trang trong RAM",
      "OS",
      `Trang ${page} đã nạp xong vào khung ${frame}.`,
      `PTE[${page}]: present 0 → 1; frame — → ${frame}.`,
      `Khôi phục CPU, chạy lại ${instruction}.`,
      `OS → RAM / Page Table[${page}]`,
      "translation",
      "thành công",
      () => {
        Object.assign(s.pt[page], {
          frame,
          present: true,
          valid: true,
          dirty: false,
        });
      },
    );
    add(
      "Khởi động lại lệnh · hoàn tất",
      "CPU / RAM",
      "PTE đã hiện diện và quyền truy cập hợp lệ.",
      `${instruction} ${s.operation === "write" ? "ghi" : "đọc"} Trang ${page}, khung ${frame}${s.operation === "write" ? "; dirty → 1" : ""}; không tăng fault lần nữa.`,
      "Chọn trang khác hoặc quay lại lịch sử.",
      s.operation === "write"
        ? `CPU → RAM / khung ${frame}`
        : `CPU ← RAM / khung ${frame}`,
      s.operation === "write" ? "write" : "read",
      "thành công",
      () => {
        if (s.operation === "write") s.pt[page].dirty = true;
      },
    );
    return events;
  }
  function renderV(e) {
    activeSetup(
      "v",
      `${V.pt.length} trang, ${V.ram.length} khung; ${names[V.policy]}; ${V.operation === "write" ? "ghi" : "đọc"} trang ${V.page}${V.sequence ? `; tham chiếu ${V.seqIndex + 1}/${V.sequence.length}` : ""}.`,
    );
    const absent = vBase.pt.filter(
        (p) => p.mapped && p.permission && !p.present,
      ),
      present = vBase.pt.filter((p) => p.mapped && p.permission && p.present);
    const hp = present.find((p) => p.page === 1) || present[0];
    for (const [id, p, label] of [
      ["v-pre-fault", absent[0], "ban đầu chưa nạp"],
      ["v-pre-fault2", absent[1] || absent[0], "ban đầu chưa nạp"],
      ["v-pre-hit", hp, "ban đầu có trong RAM"],
    ]) {
      const el = $("#" + id);
      el.disabled = !p;
      el.textContent = p
        ? `Trang ${p.page} · ${label}`
        : `Không có trang ${label}`;
    }
    const stage = e.title;
    const frame = V.plan.chosenFrame;
    const active = stage.includes("CPU tham")
      ? "cpu"
      : e.kind === "translation"
        ? "pt"
        : ["read", "write"].includes(e.kind)
          ? "ram"
          : e.kind === "page-in"
            ? "ram"
            : e.kind === "page-out"
              ? "store"
              : "os";
    const rows = V.pt.map(
      (p) =>
        `<tr class="${p.page === V.page ? "teach-selected" : ""}"><td>${p.page}</td><td>${+p.mapped}/${+p.permission}</td><td>${+p.present}</td><td>${p.frame ?? "—"}</td><td>${+p.dirty}</td></tr>`,
    );
    $("#v-flow").className = "teach-diagram";
    $("#v-flow").innerHTML =
      node(
        "CPU + MMU",
        `<b>${V.operation === "write" ? "STORE M" : "LOAD M"}</b><p>Trang yêu cầu: ${V.page}</p><p>${V.plan.oob ? "Ngoài miền / quyền" : `mapped=1 · permission=1`}</p>`,
        active === "cpu",
      ) +
      `<div class="teach-ram ${active === "ram" || active === "pt" ? "teach-active" : ""}"><h3>RAM · ${V.ram.length} khung dữ liệu</h3><div class="teach-ram-content"><div><b>Page Table · trong RAM</b>${table(["Trang", "Map/Quyền", "Present", "Frame", "Dirty"], rows)}</div><div><b>Khung RAM (Frame)</b><div class="teach-frame-grid">${V.ram.map((p, f) => `<div class="teach-frame ${stage.includes("chọn victim") && f === frame ? "teach-victim" : f === frame && active === "ram" ? "teach-selected" : ""}" data-frame="${f}">Frame ${f}<b>${p === null ? "trống" : "Trang " + p}</b>${V.policy === "CLOCK" ? `<small>R=${V.replacement.bit[f]}${V.replacement.ptr === f ? " · kim" : ""}</small>` : ""}</div>`).join("")}</div></div></div></div>` +
      node(
        "BỘ NHỚ PHỤ",
        `<p>Backing Store / SSD–HDD minh họa</p><div class="teach-store-pages">${V.pt.map((p) => `<span class="${p.page === V.page && active === "store" ? "teach-selected" : ""}">Trang ${p.page}</span>`).join("")}</div><p>Bản lưu trang; CPU không chạy lệnh tại đây.</p>`,
        active === "store",
      ) +
      `<div class="teach-node teach-os ${active === "os" ? "teach-active" : ""} ${e.kind === "trap" ? "teach-fault" : ""}"><h3>OS · Page Fault Handler</h3><span>Kiểm tra quyền → chọn khung / ${names[V.policy]} → I/O → cập nhật PTE → chạy lại lệnh</span></div>` +
      route(e);
    if ($("#v-free-frames")) $("#v-free-frames").textContent = V.freeFrames.length
      ? V.freeFrames.map((f) => "Khung " + f).join(" · ")
      : "Hết khung trống";
    if ($("#v-disk-status")) $("#v-disk-status").textContent =
      e.kind === "page-in"
        ? "Đọc trang → RAM"
        : e.kind === "page-out"
          ? "Ghi trang dirty → Backing Store"
          : "Không I/O ở bước này";
    if ($("#v-stats")) $("#v-stats").textContent =
      `Truy cập ${V.accesses} · Hit ${V.hits} · Fault ${V.faults} · I/O đọc ${V.reads} / ghi ${V.writes}`;
  }
  const vt = new Timeline("v", "p4", V, renderV, "");
  function syncVConfig() {
    resetConfigNotice("v");
    set("v-c-pages", vBase.pt.length);
    set("v-c-frames", vBase.ram.length);
    set("v-c-ram", joined(vBase.ram));
    set(
      "v-c-dirty",
      joined(vBase.pt.filter((p) => p.dirty).map((p) => p.page)),
    );
    set(
      "v-c-denied",
      joined(vBase.pt.filter((p) => !p.permission).map((p) => p.page)),
    );
    set(
      "v-c-unmapped",
      joined(vBase.pt.filter((p) => !p.mapped).map((p) => p.page)),
    );
    set("v-c-order", joined(vBase.replacement.order || vBase.fifo));
    set("v-c-recent", joined(vBase.replacement.recent || vBase.fifo));
    set("v-c-bits", joined(vBase.replacement.bit));
    set("v-c-hand", vBase.replacement.ptr);
    set("v-c-policy", vBase.policy);
    set("v-c-refs", joined(vRefs));
    set("v-op", vBase.operation);
    $("#v-page").max = vBase.pt.length - 1;
  }
  function readVConfig() {
    const count = integer(read("v-c-pages"), "Số trang", 1, 32),
      n = integer(read("v-c-frames"), "Số khung RAM", 1, 16);
    const raw = numbers(read("v-c-ram"), "RAM ban đầu", {
        nullable: true,
        empty: true,
        max: count - 1,
      }),
      ram = raw.length ? raw : Array(n).fill(null);
    if (ram.length !== n)
      throw Error(`RAM ban đầu cần ${n} mục, một mục cho mỗi khung.`);
    unique(
      ram.filter((p) => p !== null),
      "Các trang trong RAM",
    );
    const dirty = numbers(read("v-c-dirty"), "Trang dirty", {
        empty: true,
        max: count - 1,
      }),
      denied = numbers(read("v-c-denied"), "Trang bị từ chối quyền", {
        empty: true,
        max: count - 1,
      }),
      unmapped = numbers(read("v-c-unmapped"), "Trang không được ánh xạ", {
        empty: true,
        max: count - 1,
      });
    if (dirty.some((p) => !ram.includes(p)))
      throw Error("Chỉ trang đang ở RAM mới có thể dirty.");
    if (unmapped.some((p) => ram.includes(p)))
      throw Error("Trang không được ánh xạ không thể đồng thời nằm trong RAM.");
    const seed = seedFor(
      ram,
      read("v-c-bits"),
      read("v-c-hand"),
      read("v-c-order"),
      read("v-c-recent"),
    );
    const policy = read("v-c-policy");
    if (!["FIFO", "LRU", "CLOCK"].includes(policy))
      throw Error("Chọn FIFO, LRU hoặc Clock.");
    const refs = numbers(read("v-c-refs"), "Chuỗi truy cập");
    if (refs.length > 32) throw Error("Chuỗi truy cập tối đa 32 trang.");
    const pt = Array.from({ length: count }, (_, page) => ({
      page,
      mapped: !unmapped.includes(page),
      permission: !denied.includes(page),
      present: ram.includes(page),
      valid: ram.includes(page),
      frame: ram.includes(page) ? ram.indexOf(page) : null,
      dirty: dirty.includes(page),
    }));
    const base = {
      pt,
      ram,
      freeFrames: ram.flatMap((p, f) => (p === null ? [f] : [])),
      fifo: seed.order,
      replacement: seed,
      policy,
      operation: read("v-op"),
      page: refs[0],
      st: 0,
      plan: null,
      accesses: 0,
      hits: 0,
      faults: 0,
      reads: 0,
      writes: 0,
      denied: 0,
    };
    return { base, refs };
  }
  function startV(page, base) {
    if (!base) base = vt.cursor === vt.events.length - 1 ? V : vOrigin;
    if (!Number.isSafeInteger(page) || page < 0 || page > 9999)
      return error(
        "v",
        "Nhập số trang nguyên 0..9999; trang ngoài miền sẽ gây trap.",
      );
    clearError("v");
    set("v-page", page);
    vOrigin = copy(base);
    const request = { ...copy(base), operation: read("v-op") };
    delete request.sequence;
    delete request.seqIndex;
    const t = performance.now(),
      events = buildV(page, request);
    vt.load(events, performance.now() - t);
  }
  function resetV() {
    clearError("v");
    syncVConfig();
    vOrigin = copy(vBase);
    set("v-page", vRefs[0]);
    const t = performance.now(),
      events = [];
    let base = copy(vBase);
    for (let i = 0; i < vRefs.length; i++) {
      const part = buildV(vRefs[i], base);
      part.forEach((e) => {
        e.state.sequence = copy(vRefs);
        e.state.seqIndex = i;
      });
      events.push(...part);
      base = copy(part.at(-1).state);
      if (base.denied) {
        events.at(-1).next = "Dừng chuỗi tại truy cập bị từ chối.";
        break;
      }
    }
    vt.load(events, performance.now() - t);
  }
  function presetV(full = false, dirty = false, page = 3) {
    vBase = initialV(full, dirty);
    vRefs = [page];
    resetV();
  }
  const op = document.createElement("label");
  op.className = "muted";
  op.innerHTML =
    'Thao tác <select id="v-op" aria-label="Thao tác truy cập"><option value="read">Đọc (LOAD)</option><option value="write">Ghi (STORE)</option></select>';
  $("#v-go").after(op);
  configPanel(
    "v",
    $("#v-flow"),
    field("v-c-pages", "Số trang của tiến trình", 8, "number") +
      field("v-c-frames", "Số khung RAM", 8, "number") +
      field(
        "v-c-ram",
        "RAM ban đầu: trang ở Frame 0, 1, 2…",
        joined(vBase.ram),
        "textarea",
        "Dùng - cho khung trống; để cả ô trống để RAM ban đầu rỗng.",
      ) +
      field(
        "v-c-refs",
        "Chuỗi trang cần truy cập",
        "3",
        "textarea",
        "Tối đa 32 tham chiếu. Chuỗi dừng nếu gặp truy cập trái phép; có thể nhập một trang.",
      ) +
      '<label class="field"><span>Chính sách khi RAM đầy</span><select id="v-c-policy"><option value="FIFO">FIFO · vào trước ra trước</option><option value="LRU">LRU · lâu chưa dùng nhất</option><option value="CLOCK">Clock · cơ hội thứ hai</option></select></label>' +
      field(
        "v-c-dirty",
        "Trang đã sửa (dirty=1)",
        "",
        "text",
        "Chỉ liệt kê trang đang ở RAM. Ghi STORE khi chạy cũng đặt dirty=1.",
      ) +
      field(
        "v-c-order",
        "Thứ tự nạp ban đầu (cũ → mới)",
        "",
        "text",
        "FIFO. Để trống: theo thứ tự trang trong RAM.",
      ) +
      field(
        "v-c-recent",
        "Thứ tự sử dụng ban đầu (lâu → gần)",
        "",
        "text",
        "LRU. Để trống: theo thứ tự trang trong RAM.",
      ) +
      field(
        "v-c-bits",
        "Bit R của từng khung",
        "",
        "text",
        "Clock. Để trống: trang có sẵn R=1, khung trống R=0.",
      ) +
      field("v-c-hand", "Kim Clock ban đầu (số khung)", 0, "number") +
      field(
        "v-c-denied",
        "Trang không có quyền truy cập",
        "7",
        "text",
        "Để trống: cho phép mọi trang đã ánh xạ.",
      ) +
      field(
        "v-c-unmapped",
        "Trang không được ánh xạ",
        "",
        "text",
        "Khác trang hợp lệ nhưng chưa ở RAM. Không được tự nạp trang này.",
      ),
    () => {
      const { base, refs } = readVConfig();
      vBase = base;
      vRefs = refs;
      resetV();
    },
    () => presetV(),
  );
  $("#v-go").onclick = () =>
    read("v-page").trim()
      ? startV(Number(read("v-page")))
      : error("v", "Vui lòng nhập số trang.");
  $("#v-page").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#v-go").click();
  });
  const missing = () =>
      vBase.pt
        .filter((p) => p.mapped && p.permission && !p.present)
        .map((p) => p.page),
    resident = () =>
      vBase.pt
        .filter((p) => p.mapped && p.permission && p.present)
        .map((p) => p.page);
  $("#v-pre-hit").onclick = () =>
    startV(resident().includes(1) ? 1 : resident()[0]);
  $("#v-pre-fault").onclick = () => startV(missing()[0]);
  $("#v-pre-fault2").onclick = () => startV(missing()[1] ?? missing()[0]);
  $("#v-pre-invalid").onclick = () => startV(Math.max(99, vBase.pt.length));
  $("#v-reset").onclick = resetV;
  const vp = document.createElement("div");
  vp.className = "bar";
  vp.innerHTML =
    '<span class="muted">MÔ HÌNH GIẢ ĐỊNH:</span><button class="btn" id="v-full-clean">RAM đầy · victim sạch</button><button class="btn" id="v-full-dirty">RAM đầy · victim dirty</button><button class="btn" id="v-permission">Trang 7 · không có quyền</button>';
  $("#v-flow").before(vp);
  $("#v-full-clean").onclick = () => presetV(true, false);
  $("#v-full-dirty").onclick = () => presetV(true, true);
  $("#v-permission").onclick = () => presetV(false, false, 7);
  if ($("#p4 .stage > p.muted")) $("#p4 .stage > p.muted").textContent =
    "CPU tham chiếu → trap sang OS → định vị trang → nạp vào RAM → cập nhật bảng trang → chạy lại lệnh . Nếu RAM đầy, chọn victim; chỉ ghi lại trang dirty.";
  resetV();
  // DEMO 3: run the existing translation planner on a copy, commit only at real events.
  function buildX(addr, base) {
    const saved = copy(X);
    restore(X, base);
    api.plan(addr, { pageSize: base.pageSize, tlbCapacity: base.tlbCapacity });
    const after = copy(X),
      P = copy(X.plan);
    restore(X, saved);
    const s = copy(base),
      out = [];
    s.plan = P;
    const add = (
      title,
      actor,
      condition,
      change,
      next,
      path,
      kind = "translation",
      mutate = () => {},
    ) => {
      mutate();
      s.st = out.length;
      out.push(
        event(
          s,
          title,
          actor,
          condition,
          change,
          next,
          path,
          kind,
          P.err ? "lỗi truy cập" : "kiểm tra",
          "TLB nằm gần CPU/MMU; Page Table nằm trong RAM. TLB miss chỉ có nghĩa chưa có bản dịch trong cache. Kích thước bảng trang không được tính như khung dữ liệu trong sơ đồ sư phạm này.",
        ),
      );
    };
    add(
      "CPU phát địa chỉ logic",
      "CPU",
      `Yêu cầu LA=${addr}.`,
      "RAM và TLB giữ nguyên.",
      "MMU kiểm tra miền và tách địa chỉ.",
      `CPU → MMU / LA=${addr}`,
      "request",
    );
    if (P.err) {
      add(
        "Trap địa chỉ ngoài miền",
        "MMU → OS",
        `LA phải là số nguyên 0..${base.pt.length * base.pageSize - 1}.`,
        `LA=${addr} bị từ chối, không đọc bộ nhớ phụ.`,
        "Sửa địa chỉ đầu vào.",
        "MMU ⇢ OS",
        "trap",
      );
      return out;
    }
    add(
      "Tách số trang và độ lệch",
      "MMU",
      `Trang có ${s.pageSize || 4096} byte.`,
      `p=floor(${addr}/${s.pageSize || 4096})=${P.p}; d=${addr} mod ${s.pageSize || 4096}=${P.d}.`,
      "Tra trang p trong TLB.",
      `MMU / [p=${P.p} | d=${P.d}]`,
    );
    add(
      "Tra TLB · " + (P.hit ? "HIT" : "MISS"),
      "MMU / TLB",
      `Tra khóa trang ${P.p} trong ${s.tlb.length} bản ghi.`,
      P.hit
        ? `TLB Hit: trang ${P.p} → khung ${P.f}; hit +1.`
        : "TLB Miss: chưa có bản dịch; miss +1, chưa kết luận Page Fault.",
      P.hit ? "Tạo địa chỉ vật lý." : "Đọc PTE trong RAM.",
      P.hit ? `TLB → frame ${P.f}` : `TLB MISS → RAM / Page Table[${P.p}]`,
      "translation",
      () => {
        s.hit = after.hit;
        s.miss = after.miss;
      },
    );
    if (!P.hit) {
      add(
        "Tra bảng trang trong RAM",
        "MMU / RAM",
        `TLB không có trang ${P.p}.`,
        P.fault
          ? `PTE[${P.p}].present=0; Page Fault +1.`
          : `PTE[${P.p}] → frame ${P.f}, present=1; không có Page Fault.`,
        P.fault ? "Trap OS để nạp trang hợp lệ." : "Điền bản dịch vào TLB.",
        `MMU → RAM / Page Table[${P.p}]`,
        "translation",
        () => {
          s.faults = after.faults;
        },
      );
      if (P.blocked) {
        add(
          "RAM đầy · chưa thể nạp trang",
          "MMU → OS",
          `Trang ${P.p} chưa hiện diện; không còn khung trống.`,
          "Giữ nguyên RAM/PTE/TLB; chưa tạo địa chỉ vật lý.",
          "Xem cơ chế chọn victim ở Demo 4; hoặc sửa cấu hình để có khung trống.",
          "MMU ⇢ Page Fault ⇢ OS",
          "trap",
        );
        return out;
      }
      if (P.fault)
        add(
          "Page Fault · nạp trang hợp lệ",
          "OS / I/O",
          `Trang ${P.p} được ánh xạ nhưng chưa ở RAM.`,
          `Nạp vào khung trống ${P.newF}; PTE[${P.p}]: — → ${P.newF}.`,
          "Cập nhật TLB và tạo địa chỉ vật lý.",
          `MMU ⇢ OS; Backing Store / Trang ${P.p} → RAM / Frame ${P.newF}`,
          "page-in",
          () => {
            s.pt = copy(after.pt);
            s.freeF = copy(after.freeF);
          },
        );
      add(
        "Điền bản dịch TLB",
        "MMU / TLB",
        `Đã biết trang ${P.p} → frame ${P.f}.`,
        `TLB: ${s.tlb.length} → ${after.tlb.length} bản ghi${P.evict !== undefined ? `; loại trang ${P.evict} theo LRU` : ""}.`,
        "Ghép frame với độ lệch.",
        `RAM / Page Table → TLB`,
        "translation",
        () => {
          s.tlb = copy(after.tlb);
          s.clock = after.clock;
        },
      );
    }
    add(
      "Tạo địa chỉ vật lý",
      "MMU",
      `Frame=${P.f}; độ lệch d=${P.d} giữ nguyên.`,
      `PA = ${P.f} × ${s.pageSize || 4096} + ${P.d} = ${P.phys}.`,
      "Đọc đúng byte trong khung dữ liệu.",
      `MMU → PA=${P.phys}`,
    );
    add(
      "Truy cập khung và byte trong RAM",
      "CPU / RAM",
      `Bản dịch đã hoàn tất.`,
      `Frame ${P.f}, offset ${P.d} → PA ${P.phys}; đọc dữ liệu thành công.`,
      "Có thể dịch lại cùng LA để quan sát TLB Hit.",
      `CPU ← RAM / Frame ${P.f} / byte +${P.d}`,
      "read",
      () => {
        s.tlb = copy(after.tlb);
        s.clock = after.clock;
      },
    );
    return out;
  }
  function renderX(e) {
    $("#p2 .quick > span.muted").textContent =
      `Trang ${X.pageSize} B · ${X.pt.length} trang · ${X.frameCount} khung · TLB ${X.tlbCapacity} mục`;
    activeSetup(
      "x",
      `${X.pageSize} B/trang; LA 0..${X.pt.length * X.pageSize - 1}; yêu cầu ${X.plan.addr}; TLB ban đầu theo cấu hình đã áp dụng.`,
    );
    const P = X.plan;
    $("#p2 h2").textContent =
      `Địa chỉ logic ${P.addr} được dịch đến đâu trong RAM?`;
    $("#x-flow").className = "teach-diagram";
    if (P.err) {
      $("#x-flow").innerHTML =
        node("CPU", `LA=${esc(P.addr || $("#x-addr").value)}`, true) +
        node("MMU → OS", "TRAP: ngoài miền địa chỉ", true, true) +
        route(e);
      return;
    }
    const title = e.title,
      isTLB = title.includes("TLB"),
      isPT = title.includes("bảng trang"),
      isRead = e.kind === "read";
    const frame = P.f;
    const tlb = table(
      ["Page", "Frame"],
      X.tlb.length
        ? X.tlb.map(
            (t) =>
              `<tr class="${isTLB && t.page === P.p ? "teach-selected" : ""}"><td>${t.page}</td><td>${t.frame}</td></tr>`,
          )
        : ['<tr><td colspan="2">TLB rỗng</td></tr>'],
    );
    $("#x-flow").innerHTML =
      node(
        "CPU + MMU",
        `<p>LA = <b>${P.addr}</b></p><div class="split"><div class="pg">p = ${P.p}</div><div class="of">d = ${P.d}</div></div><p>${X.pageSize || 4096} byte / trang</p><h3>TLB · gần CPU/MMU</h3>${tlb}<p>${title.includes("Tra TLB") ? (P.hit ? "TLB HIT" : "TLB MISS") : ""}</p>`,
        isTLB || title.includes("CPU") || title.includes("Tách"),
      ) +
      `<div class="teach-ram ${isPT || isRead || e.kind === "page-in" ? "teach-active" : ""}"><h3>RAM · Page Table + khung dữ liệu</h3><div class="teach-ram-content"><div><b>Page Table · trong RAM</b>${table(
        ["Page", "Frame", "Present"],
        X.pt.map(
          (f, p) =>
            `<tr class="${p === P.p && isPT ? "teach-selected" : ""}"><td>${p}</td><td>${f ?? "—"}</td><td>${+(f !== null)}</td></tr>`,
        ),
      )}</div><div><b>Khung dữ liệu (Frame)</b><div class="teach-frame-grid">${Array.from({ length: X.frameCount || 16 }, (_, f) => `<div data-frame="${f}" class="teach-frame ${isRead && frame === f ? "teach-selected" : ""}">Frame ${f}<b>${X.pt.includes(f) ? "Trang " + X.pt.indexOf(f) : X.other.includes(f) ? "khác" : "trống"}</b>${isRead && frame === f ? `<span>Byte +${P.d}</span>` : ""}</div>`).join("")}</div></div></div></div>` +
      node(
        "Địa chỉ vật lý",
        `<p>PA = frame × page size + offset</p><b>${P.blocked ? "Chưa có PA: cần thay trang" : title.includes("vật lý") || isRead ? `${P.f} × ${X.pageSize || 4096} + ${P.d} = ${P.phys}` : "Chưa tạo PA"}</b><p>${P.hit ? "Nhánh HIT: bỏ tra bảng trang." : P.fault ? "Nhánh MISS + Page Fault." : "Nhánh MISS; trang vẫn ở RAM."}</p>`,
        title.includes("vật lý"),
      ) +
      route(e);
    $("#x-stats").textContent =
      `TLB Hit ${X.hit} / Miss ${X.miss} · Page Fault ${X.faults}`;
  }
  const xt = new Timeline("x", "p2", X, renderX, "");
  const defaultXConfig = () => ({
    pageSize: 4096,
    frameCount: 16,
    tlbCapacity: 4,
    pt: copy(api.PT0),
    other: copy(api.OTHER),
    tlb: [],
    addr: 10000,
  });
  let xConfig = defaultXConfig();
  function initialX(config) {
    const used = [...config.pt.filter((f) => f !== null), ...config.other];
    return {
      pt: copy(config.pt),
      other: copy(config.other),
      tlb: copy(config.tlb),
      clock: config.tlb.length,
      hit: 0,
      miss: 0,
      faults: 0,
      freeF: Array.from({ length: config.frameCount }, (_, f) => f).filter(
        (f) => !used.includes(f),
      ),
      plan: null,
      st: 0,
      pageSize: config.pageSize,
      frameCount: config.frameCount,
      tlbCapacity: config.tlbCapacity,
    };
  }
  function syncXConfig() {
    resetConfigNotice("x");
    set("x-c-size", xConfig.pageSize);
    set("x-c-pages", xConfig.pt.length);
    set("x-c-frames", xConfig.frameCount);
    set("x-c-tlb", xConfig.tlbCapacity);
    set("x-c-pt", joined(xConfig.pt));
    set("x-c-other", joined(xConfig.other));
    set("x-c-cache", xConfig.tlb.map((e) => `${e.page}:${e.frame}`).join(", "));
    $("#x-addr").max = xConfig.pageSize * xConfig.pt.length - 1;
  }
  function readXConfig() {
    const pageSize = integer(read("x-c-size"), "Kích thước trang", 1, 65536);
    if ((pageSize & (pageSize - 1)) !== 0)
      throw Error(
        "Kích thước trang phải là lũy thừa của 2: 4, 256, 1024, 4096…",
      );
    const count = integer(read("x-c-pages"), "Số trang", 1, 32),
      frameCount = integer(read("x-c-frames"), "Số khung RAM", 1, 32),
      tlbCapacity = integer(read("x-c-tlb"), "Số mục TLB", 1, 16);
    const pt = numbers(read("x-c-pt"), "Bảng trang", {
      nullable: true,
      max: frameCount - 1,
    });
    if (pt.length !== count)
      throw Error(
        `Bảng trang cần ${count} mục, ứng với trang 0..${count - 1}.`,
      );
    unique(
      pt.filter((f) => f !== null),
      "Khung được ánh xạ",
    );
    const other = numbers(read("x-c-other"), "Khung tiến trình khác", {
      empty: true,
      max: frameCount - 1,
    });
    unique(other, "Khung tiến trình khác");
    if (other.some((f) => pt.includes(f)))
      throw Error(
        "Khung tiến trình khác không được trùng khung trong bảng trang.",
      );
    const cache = read("x-c-cache").trim(),
      tlb = cache
        ? cache.split(/[\s,;]+/).map((text, i) => {
            const pair = text.split(":");
            if (pair.length !== 2)
              throw Error("TLB: nhập cặp trang:khung, ví dụ 2:5.");
            const page = integer(pair[0], "Trang trong TLB", 0, count - 1),
              frame = integer(pair[1], "Khung trong TLB", 0, frameCount - 1);
            if (pt[page] !== frame)
              throw Error(
                `TLB trang ${page} phải khớp bảng trang và trang phải đang ở RAM.`,
              );
            return { page, frame, last: i + 1 };
          })
        : [];
    unique(
      tlb.map((e) => e.page),
      "Trang trong TLB",
    );
    if (tlb.length > tlbCapacity) throw Error(`TLB chỉ có ${tlbCapacity} mục.`);
    const addr = integer(
      read("x-addr"),
      "Địa chỉ logic",
      0,
      pageSize * count - 1,
    );
    return { pageSize, frameCount, tlbCapacity, pt, other, tlb, addr };
  }
  function startX(addr, base = X) {
    if (
      !Number.isSafeInteger(addr) ||
      addr < 0 ||
      addr >= base.pt.length * base.pageSize
    )
      return error(
        "x",
        `Nhập địa chỉ nguyên 0..${base.pt.length * base.pageSize - 1} theo đề đang chạy.`,
      );
    clearError("x");
    const t = performance.now(),
      events = buildX(addr, base);
    xt.load(events, performance.now() - t);
  }
  function resetX() {
    set("x-addr", xConfig.addr);
    syncXConfig();
    startX(xConfig.addr, initialX(xConfig));
  }
  function sampleX(config = defaultXConfig()) {
    xConfig = copy(config);
    resetX();
  }
  configPanel(
    "x",
    $("#x-flow"),
    field("x-c-size", "Kích thước trang (byte)", 4096, "number") +
      field("x-c-pages", "Số trang logic", 8, "number") +
      field("x-c-frames", "Số khung RAM", 16, "number") +
      field("x-c-tlb", "Sức chứa TLB (mục)", 4, "number") +
      field(
        "x-c-pt",
        "Bảng trang: số khung của trang 0, 1, 2…",
        joined(api.PT0),
        "textarea",
        "Dấu -: trang hợp lệ nhưng chưa có trong RAM. Một khung chứa tối đa một trang trong mô hình này.",
      ) +
      field(
        "x-c-cache",
        "TLB ban đầu (cũ → mới)",
        "",
        "text",
        "Cú pháp trang:khung, phải khớp bảng trang. Để trống nếu TLB rỗng.",
      ) +
      field(
        "x-c-other",
        "Khung dành cho tiến trình khác",
        joined(api.OTHER),
        "text",
        "Có thể để trống. Khung chưa được dùng sẽ tự vào danh sách khung trống.",
      ),
    () => {
      const config = readXConfig();
      xConfig = config;
      resetX();
    },
    () => sampleX(),
  );
  $("#x-go").onclick = () =>
    read("x-addr").trim()
      ? startX(Number(read("x-addr")))
      : error("x", "Vui lòng nhập địa chỉ logic.");
  $("#x-addr").addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        e.stopImmediatePropagation();
        $("#x-go").click();
      }
    },
    true,
  );
  $("#x-rand").onclick = () => {
    const addr = Math.floor(Math.random() * X.pt.length * X.pageSize);
    set("x-addr", addr);
    startX(addr);
  };
  $("#x-fault").onclick = () => {
    const p = X.pt.indexOf(null);
    if (p < 0)
      return error(
        "x",
        "Mọi trang đã ở RAM. Làm lại theo cấu hình ban đầu hoặc sửa bảng trang.",
      );
    const addr = p * X.pageSize + Math.min(300, X.pageSize - 1);
    set("x-addr", addr);
    startX(addr);
  };
  $("#x-reset").onclick = resetX;
  const xp = document.createElement("div");
  xp.className = "bar";
  xp.innerHTML =
    '<button class="btn" id="x-textbook">Mẫu nhỏ · 13 → 9 (4 B)</button><button class="btn" id="x-default">Mẫu gốc · 10000 → 22288 (4 KB)</button>';
  $("#x-flow").before(xp);
  $("#x-textbook").onclick = () =>
    sampleX({
      pageSize: 4,
      frameCount: 8,
      tlbCapacity: 4,
      pt: [5, 6, 1, 2],
      other: [],
      tlb: [],
      addr: 13,
    });
  $("#x-default").onclick = () => sampleX();
  resetX();
  // DEMO 5: expand the original simR trace; Clock visits expose every bit test and clear.
  function buildR() {
    const result = api.simR(R.refs, R.n, R.alg, R.initial),
      out = [];
    let legacy = 0;
    let runtime = {
      ...copy(result[0].before),
      done: 0,
      faults: 0,
      hits: 0,
      t: -1,
      slot: -1,
      victim: null,
      phase: "start",
    };
    const add = (
      title,
      actor,
      condition,
      change,
      next,
      path,
      kind = "request",
      status = "kiểm tra",
    ) =>
      out.push(
        event(
          { ...copy(R), s: legacy, runtime },
          title,
          actor,
          condition,
          change,
          next,
          path,
          kind,
          status,
          "FIFO không đổi thứ tự khi hit; LRU dùng lần truy cập gần nhất; OPT dùng thông tin tương lai (chuẩn lý tưởng). Clock đặt R=1 khi nạp/hit, hạ R=0 khi cho cơ hội thứ hai; kim tiến sau khi thay. Mô hình chỉ đọc: loại trang sạch không đồng nghĩa ghi ra đĩa.",
        ),
      );
    add(
      R.initial?.fr.some((p) => p !== null)
        ? "Khởi tạo RAM theo đề"
        : "Khởi tạo RAM trống",
      "OS",
      `${R.refs.length} tham chiếu; ${R.n} khung; thuật toán ${R.alg}.`,
      `RAM: [${runtime.fr.map((p) => p ?? "-")}]; Hit=0, Fault=0, kim=${runtime.ptr}.`,
      "CPU yêu cầu trang đầu tiên.",
      "CPU → RAM",
    );
    result.forEach((s) => {
      runtime = {
        ...runtime,
        ...copy(s.before),
        t: s.t,
        slot: s.slot,
        victim: s.victim,
        phase: "request",
      };
      add(
        `Tham chiếu ${s.t + 1} · Trang ${s.pg}`,
        "CPU / MMU",
        `Tìm Trang ${s.pg} trong RAM [${s.before.fr.map((p) => p ?? "—")}].`,
        s.hit
          ? `Có Trang ${s.pg}: Page Hit; không đọc bộ nhớ phụ.`
          : `Không có Trang ${s.pg}: Page Fault; ${s.victim === null ? "còn khung trống" : "RAM đã đầy"}.`,
        s.hit
          ? "Đọc RAM, cập nhật thông tin sử dụng."
          : s.victim === null
            ? "Nạp vào khung trống."
            : "Chọn victim trước khi thay.",
        `CPU → RAM / Trang ${s.pg}`,
      );
      if (s.victim !== null) {
        legacy++;
        if (R.alg === "CLOCK") {
          let ptr = s.before.ptr;
          const micro = copy(s.before);
          for (let j = 0; j < s.skipped.length; j++) {
            runtime = { ...runtime, ...copy(micro), ptr, phase: "inspect" };
            add(
              `Clock · kiểm tra Frame ${ptr}`,
              "OS / Kim Clock",
              `RAM đầy; Trang ${s.pg} đang chờ.`,
              `Frame ${ptr}: Trang ${micro.fr[ptr]}, R=1 → được cơ hội thứ hai.`,
              "Hạ bit R về 0 rồi chuyển kim.",
              `Kim → Frame ${ptr} / R=1`,
            );
            const old = ptr;
            micro.bit[ptr] = 0;
            ptr = (ptr + 1) % R.n;
            micro.ptr = ptr;
            runtime = { ...runtime, ...copy(micro), phase: "clear" };
            add(
              `Clock · R[${old}] 1 → 0; chuyển kim`,
              "OS / Kim Clock",
              `Trang ${micro.fr[old]} vừa được kiểm tra với R=1.`,
              `Bit[${old}]: 1 → 0; kim ${old} → ${ptr}; RAM chưa thay trang.`,
              "Kiểm tra bit ở khung kim vừa tới.",
              `Frame ${old} → kim → Frame ${ptr}`,
            );
          }
          runtime = {
            ...runtime,
            ...copy(micro),
            ptr: s.slot,
            phase: "victim",
          };
          add(
            `Clock · chọn Frame ${s.slot}`,
            "OS / Kim Clock",
            `Frame ${s.slot} có R=0.`,
            `Victim = Trang ${s.victim}; dừng quét ở Frame ${s.slot}.`,
            `Nạp Trang ${s.pg}; đặt R=1; kim chuyển ${(s.slot + 1) % R.n}.`,
            `Kim → Frame ${s.slot} / R=0 → victim`,
            "request",
            "kiểm tra",
          );
        } else {
          runtime.phase = "victim";
          const proof =
            R.alg === "FIFO"
              ? `nạp sớm nhất (${s.before.load[s.slot] < 0 ? "trước khi chạy chuỗi" : "bước " + (s.before.load[s.slot] + 1)})`
              : R.alg === "LRU"
                ? `lâu chưa dùng nhất (${s.before.last[s.slot] < 0 ? "trước khi chạy chuỗi" : "bước " + (s.before.last[s.slot] + 1)})`
                : `nextUse = ${(() => {
                    const n = R.refs.indexOf(s.victim, s.t + 1);
                    return n < 0 ? "∞ (không dùng lại)" : n + 1;
                  })()}`;
          add(
            `${R.alg} · chọn Trang ${s.victim}`,
            "OS / Bộ chọn nạn nhân",
            `Trang ${s.pg} chưa ở RAM và tất cả khung đều có trang.`,
            `Frame ${s.slot}, Trang ${s.victim}: ${proof}.`,
            `Loại ánh xạ cũ, nạp Trang ${s.pg}.`,
            `OS → RAM / victim ${s.victim}`,
          );
        }
      }
      legacy++;
      runtime = {
        ...runtime,
        ...copy(s.after),
        done: s.t + 1,
        faults: runtime.faults + +!s.hit,
        hits: runtime.hits + +s.hit,
        phase: "apply",
      };
      add(
        s.hit
          ? `Page Hit · đọc Trang ${s.pg}`
          : `Page-in · Trang ${s.pg} → Frame ${s.slot}`,
        s.hit ? "CPU / RAM" : "OS / I/O",
        s.hit
          ? `Trang ${s.pg} đang ở Frame ${s.slot}.`
          : s.victim === null
            ? `Frame ${s.slot} còn trống.`
            : `Victim ${s.victim} đã được chọn (mô hình trang sạch).`,
        s.hit
          ? `Trang ${s.pg} giữ ở Frame ${s.slot}; Hit=${runtime.hits}, Fault=${runtime.faults}.`
          : `${s.victim === null ? "trống" : s.victim} → ${s.pg} tại Frame ${s.slot}; Hit=${runtime.hits}, Fault=${runtime.faults}.`,
        s.t === result.length - 1
          ? "Hoàn tất chuỗi tham chiếu."
          : "CPU chuyển sang tham chiếu kế tiếp.",
        s.hit
          ? `CPU ← RAM / Frame ${s.slot}`
          : `Backing Store / Trang ${s.pg} → RAM / Frame ${s.slot}`,
        s.hit ? "read" : "page-in",
        "thành công",
      );
    });
    return out;
  }
  function clockSVG(st) {
    const n = R.n,
      c = 170,
      r = 112;
    const a = (st.ptr * 2 * Math.PI) / n - Math.PI / 2,
      x = c + Math.cos(a) * 72,
      y = c + Math.sin(a) * 72;
    return `<svg class="teach-clock" viewBox="0 0 340 340" role="img" aria-label="Vòng Clock: kim tại khung ${st.ptr}; bit R ${st.bit.join(",")}"><defs><marker id="clock-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="currentColor"/></marker></defs><circle cx="170" cy="170" r="112" fill="none" stroke="var(--line)" stroke-dasharray="4 6"/>${st.fr
      .map((p, i) => {
        const a = (i * 2 * Math.PI) / n - Math.PI / 2,
          x = c + Math.cos(a) * r,
          y = c + Math.sin(a) * r;
        return `<g data-clock-frame="${i}"><rect class="clock-frame ${st.bit[i] ? "clock-one" : ""} ${st.ptr === i ? "clock-current" : ""} ${st.phase === "victim" && st.slot === i ? "clock-victim" : ""}" x="${x - 40}" y="${y - 31}" width="80" height="62" rx="10"/><text x="${x}" y="${y - 10}" text-anchor="middle">Frame ${i}</text><text x="${x}" y="${y + 8}" text-anchor="middle" font-weight="700">${p === null ? "trống" : "Trang " + p}</text><text x="${x}" y="${y + 25}" text-anchor="middle">R = ${st.bit[i] || 0}</text></g>`;
      })
      .join(
        "",
      )}<line x1="170" y1="170" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="5" marker-end="url(#clock-arrow)"/><circle cx="170" cy="170" r="8" fill="currentColor"/><text x="170" y="205" text-anchor="middle">Kim ${st.ptr}</text></svg>`;
  }
  const evidence = document.createElement("div");
  evidence.className = "teach-evidence";
  $("#r-cap").before(evidence);
  function renderR(e) {
    activeSetup(
      "r",
      `${R.n} khung; ${names[R.alg]}; ${R.refs.length} tham chiếu; RAM ban đầu [${(R.initial?.fr || Array(R.n).fill(null)).map((p) => p ?? "-")}].`,
    );
    api.renderR();
    const st = R.runtime,
      t = st.t,
      pg = R.refs[t];
    $("#r-refs").innerHTML = R.refs
      .map(
        (p, i) =>
          `<div class="ref ${i === t ? "now" : i < t ? "past" : ""}"><b>${p}</b><i class="${i < st.done ? (api.simR(R.refs, R.n, R.alg, R.initial)[i].hit ? "h" : "f") : ""}"></i></div>`,
      )
      .join("");
    $("#r-need").innerHTML =
      `<span class="zone-t">CPU cần trang</span><div class="card">${pg ?? "?"}</div><span class="hint">Tham chiếu ${t + 1}/${R.refs.length}</span>`;
    const stamp = (value) =>
      value < 0
        ? `ban đầu, thứ ${value + (R.initial?.fr.filter((p) => p !== null).length || 0) + 1}`
        : `bước ${value + 1}`;
    const proof = (i) =>
      R.alg === "FIFO"
        ? `Nạp ${stamp(st.load[i])}`
        : R.alg === "LRU"
          ? `Dùng ${stamp(st.last[i])}`
          : R.alg === "OPT"
            ? `Dùng tiếp: ${(() => {
                const k = R.refs.indexOf(st.fr[i], t + 1);
                return k < 0 ? "∞" : k + 1;
              })()}`
            : `Bit R = ${st.bit[i]}`;
    $("#r-slots").innerHTML = st.fr
      .map(
        (p, i) =>
          `<div class="slot"><div class="card ${p === null ? "empty" : st.phase === "victim" && i === st.slot ? "victim" : st.phase === "apply" && i === st.slot ? "hitc" : ""}">${p ?? "trống"}</div><span class="hint">Frame ${i}</span><span class="hint">${p === null ? "chưa có trang" : proof(i)}</span></div>`,
      )
      .join("");
    $("#r-out").innerHTML =
      st.phase === "apply" && st.victim !== null
        ? `<span class="hint">Trang ${st.victim}: bỏ ánh xạ cũ.<br>Trang sạch: không I/O ghi.</span>`
        : '<span class="hint">Kho trang · Backing Store</span>';
    $("#r-counts").innerHTML =
      `<div class="count bad"><span class="mono">${st.faults}</span>lỗi trang</div><div class="count ok"><span class="mono">${st.hits}</span>trúng</div>`;
    for (const card of [...$$("#r-slots .card"), $("#r-need .card")])
      if (card && /^\d{3,}$/.test(card.textContent.trim()))
        card.style.fontSize = "26px";
    const rows = st.fr.map(
      (p, i) =>
        `<tr class="${st.phase === "victim" && st.slot === i ? "teach-selected" : ""}"><td>${i}</td><td>${p ?? "—"}</td><td>${p === null ? "—" : proof(i)}</td></tr>`,
    );
    evidence.innerHTML = `<h3>${R.alg === "CLOCK" ? "Clock · kim và từng bit R" : "Vì sao chọn trang này? · " + R.alg}</h3><div class="${R.alg === "CLOCK" ? "teach-clock-layout" : ""}">${R.alg === "CLOCK" ? clockSVG(st) : ""}<div>${table(["Frame", "Page", R.alg === "FIFO" ? "Thứ tự nạp" : R.alg === "LRU" ? "Lần truy cập" : R.alg === "OPT" ? "Tham chiếu tương lai" : "Bit tham chiếu"], rows)}<p>${R.alg === "OPT" ? "OPT biết trước tương lai; dùng làm chuẩn so sánh." : R.alg === "CLOCK" ? "R=1 → cho cơ hội thứ hai, hạ về 0. R=0 → chọn victim." : R.alg === "FIFO" ? "Page Hit giữ nguyên thứ tự nạp." : "Page Hit cập nhật lần truy cập gần nhất."}</p></div></div>${route(e)}`;
    $$("#r-bars .brow").forEach(
      (b) =>
        (b.onclick = () => {
          R.alg = b.dataset.a;
          startR();
        }),
    );
  }
  const rt = new Timeline("r", "p3", R, renderR, "");
  function syncRConfig() {
    resetConfigNotice("r");
    set("r-c-n", R.n);
    set("r-c-refs", joined(R.refs));
    set("r-str", R.refs.join(" "));
    set("r-c-ram", joined(R.initial?.fr || Array(R.n).fill(null)));
    set("r-c-order", joined(R.initial?.order || []));
    set("r-c-recent", joined(R.initial?.recent || []));
    set("r-c-bits", joined(R.initial?.bit || []));
    set("r-c-hand", R.initial?.ptr || 0);
  }
  function readRConfig() {
    const n = integer(read("r-c-n"), "Số khung RAM", 1, 8),
      raw = numbers(read("r-c-ram"), "RAM ban đầu", {
        nullable: true,
        empty: true,
      }),
      fr = raw.length ? raw : Array(n).fill(null);
    if (fr.length !== n)
      throw Error(`RAM cần ${n} mục, một mục cho mỗi khung.`);
    const refs = numbers(read("r-c-refs"), "Chuỗi tham chiếu");
    if (refs.length > 48) throw Error("Chuỗi tham chiếu tối đa 48 trang.");
    const initial = seedFor(
      fr,
      read("r-c-bits"),
      read("r-c-hand"),
      read("r-c-order"),
      read("r-c-recent"),
    );
    return { n, refs, initial };
  }
  configPanel(
    "r",
    $("#r-refs").parentElement,
    field("r-c-n", "Số khung RAM", 3, "number", "Từ 1 đến 8 khung.") +
      field(
        "r-c-refs",
        "Chuỗi tham chiếu",
        R.refs.join(" "),
        "textarea",
        "Từ 1 đến 48 trang; mã trang 0..9999.",
      ) +
      field(
        "r-c-ram",
        "RAM ban đầu: trang ở Frame 0, 1, 2…",
        "",
        "textarea",
        "Dùng - cho khung trống; để cả ô trống nếu bắt đầu với RAM rỗng.",
      ) +
      field(
        "r-c-order",
        "Thứ tự nạp (cũ → mới)",
        "",
        "text",
        "FIFO. Để trống: theo thứ tự trang trong RAM.",
      ) +
      field(
        "r-c-recent",
        "Thứ tự sử dụng (lâu → gần)",
        "",
        "text",
        "LRU. Để trống: theo thứ tự trang trong RAM.",
      ) +
      field(
        "r-c-bits",
        "Bit R ở Frame 0, 1, 2…",
        "",
        "text",
        "Clock. Để trống: khung có trang R=1, khung trống R=0.",
      ) +
      field("r-c-hand", "Kim Clock ban đầu", 0, "number"),
    () => {
      const config = readRConfig();
      Object.assign(R, config);
      startR();
    },
    () => {
      R.n = 3;
      R.refs = copy(api.BOOK);
      R.initial = seedFor(Array(3).fill(null), "", 0, "", "");
      startR();
    },
  );
  function resizeR(n) {
    const fr = Array.from({ length: n }, (_, i) => R.initial?.fr[i] ?? null),
      resident = fr.filter((p) => p !== null);
    R.initial = seedFor(
      fr,
      fr.map((p, i) => (p === null ? 0 : (R.initial?.bit[i] ?? 1))).join(","),
      Math.min(R.initial?.ptr ?? 0, n - 1),
      (R.initial?.order || resident)
        .filter((p) => resident.includes(p))
        .join(","),
      (R.initial?.recent || resident)
        .filter((p) => resident.includes(p))
        .join(","),
    );
    R.n = n;
    startR();
  }
  function startR() {
    R.initial = R.initial || seedFor(Array(R.n).fill(null), "", 0, "", "");
    syncRConfig();
    clearError("r");
    R.s = 0;
    const t = performance.now(),
      ev = buildR();
    rt.load(ev, performance.now() - t);
  }
  $$("#r-alg button").forEach(
    (b) =>
      (b.onclick = () => {
        R.alg = b.dataset.a;
        startR();
      }),
  );
  $$("#r-n button").forEach(
    (b) =>
      (b.onclick = () => {
        resizeR(Number(b.dataset.n));
      }),
  );
  $("#r-reset").onclick = startR;
  $("#r-bel").onclick = () => {
    R.refs = copy(api.BEL);
    R.n = 3;
    R.initial = seedFor(Array(3).fill(null), "", 0, "", "");
    R.alg = "FIFO";
    if ($("#r-str")) $("#r-str").value = R.refs.join(" ");
    startR();
  };
  if ($("#r-book")) $("#r-book").onclick = () => {
    R.refs = copy(api.BOOK);
    R.n = 3;
    R.initial = seedFor(Array(3).fill(null), "", 0, "", "");
    if ($("#r-str")) $("#r-str").value = R.refs.join(" ");
    startR();
  };
  if ($("#r-apply")) $("#r-apply").onclick = () => {
    const v = $("#r-str")
      .value.trim()
      .split(/[\s,;]+/)
      .map(Number);
    if (
      !$("#r-str").value.trim() ||
      !v.length ||
      v.length > 48 ||
      v.some((x) => !Number.isInteger(x) || x < 0 || x > 9999)
    )
      return error(
        "r",
        "Nhập 1–48 số nguyên từ 0 đến 9999, cách nhau bằng khoảng trắng hoặc dấu phẩy.",
      );
    R.refs = v;
    startR();
  };
  $("#r-str").previousElementSibling.textContent =
    "Chuỗi tham chiếu (tối đa 48 trang)";
  startR();
  // DEMO 2 textbook exercise: add scan events, keep simA selection/tie breaks unchanged.
  const allocatorA = document.createElement("div");
  allocatorA.className = "teach-allocator";
  if ($("#a-req")) $("#a-req").after(allocatorA);
  function buildA() {
    const sim = api.simA(A.holes, A.reqs, A.alg),
      out = [],
      base = copy(A);
    base.s = 0;
    base.runtime = {
      free: copy(A.holes),
      pieces: A.holes.map(() => []),
      scan: -1,
    };
    const add = (title, condition, change, next, path, status = "kiểm tra") =>
      out.push(
        event(
          base,
          title,
          "HĐH / bộ cấp phát · " + names[A.alg],
          condition,
          change,
          next,
          path,
          "request",
          status,
          "First-fit dừng ở lỗ đủ đầu tiên; Best-fit/Worst-fit quét toàn bộ. Nếu hòa, ưu tiên địa chỉ thấp. Phân mảnh ngoài: tổng trống đủ nhưng thiếu một vùng liên tục.",
        ),
      );
    add(
      "Hàng chờ tiến trình",
      `${A.reqs.length} yêu cầu; ${A.holes.length} lỗ ban đầu.`,
      `Hàng chờ: ${A.reqs
        .slice(0, 3)
        .map((r, i) => `P${i + 1}=${r} KB`)
        .join(
          "; ",
        )}${A.reqs.length > 3 ? `; còn ${A.reqs.length - 3} tiến trình` : ""}.`,
      "Gửi yêu cầu P1 tới bộ cấp phát.",
      "Hàng chờ → Memory Allocator",
    );
    sim.ev.forEach((e, k) => {
      base.s = 2 * k;
      base.runtime = {
        free: copy(e.freeBefore),
        pieces: copy(e.piecesBefore),
        scan: -1,
      };
      add(
        `P${k + 1} yêu cầu ${e.r} KB`,
        `Tiến trình P${k + 1} đang chờ một vùng liên tục.`,
        `Tổng trống ${e.freeBefore.reduce((a, b) => a + b, 0)} KB; lớn nhất ${Math.max(...e.freeBefore)} KB.`,
        "Quét lỗ theo địa chỉ tăng dần.",
        `P${k + 1} → OS / ${A.alg}`,
      );
      let start = A.gap;
      for (let i = 0; i < A.holes.length; i++) {
        const size = e.freeBefore[i],
          used = A.holes[i] - size;
        const addr = start + used;
        start += A.holes[i] + A.gap;
        if (size <= 0) continue;
        base.s = 2 * k + 1;
        base.runtime.scan = i;
        const fit = size >= e.r;
        add(
          `${A.alg} · xét Lỗ ${i + 1}`,
          `Con trỏ ở địa chỉ ${addr} KB.`,
          `${size} ${fit ? "≥" : "<"} ${e.r} KB → ${fit ? "ứng viên, dư " + (size - e.r) + " KB" : "bỏ qua: không đủ"}.`,
          fit && A.alg === "first"
            ? "Dừng quét tại lỗ đủ đầu tiên."
            : i === A.holes.length - 1
              ? "So sánh ứng viên và quyết định."
              : "Tiếp tục quét lỗ kế tiếp.",
          `Allocator → Lỗ ${i + 1} @${addr}`,
        );
        if (fit && A.alg === "first") break;
      }
      base.runtime.scan = e.idx;
      add(
        e.idx < 0 ? `P${k + 1} · không cấp phát` : `Chọn Lỗ ${e.idx + 1}`,
        `Đã xét ${A.alg === "first" ? "đến ứng viên đầu tiên" : "toàn bộ danh sách lỗ"}.`,
        e.idx < 0
          ? `${Math.max(...e.freeBefore)} < ${e.r}; ${e.freeBefore.reduce((a, b) => a + b, 0) >= e.r ? "đủ tổng chỗ, thiếu vùng liên tục (phân mảnh ngoài)" : "tổng dung lượng còn trống cũng không đủ"}.`
          : `${A.alg}: chọn ${e.freeBefore[e.idx]} KB; dư ${e.freeBefore[e.idx] - e.r} KB.`,
        e.idx < 0
          ? "Giữ RAM, đưa tiến trình vào chờ."
          : "Đặt tiến trình vào đầu lỗ đã chọn.",
        `Allocator → ${e.idx < 0 ? "hàng chờ" : "RAM / Lỗ " + (e.idx + 1)}`,
        e.idx < 0 ? "không cấp phát" : "thành công",
      );
      base.s = 2 * (k + 1);
      const next = sim.ev[k + 1];
      base.runtime = {
        free: copy(next ? next.freeBefore : sim.free),
        pieces: copy(next ? next.piecesBefore : sim.pieces),
        scan: -1,
      };
      add(
        `Cập nhật RAM · P${k + 1}`,
        e.idx < 0 ? "Không có vùng liên tục phù hợp." : "Vị trí đã được chọn.",
        e.idx < 0
          ? "RAM trước → sau: không đổi; tiến trình phải chờ."
          : `Lỗ ${e.idx + 1}: ${e.freeBefore[e.idx]} → ${e.freeBefore[e.idx] - e.r} KB; P${k + 1} chiếm ${e.r} KB.`,
        k === sim.ev.length - 1
          ? "Hoàn tất, xem so sánh ba thuật toán."
          : `Xét P${k + 2}.`,
        `P${k + 1} → RAM / ${e.idx < 0 ? "không thay đổi" : "Lỗ " + (e.idx + 1)}`,
        e.idx < 0 ? "không cấp phát" : "thành công",
      );
    });
    return out;
  }
  function renderA(e) {
    api.configureHoleSpacing(A.gap);
    activeSetup(
      "a",
      `${A.holes.length} lỗ: ${joined(A.holes)} KB; ${A.reqs.length} yêu cầu; ${names[A.alg]}.`,
    );
    $$("#a-alg button").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.a === A.alg),
    );
    api.renderA();
    $("#a-ram").parentElement.style.minWidth =
      Math.max(620, A.holes.length * 100) + "px";
    const req = $("#a-req .req"),
      size = A.reqs[Math.min(Math.floor(A.s / 2), A.reqs.length - 1)],
      total = A.holes.reduce((n, v) => n + v, 0) + A.gap * (A.holes.length + 1);
    if (req && size > total) {
      req.style.width = "100%";
      $("#a-req .muted").textContent =
        "Yêu cầu vượt tổng RAM (thẻ không vẽ cùng tỉ lệ).";
    }
    $$("#a-ram .hole").forEach((el, i) => {
      el.classList.remove("fit", "nofit", "chosen");
      el.classList.toggle("teach-scan", i === A.runtime.scan);
      el.title = `Lỗ ${i + 1} · còn ${A.runtime.free[i]} KB`;
    });
    allocatorA.innerHTML = `<b>HÀNG CHỜ → MEMORY ALLOCATOR (${esc(A.alg)}) → RAM VẬT LÝ</b><p>${esc(e.change)}</p>${route(e)}`;
  }
  const at = new Timeline("a", "p1", A, renderA, "");
  function startA() {
    A.gap = A.gap ?? 70;
    const t = performance.now();
    at.load(buildA(), performance.now() - t);
  }
  $("#a-reset").onclick = startA;
  $("#a-apply").onclick = () => {
    try {
      const h = numbers(read("a-holes"), "Danh sách lỗ", {
          min: 1,
          max: 10000000,
        }),
        r = numbers(read("a-reqs"), "Danh sách yêu cầu", {
          min: 1,
          max: 1000000000,
        }),
        gap = integer(read("a-c-gap"), "Vùng đã dùng giữa các lỗ", 0, 10000000);
      if (h.length > 12 || r.length > 16)
        throw Error("Tối đa 12 lỗ và 16 tiến trình để dễ quan sát.");
      A.holes = h;
      A.reqs = r;
      A.gap = gap;
      clearError("a");
      startA();
    } catch (err) {
      error("a", err.message);
    }
  };
  const gapField = document.createElement("div");
  gapField.className = "field";
  gapField.innerHTML = field(
    "a-c-gap",
    "Vùng đã dùng giữa hai lỗ (KB)",
    70,
    "number",
    "Chỉ phục vụ sơ đồ địa chỉ; không tham gia phần bộ nhớ trống.",
  );
  $("#a-apply").before(gapField);
  const sampleA = document.createElement("button");
  sampleA.className = "btn";
  sampleA.textContent = "Khôi phục mẫu mặc định";
  sampleA.id = "a-sample";
  $("#a-apply").after(sampleA);
  sampleA.onclick = () => {
    set("a-holes", "100, 500, 200, 300, 600");
    set("a-reqs", "212, 417, 112, 426");
    set("a-c-gap", 70);
    $("#a-apply").click();
  };
  startA();
  // Free-RAM exercise: lazy events also capture manual allocate/free/compact actions.
  const allocatorF = document.createElement("div");
  allocatorF.className = "teach-allocator";
  $("#f-req").after(allocatorF);
  function fEvent(title, condition, change, next, path, status = "kiểm tra") {
    F.allocatorAlg = A.alg;
    return event(
      F,
      title,
      "HĐH / bộ cấp phát · " + names[A.alg],
      condition,
      change,
      next,
      path,
      "request",
      status,
      "Compaction di chuyển tiến trình; coalescing chỉ gộp lỗ kề nhau. First-fit dừng sớm; Best/Worst-fit quét hết, hòa ưu tiên địa chỉ thấp.",
    );
  }
  let fConfig = { capacity: 1000, segs: null, script: copy(api.SCRIPT) };
  function scriptText(script) {
    return script
      .map((a) =>
        a[0] === "open"
          ? `Mở ${a[1]} ${a[2]}`
          : a[0] === "close"
            ? `Đóng ${a[1]}`
            : "Dồn",
      )
      .join("\n");
  }
  function parseFreeConfig() {
    const capacity = integer(
      read("f-c-capacity"),
      "Dung lượng RAM",
      1,
      10000000,
    );
    const raw = read("f-c-layout").trim(),
      segs = [];
    let start = 0;
    if (raw)
      for (const token of raw.split(/[\s,;]+/)) {
        const pair = token.split(":");
        if (
          pair.length !== 2 ||
          !/^(-|[A-Za-z][A-Za-z0-9_]{0,11})$/.test(pair[0])
        )
          throw Error(
            "RAM ban đầu: dùng A:200, -:300, B:100… (- là vùng trống).",
          );
        const size = integer(pair[1], "Kích thước vùng", 1, 10000000),
          name = pair[0] === "-" ? null : pair[0];
        segs.push({ start, size, name });
        start += size;
      }
    if (segs.length > 24)
      throw Error("RAM ban đầu tối đa 24 vùng để dễ quan sát.");
    if (start > capacity)
      throw Error(`Các vùng chiếm ${start} KB, vượt RAM ${capacity} KB.`);
    if (start < capacity)
      segs.push({ start, size: capacity - start, name: null });
    unique(
      segs.filter((s) => s.name).map((s) => s.name),
      "Tên tiến trình ban đầu",
    );
    const merged = [];
    for (const seg of segs) {
      const last = merged.at(-1);
      if (last && !last.name && !seg.name) last.size += seg.size;
      else merged.push(seg);
    }
    const lines = read("f-c-script")
      .split(/[\n;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (lines.length > 40) throw Error("Kịch bản tối đa 40 thao tác.");
    const script = lines.map((line, i) => {
      const plain = line
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"));
      let match;
      if (
        (match = plain.match(
          /^(?:mo|open)\s+([A-Za-z][A-Za-z0-9_]{0,11})\s+(\d+)$/i,
        ))
      )
        return [
          "open",
          match[1],
          integer(match[2], `Dung lượng dòng ${i + 1}`, 1, 1000000000),
        ];
      if (
        (match = plain.match(
          /^(?:dong|tat|close)\s+([A-Za-z][A-Za-z0-9_]{0,11})$/i,
        ))
      )
        return ["close", match[1]];
      if (/^(don|don nen|compact)$/i.test(plain)) return ["compact"];
      throw Error(`Dòng ${i + 1}: dùng “Mở A 200”, “Đóng A” hoặc “Dồn”.`);
    });
    return { capacity, segs: merged, script };
  }
  function syncFConfig() {
    resetConfigNotice("f");
    set("f-c-capacity", fConfig.capacity);
    set(
      "f-c-layout",
      fConfig.segs
        ? fConfig.segs.map((s) => `${s.name || "-"}:${s.size}`).join(", ")
        : "",
    );
    set("f-c-script", scriptText(fConfig.script));
    $("#f-size").min = 1;
    $("#f-size").max = 1000000000;
  }
  configPanel(
    "f",
    $("#f-script").parentElement,
    field("f-c-capacity", "Dung lượng RAM (KB)", 1000, "number") +
      field(
        "f-c-layout",
        "RAM ban đầu (từ địa chỉ thấp lên)",
        "",
        "textarea",
        "Ví dụ A:200, -:300, B:100. Phần chưa khai báo tự là vùng trống ở cuối; để trống = RAM rỗng.",
      ) +
      field(
        "f-c-script",
        "Kịch bản mở / đóng / dồn nén",
        scriptText(api.SCRIPT),
        "textarea",
        "Mỗi dòng một thao tác: Mở A 200 · Đóng A · Dồn. Để trống nếu chỉ muốn thao tác thủ công.",
      ),
    () => {
      const config = parseFreeConfig();
      fConfig = config;
      startF();
    },
    () => {
      fConfig = { capacity: 1000, segs: null, script: copy(api.SCRIPT) };
      startF();
    },
  );

  function beginScan() {
    F.teaching = { scan: -1, index: 0, done: false, before: null };
  }
  function stepFree() {
    if (F.pending) {
      const p = copy(F.pending),
        holes = F.segs.map((s, i) => ({ ...s, i })).filter((s) => !s.name),
        t = F.teaching;
      if (!t.done && t.index < holes.length) {
        const h = holes[t.index++];
        t.scan = h.i;
        const fit = h.size >= p.size;
        if ((fit && A.alg === "first") || t.index === holes.length)
          t.done = true;
        return fEvent(
          `Xét lỗ @${h.start} KB`,
          `${p.name} cần ${p.size} KB; con trỏ quét theo địa chỉ tăng.`,
          `${h.size} ${fit ? "≥" : "<"} ${p.size} KB → ${fit ? "ứng viên; dư " + (h.size - p.size) + " KB" : "bỏ qua"}.`,
          fit && A.alg === "first"
            ? "Dừng ngay; cấp vào lỗ đầu tiên đủ lớn."
            : t.done
              ? "Chọn ứng viên theo thuật toán."
              : "Xét lỗ kế tiếp.",
          `Hàng chờ ${p.name} → Allocator → RAM @${h.start}`,
        );
      }
      const before = copy(F.segs);
      const free = before
        .filter((s) => !s.name)
        .reduce((n, s) => n + s.size, 0);
      api.doPlace();
      F.hist = [];
      beginScan();
      const placed = F.segs.find((s) => s.name === p.name);
      F.waitingSizes = F.waitingSizes || {};
      if (placed) delete F.waitingSizes[p.name];
      else F.waitingSizes[p.name] = p.size;
      return fEvent(
        placed ? `Đặt ${p.name} vào RAM` : `${p.name} phải chờ`,
        "Đã hoàn tất quét lỗ.",
        placed
          ? `RAM @${placed.start}: trống → ${p.name} (${p.size} KB).`
          : `Không có lỗ đủ ${p.size} KB; ${free >= p.size ? "đủ tổng chỗ, thiếu vùng liên tục (phân mảnh ngoài)" : "tổng trống " + free + " KB không đủ"}.`,
        "Tiếp tục kịch bản hoặc tự mở/tắt tiến trình.",
        `Allocator → ${placed ? "RAM @" + placed.start : "hàng chờ"}`,
        placed ? "thành công" : "không cấp phát",
      );
    }
    if (F.si >= F.script.length) return null;
    const a = F.script[F.si++];
    beginScan();
    if (a[0] === "open") {
      if (F.segs.some((s) => s.name === a[1]))
        return fEvent(
          `Bỏ yêu cầu trùng ${a[1]}`,
          "Tiến trình này đã ở RAM.",
          "RAM giữ nguyên; không cấp phát hai vùng cùng tên.",
          "Xét thao tác tiếp theo.",
          `OS → ${a[1]}`,
          "không thực hiện",
        );
      api.doOpen(a[1], a[2]);
      beginScan();
      return fEvent(
        `Yêu cầu ${a[1]} · ${a[2]} KB`,
        "Tiến trình gửi yêu cầu tới bộ cấp phát.",
        "RAM chưa thay đổi.",
        "Quét các lỗ trống.",
        `${a[1]} → Memory Allocator`,
      );
    }
    const before = copy(F.segs);
    if (a[0] === "close" && !F.segs.some((s) => s.name === a[1]))
      return fEvent(
        `Không có ${a[1]} trong RAM`,
        "Lệnh đóng không có vùng nhớ tương ứng.",
        "RAM giữ nguyên.",
        "Xét thao tác tiếp theo.",
        "OS → RAM",
        "không thực hiện",
      );
    if (a[0] === "close") api.doClose(a[1]);
    else api.doCompact();
    beginScan();
    if (a[0] === "compact") F.teaching.before = before;
    return fEvent(
      a[0] === "close" ? `Giải phóng ${a[1]}` : "Dồn nén RAM",
      a[0] === "close" ? "Tiến trình kết thúc." : "Các vùng trống nằm rải rác.",
      stripText(F.cap),
      "Tiếp tục kịch bản.",
      a[0] === "close"
        ? `${a[1]} → trả vùng nhớ → RAM`
        : "RAM trước → di chuyển tiến trình → RAM sau",
      "thành công",
    );
  }
  function stripText(s) {
    const el = document.createElement("div");
    el.innerHTML = s;
    return el.textContent;
  }
  function renderF(e) {
    api.configureAllocation(F.capacity, F.script);
    activeSetup(
      "f",
      `RAM ${F.capacity} KB; ${F.script.length} thao tác; ${names[F.allocatorAlg]}.`,
    );
    A.alg = F.allocatorAlg || A.alg;
    $$("#a-alg button").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.a === A.alg),
    );
    api.renderF();
    $("#f-ram").parentElement.style.minWidth =
      Math.max(620, F.segs.length * 70) + "px";
    $("#f-ram").previousElementSibling.textContent =
      `RAM vật lý · ${F.capacity} KB`;
    $("#f-ruler").innerHTML = [0, 0.25, 0.5, 0.75, 1]
      .map(
        (f) =>
          `<span style="left:${f * 100}%">${Number((f * F.capacity).toFixed(2))}</span>`,
      )
      .join("");
    const request = $("#f-req .req");
    if (request && F.pending)
      request.style.width =
        Math.min(100, (F.pending.size / F.capacity) * 100) + "%";
    if (!F.pending && F.waiting.length)
      $("#f-req").innerHTML = F.waiting
        .map(
          (w) =>
            `<span class="chip wait">${esc(w)} · ${F.waitingSizes?.[w] ?? "?"} KB · đang chờ</span>`,
        )
        .join("");
    const scan = F.teaching?.scan;
    [...$("#f-ram").children].forEach((el, i) => {
      el.classList.remove("chosen", "fit", "nofit");
      el.classList.toggle("teach-scan", scan === i);
      el.title = `@${F.segs[i].start} KB · ${F.segs[i].size} KB${F.segs[i].name ? " · " + F.segs[i].name : ""}`;
      const small = el.querySelector("small");
      if (small)
        small.textContent = F.segs[i].size + " KB · @" + F.segs[i].start;
    });
    allocatorF.innerHTML = `<b>HÀNG CHỜ → MEMORY ALLOCATOR (${esc(A.alg)}) → RAM VẬT LÝ</b><p>${esc(e.change)}</p>${route(e)}`;
    if (F.teaching?.before) {
      const strip = (segs) =>
        `<div class="teach-memory-strip">${segs.map((s) => `<span data-free="${!s.name}" style="flex:${s.size}" title="@${s.start}: ${s.size} KB">${s.name || "trống"}</span>`).join("")}</div>`;
      allocatorF.innerHTML += `<div class="teach-compaction"><div><b>TRƯỚC · địa chỉ tăng từ trái</b>${strip(F.teaching.before)}${F.teaching.before
        .filter((s) => s.name)
        .map((s) => `${s.name}@${s.start}`)
        .join(
          " · ",
        )}</div><div><b>SAU · giữ thứ tự tiến trình</b>${strip(F.segs)}${F.segs
        .filter((s) => s.name)
        .map((s) => `${s.name}@${s.start}`)
        .join(" · ")}</div></div>`;
    }
    $$("#f-ram .blk").forEach(
      (b) =>
        (b.onclick = () => {
          if (F.pending)
            return error(
              "f",
              "Hoàn tất yêu cầu đang chờ bằng Bước tiếp trước khi giải phóng.",
            );
          clearError("f");
          const n = b.dataset.n,
            before = copy(F.segs);
          api.doClose(n);
          beginScan();
          ft.append(
            fEvent(
              `Giải phóng ${n}`,
              "Tiến trình kết thúc hoặc người dùng đóng.",
              `Trả ${before.find((s) => s.name === n).size} KB @${before.find((s) => s.name === n).start}; lỗ trống ${before.filter((s) => !s.name).length} → ${F.segs.filter((s) => !s.name).length}. Chỉ gộp lỗ liền kề.`,
              "Có thể tiếp tục cấp phát.",
              `${n} → trả vùng → RAM`,
              "thành công",
            ),
          );
        }),
    );
  }
  const ft = new Timeline("f", "p1", F, renderF, "");
  ft.generate = stepFree;
  ft.more = () => !!F.pending || F.si < F.script.length;
  function startF() {
    api.configureAllocation(fConfig.capacity, fConfig.script);
    api.resetF();
    F.waitingSizes = {};
    F.capacity = fConfig.capacity;
    F.script = copy(fConfig.script);
    F.initialSegments = copy(fConfig.segs);
    if (fConfig.segs) F.segs = copy(fConfig.segs);
    syncFConfig();
    clearError("f");
    beginScan();
    ft.load([
      fEvent(
        F.segs.some((s) => s.name)
          ? "Khởi tạo RAM theo đề"
          : "Khởi tạo RAM trống",
        `${F.capacity} KB; ${F.script.length} thao tác trong kịch bản.`,
        F.segs.some((s) => s.name)
          ? `${F.segs.filter((s) => s.name).length} tiến trình có sẵn; ${F.segs.filter((s) => !s.name).reduce((n, s) => n + s.size, 0)} KB trống.`
          : `Một lỗ @0, kích thước ${F.capacity} KB.`,
        F.script.length
          ? "Gửi yêu cầu đầu tiên."
          : "Nhập dung lượng ở Tự thử rồi bấm Mở.",
        "Hàng chờ → OS → RAM",
      ),
    ]);
  }
  $("#f-reset").onclick = startF;
  if ($("#f-open")) $("#f-open").onclick = () => {
    if (F.pending)
      return error(
        "f",
        "Hoàn tất yêu cầu hiện tại trước khi mở tiến trình mới.",
      );
    const v = Number($("#f-size").value);
    if (!Number.isSafeInteger(v) || v < 1 || v > 1000000000)
      return error("f", "Dung lượng phải là số nguyên 1..1000000000 KB.");
    clearError("f");
    let name;
    do {
      name = "H" + ++F.manual;
    } while (F.segs.some((s) => s.name === name) || F.waiting.includes(name));
    api.doOpen(name, v);
    beginScan();
    ft.append(
      fEvent(
        `Mở ${name} · ${v} KB`,
        "Người dùng gửi yêu cầu mới.",
        "RAM chưa đổi; bắt đầu quét lỗ.",
        "Bấm Bước tiếp để xét từng lỗ.",
        `${name} → Memory Allocator`,
      ),
    );
  };
  $("#f-compact").onclick = () => {
    if (F.pending)
      return error("f", "Hoàn tất yêu cầu đang chờ trước khi dồn nén.");
    clearError("f");
    const before = copy(F.segs);
    api.doCompact();
    beginScan();
    F.teaching.before = before;
    ft.append(
      fEvent(
        "Dồn nén RAM",
        "Người dùng yêu cầu gom vùng trống.",
        stripText(F.cap),
        "Đối chiếu địa chỉ trước/sau, tiếp tục cấp phát.",
        "RAM trước → di chuyển tiến trình → RAM sau",
        "thành công",
      ),
    );
  };
  $$("#a-alg button").forEach(
    (b) =>
      (b.onclick = () => {
        pause();
        A.alg = b.dataset.a;
        $$("#a-alg button").forEach((x) =>
          x.setAttribute("aria-pressed", x === b),
        );
        startA();
        if (F.pending) {
          beginScan();
          ft.append(
            fEvent(
              "Đổi chiến lược · quét lại",
              "Người dùng thay thuật toán.",
              `Áp dụng ${A.alg}; RAM giữ nguyên.`,
              "Quét lại yêu cầu hiện tại.",
              "Hàng chờ → Allocator",
            ),
          );
        } else
          ft.append(
            fEvent(
              "Đổi chiến lược cấp phát",
              "Người dùng thay thuật toán.",
              `Áp dụng ${A.alg}; RAM giữ nguyên.`,
              "Tiếp tục kịch bản.",
              "OS → Allocator",
            ),
          );
        if (!$("#e-wrap").hidden) at.go(at.cursor);
      }),
  );
  $$("#a-mode button").forEach((b) =>
    b.addEventListener("click", () => {
      pause();
      const t = b.dataset.m === "ex" ? at : ft;
      t.go(t.cursor);
    }),
  );
  startF();
  // DEMO 1: keep every original handler and render; record snapshots around them.
  const originalRenderB = api.getRenderB();
  const bt = new Timeline(
    "b",
    "p0",
    B,
    () => {
      originalRenderB();
      $("#b-cap").classList.add("teach-narrator");
      updateBLabels();
    },
    "Base ≤ A < Base + Limit.",
  );
  function bEvent() {
    if (B.mode === "translate") {
      const names = [
        "CPU phát độ lệch logic L",
        "MMU so sánh với Limit",
        "Bộ cộng MMU (Adder)",
        "Truy cập RAM vật lý",
      ];
      const narrations = [
        `CPU phát độ lệch logic L=${B.offset}. Yêu cầu truy cập byte offset ${B.offset} trong tiến trình.`,
        `MMU kiểm tra điều kiện 0 ≤ L < Limit (0 ≤ ${B.offset} < ${B.limit}). ${B.isValid ? "Hợp lệ (nằm trong giới hạn)." : "Vi phạm! Vượt quá giới hạn tiến trình."}`,
        B.isValid
          ? `MMU dùng bộ cộng phần cứng: PA = Base + L = ${B.base} + ${B.offset} = ${B.pa}.`
          : `Độ lệch không hợp lệ. MMU phát bẫy ngắt TRAP bảo vệ bộ nhớ.`,
        B.isValid
          ? `MMU đưa địa chỉ vật lý PA=${B.pa} lên bus RAM. Truy cập thành công.`
          : `Bẫy ngắt TRAP chuyển điều khiển cho Hệ điều hành xử lý lỗi phân đoạn (Segmentation Fault).`,
      ];
      return event(
        B,
        names[B.st],
        "CPU / MMU",
        `L=${B.offset}; Base=${B.base}; Limit=${B.limit}.`,
        narrations[B.st],
        B.st < 3 ? "Tiếp tục chu trình dịch." : (B.isValid ? "Hoàn tất dịch địa chỉ." : "Ngắt bảo vệ HĐH."),
        "CPU → MMU → RAM",
        "translation",
        B.st === 3 ? (B.isValid ? "thành công" : "trap") : "dịch địa chỉ",
      );
    }
    const names = [
      "CPU phát địa chỉ",
      "Kiểm tra cận dưới",
      "Kiểm tra cận trên",
      "Quyết định MMU",
    ];
    return event(
      B,
      names[B.st],
      "CPU / MMU",
      `A=${B.addr}; Base=${B.base}; Limit=${B.limit}.`,
      `A=${B.addr}; ${B.addr} ≥ ${B.base}: ${B.addr >= B.base}; ${B.addr} < ${B.base + B.limit}: ${B.addr < B.base + B.limit}. ${B.st === 3 ? (B.isValid ? "Cho phép RAM" : "TRAP → OS") : "Chưa ra quyết định cuối."}`,
      "Tiếp tục kiểm tra biên.",
      "CPU → MMU → RAM",
      "request",
      B.st === 3 ? (B.isValid ? "thành công" : "trap") : "kiểm tra",
    );
  }
  function startB() {
    const base = copy(B),
      ev = [];
    for (let st = 0; st <= 3; st++) {
      B.st = st;
      ev.push(bEvent());
    }
    restore(B, base);
    bt.load(ev);
  }
  api.setRenderB(() => {
    originalRenderB();
    startB();
  }); // Existing goB/preset/reset use unchanged validation and values.
  $("#b-next").onclick = () => bt.next();
  $("#b-prev").onclick = () => {
    pause();
    bt.go(bt.cursor - 1);
  };
  $("#b-all").onclick = () => {
    pause();
    while (bt.canNext()) bt.next();
  };
  $("#b-play").onclick = () => play(bt);
  $("#b-reset").onclick = () => {
    pause();
    B.st = 0;
    startB();
  };
  function updateBLabels() {
    if (B.base === 0) $("#b-ram-track > .used").textContent = "";
    $("#b-flow").classList.toggle(
      "teach-large-values",
      Math.max(B.addr, B.base + B.limit) > 1000000,
    );
    const legend = $$(".b-ram-legend span");
    if (legend[0])
      legend[0].innerHTML = `<i style="background:var(--used)"></i>${B.base ? "Vùng trước Base (0 .. " + (B.base - 1) + ")" : "Không có vùng trước Base=0"}`;
    if (legend[1])
      legend[1].innerHTML = `<i style="background:var(--ok)"></i>Vùng được cấp quyền (${B.limit} byte)`;
    const values = {
      low: B.base,
      high: B.base + B.limit - 1,
      over: B.base + B.limit,
      under: B.base === 300040 && B.limit === 120900 ? 256000 : B.base - 1,
    };
    for (const [key, label] of [
      ["low", "cận dưới ✓"],
      ["high", "cận trên ✓"],
      ["over", "ngoài cận trên ✗"],
      ["under", "dưới Base ✗"],
    ]) {
      const el = $("#b-pre-" + key);
      el.disabled = key === "under" && B.base === 0;
      el.textContent = el.disabled
        ? "Không có địa chỉ dưới 0"
        : `${values[key]} (${label})`;
    }
    activeSetup(
      "b",
      `Base=${B.base}; Limit=${B.limit}; miền hợp lệ [${B.base}, ${B.base + B.limit - 1}]; A=${B.addr}.`,
    );
  }
  function submitB(preset) {
    try {
      const base = integer(read("b-base"), "Base", 0, 1000000000),
        limit = integer(read("b-limit"), "Limit", 1, 1000000000);
      let val;
      if (B.mode === "translate") {
        if (preset === "t-std") val = 346;
        else if (preset === "t-low") val = 0;
        else if (preset === "t-over") val = limit;
        else if (preset === "t-under") val = -5;
        else if (preset === "t-rand") val = Math.floor(Math.random() * limit * 1.2);
        else val = integer(read("b-addr"), "Độ lệch logic (L)", -1000000000, 2000000000);
        clearError("b");
        set("b-addr", val);
        api.planB(val, base, limit, "translate");
        startB();
      } else {
        if (preset === "low") val = base;
        else if (preset === "high") val = base + limit - 1;
        else if (preset === "over") val = base + limit;
        else if (preset === "under") {
          if (!base)
            throw Error("Base=0: không có địa chỉ vật lý không âm nhỏ hơn Base.");
          val = base === 300040 && limit === 120900 ? 256000 : base - 1;
        } else if (preset === "rand")
          val = Math.max(
            0,
            base -
              Math.floor(limit / 4) +
              Math.floor(Math.random() * limit * 1.5),
          );
        else val = integer(read("b-addr"), "Địa chỉ A", -1000000000, 2000000000);
        clearError("b", "");
        set("b-addr", val);
        api.planB(val, base, limit, "check");
        startB();
      }
    } catch (err) {
      error("b", err.message);
    }
  }
  $("#b-go").onclick = () => submitB();
  for (const key of ["low", "high", "over", "under", "rand"])
    $("#b-pre-" + key).onclick = () => submitB(key);
  for (const id of ["b-base", "b-limit", "b-addr"]) {
    $("#" + id).max = id === "b-addr" ? 2000000000 : 1000000000;
    $("#" + id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitB();
    });
  }
  const bSample = document.createElement("button");
  bSample.id = "b-sample";
  bSample.className = "btn";
  bSample.textContent = "Khôi phục mẫu Base/Limit";
  $("#b-pre-rand").after(bSample);
  bSample.onclick = () => {
    set("b-base", 300040);
    set("b-limit", 120900);
    set("b-addr", 300040);
    submitB();
  };
  
  const modeCheckBtn = $("#b-mode-check");
  const modeTransBtn = $("#b-mode-trans");
  const presetsCheck = $("#b-presets-check");
  const presetsTrans = $("#b-presets-trans");
  const addrLbl = $("#b-addr-lbl");
  const goBtn = $("#b-go");

  function switchModeB(mode) {
    pause();
    B.mode = mode;
    if (mode === "translate") {
      if (modeCheckBtn) modeCheckBtn.classList.remove("active");
      if (modeTransBtn) modeTransBtn.classList.add("active");
      if (presetsCheck) presetsCheck.style.display = "none";
      if (presetsTrans) presetsTrans.style.display = "flex";
      if (addrLbl) addrLbl.textContent = "Độ lệch logic (L)";
      if (goBtn) goBtn.textContent = "Dịch địa chỉ ▶";
      set("b-base", 14000);
      set("b-limit", 120900);
      set("b-addr", 346);
      api.planB(346, 14000, 120900, "translate");
    } else {
      if (modeTransBtn) modeTransBtn.classList.remove("active");
      if (modeCheckBtn) modeCheckBtn.classList.add("active");
      if (presetsTrans) presetsTrans.style.display = "none";
      if (presetsCheck) presetsCheck.style.display = "flex";
      if (addrLbl) addrLbl.textContent = "Địa chỉ CPU truy cập (A)";
      if (goBtn) goBtn.textContent = "Kiểm tra ▶";
      set("b-base", 300040);
      set("b-limit", 120900);
      set("b-addr", 300040);
      api.planB(300040, 300040, 120900, "check");
    }
    startB();
  }

  if (modeCheckBtn) modeCheckBtn.onclick = () => switchModeB("check");
  if (modeTransBtn) modeTransBtn.onclick = () => switchModeB("translate");

  for (const key of ["t-std", "t-low", "t-over", "t-under", "t-rand"]) {
    const el = $("#b-pre-" + key);
    if (el) el.onclick = () => submitB(key);
  }

  // Wire all toggle-explain-btn across panels
  document.querySelectorAll(".toggle-explain-btn").forEach(btn => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      const targetId = btn.dataset.target;
      const grid = document.getElementById(targetId);
      if (grid) {
        const isHidden = grid.classList.toggle("explain-hidden");
        document.querySelectorAll(`.toggle-explain-btn[data-target="${targetId}"]`).forEach(b => {
          b.textContent = isHidden ? "Hiện giải thích" : "Ẩn giải thích";
        });
      }
    };
  });

  startB();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const t = Object.values(timelines).find(
        (t) => !$("#" + t.panel).hidden && !t.root.closest("[hidden]"),
      );
      if (t) t.go(t.cursor);
    }, 120);
  });
  // Read-only diagnostic surface for reproducible regression tests (no mutation entry points).
  window.MemoryTeaching = {
    snapshot: (id) => copy(timelines[id].events[timelines[id].cursor].state),
    event: (id) => {
      const e = copy(timelines[id].events[timelines[id].cursor]);
      delete e.state;
      return e;
    },
    position: (id) => ({
      cursor: timelines[id].cursor,
      seen: timelines[id].seen,
      total: timelines[id].events.length,
    }),
    trace: (id) => copy(timelines[id].events),
    engines: { simA: api.simA, simR: api.simR },
    pause,
  };
};
