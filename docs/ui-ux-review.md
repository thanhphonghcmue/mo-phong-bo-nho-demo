# Nâng cấp UI/UX năm demo quản lý bộ nhớ

Đối chiếu trên `main` gốc `febb824`. Giữ cấu trúc HTML/CSS/JS tĩnh và các engine cấp phát/thay trang. Prompt nhóm trưởng là yêu cầu tham khảo cho công việc này; hình đính kèm mô tả nhánh Demand Paging. Vì vậy dùng ý tưởng Có/Chưa cho Demo 4, đồng thời giữ Demo 3 tập trung vào dịch địa chỉ có TLB.

## Thay đổi theo demo

| Demo | Trước | Sau |
|---|---|---|
| 1 | Nhãn con trỏ RAM báo hợp lệ/trap ngay trước kiểm tra | Chưa kết luận cho tới bước quyết định; nhãn số lớn được giữ trong màn hình. Hai chế độ kiểm tra A và dịch L vẫn tách rõ. |
| 2 | Nhãn Best/Worst cho biết vùng tối ưu trước khi quét xong | Thanh RAM và vùng gạch xám giữ nguyên; chỉ hiện con trỏ đang xét và phần dư tại vùng đó. Chọn vùng và cấp phát là hai snapshot. Mặc định mở bài có sẵn lỗ. |
| 3 | RAM đặt trước PA; nhiều bảng và điểm nhấn | Luồng 5 khối: CPU/MMU → TLB → PTE khi cần → PA → RAM. Một PTE liên quan; không hiện PA trước bước tính. Đọc sáng đúng byte, TLB HIT bỏ qua PTE. |
| 4 | Bốn khối xa nhau, đường vòng và nhiều thanh trạng thái | Luồng ngang CPU/MMU → OS → đĩa → RAM → PTE/chạy lại; nhánh Có/Chưa rõ. Hướng RAM → đĩa ở bước ghi bẩn; Present chỉ đổi sau I/O. HIT bỏ qua OS/đĩa. |
| 5 | Bằng chứng chọn trang bị giấu trong giải thích, bảng so sánh lớn | Khung RAM cố định; bằng chứng luôn nằm ngay dưới. FIFO giữ hàng khi hit; LRU đổi thứ tự dùng; OPT chỉ xét tương lai khi chọn; Clock hiện kim ngay trên khung và bit R ở khung. So sánh/nâng cao thu gọn. |

Tất cả có ba mức ví dụ; mặc định vừa phải. Giải thích ngắn gồm Đang làm / Vì sao / Tiếp theo; đọc sâu là tùy chọn. Màu xanh dương, tím, xanh ngọc và hổ phách biểu thị vai trò; đỏ dành cho từ chối. Một điểm đang xử lý, hiệu ứng ngắn, tôn trọng reduced motion. Chỉnh đề, xem trạng thái đầy đủ và lịch sử vẫn dùng được.

## Phân biệt UI và thuật toán

- `index.html`: chỉ thay asset đang tải và lớp body; không đổi hàm engine.
- `teaching.js`: nối view mới, rút ngắn lời giải, bố trí điều khiển và lịch sử, chọn ví dụ qua controller/validator sẵn có. Các hàm `buildX/buildV/buildR/buildA` giữ nguyên.
- `teaching-scenes.js`: đọc snapshot để dựng mô hình, không thay RAM/PTE/TLB, queue, bit hoặc bộ đếm.
- Các sửa lỗi hiển thị: bỏ kết luận sớm ở Demo 1 và bỏ nhãn vùng thắng sớm ở Demo 2; sửa nguồn nối mũi tên Demo 2 để không lấy tọa độ của bộ cấp phát đã ẩn. Chưa thấy lỗi công thức dịch địa chỉ qua các ca được kiểm tra; không sửa engine để thay kết quả.

Giá trị snapshot có kế hoạch nội bộ đã tính sẵn; view chỉ hiện kết quả ở đúng sự kiện. Lùi phục hồi toàn bộ snapshot, không tính lại từ ảnh đang hiển thị.

