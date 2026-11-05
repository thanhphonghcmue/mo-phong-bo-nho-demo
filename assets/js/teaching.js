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

  // Academic wording follows the event snapshot, including history restoration.
  // Source mapping belongs in docs/ACADEMIC_ALIGNMENT.md, not the teaching UI.
  function renderDeepExplanation(id, e, stepIndex) {
    const s = e.state || {};
    const title = (e.title || "").toLocaleLowerCase("vi");
    let mech = e.next;

    if (id === "b") {
      if (s.mode === "translate") {
        if (stepIndex === 0) {
          mech = `CPU tạo địa chỉ logic L=${s.offset}, tức độ lệch tính từ đầu tiến trình. L chưa phải địa chỉ trong RAM; MMU phải kiểm tra giới hạn trước khi dịch.`;
        } else if (stepIndex === 1) {
          mech = s.isValid
            ? `Limit=${s.limit} là độ dài vùng nhớ, không phải địa chỉ cuối. Vì 0 ≤ ${s.offset} < ${s.limit}, MMU cho phép chuyển sang bộ cộng Base.`
            : `Độ lệch ${s.offset} ${s.offset < 0 ? "âm" : `không nhỏ hơn Limit=${s.limit}`}, nên không thuộc tiến trình. MMU chặn truy cập và chuyển lỗi bảo vệ cho OS; không tạo PA hợp lệ.`;
        } else if (stepIndex === 2) {
          mech = s.isValid
            ? `Base=${s.base} là địa chỉ vật lý bắt đầu của tiến trình. MMU tính PA=${s.base}+${s.offset}=${s.pa}; địa chỉ logic của chương trình vẫn là ${s.offset}.`
            : "Kiểm tra giới hạn đã thất bại nên bộ cộng không được cấp một bản dịch hợp lệ. Trap là ngoại lệ đồng bộ do lệnh truy cập gây ra, không phải thao tác nạp trang.";
        } else {
          mech = s.isValid
            ? `RAM nhận PA=${s.pa}, không nhận L=${s.offset}. Byte này nằm trong vùng vật lý [${s.base}, ${s.base + s.limit - 1}] được cấp cho tiến trình.`
            : "OS nhận trap lỗi bảo vệ và xử lý truy cập trái phép. Việc cộng Base không thể biến một độ lệch ngoài giới hạn thành truy cập hợp lệ.";
        }
      } else {
        if (stepIndex === 0) {
          mech = `A=${s.addr} là địa chỉ vật lý đầu vào của mô hình kiểm tra bảo vệ, chưa được phép truy cập RAM. Muốn theo dõi địa chỉ do chương trình sinh ra được dịch thế nào, chọn chế độ Dịch địa chỉ logic.`;
        } else if (stepIndex === 1) {
          mech = s.addr >= s.base
            ? `A=${s.addr} không nằm dưới Base=${s.base}, nên qua phép kiểm tra cận dưới. Điều này chưa đủ kết luận hợp lệ; còn phải kiểm tra cận trên.`
            : `A=${s.addr} nằm trước vùng tiến trình bắt đầu tại Base=${s.base}. Vùng đó có thể thuộc OS hoặc tiến trình khác; phần cứng phải chặn truy cập.`;
        } else if (stepIndex === 2) {
          mech = !s.cond1
            ? "Cận dưới đã vi phạm; dù bất đẳng thức cận trên có đúng, truy cập vẫn bị chặn. Hai điều kiện bảo vệ phải đồng thời đúng."
            : s.cond2
              ? `A=${s.addr} nhỏ hơn Base+Limit=${s.base + s.limit}; cả hai cận đều đạt. Byte hợp lệ cuối là ${s.base + s.limit - 1}, vì cận trên không được lấy dấu bằng.`
              : `A=${s.addr} không nhỏ hơn Base+Limit=${s.base + s.limit}, nên vượt vùng được cấp. Limit là kích thước; địa chỉ bằng Base+Limit đã nằm ngoài vùng.`;
        } else {
          mech = s.isValid
            ? `Cả hai so sánh đều đúng, địa chỉ vật lý A=${s.addr} hợp lệ nên MMU chuyển quyền cho RAM nhận truy cập tại ô nhớ [${s.addr}]. Chế độ này chỉ kiểm tra địa chỉ vật lý; không cộng Base thêm lần nữa.`
            : "Ít nhất một điều kiện biên sai nên phần cứng MMU phát trap lỗi bảo vệ về OS. RAM không được đọc/ghi tại địa chỉ bị từ chối.";
        }
      }
    } else if (id === "f" || id === "a") {
      const alg = s.allocatorAlg || s.alg;
      const rule = alg === "first"
        ? "First-fit dừng ở lỗ đầu tiên đủ lớn theo thứ tự địa chỉ đang duyệt."
        : alg === "best"
          ? "Best-fit xét hết danh sách chưa sắp theo kích thước, chọn lỗ nhỏ nhất nhưng vẫn đủ chứa yêu cầu."
          : "Worst-fit xét hết danh sách chưa sắp theo kích thước, chọn lỗ lớn nhất để phần dư còn lớn nhất.";
      if (e.status === "không cấp phát") {
        mech = e.change.includes("phân mảnh ngoài")
          ? "Tổng bộ nhớ trống đủ nhưng không có một lỗ liên tục đủ lớn: đây là phân mảnh ngoài. Yêu cầu phải chờ; bộ cấp phát không ghép các lỗ cách nhau qua một tiến trình."
          : "Không có một lỗ liên tục đủ lớn nên yêu cầu phải chờ và RAM giữ nguyên. Nếu tổng trống cũng thiếu thì đây là thiếu dung lượng, không chỉ là phân mảnh ngoài.";
      } else if (title.includes("dồn nén")) {
        mech = "Dồn nén di chuyển các tiến trình để gom vùng trống về một khối; tổng dung lượng trống không tăng. Cách này cần tái định vị động và cập nhật địa chỉ cơ sở của các tiến trình bị dời.";
      } else if (title.includes("giải phóng")) {
        mech = "OS thu hồi vùng của tiến trình kết thúc và gộp các lỗ trống liền kề. Việc gộp không di chuyển tiến trình còn sống, khác với dồn nén.";
      } else if (title.includes("xét lỗ") || title.includes("chọn lỗ")) {
        mech = `${rule} Phần còn dư bằng kích thước lỗ trừ kích thước yêu cầu; bước quét chưa thay đổi nội dung RAM.`;
      } else if (title.startsWith("đặt ") || title.includes("cập nhật ram")) {
        mech = "OS đặt tiến trình vào đầu lỗ đã chọn; phần dư trở thành lỗ trống, nếu còn. Đây là cấp phát liên tục: mọi byte của tiến trình nằm trong cùng một vùng.";
      } else if (title.includes("yêu cầu") && e.status !== "không thực hiện") {
        mech = `Tiến trình cần một vùng RAM liên tục đủ kích thước, không chỉ đủ tổng chỗ trống. ${rule}`;
      } else {
        mech = `OS quản lý các vùng đã cấp và các lỗ trống; một lỗ không thể chồng lên vùng đang dùng. ${rule}`;
      }
    } else if (id === "x") {
      const p = s.plan, size = s.pageSize;
      if (title.startsWith("cpu phát")) {
        mech = `Chương trình muốn tìm byte ${p.addr}. CPU gửi yêu cầu này; địa chỉ thật trong RAM chưa được xác định.`;
      } else if (title.startsWith("trap")) {
        mech = "Địa chỉ ngoài không gian logic nên MMU chuyển lỗi truy cập cho OS. Đây không phải một trang hợp lệ đang chờ nạp; không thực hiện I/O để sửa địa chỉ sai.";
      } else if (title.startsWith("tách")) {
        mech = `Mỗi trang chứa ${size} byte. Chia ${p.addr} cho ${size}: được ${p.p}, dư ${p.d}; vậy cần trang p=${p.p}, tại vị trí d=${p.d} trong trang.`;
      } else if (title.startsWith("tra tlb")) {
        mech = p.hit
          ? `TLB Hit: sổ nhớ nhanh đã biết trang ${p.p} ở ngăn RAM ${p.f}. Bỏ qua tra bảng trang, nhưng vẫn phải đến RAM để đọc dữ liệu.`
          : `TLB Miss chỉ có nghĩa sổ nhớ nhanh chưa có chỉ đường cho trang ${p.p}. Máy phải xem bảng trang; chưa thể kết luận trang đang thiếu trong RAM.`;
      } else if (title.startsWith("tra bảng trang")) {
        mech = p.fault
          ? `Bảng trang báo trang ${p.p} chưa nằm trong RAM (present=0). Máy báo lỗi trang để hệ điều hành nạp vào; chưa được đọc dữ liệu.`
          : `Bảng trang cho biết trang ${p.p} đang ở ngăn ${p.f} (present=1). Lượt này không gây Page Fault: thiếu chỉ đường trong TLB, nhưng dữ liệu vẫn ở RAM.`;
      } else if (title.startsWith("ram đầy")) {
        mech = "Page Fault đã được phát hiện nhưng không có khung trống để nạp trang. Mô hình dịch địa chỉ dừng an toàn; cần cơ chế thay trang ở Demo 4 hoặc thêm khung trống, chưa có PA hợp lệ.";
      } else if (e.kind === "page-in") {
        mech = `OS đọc trang ${p.p} từ bộ nhớ phụ vào khung trống ${p.newF}, rồi cập nhật PTE. Demo này gộp phần xử lý lỗi trang; Demo 4 tách riêng các bước trap, I/O, cập nhật và chạy lại lệnh.`;
      } else if (title.startsWith("điền bản dịch tlb")) {
        mech = `Máy ghi nhớ chỉ đường trang ${p.p} → ngăn ${p.f} vào TLB để lần sau tra nhanh. Thay một mục trong TLB không xóa dữ liệu trang trong RAM.`;
      } else if (title.startsWith("tạo địa chỉ")) {
        mech = `Ngăn RAM ${p.f} bắt đầu ở byte ${p.f * size}. Thêm vị trí ${p.d} trong ngăn: địa chỉ thật PA=${p.phys}.`;
      } else if (e.kind === "read") {
        mech = `CPU đến byte ${p.phys} trong ngăn RAM ${p.f} để đọc dữ liệu. TLB và bảng trang chỉ giữ chỉ đường; dữ liệu cần đọc nằm trong RAM.`;
      }
    } else if (id === "v") {
      const page = s.page, pte = s.pt[page], frame = s.plan.chosenFrame;
      if (title.startsWith("cpu tham chiếu")) {
        mech = `Chương trình muốn ${s.operation === "write" ? "ghi vào" : "đọc"} trang ${page}. Trước tiên, bộ dịch địa chỉ kiểm tra quyền và xem trang đã có trong RAM chưa.`;
      } else if (title.startsWith("từ chối")) {
        mech = "Trang ngoài miền hoặc không có quyền nên truy cập bị từ chối. Trong mô hình này đây là lỗi bảo vệ, không phải thiếu trang hợp lệ để nạp; RAM và bộ nhớ phụ giữ nguyên.";
      } else if (e.kind === "trap") {
        mech = `Trang ${page} được phép dùng nhưng chưa ở RAM. Máy báo cho hệ điều hành (OS) bằng trap; trap chưa đọc trang vào RAM, lệnh hiện tại đang tạm dừng.`;
      } else if (title.startsWith("định vị")) {
        mech = `Hệ điều hành tìm bản lưu của trang ${page} trên bộ nhớ phụ, thường là ổ đĩa. Mới tìm chỗ lưu; chưa chuyển trang vào RAM.`;
      } else if (title.includes("chọn victim")) {
        mech = `RAM hết khung trống nên OS chọn nạn nhân theo ${names[s.policy]}. Chọn nạn nhân chưa đồng nghĩa ghi ra đĩa: chỉ cần ghi nếu dirty=1; trang sạch đã có bản lưu phù hợp.`;
      } else if (e.kind === "page-out") {
        mech = `Trang nạn nhân ${s.plan.victim} đã bị ghi sửa, nên OS phải lưu nội dung mới về bộ nhớ phụ trước khi dùng lại khung. Khi I/O ghi hoàn tất, dirty được xóa; bước này chưa nạp trang ${page}.`;
      } else if (e.kind === "page-in") {
        mech = `Trang ${page} được đọc từ bộ nhớ phụ vào ngăn RAM ${frame}. Dữ liệu đã tới, nhưng bảng trang chưa được đánh dấu hiện diện; phải ghi lại chỉ đường rồi mới chạy tiếp.`;
      } else if (title.startsWith("cập nhật bảng trang")) {
        mech = `Trang đã nạp xong. Hệ điều hành ghi vào bảng: trang ${page} ở ngăn ${pte.frame}, present=1 nghĩa là đã có trong RAM; bộ dịch địa chỉ giờ biết đường đến dữ liệu.`;
      } else if (title.startsWith("khởi động lại")) {
        mech = `CPU thử lại đúng lệnh ${s.operation === "write" ? "ghi" : "đọc"} đang dở. Trang đã ở ngăn ${frame} nên lệnh hoàn tất${s.operation === "write" ? "; ghi làm dirty=1" : ""}; không cộng thêm lỗi trang cho lần thử lại này.`;
      } else if (title.startsWith("page hit")) {
        mech = `Trang ${page} đã ở ngăn RAM ${frame}, máy chỉ cần đến đó. Không có trap Page Fault và không cần đọc trang từ bộ nhớ phụ.`;
      } else if (e.kind === "write" || e.kind === "read") {
        mech = s.operation === "write"
          ? `CPU ghi dữ liệu vào khung ${frame} trong RAM và phần cứng đặt dirty=1. Đây không phải lệnh ghi ngay ra bộ nhớ phụ; bit dirty giúp OS biết cần lưu lại khi thay trang.`
          : `CPU đọc dữ liệu trong ngăn RAM ${frame}. Trang không bị ghi sửa và không cần đọc ổ đĩa.`;
      }
    } else if (id === "r") {
      const r = s.runtime;
      if (r.phase === "start") {
        mech = "RAM và thông tin thứ tự sử dụng được lấy từ đề đã áp dụng. Chưa thực hiện tham chiếu nào nên các bộ đếm Hit/Fault bắt đầu từ 0.";
      } else if (r.phase === "inspect") {
        mech = "Kim Clock gặp R=1: trang đã được tham chiếu từ lần xóa bit gần nhất nên được cơ hội thứ hai. Chỉ kiểm tra bit ở bước này, chưa thay trang.";
      } else if (r.phase === "clear") {
        mech = `OS xóa R ở khung vừa xét rồi chuyển kim tới khung ${r.ptr}; các trang trong RAM vẫn giữ nguyên. R chỉ là dấu đã tham chiếu, không phải thời điểm dùng gần nhất như LRU.`;
      } else if (r.phase === "victim") {
        mech = s.alg === "FIFO" ? "FIFO chọn trang có thời điểm nạp sớm nhất; một lần Hit không đưa trang về cuối hàng đợi. Nạn nhân đã chọn nhưng RAM chưa bị thay ở bước này."
          : s.alg === "LRU" ? "LRU so sánh lần truy cập gần nhất, chọn trang lâu chưa được dùng nhất trong quá khứ. Đây là thời điểm sử dụng, không phải thời điểm nạp."
            : s.alg === "OPT" ? "OPT chọn trang có lần dùng kế tiếp xa nhất, ưu tiên trang không còn được dùng. Thuật toán cần biết trước chuỗi tương lai nên là chuẩn lý tưởng để so sánh."
              : `Clock dừng tại khung ${r.slot} có R=0 và chọn trang ${r.victim}. R=0 cho biết chưa được tham chiếu từ lần xóa bit, không chứng minh trang này là LRU chính xác.`;
      } else if (e.kind === "read") {
        mech = s.alg === "CLOCK" ? `Page Hit chỉ đọc RAM và đặt R=1; kim vẫn ở khung ${r.ptr}, không quay vì Hit.`
          : s.alg === "FIFO" ? "Page Hit không đọc bộ nhớ phụ và không đổi thứ tự nạp của FIFO."
            : "Page Hit không nạp lại trang; LRU cập nhật lần dùng gần nhất, còn OPT xét các tham chiếu tiếp theo.";
      } else if (e.kind === "page-in") {
        mech = r.victim === null
          ? "Còn khung trống nên chỉ cần nạp trang, không chọn nạn nhân. Mỗi tham chiếu thiếu trang được tính một lỗi trang."
          : "Thay ánh xạ cũ bằng trang yêu cầu trong cùng khung. Demo này chỉ đọc các trang sạch nên không cần I/O ghi nạn nhân; Demo 4 mô phỏng riêng trường hợp dirty.";
      } else if (r.phase === "request") {
        mech = "MMU kiểm tra trang yêu cầu đã có trong RAM chưa. Chỉ cần chọn nạn nhân khi trang vắng mặt và mọi khung đều đã được dùng.";
      }
    }

    return `<div class="teach-deep-content">${esc(mech)}</div>`;
  }
  function renderTerms(id, e, open) {
    if (!["x", "v", "r"].includes(id)) return "";
    const words = {
      CPU: "Bộ xử lý: chạy các lệnh của chương trình.",
      MMU: "Bộ dịch địa chỉ: đổi địa chỉ chương trình thành địa chỉ trong RAM.",
      RAM: "Bộ nhớ làm việc, chứa dữ liệu đang được chương trình dùng.",
      Byte: "Đơn vị đo dữ liệu. Mỗi địa chỉ trong mô phỏng chỉ đến một byte.",
      LA: "Địa chỉ logic: vị trí chương trình muốn tìm, trước khi đổi sang địa chỉ RAM.",
      PA: "Địa chỉ vật lý: vị trí thật của byte trong RAM.",
      "Trang (Page)": "Một phần của chương trình có kích thước cố định. Các trang được đánh số từ 0.",
      "Khung (Frame)": "Một ngăn trong RAM để chứa một trang. Khung và trang có cùng kích thước.",
      p: "Số thứ tự trang: lấy phần nguyên khi chia địa chỉ logic cho cỡ trang.",
      d: "Vị trí trong trang: phần dư của phép chia. Khi đổi trang sang khung, d giữ nguyên.",
      TLB: "Sổ nhớ nhanh vài bản dịch trang → khung, nằm gần CPU/MMU; không chứa dữ liệu trang.",
      "Bảng trang (Page Table)": "Sổ địa chỉ trong RAM, do OS lập khi bố trí bộ nhớ: cho biết mỗi trang nằm ở khung nào.",
      Present: "1: trang đã có trong RAM. 0: trang chưa ở RAM. Quyền truy cập được kiểm tra riêng.",
      OS: "Hệ điều hành: quản lý RAM, chọn khung và yêu cầu đọc/ghi trang.",
      Trap: "Thông báo do lệnh đang chạy gây ra, chuyển việc xử lý về hệ điều hành.",
      "Page Fault": "Lỗi trang: trang hợp lệ cần dùng chưa nằm trong RAM; OS phải nạp trang rồi thử lại lệnh.",
      "Bộ nhớ phụ (Backing Store)": "Nơi giữ bản lưu trang, thường là ổ đĩa. CPU không đọc dữ liệu của lệnh trực tiếp ở đây.",
      "I/O": "Đọc/ghi với thiết bị. Trong bước nạp trang: đưa dữ liệu giữa bộ nhớ phụ và RAM.",
      Dirty: "Bit đánh dấu trang đã bị ghi sửa. Khi thay trang này, cần lưu nội dung mới về bộ nhớ phụ.",
      Victim: "Trang được chọn để nhường ngăn RAM cho trang cần dùng.",
      "Bit R": "1: đã được tham chiếu từ lần xóa bit gần nhất; 0: chưa. Clock xóa R=1 để cho cơ hội thứ hai.",
      "Không giới hạn": "Tên trụ cột của bộ nhớ ảo: không cần nạp toàn bộ tiến trình vào RAM. RAM và ổ đĩa thực tế vẫn hữu hạn.",
    };
    let keys;
    const title = e.title.toLocaleLowerCase("vi");
    if (id === "x") {
      keys = title.startsWith("cpu") ? ["CPU", "MMU", "LA", "Byte"]
        : title.startsWith("tách") ? ["Trang (Page)", "p", "d"]
          : title.includes("tlb") ? ["TLB", "Trang (Page)", "Khung (Frame)"]
            : title.includes("bảng trang") ? ["Bảng trang (Page Table)", "Present", "Khung (Frame)"]
              : e.kind === "page-in" || e.kind === "trap" ? ["Page Fault", "OS", "Bộ nhớ phụ (Backing Store)"]
                : ["PA", "Khung (Frame)", "d"];
    } else if (id === "v") {
      keys = title.startsWith("cpu") ? ["CPU", "Trang (Page)", "RAM", "Không giới hạn"]
        : title.startsWith("cập nhật") || title.startsWith("page hit") ? ["Bảng trang (Page Table)", "Present", "Khung (Frame)"]
          : e.kind === "trap" ? (e.state.plan.oob ? ["OS", "Trap"] : ["OS", "Trap", "Page Fault"])
            : e.kind === "page-out" ? ["Dirty", "I/O", "Victim"]
              : e.kind === "page-in" || title.startsWith("định vị") ? ["Bộ nhớ phụ (Backing Store)", "I/O", "Khung (Frame)"]
                : title.includes("victim") ? ["Victim", "Dirty", "Khung (Frame)"]
                  : ["CPU", "RAM", "Dirty"];
    } else keys = e.state.alg === "CLOCK" ? ["Khung (Frame)", "Victim", "Bit R"] : ["Trang (Page)", "Khung (Frame)", "Page Fault", "Victim"];
    return `<details class="teach-terms" ${open ? "open" : ""}><summary>Giải nghĩa các chữ trong bước này</summary><dl>${keys.map(key => `<dt>${esc(key)}</dt><dd>${esc(words[key])}</dd>`).join("")}</dl></details>`;
  }

  function route(e) {
    return `<div class="teach-path" data-kind="${esc(e.kind)}"><span>${esc({ request: "Yêu cầu / điều khiển", translation: "Dịch địa chỉ", read: "Đọc RAM", write: "Ghi RAM", "page-in": "Dữ liệu nạp trang", "page-out": "Dữ liệu ghi trang", trap: "TRAP → hệ điều hành" }[e.kind])}</span><span class="teach-packet">${esc(e.path || e.actor)}</span></div>`;
  }
  // Connect the actual components with one active, typed edge per event.
  function connect(root, from, to, e, speed = 1) {
    if (!root) return;
    root.querySelector(".teach-wire")?.remove();
    root.querySelectorAll(".teach-spotlight, .teach-source").forEach((el) => {
      el.classList.remove("teach-spotlight", "teach-source");
      delete el.dataset.processing;
    });
    if (to) {
      to.classList.add("teach-spotlight");
      to.dataset.processing = "true";
      to.dataset.signal = e.kind;
    }
    if (!from || !to || from === to) return;
    from.classList.add("teach-source");
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
    const verticalToRam = !!to.closest("#f-ram, #a-ram, #x-data");
    const horizontal = !verticalToRam && Math.abs(ac.x - bc.x) > Math.abs(ac.y - bc.y);
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
    let d = horizontal
      ? `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`
      : `M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2}`;
    if (root.matches("#x-flow, #v-flow"))
      d = memoryPath(root, from, to, r, a, b, d);
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
    svg.dataset.from = from.id || from.dataset.frame || from.dataset.start || "source";
    svg.dataset.to = to.id || to.dataset.frame || to.dataset.start || "target";
    svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    svg.setAttribute("aria-hidden", "true");
    const id = "wire-" + root.id;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? ""
      : `<circle r="5" fill="${color}"><animateMotion dur="${0.8 / speed}s" path="${d}" repeatCount="1" fill="freeze"/></circle>`;
    svg.innerHTML = `<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="${color}"/></marker></defs><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" ${["trap", "request"].includes(e.kind) ? 'stroke-dasharray="5 4"' : ""} marker-end="url(#${id})"/>${motion}`;
    root.append(svg);
  }
  // Keep the active edge in the gaps between the four teaching blocks.
  function memoryPath(root, from, to, r, a, b, fallback) {
    const ax = a.left + a.width / 2 - r.left, ay = a.top + a.height / 2 - r.top;
    const bx = b.left + b.width / 2 - r.left, by = b.top + b.height / 2 - r.top;
    const layout = root.querySelector(".teach-layout-x, .teach-layout-v");
    if (!layout || matchMedia("(max-width: 620px)").matches) return fallback;
    if (root.id === "x-flow") {
      if (to.matches("[data-frame]")) {
        const gap = layout.getBoundingClientRect().bottom - r.top + 10;
        return `M ${ax} ${from.id === "x-os" ? a.top - r.top : a.bottom - r.top} L ${ax} ${gap} L ${bx} ${gap} L ${bx} ${b.bottom - r.top}`;
      }
      if (to.id === "x-os") {
        const x = 4, y = b.top - r.top - 8;
        return `M ${a.left - r.left} ${ay} L ${x} ${ay} L ${x} ${y} L ${bx} ${y} L ${bx} ${b.top - r.top}`;
      }
    } else {
      const ram = root.querySelector("#v-ram").getBoundingClientRect();
      const os = root.querySelector("#v-os").getBoundingClientRect();
      const gap = (ram.bottom + os.top) / 2 - r.top;
      if ((from.id === "v-cpu" && to.matches("[data-frame]")) || (from.matches("[data-frame]") && to.id === "v-cpu")) {
        const f = from.matches("[data-frame]") ? a : b;
        const cpu = from.id === "v-cpu" ? a : b;
        const fx = f.left + f.width / 2 - r.left, cx = cpu.right - r.left;
        const cy = cpu.top + cpu.height / 2 - r.top, x = (cpu.right + ram.left) / 2 - r.left;
        return from.id === "v-cpu"
          ? `M ${cx} ${cy} L ${x} ${cy} L ${x} ${gap} L ${fx} ${gap} L ${fx} ${f.bottom - r.top}`
          : `M ${fx} ${f.bottom - r.top} L ${fx} ${gap} L ${x} ${gap} L ${x} ${cy} L ${cx} ${cy}`;
      }
      if (from.id === "v-os" && to.matches("[data-frame]"))
        return `M ${ax} ${a.top - r.top} L ${ax} ${gap} L ${bx} ${gap} L ${bx} ${b.bottom - r.top}`;
      if (from.id === "v-store" && to.matches("[data-frame]"))
        return `M ${ax} ${a.top - r.top} L ${ax} ${gap} L ${bx} ${gap} L ${bx} ${b.bottom - r.top}`;
      if (from.matches("[data-frame]") && to.id === "v-store")
        return `M ${ax} ${a.bottom - r.top} L ${ax} ${gap} L ${bx} ${gap} L ${bx} ${b.top - r.top}`;
    }
    return fallback;
  }
  function drawEvent(t, e) {
    const id = t.id;
    const speed = Number(t.speed?.value) || 1;
    if (id === "b") {
      const root = $("#b-flow");
      const boxes = root.querySelectorAll(".box");
      connect(root, B.st ? boxes[B.st - 1] : null, boxes[B.st], e, speed);
    } else if (id === "v") {
      const root = $("#v-flow");
      const cpu = $("#v-cpu"), mmu = $("#v-mmu"), os = $("#v-os"),
        store = $("#v-store"), pt = $("#v-pt-focus"), ram = $("#v-ram");
      const frame = root.querySelector(`[data-frame="${V.plan.chosenFrame}"]`) || ram;
      let from = null, to = cpu;
      if (e.kind === "trap") {
        from = mmu; to = os;
      } else if (e.kind === "page-in") {
        from = store; to = frame;
      } else if (e.kind === "page-out") {
        from = frame; to = store;
      } else if (["read", "write"].includes(e.kind)) {
        from = e.kind === "write" ? cpu : frame;
        to = e.kind === "write" ? frame : cpu;
      } else if (e.title.includes("Định vị")) {
        from = os; to = store;
      } else if (e.title.includes("chọn victim")) {
        from = os; to = frame;
      } else if (e.kind === "translation") {
        from = e.title.startsWith("Page Hit") ? mmu : os;
        to = pt;
      }
      connect(root, from, to, e, speed);
    } else if (id === "x") {
      const root = $("#x-flow"), title = e.title.toLocaleLowerCase("vi");
      const cpu = $("#x-cpu"), mmu = $("#x-mmu"), tlb = $("#x-tlb"),
        pt = $("#x-pt-focus"), pa = $("#x-pa"), os = $("#x-os"),
        frame = root.querySelector(`[data-frame="${X.plan.f}"]`);
      let from = null, to = cpu;
      if (title.startsWith("tách")) { from = cpu; to = mmu; }
      else if (title.startsWith("tra tlb")) { from = mmu; to = tlb; }
      else if (title.startsWith("tra bảng")) { from = tlb; to = pt; }
      else if (title.startsWith("điền")) { from = pt; to = tlb; }
      else if (title.startsWith("tạo địa chỉ")) { from = tlb; to = pa; }
      else if (e.kind === "page-in") { from = os; to = frame; }
      else if (e.kind === "trap") { from = mmu; to = os; }
      else if (e.kind === "read") { from = pa; to = frame; }
      connect(root, from, to, e, speed);
    } else if (id === "r") {
      const root = $("#p3 .scene");
      root.id = "r-scene";
      const s = R.runtime, clock = R.alg === "CLOCK";
      const slot = root.querySelector(`[data-frame="${["inspect", "clear"].includes(s.phase) ? s.ptr : s.slot}"] .card`);
      let from = $("#r-need"), to = slot || root.querySelector(".ramzone");
      if (s.phase === "start") { from = null; to = $("#r-need"); }
      else if (s.phase === "request") to = root.querySelector(".ramzone");
      else if (clock && ["inspect", "victim"].includes(s.phase)) from = null;
      else if (clock && s.phase === "clear") {
        const old = e.beforeState.runtime.ptr;
        from = old < s.ptr ? root.querySelector(`[data-frame="${old}"] .card`) : null;
      }
      else if (e.kind === "page-in") from = root.querySelector(".disk");
      else if (e.kind === "read") { from = slot; to = $("#r-need"); }
      connect(root, from, to, e, speed);
      if (clock && ["inspect", "clear", "victim"].includes(s.phase)) {
        const row = evidence.querySelectorAll("tbody tr")[s.phase === "victim" ? s.slot : s.ptr];
        row?.classList.add("teach-spotlight");
      }
    } else if (id === "a" || id === "f") {
      const root = $("#" + id + "-ram").parentElement;
      root.id = id + "-lane";
      const ram = $("#" + id + "-ram"), allocator = root.querySelector(".teach-allocator");
      let target = root.querySelector(".teach-scan") || allocator;
      if (id === "f") {
        const added = F.segs.find((seg) => seg.name && !e.beforeState?.segs?.some((old) => old.name === seg.name));
        if (added) target = ram.querySelector(`[data-start="${added.start}"]`);
        if (e.title.startsWith("Giải phóng")) {
          const old = e.beforeState.segs.find((seg) => seg.name && !F.segs.some((now) => now.name === seg.name));
          const hole = old && F.segs.find((seg) => !seg.name && seg.start <= old.start && seg.start + seg.size > old.start);
          if (hole) target = ram.querySelector(`[data-start="${hole.start}"]`);
        }
        if (e.title.includes("Dồn nén")) target = ram;
      } else {
        const i = A.runtime.pieces.findIndex((pieces, k) => pieces.length > (e.beforeState?.runtime?.pieces[k]?.length || 0));
        if (i >= 0) {
          const hole = ram.querySelectorAll(".hole")[i];
          target = [...(hole?.querySelectorAll(".pc") || [])].at(-1) || hole;
        }
      }
      connect(root, target === allocator ? $("#" + id + "-req") : allocator, target, e, speed);
    }
  }
  function unit(id, title, body, extra = "") {
    return `<section id="${id}" class="teach-unit ${extra}"><h3>${title}</h3>${body}</section>`;
  }
  function stepRail(labels, current) {
    return `<ol class="teach-stage-rail" aria-label="Luồng xử lý">${labels.map((label, i) => `<li ${i === current ? 'aria-current="step"' : ""}><span>${i + 1}</span>${label}</li>`).join("")}</ol>`;
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
  const pillarIcons = {
    safety: '<path d="M12 3 4 6v5c0 5 8 10 8 10s8-5 8-10V6Z"/><path d="m8 12 3 3 5-6"/>',
    efficiency: '<path d="m13 2-8 12h6l-1 8 9-13h-6Z"/>',
    virtual: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>',
  };
  for (const [tab, kind, label, meaning] of [
    ["t0", "safety", "AN TOÀN", "Kiểm tra vùng nhớ trước khi cho phép truy cập."],
    ["t1", "efficiency", "HIỆU QUẢ", "Chọn vùng trống để sử dụng RAM."],
    ["t2", "efficiency", "HIỆU QUẢ", "Phân trang và TLB giúp dịch địa chỉ."],
    ["t4", "virtual", "KHÔNG GIỚI HẠN", "Bộ nhớ ảo không cần nạp toàn bộ tiến trình vào RAM; dung lượng thực tế vẫn có giới hạn."],
    ["t3", "virtual", "KHÔNG GIỚI HẠN", "Thay trang để dùng lại số khung RAM hữu hạn, không phải RAM vô hạn."],
  ]) {
    const button = $("#" + tab), badge = document.createElement("span");
    badge.className = "teach-pillar";
    badge.dataset.pillar = kind;
    badge.title = meaning;
    badge.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pillarIcons[kind]}</svg><span>${label}</span>`;
    button.querySelector(".n").textContent = button.querySelector(".n").textContent.replace(/^.*?(?=DEMO\s)/u, "");
    button.append(badge);
  }
  const configs = {};
  function integer(raw, label, min = 0, max = 1e9) {
    const text = String(raw).trim(),
      value = Number(text);
    if (
      !/^-?\d+$/.test(text) ||
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
  function submitEasyConfig(id, values) {
    const previous = Object.fromEntries(Object.keys(values).map(key => [key, read(key)]));
    Object.entries(values).forEach(([key, value]) => set(key, value));
    configs[id].querySelector(".teach-config-form").requestSubmit();
    const status = configs[id].querySelector(".teach-config-status");
    if (status.classList.contains("teach-error")) {
      Object.entries(previous).forEach(([key, value]) => set(key, value));
      throw Error(status.textContent);
    }
  }
  function easySetup(id, help, fields, apply, example) {
    const root = configs[id], original = root.querySelector(".teach-config-form");
    root.querySelector("summary").textContent = "Đổi đề bài · nhập nhanh hoặc chọn ví dụ";
    const advanced = document.createElement("details");
    advanced.className = "teach-advanced-config";
    advanced.innerHTML = "<summary>Nhập chi tiết: tự đặt RAM và các thông số (không bắt buộc)</summary>";
    original.before(advanced);
    advanced.append(original);
    const quick = document.createElement("form");
    quick.className = "teach-easy-form";
    quick.noValidate = true;
    quick.innerHTML = `<p>${help}</p><div class="teach-easy-grid">${fields}</div><div class="bar"><button type="submit" class="btn primary" id="${id}-easy-apply">Áp dụng đề nhanh</button><button type="button" class="btn" id="${id}-easy-example">Chạy ví dụ dễ hiểu</button><button type="button" class="btn" id="${id}-easy-sample">Khôi phục mẫu cũ</button></div><p class="teach-easy-status" role="status" aria-live="polite"></p>`;
    advanced.before(quick);
    const status = quick.querySelector(".teach-easy-status");
    quick.addEventListener("input", () => {
      status.className = "teach-easy-status";
      status.textContent = "Chưa áp dụng: mô phỏng vẫn dùng đề đang chạy.";
    });
    quick.onsubmit = e => {
      e.preventDefault();
      try {
        apply();
        status.className = "teach-easy-status";
        status.textContent = "Đã áp dụng. Bấm Bước tiếp để xem từng thao tác.";
        root.open = false;
      } catch (err) {
        status.className = "teach-easy-status teach-error";
        status.textContent = err.message;
      }
    };
    quick.querySelector("#" + id + "-easy-example").onclick = () => { example(); quick.requestSubmit(); };
    quick.querySelector("#" + id + "-easy-sample").onclick = () => {
      $("#" + id + "-config-sample").click();
      status.className = "teach-easy-status";
      status.textContent = "Đã khôi phục mẫu cũ.";
      root.open = false;
    };
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
    const easy = configs[id]?.querySelector(".teach-easy-status");
    if (easy) { easy.className = "teach-easy-status"; easy.textContent = "Đang dùng đề đã áp dụng."; }
  }
  const read = (id) => $("#" + id).value;
  const set = (id, value) => {
    if ($("#" + id)) $("#" + id).value = value;
  };
  const joined = (items) => items.map((x) => x ?? "-").join(", ");
  function conclusionFor(id, e, visited) {
    const s = e.state;
    if (id === "b") return ["AN TOÀN", !s.isValid
      ? "Base/Limit chặn truy cập ngoài vùng."
      : s.mode === "translate" ? "MMU dịch địa chỉ: PA = Base + L." : "Base/Limit bảo vệ vùng nhớ tiến trình."];
    if (id === "a" || id === "f") {
      const holes = id === "a" ? s.runtime.free : s.segs.filter(p => !p.name).map(p => p.size);
      const allocated = id === "a" ? new Set(s.runtime.pieces.flat().map(p => p.k)) : null;
      const waiting = id === "a" ? s.reqs.filter((_, i) => !allocated.has(i))
        : s.waiting.map(name => s.waitingSizes?.[name]).filter(Number.isFinite);
      const total = holes.reduce((n, size) => n + size, 0), largest = Math.max(0, ...holes);
      if (waiting.some(size => size <= total && size > largest))
        return ["PHÂN MẢNH NGOÀI", "Đủ tổng trống, vẫn thiếu vùng liên tục."];
      if (id === "f" && visited.some(step => step.title === "Dồn nén RAM"))
        return ["DỒN NÉN", "Gom vùng trống, không tăng tổng dung lượng."];
      if (waiting.length || s.waiting?.length)
        return ["CẤP PHÁT LIÊN TỤC", "Chỉ cấp khi có một lỗ trống đủ lớn."];
      const alg = s.allocatorAlg || s.alg;
      return [names[alg], { first: "Chọn lỗ đủ đầu tiên.", best: "Chọn lỗ nhỏ nhất nhưng đủ chứa yêu cầu.", worst: "Chọn lỗ trống lớn nhất." }[alg]];
    }
    if (id === "x") {
      if (s.plan.err) return ["AN TOÀN", "Chặn địa chỉ ngoài không gian tiến trình."];
      if (s.plan.blocked) return ["RAM ĐẦY", "Cần thay trang trước khi tiếp tục dịch địa chỉ."];
      if (s.plan.fault) return ["PAGE FAULT", "Trang hợp lệ chưa nạp phải được đưa vào RAM."];
      return s.plan.hit ? ["TLB HIT", "Lấy ngay Frame, bỏ qua tra bảng trang."]
        : ["TLB MISS ≠ PAGE FAULT", "Thiếu bản dịch trong TLB, trang vẫn ở RAM."];
    }
    if (id === "v") {
      if (s.plan.oob) return ["AN TOÀN", "Truy cập ngoài miền hoặc thiếu quyền bị chặn."];
      const initial = visited[0].state;
      if (s.writes > initial.writes) return ["DIRTY BIT", "Chỉ ghi lại trang nạn nhân đã bị sửa."];
      if (s.faults > initial.faults) return ["DEMAND PAGING", "Nạp trang khi cần, rồi chạy lại lệnh."];
      return ["PAGE HIT", "Trang có sẵn trong RAM, không đọc bộ nhớ phụ."];
    }
    if (id === "r") {
      if (!s.runtime.faults) return ["PAGE HIT", "Các trang cần dùng đã có trong RAM."];
      if (!visited.some(step => step.state.runtime.phase === "victim"))
        return ["KHUNG TRỐNG", "Nạp trang mà chưa cần chọn nạn nhân."];
      return [names[s.alg], {
        FIFO: "Thay trang vào RAM sớm nhất.",
        LRU: "Thay trang lâu chưa được dùng nhất.",
        OPT: "Thay trang lâu nhất mới được dùng lại.",
        CLOCK: "R=1: cơ hội thứ hai; R=0: thay.",
      }[s.alg]];
    }
  }
  // A separate, read-only foundation layer. Examples use the applied snapshot,
  // never draft inputs; opening it does not advance or reset the simulation.
  function conceptContent(id, e) {
    const s = e.state, title = e.title.toLocaleLowerCase("vi");
    const common = {
      CPU: "Bộ xử lý chạy lệnh và phát yêu cầu đọc hoặc ghi dữ liệu.",
      MMU: "Bộ phận kiểm tra, dịch địa chỉ trước khi truy cập RAM.",
      RAM: "Bộ nhớ làm việc, chứa dữ liệu chương trình đang dùng.",
      LA: "Địa chỉ logic: vị trí chương trình yêu cầu, trước khi dịch.",
      PA: "Địa chỉ vật lý: vị trí thật của byte trong RAM.",
      Page: "Trang: một phần có kích thước cố định của chương trình.",
      Frame: "Khung: một ngăn RAM chứa được một trang. Trang và khung có cùng cỡ.",
      TLB: "Bảng nhớ rất nhanh gần CPU, giữ vài bản dịch trang → khung; không giữ dữ liệu trang.",
      "Page Table": "Bảng trang: sổ chỉ đường trong RAM, cho biết trang đang ở khung nào.",
      Trap: "Tín hiệu chuyển quyền xử lý sang hệ điều hành khi lệnh gặp tình huống cần xử lý.",
      "Page Fault": "Trang cần dùng chưa ở RAM. Nếu truy cập hợp lệ, hệ điều hành nạp trang rồi chạy lại lệnh.",
      Hit: "Trang cần dùng đã có trong RAM; dùng ngay, không phải nạp từ ổ đĩa.",
      Fault: "Trang cần dùng chưa ở RAM; phải nạp trang vào.",
      FIFO: "Thay trang được nạp vào RAM sớm nhất. Dùng lại trang không đổi thứ tự vào.",
      LRU: "Thay trang lâu nhất chưa được dùng lại.",
      OPT: "Thay trang có lần dùng tiếp theo xa nhất; không dùng lại thì ưu tiên thay. Cần biết trước tương lai nên dùng để so sánh.",
      Clock: "Đi vòng kiểm tra R: gặp 1 thì xóa về 0 và đi tiếp; gặp 0 thì chọn thay.",
    };
    let terms, diagram = "", example = "", takeaway = "";
    const box = (label, detail, active = false) => `<div class="concept-node${active ? " is-current" : ""}"><b>${esc(label)}</b><span>${esc(detail)}</span>${active ? '<small>Đang xét</small>' : ''}</div>`;
    const flow = (...nodes) => `<div class="concept-flow">${nodes.join('<span class="concept-arrow" aria-hidden="true">→</span>')}</div>`;
    const list = keys => keys.map(k => [k, common[k]]);
    if (id === "b") {
      terms = [["Base", "Địa chỉ bắt đầu vùng RAM tiến trình được dùng."], ["Limit", "Độ dài vùng được cấp, không phải địa chỉ kết thúc."], ...list(["LA", "PA", "CPU", "MMU"]), ["Vùng hợp lệ", "Từ Base đến ngay trước Base + Limit. Không được chạm mốc cuối."], ...list(["Trap"])];
      const translate = s.mode === "translate", valid = s.isValid;
      diagram = flow(box("CPU", translate ? `LA = ${s.offset}` : `PA cần kiểm tra = ${s.addr}`, s.st === 0), box("MMU kiểm tra", translate ? "0 ≤ LA < Limit" : "Base ≤ PA < Base + Limit", s.st === 1 || s.st === 2), box(valid ? "RAM · được phép" : "TRAP → hệ điều hành", valid ? "Chỉ dùng vùng được cấp" : "Chặn truy cập, không đọc RAM", s.st === 3));
      diagram += `<div class="concept-ram"><span>OS / vùng khác</span><span class="allowed">Vùng tiến trình được dùng<br>${esc(s.base)} ≤ PA &lt; ${esc(s.base + s.limit)}</span><span>Ngoài phạm vi</span></div><small>Thanh minh họa ranh giới, không theo tỉ lệ.</small>`;
      example = translate ? `LA = ${s.offset}; Limit = ${s.limit}. ${valid ? `Hợp lệ → PA = ${s.base} + ${s.offset} = ${s.pa}.` : "Ngoài giới hạn → TRAP; không cộng Base để truy cập RAM."}` : `PA = ${s.addr}; vùng được phép [${s.base}, ${s.base + s.limit}). ${valid ? "Địa chỉ nằm trong vùng → cho phép." : "Địa chỉ ngoài vùng → chặn."}`;
      takeaway = "Chế độ kiểm tra nhận PA có sẵn; chế độ dịch nhận LA rồi mới cộng Base.";
    } else if (id === "a" || id === "f") {
      terms = [["Tiến trình", "Một chương trình đang chạy, cần chỗ trong RAM."], ...list(["RAM"]), ["Lỗ trống", "Một vùng RAM liên tục chưa được dùng."], ["Cấp phát", "Dành một vùng trống đủ lớn cho tiến trình."], ["First-fit", "Gặp lỗ đầu tiên đủ chỗ thì dùng luôn."], ["Best-fit", "Chọn lỗ nhỏ nhất trong các lỗ đủ chỗ."], ["Worst-fit", "Chọn lỗ lớn nhất trong các lỗ đủ chỗ."], ["Phân mảnh ngoài", "Tổng trống đủ, nhưng bị chia nhỏ: không lỗ riêng lẻ nào đủ cho yêu cầu."], ["Dồn nén", "Dời các tiến trình để gom chỗ trống lại. Không làm RAM lớn thêm."]];
      const holes = id === "f" ? s.segs.filter(x => !x.name).map(x => x.size) : (s.runtime?.free || s.holes);
      const total = holes.reduce((a,b) => a+b,0), largest = Math.max(0,...holes);
      diagram = flow(box("Tiến trình", "Xin một vùng liên tục"), box("Bộ cấp phát", names[s.allocatorAlg || s.alg], true), box("RAM", "Chọn một lỗ đủ lớn"));
      diagram += `<div class="concept-ram">${holes.map((h,i) => `<span class="allowed">Lỗ ${i+1}<br>${esc(h)} KB</span>`).join('') || '<span>Không còn lỗ trống</span>'}</div>`;
      example = `Các lỗ ở bước đang xem: ${holes.join(', ') || 'không có'} KB. Tổng trống ${total} KB; lỗ lớn nhất ${largest} KB.`;
      takeaway = "Một yêu cầu phải vừa trong một lỗ; không ghép các lỗ rời nhau để cấp phát liên tục.";
    } else if (id === "x") {
      terms = [["p", "Số trang cần tìm: lấy phần nguyên của LA chia cỡ trang."], ["d / Offset", "Vị trí trong trang: phần dư của phép chia. Khi dịch, d giữ nguyên."], ...list(["Page", "Frame", "CPU", "MMU", "LA", "PA", "TLB", "Page Table", "RAM"])];
      const p=s.plan.p, d=s.plan.d, frame=s.pt[p], size=s.pageSize;
      const tlb = title.includes("tlb"), table = title.includes("bảng trang"), phys = title.includes("vật lý"), read = e.kind === "read";
      diagram = flow(box("CPU → MMU", `LA ${s.plan.addr} → p ${p}, d ${d}`, title.startsWith("cpu") || title.startsWith("tách")), box("TLB · tra p", "Có bản dịch?", tlb));
      diagram += `<div class="concept-branches">${box("HIT · có", "Lấy số khung ngay")}<span>hoặc</span>${box("MISS · chưa có", "Tra bảng trang để tìm khung", table)}</div>`;
      diagram += flow(box("Khung f + d", "PA = f × cỡ trang + d", phys), box("RAM · dữ liệu thật", "Đọc byte tại PA", read));
      example = `LA = ${s.plan.addr}; mỗi trang ${size} byte → p = ${p}, d = ${d}. ` + (Number.isInteger(frame) && frame >= 0 ? `Bảng trang: Trang ${p} → Frame ${frame}. PA = ${frame} × ${size} + ${d} = ${frame*size+d}.` : "Trang chưa có khung RAM → phải nhờ hệ điều hành nạp; chưa thể tính PA để đọc.");
      takeaway = "TLB miss chỉ thiếu bản dịch nhanh. Nếu bảng trang cho biết trang đã ở RAM thì không có Page Fault. Dữ liệu nằm trong RAM, không nằm trong TLB.";
      if (s.plan.err) {
        diagram = flow(box("CPU → MMU", `Địa chỉ ${s.plan.addr}`), box("TRAP → OS", "Địa chỉ ngoài miền hợp lệ", true));
        example = "Địa chỉ đang yêu cầu không hợp lệ → chặn truy cập, không tính PA để đọc RAM.";
      }
    } else if (id === "v") {
      terms = [...list(["Page Fault", "RAM"]), ["Valid / Invalid", "Đánh dấu hợp lệ tùy cách tổ chức bảng trang. Demo tách quyền/ánh xạ với present để biết bị cấm hay chỉ chưa nạp."], ["Present", "1: trang đang ở RAM; 0: chưa ở RAM. Chưa có trong RAM không có nghĩa là bị cấm."], ["Backing Store", "Bộ nhớ phụ giữ bản lưu trang khi chưa ở RAM."], ["SSD / HDD", "Các loại ổ lưu trữ. OS yêu cầu đọc trang từ đây vào RAM; CPU không đọc lệnh trực tiếp ở ổ đĩa."], ...list(["Trap", "Page Table"]), ["Khung trống", "Ngăn RAM chưa chứa trang, có thể dùng để nạp trang mới."], ["Nạp trang", "Chuyển dữ liệu từ bộ nhớ phụ vào một khung RAM."], ["Chạy lại lệnh", "Sau khi nạp và sửa bảng trang, thử lại đúng lệnh vừa bị ngắt."], ["Dirty", "Trang đã bị sửa; phải lưu nội dung mới trước khi thay trang đó."]];
      diagram = flow(box("CPU → MMU", `Cần Trang ${s.page}`, title.startsWith("cpu")), box("Bảng trang", "Kiểm tra quyền và present"));
      if(s.plan.oob) diagram += flow(box("TRAP → OS", "Bị cấm / ngoài miền", true), box("Chặn", "Không nạp trang"));
      else if(s.plan.hit) diagram += flow(box("Đã ở RAM", "Đọc/ghi ngay", true), box("Tiếp tục lệnh", "Không đọc ổ đĩa"));
      else {
        diagram += flow(box("Page Fault → OS", "Tìm trang và chọn khung", e.kind === "trap" || title.includes("định vị")), box("SSD / HDD → RAM", "OS yêu cầu nạp dữ liệu", e.kind === "page-in"));
        diagram += flow(box("Sửa bảng trang", "Chỉ sau khi nạp xong", title.startsWith("cập nhật")), box("Chạy lại lệnh", "Dữ liệu đã có trong RAM", title.includes("chạy lại")));
      }
      example = `Trang đang yêu cầu: ${s.page}. ` + (s.plan.oob ? "Không được phép truy cập → OS chặn, không nạp." : s.plan.hit ? `Đã có trong RAM tại khung ${s.plan.frame}; không cần nạp trang.` : `Lúc yêu cầu chưa có trong RAM → OS nạp trang${s.pt[s.page]?.present ? ` vào khung ${s.pt[s.page].frame}; bảng trang đã cập nhật` : '; đợi nạp xong mới đánh dấu present = 1'}.`);
      takeaway = "Bảng trang chỉ đường; RAM giữ dữ liệu đang dùng; ổ đĩa giữ bản lưu. Trang không tự nhảy vào RAM: hệ điều hành xử lý việc nạp.";
    } else {
      terms = [...list(["Hit", "Fault"]), ["Page replacement", "Thay trang: khi không còn khung trống, chọn trang cũ nhường chỗ cho trang cần nạp."], ["Victim page", "Trang bị chọn rời RAM để nhường khung. Không phải trang mới cần nạp."], ...list(["FIFO", "LRU", "OPT", "Clock"]), ["Bit tham chiếu R", "Dùng trang thì đặt R = 1. Clock xóa về 0 khi cho cơ hội thứ hai."], ["Kim đồng hồ", "Vị trí Clock sẽ kiểm tra tiếp. Hit đặt R = 1 nhưng không làm kim quay."]];
      const rt=s.runtime, pg=s.refs[Math.max(0, rt.t)];
      diagram = flow(box("Dãy trang cần dùng", s.refs.join(' → ')), box("Đã ở RAM?", "Hit → dùng ngay", e.status === "hit"));
      diagram += `<div class="concept-branches">${box("Fault · còn khung trống", "Nạp vào khung trống")}<span>hoặc</span>${box("Fault · RAM đầy", `${names[s.alg]} chọn trang nhường chỗ rồi nạp`, rt.victim != null)}</div>`;
      if(s.alg === "CLOCK") {
        diagram += `<div class="concept-clock" role="img" aria-label="Vòng Clock, kim ở khung ${rt.ptr}"><div class="concept-clock-center">Kim → ${esc(rt.ptr)}<br>R=1: xóa, đi tiếp<br>R=0: chọn</div>${rt.fr.map((page,i) => {
          const angle=2*Math.PI*i/rt.fr.length-Math.PI/2;
          return `<div class="concept-clock-slot${i===rt.ptr?' is-current':''}" style="left:${50+38*Math.cos(angle)}%;top:${50+38*Math.sin(angle)}%"><b>Khung ${i}</b><span>${page===null?'Trống':'Trang '+esc(page)}</span><span>R=${esc(rt.bit[i])}${i===rt.ptr?' ← kim':''}</span></div>`;
        }).join('')}</div>`;
      }
      example = `${s.n} khung RAM; đang dùng ${names[s.alg]}. Trang ${pg}; RAM ở bước này: [${rt.fr.map(p=>p??'trống').join(', ')}].`;
      takeaway = "Fault chưa chắc phải đuổi trang: chỉ thay khi không còn khung trống. Các thuật toán khác nhau ở cách chọn trang nhường chỗ.";
    }
    const cards = entries => entries.map(([name, text]) => `<div class="concept-card"><dt>${esc(name)}</dt><dd>${esc(text)}</dd></div>`).join('');
    return `<p class="concept-intro">Chưa quen các chữ trong mô hình? Xem cách chúng nối với nhau. Số liệu bên dưới theo đề và bước đang xem.</p><div class="concept-layout"><div><h3>Từ điển nhanh</h3><dl class="concept-cards">${cards(terms.slice(0,4))}</dl><details class="concept-more"><summary>Thêm ${terms.length-4} khái niệm</summary><dl class="concept-cards">${cards(terms.slice(4))}</dl></details></div><div><h3>Nhìn luồng để hiểu</h3>${diagram}<div class="concept-example"><b>Ví dụ theo đề đang chạy</b><p>${esc(example)}</p></div><p class="concept-takeaway">${esc(takeaway)}</p></div></div>`;
  }
  function updateConcepts(t, e) {
    if (!t.concepts.open) return;
    const moreOpen = t.concepts.querySelector('.concept-more')?.open;
    t.concepts.querySelector('.concept-body').innerHTML = conceptContent(t.id, e);
    t.concepts.querySelector('.concept-more').open = !!moreOpen;
  }
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
      this.conclusion = document.createElement("aside");
      this.conclusion.id = id + "-conclusion";
      this.conclusion.className = "teach-conclusion";
      this.conclusion.hidden = true;
      this.conclusion.setAttribute("role", "status");
      this.conclusion.setAttribute("aria-live", "polite");
      this.conclusion.setAttribute("aria-atomic", "true");
      bar.before(this.conclusion);
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
      this.concepts = document.createElement("details");
      this.concepts.className = "teach-concepts";
      this.concepts.id = id + "-concepts";
      this.concepts.innerHTML = '<summary>GIẢI THÍCH KHÁI NIỆM TRỰC QUAN <span>Hiểu nhanh thuật ngữ · sơ đồ · ví dụ</span></summary><div class="concept-body"></div>';
      history.after(this.concepts);
      this.concepts.addEventListener('toggle', () => {
        if (this.events.length) updateConcepts(this, this.events[this.cursor]);
      });
      const noteEl = document.createElement("div");
      noteEl.className = "teach-note";
      noteEl.hidden = true;
      this.concepts.after(noteEl);
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
      const termsOpen = $("#" + this.id + "-cap .teach-terms")?.open;
      restore(this.target, e.state);
      const t0 = performance.now();
      this.renderModel(e, this);
      updateConcepts(this, e);
      drawEvent(this, e);
      const cap = $("#" + this.id + "-cap");
      if (cap) {
        cap.classList.add("teach-narrator");
        const deepExp = renderDeepExplanation(this.id, e, i);
        if (this.id === "r") {
          cap.innerHTML = `<div class="teach-step-title">Bước ${i + 1} · ${esc(e.title)}</div>
            <div class="teach-step-context"><b>${esc(e.actor)}:</b> ${esc(e.condition)}</div>
            <div class="teach-step-change">${esc(e.change)}</div>${deepExp}${renderTerms(this.id, e, termsOpen)}`;
        } else {
          cap.innerHTML = `<div class="teach-step-title">Bước ${i + 1} · ${esc(e.title)}</div>
            <div class="teach-step-context"><b>${esc(e.actor)}:</b> ${esc(e.condition)}</div>
            <div class="teach-step-change">${esc(e.change)}</div>
            <details class="teach-next" open>
              <summary>Giải thích nguyên lý hoạt động</summary>
              ${deepExp}
            </details>${renderTerms(this.id, e, termsOpen)}`;
        }
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
      const completed = i > 0 && $("#" + this.id + "-next").disabled;
      this.conclusion.hidden = !completed;
      if (completed) {
        const [keyword, message] = conclusionFor(this.id, e, this.events.slice(0, i + 1));
        const html = `<span class="teach-conclusion-label">KẾT LUẬN</span><strong>${esc(keyword)}</strong><span>${esc(message)}</span>`;
        if (this.conclusion.innerHTML !== html) this.conclusion.innerHTML = html;
      } else this.conclusion.textContent = "";
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
      `${V.operation === "write" ? "Ghi vào" : "Đọc"} trang ${V.page} từ yêu cầu của chương trình · RAM có ${V.ram.length} ngăn${V.sequence ? ` · lần ${V.seqIndex + 1}/${V.sequence.length}` : ""}.`,
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
    const denied = V.plan.oob, hit = V.plan.hit;
    const faultStage = stage.startsWith("CPU") ? 0 : e.kind === "trap" ? 1
      : stage.startsWith("Định vị") ? 2 : stage.startsWith("Cập nhật") ? 4
        : stage.startsWith("Khởi động") ? 5 : 3;
    const labels = denied ? ["Yêu cầu", "OS chặn"] : hit
      ? ["Yêu cầu", "Tìm ngăn RAM", V.operation === "write" ? "Ghi RAM" : "Đọc RAM"]
      : ["Yêu cầu", "Báo OS", "Tìm trên đĩa", "Nạp vào RAM", "Sửa bảng trang", "Thử lại"];
    const current = denied ? (stage.startsWith("CPU") ? 0 : 1)
      : hit ? (stage.startsWith("CPU") ? 0 : e.kind === "translation" ? 1 : 2) : faultStage;
    const row = (p) => `<tr data-page="${p.page}"><td>${p.page}</td><td>${+p.present}</td><td>${p.frame ?? "—"}</td><td>${+p.dirty}</td></tr>`;
    const showVictim = !stage.startsWith("CPU") && !stage.startsWith("Định vị") && e.kind !== "trap";
    const focus = V.pt.filter((p) => p.page === V.page || (showVictim && p.page === V.plan.victim));
    const pte = V.pt[V.page];
    const permissions = !pte ? "Trang ngoài miền" : !pte.mapped ? "Chưa được ánh xạ"
      : !pte.permission ? "Không có quyền truy cập" : "Trang hợp lệ · có quyền";
    const chosen = !denied && (hit || stage.includes("chọn victim") || ["page-in", "page-out", "translation", "read", "write"].includes(e.kind));
    const victim = chosen && V.plan.victim !== null && V.ram[frame] !== V.page;
    const expanded = $("#v-memory-details")?.open;
    const frameBody = chosen
      ? `<div id="v-frame-${frame}" data-frame="${frame}" class="teach-frame teach-focus-frame ${victim ? "teach-victim" : ""}"><span>Ngăn ${frame} (Frame)${victim ? " · nhường chỗ" : ""}</span><b>${V.ram[frame] === null ? "trống" : "Trang " + V.ram[frame]}</b>${V.policy === "CLOCK" ? `<small>R=${V.replacement.bit[frame]}</small>` : ""}</div>`
      : '<div class="teach-frame teach-focus-frame"><span>Ngăn chứa dữ liệu</span><b>Chưa chọn ngăn</b></div>';
    const ramBody = `<div class="teach-ram-focus"><div id="v-pt-focus" class="teach-endpoint"><b>Bảng trang</b><span>Cho biết trang nằm ở ngăn nào</span>${table(["Trang", "Trong RAM?", "Ngăn", "Dirty"], focus.length ? focus.map(row) : ['<tr><td colspan="4">Không có mục hợp lệ</td></tr>'])}</div>${frameBody}</div>`;
    $("#v-flow").className = "teach-schematic";
    $("#v-flow").innerHTML = stepRail(labels, current) + `<div class="teach-layout-v">
      ${unit("v-processor", "Bộ xử lý / Bộ dịch địa chỉ", `<div id="v-cpu" class="teach-endpoint"><span>CPU · chương trình gửi yêu cầu</span><b>${V.operation === "write" ? "Ghi (STORE)" : "Đọc (LOAD)"} trang ${V.page}</b></div><div id="v-mmu" class="teach-endpoint"><span>MMU · kiểm tra trước khi vào RAM</span><b>${permissions}</b></div>`)}
      ${unit("v-os", "Hệ điều hành (OS)", `<b>${denied ? "Xử lý lỗi bảo vệ" : hit ? "Không cần nạp trang" : stage.startsWith("CPU") ? "Chờ báo thiếu trang" : esc(labels[current])}</b><p>${!hit && !denied && !V.freeFrames.length ? `RAM đầy · chọn trang nhường chỗ theo ${names[V.policy]}` : "Quản lý các ngăn trong RAM"}</p>`)}
      ${unit("v-store", "Bộ nhớ phụ · ổ đĩa", `<b>${denied ? "Không nạp trang bị từ chối" : "Bản lưu Trang " + V.page}</b><p>${e.kind === "page-out" ? `Nhận dữ liệu Trang ${V.plan.victim} đã sửa` : e.kind === "page-in" ? `Đọc Trang ${V.page} → ngăn ${frame}` : "Backing Store · chưa truyền dữ liệu"}</p>`)}
      ${unit("v-ram", "RAM · bộ nhớ đang làm việc", ramBody)}
      </div><details id="v-memory-details" class="teach-full-table teach-all-state" ${expanded ? "open" : ""}><summary>Xem toàn bộ bảng trang và RAM (${V.ram.length} khung)</summary><div class="teach-table-scroll">${table(["Trang", "Ánh xạ", "Quyền", "Present", "Frame", "Dirty"], V.pt.map(p => `<tr><td>${p.page}</td><td>${+p.mapped}</td><td>${+p.permission}</td><td>${+p.present}</td><td>${p.frame ?? "—"}</td><td>${+p.dirty}</td></tr>`))}</div><div class="teach-compact-frames">${V.ram.map((p, f) => `<div data-overview-frame="${f}" class="teach-frame"><span>Frame ${f}</span><b>${p === null ? "trống" : "Trang " + p}</b>${V.policy === "CLOCK" ? `<small>R=${V.replacement.bit[f]}${V.replacement.ptr === f ? " · kim" : ""}</small>` : ""}</div>`).join("")}</div></details>` + route(e);
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
    set("v-easy-frames", vBase.ram.length);
    set("v-easy-refs", joined(vRefs));
    set("v-easy-policy", vBase.policy);
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
      `Mỗi trang ${X.pageSize} byte · RAM có ${X.frameCount} ngăn`;
    activeSetup(
      "x",
      `Địa chỉ muốn tìm: ${X.plan.addr} byte (ô nhập phía trên) · mỗi trang chứa ${X.pageSize} byte (đề cho).`,
    );
    const P = X.plan;
    $("#p2 h2").textContent =
      `Chương trình cần byte ${P.addr}. Byte đó đang ở đâu trong RAM?`;
    $("#x-flow").className = "teach-schematic";
    if (P.err) {
      $("#x-flow").innerHTML =
        unit("x-cpu", "CPU · địa chỉ logic", `LA=${esc(P.addr)}`) +
        unit("x-mmu", "MMU", "Kiểm tra miền địa chỉ") +
        unit("x-os", "OS · lỗi bảo vệ", "TRAP: ngoài miền địa chỉ; không nạp trang") +
        route(e);
      return;
    }
    const title = e.title,
      lower = title.toLocaleLowerCase("vi"),
      isRead = e.kind === "read",
      ready = lower.startsWith("tạo địa chỉ") || isRead,
      split = !title.startsWith("CPU");
    const current = title.startsWith("CPU") ? 0 : lower.startsWith("tách") ? 1
      : lower.startsWith("tra tlb") || lower.startsWith("điền") ? 2 : ready ? (isRead ? 5 : 4) : 3;
    const tlb = table(
      ["Page", "Frame"],
      X.tlb.length
        ? X.tlb.map(
            (t) =>
              `<tr class="${current === 2 && t.page === P.p ? "teach-selected" : ""}"><td>${t.page}</td><td>${t.frame}</td></tr>`,
          )
        : ['<tr><td colspan="2">TLB rỗng</td></tr>'],
    );
    const ptRow = (f, p) => `<tr data-page="${p}"><td>${p}</td><td>${+(f !== null)}</td><td>${f ?? "—"}</td></tr>`;
    const tlbStatus = current < 2 ? "Chờ tra" : !P.hit && X.tlb.some(t => t.page === P.p) ? "Đã lưu bản dịch"
      : P.hit ? "HIT" : "MISS";
    const cached = X.tlb.find(t => t.page === P.p);
    const knownFrame = ready || (P.hit && X.st >= 2) || (!P.hit && X.st >= 3 && X.pt[P.p] !== null);
    const bypass = P.hit && X.st >= 2;
    const expanded = $("#x-memory-details")?.open;
    const processor = `<div id="x-cpu" class="teach-endpoint"><span>CPU · địa chỉ chương trình muốn tìm</span><b>LA = ${P.addr}</b></div>
      <div id="x-mmu" class="teach-endpoint"><span>MMU · chia địa chỉ thành trang</span><b>${split ? `p = ${P.p} · d = ${P.d}` : "Chờ tách p, d"}</b><small>${split ? `${P.addr} ÷ ${X.pageSize} = ${P.p}, dư ${P.d}<br>` : ""}p: số trang · d: vị trí trong trang</small></div>
      <div id="x-pa" class="teach-endpoint"><span>MMU · địa chỉ thật trong RAM</span><b>${ready ? `PA = ${P.phys}` : "Chưa tạo PA"}</b>${ready ? `<small>Ngăn ${P.f} × ${X.pageSize} + vị trí ${P.d}</small>` : ""}</div>`;
    const focusedFrame = knownFrame
      ? `<div id="x-frame-${P.f}" data-frame="${P.f}" class="teach-frame teach-focus-frame"><span>Ngăn ${P.f} (Frame)</span><b>Trang ${X.pt.indexOf(P.f)}</b><small>${P.fault ? "OS vừa cấp ngăn" : P.hit ? "Tìm được từ TLB" : "Tìm được từ bảng trang"}</small><small>${isRead ? `Đọc ở vị trí +${P.d}` : "Chờ đọc dữ liệu"}</small></div>`
      : '<div class="teach-frame teach-focus-frame"><span>Ngăn chứa dữ liệu</span><b>Chờ tìm được địa chỉ</b></div>';
    $("#x-flow").innerHTML = `<div class="teach-layout-x">
      ${unit("x-processor", "Bộ xử lý / Bộ dịch địa chỉ", processor)}
      ${unit("x-tlb", "TLB · sổ nhớ nhanh", `<p>Ở gần CPU / MMU</p><b class="teach-lookup-status">${tlbStatus}</b>${table(["Trang p", "Ngăn f"], [`<tr><td>${split ? P.p : "?"}</td><td>${split ? cached?.frame ?? "—" : "—"}</td></tr>`])}`)}
      ${unit("x-pt-focus", "Bảng trang · trong RAM", `${bypass ? '<p>TLB Hit · bỏ qua bước tra này</p>' : ""}${table(["Trang p", "Trong RAM?", "Ngăn f"], split ? [ptRow(X.pt[P.p], P.p)] : ['<tr><td colspan="3">Chờ số trang p</td></tr>'])}`, bypass ? "teach-bypassed" : "")}
      ${unit("x-data", "RAM · bộ nhớ làm việc", focusedFrame)}
      </div>` +
      (P.fault ? unit("x-os", "OS / Backing Store", `<p>${P.blocked ? "Không có khung trống · cần thay trang" : e.kind === "page-in" ? `Đã nạp Trang ${P.p} vào Frame ${P.newF}` : "Nạp trang hợp lệ khi có Page Fault · xem chi tiết ở Demo 4"}</p>`) : "") +
      `<details id="x-memory-details" class="teach-full-table teach-all-state" ${expanded ? "open" : ""}><summary>Xem toàn bộ TLB, bảng trang và RAM</summary><div class="teach-detail-grid"><div><b>TLB</b><div class="teach-table-scroll">${tlb}</div></div><div><b>Bảng trang</b><div class="teach-table-scroll">${table(["Page", "Present", "Frame"], X.pt.map(ptRow))}</div></div></div><b>RAM · ${X.frameCount} khung · ${X.pageSize} byte/khung</b><div class="teach-compact-frames">${Array.from({ length: X.frameCount }, (_, f) => `<div data-overview-frame="${f}" class="teach-frame"><span>Frame ${f}</span><b>${X.pt.includes(f) ? "Trang " + X.pt.indexOf(f) : X.other.includes(f) ? "khác" : "trống"}</b></div>`).join("")}</div></details>` + route(e);
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
    set("x-easy-addr", xConfig.addr);
    set("x-easy-size", xConfig.pageSize);
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
  const evidence = document.createElement("div");
  evidence.className = "teach-evidence";
  $("#r-cap").after(evidence);
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
          `<div class="slot" data-frame="${i}"><div id="r-frame-${i}" class="card ${p === null ? "empty" : st.phase === "victim" && i === st.slot ? "victim" : st.phase === "apply" && i === st.slot ? "hitc" : ""}">${p ?? "trống"}</div><span class="hint">Frame ${i}</span><span class="hint">${p === null ? "chưa có trang" : proof(i)}</span></div>`,
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

    // Redesigned algorithm evaluation explanation (no circular clock SVG)
    let algTitle = "";
    let bannerHtml = "";
    let tableHeaders = [];
    let rows = [];
    let ruleHtml = "";

    if (R.alg === "CLOCK") {
      algTitle = "Đánh giá chọn trang · Thuật toán Clock";
      const clearedFrame = e.beforeState?.runtime?.ptr;
      const clockStatusDesc =
        st.phase === "inspect"
          ? `Kim đang kiểm tra Khung ${st.ptr} (Trang ${st.fr[st.ptr] ?? "trống"}, Bit R = ${st.bit[st.ptr]}).`
          : st.phase === "clear"
            ? `Đã xóa R ở Khung ${clearedFrame}: 1 → 0; RAM giữ nguyên. Kim chuyển tới Khung ${st.ptr} (R = ${st.bit[st.ptr]}).`
            : st.phase === "victim"
              ? `Khung ${st.slot} có R = 0 → Chọn Trang ${st.victim} làm nạn nhân (Victim) để thay thế!`
              : st.phase === "apply"
                ? e.kind === "read"
                  ? `Page Hit: Trang ${pg} vẫn ở Khung ${st.slot}, đặt R = 1. Kim giữ tại Khung ${st.ptr}.`
                  : `Đã nạp Trang ${pg} vào Khung ${st.slot}, đặt R = 1. Kim ở Khung ${st.ptr}.`
                : `Kim quét sẵn sàng tại Khung ${st.ptr}.`;

      bannerHtml = `<div class="teach-clock-banner"><div class="teach-pointer-badge">📍 Vị trí kim quét: <strong>Khung ${st.ptr}</strong></div><div class="teach-clock-step-desc">${clockStatusDesc}</div></div>`;
      tableHeaders = ["Khung", "Trang", "Bit R", "Đánh giá / Quyết định"];
      rows = st.fr.map((p, i) => {
        const isVictim = st.phase === "victim" && st.slot === i;
        const isPointer = st.ptr === i;
        const rowClass = isVictim ? "teach-row-victim" : isPointer ? "teach-row-pointer" : "";
        const pageText = p === null ? "<em>(trống)</em>" : `Trang <b>${p}</b>`;
        const bitText =
          p === null
            ? "—"
            : st.bit[i] === 1
              ? '<span class="badge-bit badge-bit-1">R = 1</span>'
              : '<span class="badge-bit badge-bit-0">R = 0</span>';
        let evalText = "—";
        if (isVictim) {
          evalText = '<span class="badge-eval badge-victim">⚠️ Chọn làm Nạn nhân</span>';
        } else if (isPointer) {
          evalText = '<span class="badge-eval badge-pointer">👉 Kim đang trỏ</span>';
        } else if (p !== null && st.bit[i] === 1) {
          evalText = '<span class="badge-eval badge-second-chance">R=1: cho cơ hội khi xét</span>';
        } else if (p !== null && st.bit[i] === 0) {
          evalText = '<span class="badge-eval badge-ready">Sẵn sàng thay</span>';
        }
        return `<tr class="${rowClass}"><td>Khung ${i}</td><td>${pageText}</td><td>${bitText}</td><td>${evalText}</td></tr>`;
      });
      ruleHtml = `<div class="teach-rule-box"><span class="teach-rule-title">Nguyên lý Clock (Second Chance):</span><span>Kim duyệt vòng tròn qua các khung. Gặp <code>R = 1</code>: cho cơ hội thứ hai, xóa <code>R → 0</code> và chuyển kim. Gặp <code>R = 0</code>: chọn ngay làm nạn nhân để thay thế, nạp trang mới và đặt lại <code>R = 1</code>.</span></div>`;
    } else if (R.alg === "FIFO") {
      algTitle = "Đánh giá chọn trang · Thuật toán FIFO";
      tableHeaders = ["Khung", "Trang", "Thời điểm nạp vào RAM", "Đánh giá"];
      const activeLoads = st.load.filter((_, idx) => st.fr[idx] !== null);
      const minLoad = activeLoads.length ? Math.min(...activeLoads) : Infinity;
      rows = st.fr.map((p, i) => {
        const isVictim = st.phase === "victim" && st.slot === i;
        const isOldest = p !== null && st.load[i] === minLoad;
        const rowClass = isVictim ? "teach-row-victim" : isOldest && st.phase === "victim" ? "teach-row-pointer" : "";
        const pageText = p === null ? "<em>(trống)</em>" : `Trang <b>${p}</b>`;
        const loadText = p === null ? "—" : stamp(st.load[i]);
        let evalText = "—";
        if (isVictim) {
          evalText = '<span class="badge-eval badge-victim">⚠️ Vào sớm nhất → Chọn thay</span>';
        } else if (isOldest) {
          evalText = '<span class="badge-eval badge-oldest">Vào sớm nhất</span>';
        }
        return `<tr class="${rowClass}"><td>Khung ${i}</td><td>${pageText}</td><td>${loadText}</td><td>${evalText}</td></tr>`;
      });
      ruleHtml = `<div class="teach-rule-box"><span class="teach-rule-title">Nguyên lý FIFO (First-In, First-Out):</span><span>Thay thế trang đã ở trong RAM lâu nhất (thời điểm nạp sớm nhất). Khi trúng trang (Hit), thứ tự nạp của các trang giữ nguyên không đổi.</span></div>`;
    } else if (R.alg === "LRU") {
      algTitle = "Đánh giá chọn trang · Thuật toán LRU";
      tableHeaders = ["Khung", "Trang", "Lần truy cập gần nhất", "Đánh giá"];
      const activeLasts = st.last.filter((_, idx) => st.fr[idx] !== null);
      const minLast = activeLasts.length ? Math.min(...activeLasts) : Infinity;
      rows = st.fr.map((p, i) => {
        const isVictim = st.phase === "victim" && st.slot === i;
        const isOldest = p !== null && st.last[i] === minLast;
        const rowClass = isVictim ? "teach-row-victim" : isOldest && st.phase === "victim" ? "teach-row-pointer" : "";
        const pageText = p === null ? "<em>(trống)</em>" : `Trang <b>${p}</b>`;
        const lastText = p === null ? "—" : stamp(st.last[i]);
        let evalText = "—";
        if (isVictim) {
          evalText = '<span class="badge-eval badge-victim">⚠️ Lâu chưa dùng nhất → Chọn thay</span>';
        } else if (isOldest) {
          evalText = '<span class="badge-eval badge-oldest">Lâu chưa dùng nhất</span>';
        }
        return `<tr class="${rowClass}"><td>Khung ${i}</td><td>${pageText}</td><td>${lastText}</td><td>${evalText}</td></tr>`;
      });
      ruleHtml = `<div class="teach-rule-box"><span class="teach-rule-title">Nguyên lý LRU (Least Recently Used):</span><span>Thay thế trang có lần truy cập cách hiện tại xa nhất trong quá khứ. Mỗi khi truy cập (Hit hoặc Fault), mốc thời gian của trang được cập nhật lại thành mới nhất.</span></div>`;
    } else {
      algTitle = "Đánh giá chọn trang · Thuật toán OPT";
      tableHeaders = ["Khung", "Trang", "Khoảng cách tương lai", "Đánh giá"];
      rows = st.fr.map((p, i) => {
        const isVictim = st.phase === "victim" && st.slot === i;
        const pageText = p === null ? "<em>(trống)</em>" : `Trang <b>${p}</b>`;
        let nextUseText = "—";
        let isInf = false;
        if (p !== null) {
          const k = R.refs.indexOf(st.fr[i], t + 1);
          if (k < 0) {
            nextUseText = "∞ (Không dùng lại)";
            isInf = true;
          } else {
            nextUseText = `Bước ${k + 1}`;
          }
        }
        let evalText = "—";
        if (isVictim) {
          evalText = '<span class="badge-eval badge-victim">⚠️ Lâu dùng lại nhất → Chọn thay</span>';
        } else if (isInf) {
          evalText = '<span class="badge-eval badge-subtle">Không dùng lại</span>';
        }
        const rowClass = isVictim ? "teach-row-victim" : "";
        return `<tr class="${rowClass}"><td>Khung ${i}</td><td>${pageText}</td><td>${nextUseText}</td><td>${evalText}</td></tr>`;
      });
      ruleHtml = `<div class="teach-rule-box"><span class="teach-rule-title">Nguyên lý OPT (Thuật toán tối ưu):</span><span>Thay thế trang mà trong tương lai sẽ lâu được dùng lại nhất (hoặc không bao giờ dùng nữa). Cần biết trước chuỗi truy cập nên dùng làm chuẩn so sánh lý thuyết.</span></div>`;
    }

    evidence.innerHTML = `<h3>${algTitle}</h3>${bannerHtml}<div>${table(tableHeaders, rows)}${ruleHtml}</div>${route(e)}`;
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
    set("r-easy-frames", R.n);
    set("r-easy-refs", joined(R.refs));
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
      el.dataset.start = F.segs[i].start;
      el.dataset.process = F.segs[i].name || "";
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
        B.isValid ? "Truy cập RAM vật lý" : "Xử lý trap bảo vệ",
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
      "Địa chỉ vật lý cần kiểm tra",
      "Kiểm tra cận dưới",
      "Kiểm tra cận trên",
      "Quyết định MMU",
    ];
    const descriptions = [
      `A=${B.addr} là địa chỉ vật lý cần kiểm tra an toàn. RAM chưa được truy cập.`,
      `${B.addr} ≥ Base (${B.base}): ${B.cond1 ? "đạt cận dưới (A ≥ Base); chuyển sang kiểm tra cận trên." : "vi phạm cận dưới (A < Base); truy cập bị chặn."}`,
      !B.cond1 ? "Cận dưới đã vi phạm; không thể cho phép RAM dù cận trên có đúng."
        : `${B.addr} < Base+Limit (${B.base + B.limit}): ${B.cond2 ? "đạt cận trên (A < Base+Limit)." : "vượt cận trên (A ≥ Base+Limit)."}.`,
      B.isValid 
        ? `Địa chỉ vật lý A=${B.addr} hợp lệ (thỏa mãn cả 2 cận) → MMU chuyển quyền cho phép truy cập RAM [${B.addr}].` 
        : `Địa chỉ A=${B.addr} không hợp lệ (vi phạm an toàn) → MMU phát trap lỗi bảo vệ → OS; không đọc/ghi RAM.`,
    ];
    return event(
      B,
      names[B.st],
      B.st === 0 ? "CPU → MMU" : B.st === 3 && !B.isValid ? "MMU → OS" : "MMU",
      `A=${B.addr}; Base=${B.base}; Limit=${B.limit}.`,
      descriptions[B.st],
      ["So sánh với Base.", "Kiểm tra cận trên nếu cận dưới đạt.", "Quyết định cho phép hoặc trap.", "Hoàn tất kiểm tra."][B.st],
      B.st === 3 && !B.isValid ? "MMU → TRAP → OS" : "CPU → MMU → RAM",
      B.st === 3 && !B.isValid ? "trap" : "request",
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
      B.mode === "translate"
        ? `L=${B.offset}; Base=${B.base}; Limit=${B.limit}; PA=${B.isValid ? B.pa : "không hợp lệ"}.`
        : `Base=${B.base}; Limit=${B.limit}; miền vật lý [${B.base}, ${B.base + B.limit - 1}]; A=${B.addr}.`,
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
      if (addrLbl) addrLbl.textContent = "Địa chỉ vật lý cần kiểm tra (A)";
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
        const timeline = targetId === "grid-p2" ? timelines.x : targetId === "grid-p4" ? timelines.v : null;
        if (timeline?.events.length) drawEvent(timeline, timeline.events[timeline.cursor]);
      }
    };
  });

  startB();
  $("label[for='x-addr']").textContent = "Địa chỉ muốn tìm (byte)";
  $("label[for='v-page']").textContent = "Trang chương trình cần";
  easySetup("x", "Chỉ nhập 2 số. Máy tự bố trí trang vào các ngăn RAM; muốn tự đặt bảng trang thì mở Nhập chi tiết.",
    field("x-easy-addr", "Địa chỉ muốn tìm (byte)", X.plan.addr, "number", "Ví dụ: 13.") +
    field("x-easy-size", "Mỗi trang chứa (byte)", X.pageSize, "number", "Ví dụ: 4. Dùng 1, 2, 4, 8… hoặc 4096."),
    () => {
      const addr = integer(read("x-easy-addr"), "Địa chỉ", 0, 2097151);
      const size = integer(read("x-easy-size"), "Cỡ trang", 1, 65536);
      const count = Math.max(4, Math.floor(addr / size) + 1);
      if (count > 32) throw Error("Đề nhanh tối đa 32 trang. Tăng cỡ trang hoặc giảm địa chỉ; ví dụ 13 và 4.");
      const pool = [5, 6, 1, 2, ...Array.from({ length: 32 }, (_, i) => i).filter(i => ![5, 6, 1, 2].includes(i))];
      const pt = pool.slice(0, count);
      submitEasyConfig("x", { "x-addr": addr, "x-c-size": size, "x-c-pages": count, "x-c-frames": Math.max(8, ...pt.map(f => f + 1)), "x-c-tlb": 4, "x-c-pt": joined(pt), "x-c-other": "", "x-c-cache": "" });
    },
    () => { set("x-easy-addr", 13); set("x-easy-size", 4); });
  easySetup("v", "Nhập số ngăn RAM và dãy trang cần đọc. RAM bắt đầu trống, mọi trang trong đề đều được phép truy cập.",
    field("v-easy-frames", "Số ngăn trong RAM", V.ram.length, "number", "Ví dụ: 2. Từ 1 đến 16.") +
    field("v-easy-refs", "Thứ tự các trang cần đọc", joined(vRefs), "text", "Ví dụ: 3 1 3 — đọc trang 3, rồi 1, rồi 3.") +
    '<label class="field"><span>Khi RAM đầy, chọn cách</span><select id="v-easy-policy"><option value="FIFO">FIFO · trang vào sớm nhất</option><option value="LRU">LRU · trang lâu chưa dùng</option><option value="CLOCK">Clock · cơ hội thứ hai</option></select></label>',
    () => {
      const frames = integer(read("v-easy-frames"), "Số ngăn RAM", 1, 16);
      const refs = numbers(read("v-easy-refs"), "Các trang cần đọc", { max: 31 });
      submitEasyConfig("v", { "v-c-pages": Math.max(8, ...refs.map(p => p + 1)), "v-c-frames": frames, "v-c-ram": "", "v-c-refs": joined(refs), "v-c-policy": read("v-easy-policy"), "v-c-dirty": "", "v-c-denied": "", "v-c-unmapped": "", "v-c-order": "", "v-c-recent": "", "v-c-bits": "", "v-c-hand": 0, "v-op": "read" });
    },
    () => { set("v-easy-frames", 2); set("v-easy-refs", "3 1 3"); set("v-easy-policy", "FIFO"); });
  easySetup("r", "Chọn thuật toán ở phía trên. Chỉ cần nhập 2 ô dưới đây; RAM bắt đầu trống, không cần nhập bit hay vị trí kim.",
    field("r-easy-frames", "Số ngăn trong RAM", R.n, "number", "Ví dụ: 3. Từ 1 đến 8.") +
    field("r-easy-refs", "Thứ tự các trang cần dùng", joined(R.refs), "text", "Ví dụ: 1 2 3 1 4 2. Mỗi số là một trang; tối đa 48 số."),
    () => submitEasyConfig("r", { "r-c-n": read("r-easy-frames"), "r-c-refs": read("r-easy-refs"), "r-c-ram": "", "r-c-order": "", "r-c-recent": "", "r-c-bits": "", "r-c-hand": 0 }),
    () => { set("r-easy-frames", 3); set("r-easy-refs", "1 2 3 1 4 2"); });
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
