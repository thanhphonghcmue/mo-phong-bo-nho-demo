/* Presentation only: navigation, icons and a snapshot-backed window of visited steps.
   The existing MemoryTeaching controller remains the only simulation controller. */
(() => {
  "use strict";
  if (window.MemoryLabInterface || !window.MemoryTeaching) return;
  const api = window.MemoryTeaching, icon = MemoryScenes.icon;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const lessons = {b:"p0", a:"p1", f:"p1", x:"p2", v:"p4", r:"p3"};
  const steppers = new Map();
  const nav = [
    ["t0", "01", "Bảo vệ địa chỉ", "shield-check"],
    ["t1", "02", "Cấp phát bộ nhớ", "layers"],
    ["t2", "03", "Phân trang & TLB", "network"],
    ["t4", "04", "Bộ nhớ ảo", "hard-drive-download"],
    ["t3", "05", "Thay thế trang", "repeat-2"],
  ];
  nav.forEach(([id, number, title, symbol]) => {
    const button = $("#" + id);
    button.querySelector(".n").textContent = "DEMO " + number;
    button.querySelector(".t").textContent = title;
    button.insertAdjacentHTML("afterbegin", `<span class="lab-nav-icon">${icon(symbol)}</span>`);
    button.querySelector(".teach-pillar svg")?.remove();
    button.tabIndex = button.getAttribute("aria-selected") === "true" ? 0 : -1;
  });
  $(".dash-tabs").addEventListener("keydown", event => {
    const button = event.target.closest('[role="tab"]');
    if (!button || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    const index = nav.findIndex(([id]) => id === button.id);
    const next = event.key === "Home" ? 0 : event.key === "End" ? nav.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + nav.length) % nav.length;
    $("#" + nav[next][0]).focus();
    $("#" + nav[next][0]).click();
  });
  // Keep example selection beside the current input rather than adding another row.
  for (const [id, panel] of Object.entries(lessons)) {
    if (id === "f") continue;
    const root = $("#" + id + "-next").closest(".stage"), examples = root.querySelector(".scene-scenarios");
    const hint = examples.querySelector(".scene-scenario-hint");
    examples.querySelector("select").title = hint.textContent;
    hint.hidden = true;
    if (id === "x" || id === "v") {
      const group = document.createElement("div");
      group.className = "lab-setup-row";
      examples.before(group);
      group.append(examples, root.querySelector(".quick"));
    } else {
      const heading = root.querySelector("h2");
      let row = heading.closest(".bar");
      if (!row) { row = document.createElement("div"); heading.before(row); row.append(heading); }
      row.classList.add("lab-lesson-heading");
      row.append(examples);
    }
  }
  const quick = $("#p4 .quick"), casePicker = document.createElement("details");
  casePicker.className = "lab-case-picker";
  casePicker.innerHTML = '<summary>Thử nhánh khác</summary><div></div>';
  quick.append(casePicker);
  ["v-pre-fault","v-pre-hit","v-pre-fault2","v-pre-invalid"].forEach(id => casePicker.lastElementChild.append($("#" + id)));
  quick.querySelectorAll(":scope > .spacer, :scope > span.muted").forEach(element => element.hidden = true);
  casePicker.addEventListener("click", event => {
    if (event.target.closest("button")) { casePicker.open = false; casePicker.querySelector("summary").focus({preventScroll:true}); }
  });
  casePicker.addEventListener("keydown", event => {
    if (event.key === "Escape") { casePicker.open = false; casePicker.querySelector("summary").focus(); }
  });

  function buttonIcon(button, symbol, label) {
    if (!button) return;
    const html = icon(symbol) + `<span>${esc(label)}</span>`;
    if (button.innerHTML !== html) button.innerHTML = html;
  }
  function paintButtons() {
    for (const id of Object.keys(lessons)) {
      for (const [suffix, symbol, label] of [
        ["prev", "arrow-left", "Lùi"], ["next", "arrow-right", "Bước tiếp"],
        ["reset", "rotate-ccw", "Làm lại"],
      ]) buttonIcon($("#" + id + "-" + suffix), symbol, label);
    }
    buttonIcon($("#x-go"), "scan-line", "Dịch địa chỉ");
    buttonIcon($("#v-go"), "arrow-right", "Truy cập");
    buttonIcon($("#b-go"), "shield-check", api.snapshot("b").mode === "translate" ? "Dịch địa chỉ" : "Kiểm tra");
    document.querySelectorAll(".toggle-explain-btn").forEach(button => {
      const open = button.getAttribute("aria-expanded") === "true";
      buttonIcon(button, "list-ordered", open ? "Ẩn giải thích" : "Hiện giải thích");
    });
    const dark = document.documentElement.dataset.theme === "dark";
    buttonIcon($("#theme-toggle"), dark ? "sun" : "moon", dark ? "Nền sáng" : "Nền tối");
    $("#theme-toggle").setAttribute("aria-label", "Chuyển sang chế độ " + (dark ? "sáng" : "tối"));
  }

  function shortTitle(title) {
    return title.replace(/^CPU phát địa chỉ logic$/, "CPU gửi địa chỉ")
      .replace(/^Tách số trang và độ lệch$/, "Tách trang / độ lệch")
      .replace(/^Tra bảng trang trong RAM$/, "Tra bảng trang")
      .replace(/^Page Fault · nạp trang hợp lệ$/, "OS nạp trang")
      .replace(/^Truy cập khung và byte trong RAM$/, "Đọc đúng byte")
      .replace(/^Định vị trang trên bộ nhớ phụ$/, "Tìm trang trên đĩa")
      .replace(/^RAM đầy · chọn victim /, "Chọn trang · ")
      .replace(/^Nạp trang vào khung nạn nhân$/, "Nạp vào khung đã chọn");
  }
  function mount(id) {
    const root = $("#" + id + "-next").closest(".stage");
    const element = document.createElement("section");
    element.className = "lab-stepper";
    element.dataset.lesson = id;
    element.setAttribute("aria-label", "Tiến trình từng bước của mô phỏng");
    element.innerHTML = '<div class="lab-stepper-head"></div><div class="lab-progress" role="progressbar" aria-label="Vị trí trong luồng thực hiện"><span></span></div><ol class="lab-steps"></ol>';
    root.querySelector(".demo-stage-grid").before(element);
    const status = root.querySelector(`.scene-status[data-lesson="${id}"]`);
    if (status) { status.setAttribute("aria-atomic", "true"); element.append(status); }
    element.addEventListener("click", event => {
      const button = event.target.closest("button[data-lab-step]");
      if (!button || button.disabled) return;
      const step = Number(button.dataset.labStep);
      // Future events are never enabled, even if the engine has planned them.
      if (step <= api.position(id).seen) api.seek(id, step);
    });
    steppers.set(id, element);
  }

  function render(id) {
    const element = steppers.get(id);
    if (!element) return;
    const position = api.position(id), current = api.event(id);
    const events = api.trace(id), count = matchMedia("(max-width: 600px)").matches ? 3 : 5;
    const start = Math.max(0, Math.min(position.cursor - Math.floor(count / 2), position.total - count));
    const end = Math.min(position.total, start + count);
    const focused = element.contains(document.activeElement) ? document.activeElement?.dataset.labStep : null;
    const growing = id === "f" && api.canNext(id);
    element.querySelector(".lab-stepper-head").innerHTML = `<span>${icon("list-ordered")} LUỒNG THỰC HIỆN</span><b>Bước ${position.cursor + 1}<span>${growing ? ' · còn tiếp' : ' / ' + position.total}</span></b>`;
    const progress = element.querySelector(".lab-progress");
    progress.hidden = growing;
    progress.setAttribute("aria-valuemin", "1");
    progress.setAttribute("aria-valuemax", String(position.total));
    progress.setAttribute("aria-valuenow", String(position.cursor + 1));
    progress.setAttribute("aria-valuetext", `Bước ${position.cursor + 1}/${position.total}: ${current.title}`);
    progress.firstElementChild.style.transform = `scaleX(${(position.cursor + 1) / position.total})`;
    element.querySelector("ol").innerHTML = events.slice(start, end).map((event, offset) => {
      const step = start + offset, visited = step <= position.seen, active = step === position.cursor;
      const done = step < position.cursor;
      const state = event.state;
      const skipped = visited && id === "b" && step === 2 &&
        (state.mode === "translate" ? !state.isValid : !state.cond1);
      const title = !visited ? "Chưa thực hiện" : skipped
        ? (state.mode === "translate" ? "Bỏ qua cộng Base" : "Bỏ qua cận trên")
        : shortTitle(event.title);
      return `<li class="${active ? "is-current" : done ? "is-done" : visited ? "is-visited" : "is-pending"}${skipped ? ' is-skipped' : ''}"><button type="button" data-lab-step="${step}" ${visited ? "" : "disabled"} ${active ? 'aria-current="step"' : ""} aria-label="${visited ? 'Xem bước' : 'Chưa thực hiện bước'} ${step + 1}${visited ? ': ' + esc(title) : ''}" title="${esc(title)}"><span class="lab-step-dot">${skipped ? '–' : done ? icon("check") : step + 1}</span><span class="lab-step-label">${esc(title)}</span></button></li>`;
    }).join("");
    if (focused !== null) element.querySelector(`[data-lab-step="${focused}"]`)?.focus({preventScroll:true});
    if (id === "r") {
      const state = api.snapshot("r");
      $("#r-scene .ramzone .zone-t").textContent = `RAM · ${state.n} KHUNG VẬT LÝ`;
      $("#r-need .card").dataset.pageNumber = state.refs[state.runtime.t] ?? "";
      // A reference number is an identity; status still has its own text and color.
      document.querySelectorAll("#r-evidence .scene-token").forEach(token => {
        const page = token.textContent.match(/Trang (\d+)/);
        if (page) token.dataset.pageNumber = page[1];
      });
    }
    document.querySelectorAll("[data-page-number]").forEach(page => {
      const value = page.dataset.pageNumber;
      page.dataset.pageTone = value === "" ? "" : String(Number(value) % 6);
    });
    paintButtons();
  }

  Object.keys(lessons).forEach(mount);
  Object.keys(lessons).forEach(render);
  window.addEventListener("memory-lesson-step", event => render(event.detail.id));
  // Swap complete theme pairs together; do not interpolate light text over a light surface.
  new MutationObserver(() => {
    document.documentElement.classList.add("lab-theme-changing");
    paintButtons();
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove("lab-theme-changing")));
  }).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});
  document.addEventListener("click", event => {
    if (!event.target.closest(".lab-case-picker")) casePicker.open = false;
    if (event.target.closest(".theme-toggle-btn, .toggle-explain-btn, #b-mode-check, #b-mode-trans")) paintButtons();
    const tab = event.target.closest('[role="tab"]');
    if (tab) {
      nav.forEach(([id]) => $("#" + id).tabIndex = id === tab.id ? 0 : -1);
      requestAnimationFrame(() => {
      tab.scrollIntoView({block:"nearest", inline:"nearest", behavior:"instant"});
      });
    }
  });
  window.MemoryLabInterface = Object.freeze({refresh:render, version:"academic-lab-2"});
})();