## Kiểm chứng

| Bộ kiểm tra | Kết quả | Nội dung |
|---|---|---|
| `seeded-algorithms.cjs` | PASS | 320 trace / 6400 trạng thái / 240 continuation; FIFO, LRU, OPT, Clock với RAM ban đầu tùy chỉnh. |
| `regression.cjs` | PASS · 11 nhóm | Hai cận, PA chuẩn, RAM/PTE commit, I/O, kết quả giáo trình, hoàn tác, Belady, responsive/theme. |
| `custom-problems.cjs` | PASS · 13 nhóm | Tự nhập, RAM không rỗng, FIFO/LRU/Clock, dirty/STORE, không ánh xạ, cấu hình sai, địa chỉ lớn, mobile. |
| `teaching-flow.cjs` | PASS · 9 nhóm | Đúng điểm xử lý, quay lui/lịch sử, TLB nóng, PTE sau I/O, đích mũi tên Demo 2, reduced motion và autoplay. |
| `scenes-browser.cjs` | PASS · 8 nhóm | UI công khai, không lộ đáp án sớm, byte offset, dirty trước page-in, bằng chứng bốn thuật toán, 1366×768 / 1920×1080 / 375×844 / 390×844, mở/đóng giải thích, tab pause. |

Các số liệu được đối chiếu:

- Demo 3: LA 13, S=4, p=3, d=1; trang chưa nạp → khung 0 → PA 1. Trang đã có khung 2 → PA 9, không fault. LA 10000, S=4096 → PA 22288.
- Demo 4: RAM `[0,1]`, D[0]=1, FIFO, đọc `[2,1,2,3]` → 21 sự kiện; Hit=2, Fault=2, Read=2, Write=1; RAM cuối `[2,3]`. Từ chối quyền không tăng Fault/I/O.
- Demo 5: chuỗi giáo trình 20 tham chiếu, 3 khung → FIFO 15, LRU 12, OPT 9, Clock 14 lỗi trang.

Kiểm thử cũ được đổi cách chọn fixture vì mặc định mới là Thử thêm và các mục so sánh nằm trong details. Kiểm tra UI chuyển từ dây SVG dài sang cạnh nối trong khe và một điểm đang xử lý. Không đổi các giá trị kỳ vọng của thuật toán. Bộ Python cũ yêu cầu `MemoryLessons` không áp dụng cho UI đang tải; không khôi phục giao diện cũ để chạy chúng.

## Ảnh trước/sau

Ảnh trước lấy từ bản `febb824`; dữ liệu ở ảnh sau có thể khác vì ví dụ mặc định đã đổi. Dùng để so bố cục; tính đúng thuật toán được kiểm tra riêng ở trên.

| Demo | Trước | Sau |
|---|---|---|
| 3 | [Bố cục cũ](review/x-before.png) | [Đọc đúng byte](review/x-after.png) |
| 4 | [Bố cục cũ](review/v-before.png) | [Ghi trang bẩn](review/v-after.png) |
| 5 | [Bố cục cũ](review/r-before.png) | [Clock chọn trang](review/r-after.png) |

Điện thoại: [Demo 3](review/x-mobile.png) · [Demo 4](review/v-mobile.png).

## Giới hạn đã ghi nhận

- Đã kiểm bằng Chromium cục bộ. Chưa kiểm trực tiếp Safari/iOS hay thiết bị màn hình cảm ứng thật.
- Mô hình dài dùng luồng dọc trên điện thoại; mở nhiều phần giải thích cần cuộn. Bảng RAM nhiều khung và bài nhiều tham chiếu cũng có thể dài hơn màn hình.
- Chưa xác nhận giao diện sau triển khai trên tên miền GitHub Pages; môi trường hạn chế truy cập tên miền đó. Cấu trúc tĩnh và đường dẫn asset tương đối được giữ nguyên.
- Không khẳng định mô phỏng từng chu kỳ hoặc toàn bộ cơ chế của máy thật; các bước gộp và giả định được ghi trong README.
