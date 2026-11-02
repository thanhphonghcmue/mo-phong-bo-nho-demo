# Nhập đề bài và trạng thái ban đầu

Mở từng Demo, chọn **Đổi đề bài & trạng thái ban đầu**, sửa số liệu rồi bấm **Áp dụng & bắt đầu lại**. Demo 1 dùng trực tiếp các ô Base/Limit/A và nút **Kiểm tra**; bài tập lỗ trống của Demo 2 dùng **Đổi dữ liệu → Áp dụng**.

- Dữ liệu đang gõ chưa làm thay đổi bài đang chạy. Dòng **Đề đang chạy** hiển thị cấu hình thực sự được dùng.
- Áp dụng tạo phiên mới và xóa lịch sử cũ. **Làm lại** chạy từ trạng thái ban đầu của đề đã áp dụng; **Khôi phục mẫu giáo trình** trở về dữ liệu mẫu.
- Nhập sai báo lỗi và giữ nguyên mô hình. Bật/tắt giải thích, ghi chú và lịch sử không thay đổi kết quả.
- Mỗi bước có tên thao tác, thành phần xử lý, điều kiện và kết quả theo số liệu thực. Mở **Vì sao / bước tiếp theo?** khi cần; ghi chú học thuật vẫn mặc định thu gọn.

## Demo 1 — Base/Limit

Nhập Base, Limit và địa chỉ cần kiểm tra A. Limit là **độ dài vùng nhớ**, không phải địa chỉ cuối. Điều kiện: `Base ≤ A < Base + Limit`.

Ví dụ Base=512, Limit=128: A=639 hợp lệ; A=640 bị chặn. Base=0, Limit=4, A=0 cũng hợp lệ. Nút thử cận lấy theo Base/Limit đang nhập; khi Base=0 không có địa chỉ vật lý không âm dưới cận này.

Số liệu phải nguyên: Base 0..1.000.000.000; Limit 1..1.000.000.000; A 0..2.000.000.000. Thước RAM tự điều chỉnh với số liệu nhỏ/lớn; các ví dụ gốc vẫn được giữ.

## Demo 2 — Cấp phát

**Chế độ RAM trống / tự mở-tắt** cho sửa:

- Dung lượng RAM: 1..10.000.000 KB.
- Các vùng ban đầu theo địa chỉ tăng: `A:256, -:256, B:512, -:1024`. Dấu `-` là lỗ trống. Phần dung lượng chưa khai báo tự thành lỗ cuối RAM; để trống cả ô thì RAM rỗng. Tối đa 24 vùng.
- Kịch bản tối đa 40 thao tác, mỗi dòng một lệnh: `Mở C 300`, `Đóng A`, `Dồn`. Để trống để chỉ thao tác thủ công. Tên tiến trình gồm chữ cái, số, dấu gạch dưới, bắt đầu bằng chữ; tối đa 12 ký tự.

Ví dụ RAM=2048 KB với bố trí trên và ba lệnh vừa nêu: sau dồn nén, B ở địa chỉ 0 (512 KB), C ở 512 (300 KB), lỗ trống ở 812 (1236 KB). Mở lại cùng tên đang ở RAM không cấp thêm vùng trùng. Yêu cầu lớn hơn RAM được ghi nhận là không đủ chỗ, không tự sửa dung lượng.

**Chế độ bài tập có lỗ** cho đổi tối đa 12 lỗ, 16 yêu cầu và kích thước phần đã dùng giữa các lỗ (có thể bằng 0). Các vùng đã dùng chỉ tham gia sơ đồ địa chỉ, không phải lỗ để cấp phát. First-fit dừng ở lỗ đủ đầu tiên; Best/Worst-fit xét hết và hòa thì chọn địa chỉ thấp.

Các yêu cầu phải chờ chưa tự được cấp lại sau giải phóng/dồn nén; thử lại bằng lệnh Mở tương ứng trong kịch bản. Đây là mô phỏng chọn lỗ, không mô phỏng bộ lập lịch tiến trình.

## Demo 3 — Dịch địa chỉ

Cho sửa kích thước trang, số trang, số khung RAM, dung lượng TLB, bảng trang, các khung dành cho tiến trình khác và TLB ban đầu.

- Kích thước trang: lũy thừa 2 từ 1..65536 byte; số trang/khung: 1..32; TLB: 1..16 mục.
- Bảng trang liệt kê Frame của Page 0, 1, 2… Ví dụ `4, -, 1, 3`. Dấu `-` là trang được ánh xạ nhưng chưa hiện diện. Mô hình này chưa mô phỏng chia sẻ/alias nhiều trang vào cùng một khung.
- TLB có cú pháp `trang:khung`, từ cũ đến mới; mọi mục phải khớp bảng trang và không trùng Page. Khung dành cho tiến trình khác không được trùng các khung đã ánh xạ.
- Nhập LA ở ô **Địa chỉ logic** trước khi áp dụng; miền LA tự tính bằng `số trang × kích thước trang`.

