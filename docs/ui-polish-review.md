# Rà soát và tinh chỉnh giao diện hiện tại

Nền đối chiếu: `6ecf960`. Giữ bảng màu giấy ấm/xanh teal/vàng đất, mô hình và thuật toán hiện tại; giữ hai chế độ Demo 1 hiện sẵn và phần lý do Demo 5 ẩn mặc định.

## Các điểm đã sửa

- **Điều hướng:** điện thoại và máy tính bảng hiện đủ 5 demo cùng lúc. Tên rút gọn hiển thị ở màn hình nhỏ; tên đầy đủ vẫn có cho trình đọc màn hình và trên desktop. Phím mũi tên, Home/End và Tab giữ nguyên hoạt động.
- **Đầu trang:** bỏ dòng tiếng Anh trùng ý ở điện thoại, đưa nút sáng/tối thành biểu tượng 44px có nhãn truy cập. Ở 390px, header giảm từ khoảng 179 xuống 88px; vùng mô phỏng bắt đầu cao hơn khoảng 93px.
- **Demo 1:** sơ đồ tóm tắt hiển thị đủ 4 bước theo đường 1 → 2 ↓ 3 ← 4 khi màn hình hẹp. Số bước dùng màu chữ theo theme, sửa tương phản cũ khoảng 1,7:1; chữ bước bị bỏ qua vẫn rõ.
- **Demo 2:** chỉ dẫn và hàng đợi vừa bề ngang màn hình, vẫn nhìn thấy khi cuộn thanh RAM. Mũi tên đi qua khoảng trống bên cạnh, không cắt hàng đợi; vị trí được tính lại khi cuộn.
- **Demo 3–4:** thẻ xếp dọc có chiều cao theo nội dung thay vì giữ mức tối thiểu của desktop. Tăng chữ giải thích/nhãn nhỏ và độ tương phản của nhãn khung RAM được chọn.
- **Khả năng đọc và bàn phím:** chỉnh màu các tiến trình trong chế độ RAM trống; nhãn đã chạy vẫn đọc được. Dòng thuật toán đang chọn trong bảng tổng lỗi trang có vòng focus rõ khi dùng bàn phím.

## Ảnh đối chiếu

| Nội dung | Trước | Sau |
|---|---|---|
| Điều hướng, header và tóm tắt Demo 1 trên điện thoại | [Trước](review/polish/mobile-before.png) | [Sau](review/polish/mobile-after.png) |
| Chỉ dẫn và hàng đợi Demo 2 | [Trước](review/polish/allocation-before.png) | [Sau](review/polish/allocation-after.png) |

Xem thêm [cuộn RAM](review/polish/allocation-panned.png), [nhãn tiến trình nền tối](review/polish/free-dark.png) và [focus bàn phím](review/polish/keyboard-focus.png).

## Kiểm tra

Đã đạt 39 nhóm kiểm thử trình duyệt: mobile-polish 4, requested-ui 7, academic-lab 9, flow-emphasis 8, regression 11. Bộ đối chứng thuật toán đạt 320 trace, 6400 trạng thái và 240 lần tiếp tục.

Kiểm tra bổ sung đã xem đủ 5 demo ở 1366/768/390px, cả hai theme. Nhãn tiến trình trong 30 trạng thái của chế độ RAM trống đạt tương phản tối thiểu khoảng 4,72:1 ở nền sáng và 7,85:1 ở nền tối. Dấu focus của dòng đang chọn hiện đường viền 3px trong cả hai theme.

[Kết quả kiểm tra giao diện](review/polish/results.json) · [Kết quả tương phản](review/polish/contrast-results.json). Không bật axe trong lần chạy này; số tương phản lấy từ màu tính được trong trình duyệt.

```sh
node tests/mobile-polish.cjs
node tests/requested-ui.cjs
node tests/academic-lab.cjs
node tests/flow-emphasis.cjs
node tests/regression.cjs
node tests/seeded-algorithms.cjs
```
