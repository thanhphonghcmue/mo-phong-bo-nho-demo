# 🖥️ Web Demo Quản Lý Bộ Nhớ Hệ Điều Hành (5 Phân Hệ Tiêu Biểu)
### Operating System Memory Management Visualizer · Trường ĐH Sư Phạm TP.HCM (HCMUE)

[![GitHub Pages](https://img.shields.io/badge/Demo-Live%20on%20GitHub%20Pages-success?style=for-the-badge&logo=github)](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![University](https://img.shields.io/badge/HCMUE-Khoa%20CNTT-0c3668?style=for-the-badge)](#)

> 🌐 **LINK TRUY CẬP TRỰC TUYẾN (STATIC GITHUB PAGES):**  
> 👉 **[https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/)**  
> *(Truy cập trực tiếp trên mọi trình duyệt Chrome, Edge, Safari, Firefox trên cả điện thoại và máy tính mà không cần cài đặt).*

---

## 📂 Cấu trúc thư mục dự án (Project Directory Structure)

Dự án được cấu trúc theo chuẩn Frontend chuyên nghiệp, tinh gọn, phân tách rõ ràng giữa mã nguồn giao diện, tài sản tĩnh, tài liệu kỹ thuật và bộ kiểm thử tự động:

```text
mo-phong-bo-nho-demo/
│
├── assets/                            # Tài nguyên tĩnh của ứng dụng web
│   ├── css/
│   │   └── teaching.css               # Phong cách giao diện nâng cao, timeline, Dark/Light mode
│   ├── js/
│   │   └── teaching.js                # Engine mô phỏng, timeline events, giải thích nguyên lý chuyên sâu
│   └── images/
│       └── logo-it.jpg                # Logo chính thức Khoa Công nghệ Thông tin - HCMUE
│
├── docs/                              # Tài liệu kỹ thuật & hướng dẫn chi tiết
│   ├── CUSTOM_PROBLEMS.md             # Hướng dẫn tùy biến đề bài, thông số RAM, chuỗi tham chiếu
│   └── UPGRADE_NOTES.md               # Đặc tả kỹ thuật và kiến trúc nâng cấp hệ thống
│
├── tests/                             # Bộ kiểm thử tự động (Automated Testing Suite)
│   ├── seeded-algorithms.cjs          # Unit test độc lập cho 4 thuật toán (320 traces, 6.400 states)
│   ├── custom-problems.cjs            # E2E test cho tính năng nhập đề bài tùy chỉnh (Playwright)
│   └── regression.cjs                 # Kiểm thử hồi quy giao diện và tính tương thích (Playwright)
│
├── legacy/                            # Lưu trữ phiên bản gốc phục vụ đối chiếu & sao lưu
│   └── index.original.html            # Bản backup mô phỏng 3 demo ban đầu
│
├── .gitignore                         # Loại trừ các file tạm và tài liệu nặng khỏi git
├── .nojekyll                          # Vô hiệu hóa Jekyll engine để nạp file tĩnh nhanh trên GitHub Pages
├── index.html                         # Điểm vào ứng dụng chính (Entry point cho GitHub Pages)
└── README.md                          # Tài liệu tổng quan và hướng dẫn dự án trên GitHub
```

---

## 🌟 Giới thiệu Dự án

Trang web mô phỏng trực quan phục vụ học tập, thực hành, thuyết trình và nghiên cứu đề tài môn **Hệ điều hành** (Khoa Công Nghệ Thông Tin - Trường ĐH Sư Phạm TP.HCM), dựa trên giáo trình chuẩn quốc tế:
**Operating System Concepts (10th ed., Silberschatz, Galvin & Gagne) — Part Four: Memory Management (Chương 9 & 10)** kết hợp bài giảng chuyên sâu của Bộ môn.

### 5 Phân hệ tiêu biểu trên Dashboard:

1. **📁 DEMO 1 · NỀN TẢNG (Foundations)**:  
   - **Cơ chế:** Bảo vệ địa chỉ bộ nhớ bằng hai thanh ghi phần cứng **Base** (Cơ sở) và **Limit** (Giới hạn).  
   - **Luồng hoạt động:** CPU phát địa chỉ $A \to$ Bộ so sánh kiểm tra cận dưới ($A \ge \text{Base}$) $\to$ Kiểm tra cận trên ($A < \text{Base} + \text{Limit}$) $\to$ Cấp quyền truy cập RAM an toàn hoặc kích hoạt ngắt phần cứng **TRAP to OS (Segmentation Fault)**. Thước đo RAM trực quan phân định rõ vùng OS, vùng tiến trình và vùng ngoài phạm vi.

2. **🖴 DEMO 2 · CẤP PHÁT BỘ NHỚ (Contiguous Allocation — Bãi đỗ xe)**:  
   - **Cơ chế:** Cấp phát phân vùng động liên tục với 3 chiến lược kinh điển: **First-fit, Best-fit, Worst-fit**.  
   - **Luồng hoạt động:** Quan sát các lỗ trống (holes) tự xuất hiện khi tắt tiến trình và tự động gộp (coalescing) các lỗ trống liền kề; minh họa hiện tượng **Phân mảnh ngoài (External Fragmentation)** và tính năng **Dồn nén RAM (Compaction)**.

3. **⊞ DEMO 3 · CƠ CHẾ PHÂN TRANG (Paging)**:  
   - **Cơ chế:** Dịch địa chỉ logic $(p, d)$ sang địa chỉ vật lý $(f, d)$ qua bộ đệm dịch nhanh **TLB** (Translation Lookaside Buffer) và **Bảng trang (Page Table)** trong RAM.  
   - **Luồng hoạt động:** Phân biệt rõ **TLB Hit** (lấy frame tức thì trong CPU) vs **TLB Miss** (phải truy cập RAM tra PTE); kiểm tra bit **Valid / Invalid ($v/i$)** để chặn truy cập ngoài vùng nhớ; chức năng thử lỗi trang linh hoạt.

4. **💾 DEMO 4 · BỘ NHỚ ẢO (Virtual Memory — Demand Paging)**:  
   - **Cơ chế:** Phân trang theo yêu cầu (Demand Paging) và quy trình chuẩn 6 bước xử lý ngắt lỗi trang (**Page Fault Handling** - Silberschatz 10.2).  
   - **Luồng hoạt động:** *1. CPU chạm trang bit $i \to$ 2. Hardware Trap to OS $\to$ 3. OS định vị khối trang trên Backing Store $\to$ 4. Nạp vào khung trống từ Free-frame List (hoặc chọn victim khi RAM đầy) $\to$ 5. Cập nhật PTE ($i \to v$) $\to$ 6. Restart Instruction*. Hỗ trợ quản lý **Dirty bit** để tối ưu hóa I/O ghi đĩa.

5. **🔄 DEMO 5 · THUẬT TOÁN THAY THẾ TRANG (Page Replacement)**:  
   - **Cơ chế:** So sánh trực quan 4 thuật toán chuẩn: **FIFO, LRU, OPT (Tối ưu), Clock (Cơ hội thứ hai - Second Chance)**.  
   - **Luồng hoạt động:** Bàn học (RAM các khung) và Tủ sách (Bộ nhớ phụ); biểu đồ so sánh số lỗi trang thời gian thực; kiểm chứng thực nghiệm **Nghịch lý Belady (Belady's Anomaly)** khi tăng số khung RAM; phòng tránh hiện tượng **Trì trệ hệ thống (Thrashing)**.

---

## 💡 Điểm nổi bật: "Giải thích nguyên lý hoạt động" chuyên sâu

Mỗi bước chuyển tiếp ở cả 5 Demo đều tích hợp mục giải thích tương tác chuẩn học thuật:
- **📌 Bước này là gì & Làm gì:** Phân tích chính xác vai trò của CPU, MMU hoặc Hệ điều hành tại bước đang thực thi.
- **⚙️ Cơ chế hoạt động & Tại sao phải làm:** Đi sâu vào nguyên lý phần cứng, bit trạng thái, ngắt Trap, cơ chế I/O đĩa.
- **🎯 Mục đích & Trụ cột hệ điều hành:** Liên kết trực tiếp với **Ba trụ cột quản lý bộ nhớ**:
  - 🛡️ **AN TOÀN:** Base + Limit, MMU dịch địa chỉ, bit Valid/Invalid.
  - ⚡ **HIỆU QUẢ:** Phân trang triệt tiêu phân mảnh ngoài, TLB tra cứu nhanh, gộp lỗ trống, dồn nén RAM.
  - ♾️ **KHÔNG GIỚI HẠN:** Bộ nhớ ảo, Demand Paging 6 bước, thay trang tối ưu, kiểm soát Working Set.
- **⏭️ Bước tiếp theo:** Mô tả chính xác trạng thái kế tiếp của hệ thống.

---

## 🖥️ Điểm cải tiến và Tối ưu trải nghiệm (UX/UI Enhancements)

- **📐 Bố cục 2 cột chuẩn trình chiếu (1366 × 768):**
  - Vùng mô phỏng trực quan chiếm khoảng 2/3 bên trái, bảng giải thích và đánh giá chiếm 1/3 bên phải.
  - Cập nhật tại chỗ mượt mà khi chuyển bước, theo dõi đồng thời toàn bộ tiến trình và thanh điều khiển mà không cần cuộn trang.
  - Nút **"Ẩn/Hiện giải thích"** linh hoạt, tự động mở rộng vùng mô phỏng khi cần tập trung vào sơ đồ.
- **🌓 Chế độ Sáng / Tối (Light & Dark Mode):**
  - Tích hợp nút chuyển đổi ngay trên thanh điều khiển và header, tự động ghi nhớ tùy chọn vào `localStorage`.
  - Chế độ tối sử dụng nền tương phản cao, tối ưu viền nổi bật cho các ô nhớ RAM và bảng trang.
- **✨ Tinh gọn chú thích học thuật:**
  - Loại bỏ hoàn toàn các trích dẫn giáo trình, số chương, số trang rườm rà.
  - Giữ lại đầy đủ các nhãn kỹ thuật cốt lõi (CPU, MMU, RAM, Page Table, Frame, Base, Limit).
- **🔄 Bảng đánh giá thuật toán Demo 5 hiện đại:**
  - Thiết kế bảng đánh giá khung trang chuyên nghiệp cho cả 4 thuật toán: **FIFO, LRU, OPT, CLOCK**.
  - Thuật toán Clock hiển thị rõ ràng vị trí kim quét (`📍 Kim đang trỏ`), bit tham chiếu $R$, cơ chế Second Chance và thẻ đánh dấu nạn nhân (`⚠️ Victim`), loại bỏ hình vẽ kim đồng hồ cũ.

---

## 🚀 Hướng dẫn cài đặt và chạy thử

### 1. Xem trực tiếp trên mạng (Khuyên dùng khi nộp bài hoặc thuyết trình):
Mở liên kết GitHub Pages:  
👉 **[https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/)**

### 2. Chạy trên máy cục bộ (Offline / Development):
```bash
# Clone repository
git clone https://github.com/thanhphonghcmue/mo-phong-bo-nho-demo.git
cd mo-phong-bo-nho-demo

# Khởi chạy server tĩnh cục bộ bằng Python
python -m http.server 8080
```
Mở trình duyệt truy cập: `http://localhost:8080`

### 3. Chạy kiểm thử tự động (Unit Test):
```bash
# Chạy bộ test thuật toán thay thế trang (320 traces, 6.400 states)
node tests/seeded-algorithms.cjs
```

---

## 🛠️ Tùy biến đề bài & Tài liệu nâng cao

- Hướng dẫn nhập đề bài và trạng thái ban đầu: Xem chi tiết tại [docs/CUSTOM_PROBLEMS.md](docs/CUSTOM_PROBLEMS.md).
- Ghi chú kiến trúc và nhật ký nâng cấp: Xem chi tiết tại [docs/UPGRADE_NOTES.md](docs/UPGRADE_NOTES.md).
- Tài liệu học phần và slide bài giảng được lưu trữ nội bộ tại thư mục cục bộ của sinh viên.

---

## 👨‍💻 Tác giả & Đơn vị thực hiện
- **Đơn vị:** Khoa Công nghệ Thông tin — Trường Đại học Sư phạm TP.HCM (HCMUE)
- **Học phần:** Hệ điều hành (Operating Systems)
- **Công nghệ sử dụng:** Pure Modern HTML5, CSS3 Variables, ES6+ JavaScript, SVG Animations.