Ví dụ: trang=1024 B; 4 trang; 6 Frame; TLB=2; bảng trang `4,-,1,3`; khung khác `0`; TLB ban đầu `2:1`; LA=2200. Kết quả `p=2, d=152, PA=1×1024+152=1176`; có TLB Hit, không Page Fault.

Nếu trang chưa hiện diện và có khung trống, OS nạp trang. Nếu không còn khung trống, mô phỏng dừng ở Page Fault và chỉ rõ cần chọn victim trong Demo 4; không sinh PA giả hoặc NaN. TLB Miss không đồng nghĩa Page Fault.

## Demo 4 — Demand Paging

Cho sửa 1..32 trang, 1..16 khung, RAM ban đầu (Page ở mỗi Frame), thứ tự nạp/sử dụng, bit R và kim, danh sách trang dirty, trang không có quyền, trang không được ánh xạ; chọn FIFO/LRU/Clock khi RAM đầy.

- RAM `0,1` nghĩa Frame 0 chứa Page 0, Frame 1 chứa Page 1. `-` là khung trống. Không được trùng trang trong RAM.
- Chuỗi truy cập có tối đa 32 tham chiếu. Có thể nhập một trang, hoặc nhập tiếp ở ô **Trang cần truy cập**. Chuỗi dừng khi bị từ chối truy cập; trang chưa hiện diện nhưng được cấp quyền vẫn được nạp bình thường.
- **Đọc (LOAD)** không tự làm dirty. **Ghi (STORE)** đặt dirty=1 khi CPU ghi vào RAM. Khi thay victim, chỉ dirty=1 mới phát sinh I/O ghi.
- Thứ tự ban đầu phải chứa đúng các trang đang ở RAM; để trống thì theo thứ tự Frame. FIFO dùng thứ tự nạp; LRU dùng thứ tự sử dụng; Clock dùng bit R và vị trí kim.

Ví dụ 3 trang, 1 khung, RAM ban đầu `0`, chuỗi `0,1`, thao tác Ghi: Page 0 trúng và bị sửa; truy cập Page 1 phải ghi Page 0 rồi nạp Page 1. Kết quả 1 hit, 1 fault, 1 I/O ghi, 1 I/O đọc. Page 1 dirty sau STORE.

Sửa đề và Áp dụng khởi tạo lại toàn bộ bài. Khi chỉ gửi yêu cầu mới lúc giao dịch trước chưa hoàn tất, giao dịch dở được hủy và trạng thái trước giao dịch được phục hồi.

## Demo 5 — Thay trang

Cho nhập 1..48 tham chiếu, 1..8 khung, Page ID 0..9999, RAM ban đầu rỗng hoặc có trang, thứ tự nạp FIFO, thứ tự dùng LRU, bit R và kim Clock. Chi phí nạp những trang có sẵn trước khi bắt đầu không tính vào bộ đếm của chuỗi.

Ví dụ Clock: 4 khung; RAM `8,-,3,-`; R=`1,0,0,0`; kim=2; chuỗi `9,8,3,9`. Có khung trống nên Page 9 vào Frame 3; Page 3 ở Frame 2 không bị ghi đè. Kết quả 1 fault và 3 hit. Chọn lại bước lịch sử phục hồi cả RAM, R, kim và bộ đếm.

OPT dùng tương lai của chuỗi đã nhập để làm chuẩn so sánh, không mô phỏng khả năng biết trước của OS thực. Mô hình Demo 5 dùng trang sạch/chỉ đọc; I/O ghi trang dirty được học riêng ở Demo 4.

## Kiểm chứng

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# Terminal khác (đã có Playwright/Chromium):
node tests/regression.cjs
node tests/custom-problems.cjs
node tests/seeded-algorithms.cjs
```

Đã kiểm tra 11 nhóm hồi quy mẫu cũ, 13 nhóm đề tùy chỉnh và 320 trace với 6.400 trạng thái thay trang; 240 ca tiếp tục từ snapshot cũng khớp bộ tham chiếu độc lập. Mẫu 20 tham chiếu, 3 khung rỗng vẫn cho FIFO/LRU/OPT/Clock: 15/12/9/14 lỗi trang.

Các giới hạn số lượng giúp hình mô phỏng và lịch sử dễ quan sát. Lịch sử giữ trong phiên, không qua reload. Chưa kiểm thử Firefox/Safari hoặc push/publish lên GitHub Pages.
