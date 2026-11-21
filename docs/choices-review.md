# Điều chỉnh theo ba ảnh góp ý

Nền đối chiếu: `dbf7ee9`. Giữ giao diện và các thuật toán hiện tại; tập trung làm rõ thao tác chọn chế độ, ví dụ và phần giải thích tùy chọn.

- **Demo 1:** hai nút “Kiểm tra địa chỉ” và “Dịch địa chỉ” luôn hiện phía trên các ô nhập. Nút được chọn có trạng thái hiển thị và `aria-pressed`. Phần “Thử ví dụ khác” chỉ chứa ví dụ/preset.
- **Demo 5:** phần thứ tự chọn trang ẩn mặc định dưới “Vì sao chọn trang này?”. Mở/đóng không đổi trạng thái mô phỏng; lựa chọn mở được giữ khi Lùi/Tiếp hoặc Làm lại. Mũi tên dùng nguồn đang nhìn thấy, không bắt đầu từ phần bị ẩn.
- **Tên ví dụ:** thay “so sánh bốn quy tắc” bằng chuỗi 6, 12 hoặc 20 lượt truy cập. Nội dung và giá trị lựa chọn không đổi. Bảng tổng hợp được đặt tên cụ thể: “Xem số lỗi trang của 4 thuật toán”.
- **Rà soát bổ sung:** giải thích riêng độ lệch âm và độ lệch không nhỏ hơn Limit; sửa màu số bước nền tối; bỏ chú thích sai “cùng tỉ lệ với RAM” ở khối tiến trình Demo 2.

## Ảnh kết quả

| Trạng thái | Ảnh |
|---|---|
| Hai chế độ hiện ngoài phần thu gọn | [Demo 1](review/choices/demo1-modes.png) |
| Tên ví dụ rõ nghĩa, phần thứ tự ẩn mặc định | [Demo 5](review/choices/demo5-closed.png) |
| Mở lý do khi cần | [Demo 5 mở giải thích](review/choices/demo5-open.png) |
| Giao diện điện thoại | [Demo 5 · 390px](review/choices/demo5-mobile.png) |

## Kiểm tra

Đã đạt 60 nhóm kiểm thử trình duyệt: regression 11, teaching-flow 9, scenes-browser 8, flow-emphasis 8, studio-browser 8, academic-lab 9 và requested-ui 7. Bộ đối chứng thuật toán đạt 320 trace, 6400 trạng thái và 240 lần tiếp tục.

Bộ mới kiểm tra hai chế độ khi phần tùy chọn đóng; điều kiện lỗi và thời điểm PA xuất hiện; ví dụ đúng 6/12/20 lượt; phần giải thích đóng/mở; nguồn mũi tên nhìn thấy; khôi phục snapshot; 375/390/768/1024/1366px; màu số bước ở nền tối; giảm chuyển động. Không có lỗi JavaScript hoặc thiếu tài nguyên trong các lần chạy.

Kết quả máy đọc: [requested-ui](review/choices/results.json). Không bật axe trong lần kiểm tra này; kiểm tra tương phản số bước dùng màu tính được từ trình duyệt.

```sh
python3 -m http.server 8080 --bind 127.0.0.1
node tests/requested-ui.cjs
```
