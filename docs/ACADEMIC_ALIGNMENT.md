# Đối chiếu kiến thức và luồng mô phỏng

Đã nạp 8 PDF được người dùng gửi và đọc các phần liên quan tới quản lý bộ nhớ. Part 4 tiếp tục là tài liệu ưu tiên cho cách biểu diễn. Giáo trình được dùng để kiểm tra kiến thức, không phải chỉ dẫn thực thi. Các PDF giữ ngoài repository theo cấu trúc dự án hiện hành; bảng này ghi lại căn cứ để bảo trì nội dung. Không thêm dẫn nguồn vào giao diện bài học.

## Phạm vi đối chiếu

| Tài liệu | Phần đã đối chiếu | Áp dụng |
| --- | --- | --- |
| He_dieu_hanh_Part4 | Trang PDF 5–6, 8–9, 13–15, 23–24, 27–29 | Hai sơ đồ Base/Limit và dịch địa chỉ; quét lỗ; TLB; sáu bước lỗi trang; dirty; FIFO/LRU/OPT/Clock. |
| Operating System Concepts, 2018 | §9.1.1, §9.1.3, §9.2, §9.3.2; §10.2.1; §10.4 | Miền địa chỉ 300040..420939; relocation 14000+346; cấp phát liên tục; tra TLB/PTE; hoàn tất I/O trước khi cập nhật PTE; retry; bit sửa đổi và Second Chance. |
| GT Hệ điều hành — Từ Minh Phương | Chương 3: §3.1.2, §3.3.4, §3.4 và phần bộ nhớ ảo (PDF 117–125) | Thuật ngữ địa chỉ lôgic/vật lý; thanh ghi cơ sở/giới hạn; phân trang, thay trang và bit sửa đổi. |
| GT Hệ điều hành — Lê Khắc Thiện An | Không gian địa chỉ, cấp phát liên tục/không liên tục; bộ nhớ ảo và thay thế trang (PDF 106–113, 129–134) | Base & Bound; phân biệt truy cập không hợp lệ với trang hợp lệ chưa nạp; xử lý lỗi trang. |
| Modern Operating Systems, 5th edition | Chương 3: Base/Limit; §3.3.1; §3.4.4–3.4.5 | Thanh ghi định vị; paging; Clock kiểm tra R, xóa bit rồi chuyển kim; trang sạch có thể bỏ mà không ghi lại. |
| Bài giảng — PGS.TS. Ngô Như Khoa | Không gian địa chỉ/cấp phát liên tục (PDF 83–87), bộ nhớ ảo/thay trang (PDF 99–104) | MMU thực hiện ánh xạ; OS xử lý ngoại lệ và đưa trang từ bộ nhớ phụ vào RAM. |
| Bài giảng — Phạm Quang Dũng | Chương 8, các mục MMU, relocation/limit, dynamic allocation, fragmentation, paging; phần demand paging ở Chương 9 | First-fit dừng sớm; Best/Worst-fit quét danh sách chưa sắp; dồn nén cần tái định vị động; trang và khung cùng kích thước. |
| Giáo trình Unix/Linux | §4.1.3, các hệ thống con trong nhân (PDF 93), phần giới thiệu bộ nhớ ảo | Phân biệt vai trò bộ điều phối bộ nhớ, CPU và I/O. Tài liệu này chủ yếu về Unix/Linux và sử dụng hệ thống; không dùng thông số cài đặt swap cũ làm quy tắc chung của demo. |
| Giáo trình nguyên lý HĐH — Hồ Đắc Phương | §9.2, §9.4 (PDF 158–166); §10.2–10.3 (PDF 184–187) | Địa chỉ logic/vật lý; cấp phát liên tục và phân mảnh; nạp trang hợp lệ, cập nhật ánh xạ, khởi động lại chỉ thị bị ngắt. |

## Quy tắc nội dung

