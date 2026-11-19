# Khám phá bên trong bộ nhớ

Web tĩnh cho bài học Hệ điều hành – Khoa CNTT, Trường Đại học Sư phạm TP.HCM. Theo dõi **máy đang làm gì, vì sao, và bộ nhớ thay đổi thế nào**.

[Website GitHub Pages](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/) · [Thiết kế Academic Tech Lab, kiểm thử và ảnh trước/sau](docs/academic-lab-design.md)

Bản giao diện thử nghiệm trên nhánh `design/memory-workbench`: [ảnh trước/sau và kết quả kiểm tra](docs/memory-workbench-review.md).

Nền giấy ấm, header mực đậm, tab liền và cửa sổ bước từ snapshot giúp theo dõi bài khi trình chiếu. RAM dùng bề mặt tối; thao tác, bước dò xét và truy cập bị chặn có màu và nhãn riêng. [Hệ typography của cả 5 demo](docs/typography.md) dùng Be Vietnam Pro/JetBrains Mono cục bộ, cùng SVG Lucide. Lớp giao diện hiện hành và hai theme nằm trong `assets/css/studio.css`; Demo 1 có lớp trình bày riêng trong `studio-base.css` và `studio-base.js`. Hai skill UI UX Pro Max và Interface Design được cài tại `.agents/skills/`; nguồn pin revision trong `docs/design-skill-sources.json`.

## Năm demo

| Demo | Mô hình chính | Cách quan sát |
|---|---|---|
| 1 · Bảo vệ địa chỉ | Base ≤ A < Base + Limit; hoặc PA = Base + L | Kiểm tra cận, cho phép hoặc trap; địa chỉ vật lý và độ lệch logic có nhãn riêng. |
| 2 · Cấp phát | Thanh RAM, vùng đã dùng gạch xám, các vùng trống | Quét → chọn → cấp phát; First-fit dừng sớm, Best/Worst-fit xét hết. Chế độ mở/tắt tiến trình vẫn có. |
| 3 · Dịch địa chỉ | CPU/MMU → TLB → bảng trang nếu cần → PA → đọc RAM | Tách p và d, giữ nguyên d; phân biệt TLB hit, TLB miss và lỗi trang. |
| 4 · Demand Paging | CPU/MMU → OS → ổ đĩa → RAM → cập nhật bảng trang/chạy lại | Nhánh có/chưa có trang; ghi lại trang bẩn trước khi nạp; không đổi Present sớm. |
| 5 · Thay trang | Chuỗi tham chiếu → các khung RAM cố định → bằng chứng | FIFO: thứ tự nạp; LRU: thứ tự dùng; OPT: tương lai tại bước chọn; Clock: kim và bit R. |

Mỗi demo có ba nhóm **Làm quen / Thử thêm / Đối chiếu giáo trình**, mặc định là **Thử thêm**. Lùi/Bước tiếp phục hồi cùng snapshot; chuyển tab, đổi đề hoặc bấm Lùi dừng tự chạy. **Hiện giải thích** mở phần bên dưới mô hình; quy tắc chọn trang ở Demo 5 luôn hiện. Bảng đầy đủ, nhập đề chi tiết, lịch sử và so sánh chỉ mở khi cần. Trên điện thoại, các khối chuyển thành luồng dọc và thanh điều khiển bám mép dưới.

Các nhãn bài học: **AN TOÀN** (Demo 1), **HIỆU QUẢ** (Demo 2–3), **KHÔNG GIỚI HẠN** (Demo 4–5). Nhãn cuối nói về ý tưởng bộ nhớ ảo; RAM và không gian địa chỉ thực tế luôn hữu hạn.

## Ví dụ mặc định