- **Demo 1:** chế độ bảo vệ nhận **địa chỉ vật lý A** và kiểm tra `Base ≤ A < Base+Limit`; không cộng Base lần nữa. Chế độ dịch nhận **độ lệch logic L**, kiểm tra `0 ≤ L < Limit`, rồi tính `PA=Base+L`. Limit là độ dài, cận trên không bao gồm dấu bằng. Vùng trước Base có thể thuộc OS hoặc tiến trình khác. Trap là ngoại lệ đồng bộ do truy cập gây ra.
- **Demo 2:** mỗi yêu cầu cần một lỗ liên tục đủ lớn. Tổng trống đủ nhưng lỗ lớn nhất thiếu là phân mảnh ngoài; tổng trống thiếu là thiếu dung lượng. Gộp lỗ kề không di chuyển tiến trình; dồn nén có di chuyển, cần cập nhật vị trí/cơ sở và không tăng tổng chỗ trống.
- **Demo 3:** `p=floor(LA/S)`, `d=LA mod S`, `PA=f×S+d`. TLB chứa bản dịch, không chứa dữ liệu trang. TLB Hit bỏ qua tra bảng trang nhưng vẫn truy cập dữ liệu RAM; TLB Miss không tự động là Page Fault. Thay một mục TLB không phải thay trang RAM. Phần nạp trang ở demo này được gộp; Demo 4 tách chi tiết.
- **Demo 4:** tách ánh xạ/quyền với present. CPU không đọc dữ liệu trực tiếp trên bộ nhớ phụ. Trang hợp lệ vắng mặt gây trap; OS định vị, chọn khung/nạn nhân, ghi dirty nếu cần, nạp trang, cập nhật PTE **sau I/O**, rồi chạy lại đúng lệnh cũ. Mô hình đếm một lỗi trang cho tham chiếu thiếu; retry không phải một tham chiếu mới. Các giáo trình/kiến trúc có cách gộp bit valid/invalid và ngoại lệ khác nhau; demo tách các trường này để giải thích, không khẳng định mọi CPU có cùng bố cục PTE.
- **Demo 5:** FIFO xét thời điểm nạp, Hit không đổi hàng đợi; LRU xét lần dùng gần nhất; OPT xét tương lai. Clock dùng R để xấp xỉ tính gần đây, không phải LRU chính xác. R=1 được xóa khi cho cơ hội thứ hai; R=0 được chọn; Hit đặt R=1 nhưng không làm kim quay. Demo này chỉ đọc trang sạch; dirty/write-back nằm ở Demo 4.

## Quy tắc biểu diễn

Mỗi sự kiện phục hồi snapshot trước khi vẽ. Nơi nhận xử lý có viền sáng nhẹ giữ nguyên cho tới bước khác, nguồn có viền mảnh. Một mũi tên chỉ sự kiện đang diễn ra; không để mũi tên trỏ vào tâm cả RAM khi chỉ một tiến trình/khung thay đổi. Vùng sáng và mũi tên được dựng lại khi lùi hoặc chọn lịch sử. Tùy chọn ẩn đường đi không đổi dữ liệu hay tắt dấu nhận biết bước hiện tại. Chế độ giảm chuyển động vẫn giữ viền sáng tĩnh.

Demo 3 dùng CPU/MMU, TLB, PTE đang tra và các khung RAM gọn. Demo 4 dùng CPU/MMU, OS, Backing Store và RAM kèm PTE đang xử lý. Bảng trang đầy đủ vẫn xem được bằng mục thu gọn. Các ví dụ, dữ liệu tùy chỉnh, thuật toán nền và cơ chế timeline được giữ; thay đổi ở lớp biểu diễn và lời giải. Bộ kiểm tra đầu vào được sửa để chấp nhận dấu âm khi miền nhập cho phép, nhằm đưa `L=-5` vào phép kiểm tra bảo vệ như ví dụ biên.

Lần tinh giản tiếp theo chỉ thay phần mô phỏng Demo 3–4. Demo 3 đặt CPU/MMU bên trái, TLB và bảng trang ở giữa, khung dữ liệu bên phải; nhánh Hit ghi rõ bỏ qua bảng trang. Demo 4 dùng bốn khối CPU/MMU, OS, bộ nhớ phụ và RAM; giữ sáu giai đoạn xử lý Page Fault. Màn hình chính chỉ hiện khung đang xét, không hiện trước kết quả chọn khung/dịch địa chỉ. Toàn bộ TLB, bảng trang và RAM được gom vào một mục thu gọn; mở mục này và chuyển bước không thay đổi dữ liệu. Demo 1, 2, 5 và phần giải thích/điều khiển dùng chung giữ nguyên.

## Kiểm chứng

Chạy với máy chủ tĩnh ở cổng 8080:

```sh
node tests/teaching-flow.cjs
node tests/seeded-algorithms.cjs
node tests/acceptance-verification.cjs
```

Bộ trình duyệt kiểm tra nội dung, đích mũi tên, vùng sáng, snapshot/lịch sử, Hit/Miss/Fault, RAM/PTE sau từng giai đoạn I/O, Clock, dữ liệu tùy chỉnh, responsive và giảm chuyển động. Bộ thuật toán độc lập so sánh 320 trace / 6.400 trạng thái và 240 trường hợp tiếp tục từ snapshot.