| Demo | Dữ liệu | Điều cần thấy |
|---|---|---|
| 1 | Base 300040, Limit 120900, A 400000 | A phải đạt cả hai cận; A = 420940 bị chặn. |
| 2 | Vùng trống `[5,8,4,7]` KB; yêu cầu `[4,6,3]` KB | Lựa chọn trước ảnh hưởng phần dư cho yêu cầu sau. |
| 3 | LA 13; trang 4 byte; trang 3 chưa nạp | TLB miss → lỗi trang → nạp khung 0 → điền TLB → PA 1 → đọc byte +1. Dịch lại cùng LA để thấy TLB hit. |
| 4 | RAM `[0,1]`; trang 0 bẩn; đọc `[2,1,2,3]`; FIFO | 21 bước; 2 hit, 2 fault, 2 đọc đĩa, 1 ghi đĩa; cuối cùng RAM `[2,3]`. |
| 5 | Ba khung trống; chuỗi `1 2 3 1 4 2 5 1 2 3 4 5` | Có HIT, nạp trống và thay trang. Đổi thuật toán để thấy bằng chứng khác nhau. |

Mẫu giáo trình vẫn có: LA 10000 → PA 22288 với trang 4096 byte; chuỗi 20 tham chiếu/3 khung cho FIFO 15, LRU 12, OPT 9, Clock 14 lỗi trang.

## Chạy tại máy

Không cần npm, framework, build hoặc backend:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8080`. GitHub Pages phục vụ `index.html` ở gốc repository; giữ nguyên đường dẫn tương đối `assets/`.

## Mã đang được tải

- `index.html`: engine và điều khiển nền.
- `assets/js/teaching.js`: timeline, snapshot, kiểm tra đầu vào, ví dụ.
- `assets/js/teaching-scenes.js`: lớp hiển thị chỉ đọc cho Demo 3–5.
- `assets/js/lab-interface.js`: icon, bàn phím và stepper đọc timeline; không tạo controller mô phỏng thứ hai.
- `assets/css/teaching.css`: phong cách nền hiện có.
- `assets/css/teaching-scenes.css`: bố cục mới, màu theo vai trò, responsive và reduced motion.

Các file `lessons.js`, `lesson-*.js`, `hardware-*` và ảnh linh kiện cũ còn trong repository nhưng **không được index.html tải**. Giao diện hiện tại dùng thanh/ô nhớ và biểu tượng nhẹ.

## Kiểm tra

Node.js và Playwright/Chromium cần có sẵn để chạy kiểm thử trình duyệt; website không phụ thuộc chúng.

```sh
node tests/seeded-algorithms.cjs
node tests/regression.cjs
node tests/custom-problems.cjs
node tests/teaching-flow.cjs
node tests/scenes-browser.cjs
node tests/academic-lab.cjs
node tests/studio-browser.cjs
```

Bộ `seeded-algorithms` dùng mô hình đối chứng độc lập: 320 trace, 6400 trạng thái, 240 lần tiếp tục. Các bộ trình duyệt dùng máy chủ cổng 8080. `scenes-browser` kiểm tra UI công khai ở 1366/1920/375/390 px và lưu ảnh, kết quả JSON trong `/tmp/memory-scenes-review` (đổi bằng `MEMORY_ARTIFACT_DIR`). Các script `*_browser.py` cũ phụ thuộc lớp `MemoryLessons` không còn được tải, nên không thuộc kiểm tra giao diện hiện hành.

## Phạm vi mô phỏng

Mỗi bước là một thao tác giảng dạy, không phải một chu kỳ CPU. Demo 3 gộp nạp trang và cập nhật PTE; Demo 4 tách chúng, nhưng gộp chọn khung trống với nạp và gộp chạy lại với truy cập RAM. Demo 5 giả định trang sạch; trang ra không đồng nghĩa ghi đĩa. TLB là bộ đệm bản dịch trong MMU, bảng trang nằm trong RAM; khung của bảng trang không được trừ khỏi khung dữ liệu trong mô hình này. Không mô phỏng DMA, GPU, cache dữ liệu CPU hoặc bộ lập lịch.
