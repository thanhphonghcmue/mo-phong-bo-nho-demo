# Rà soát font trên cả năm demo

Bản nền: `9f64542`. Giữ Be Vietnam Pro vì hỗ trợ dấu tiếng Việt tốt và khớp phong cách học thuật hiện có. JetBrains Mono dùng cho số liệu, địa chỉ và công thức; lời giải, tên bước, nhãn và nút dùng chữ sans dễ đọc.

## Điều chỉnh

| Vai trò | Cỡ mặc định | Độ đậm / khoảng cách dòng |
|---|---|---|
| Nội dung và lời giải | 16px | 400, line-height 1.6–1.7 |
| Nhãn, tên bước, nút | 14px | 500–600, line-height 1.5–1.6 |
| Chữ phụ, bit, tên khung | Từ 12px | 400–600, line-height 1.5–1.6 |
| Tiêu đề | 20–22px | 600–700 |
| Số liệu trọng tâm | 28–36px | 700, số thẳng cột |

Các mức được đặt bằng token `rem` trong `teaching-scenes.css`, để tôn trọng cỡ chữ trình duyệt. Gỡ các mức chữ nhỏ 9–11px trong phần đọc; chỉ con trỏ tam giác trang trí có cỡ 10px. Chuẩn hóa các nhãn cũ, bảng tùy chọn, lịch sử, Base/Limit và chú thích RAM vào cùng hệ chữ. Giảm các phần in hoa/giãn chữ không cần thiết và chữ đậm 800.

Bổ sung hai WOFF2 Medium 500 (Latin và Vietnamese) từ cùng gói Fontsource 5.2.8 có giấy phép OFL đang dùng. Không yêu cầu font ngoài khi mở web. Tắt font synthesis để không tạo nét đậm/nghiêng giả.

Nội dung, thuật toán và controller không đổi. Tăng khoảng trống cần thiết để nhãn lớn hơn không bị cắt; trên điện thoại RAM của Demo 3 dùng ba cột và pipeline vẫn theo chiều dọc.

## Kiểm tra

- Đọc font computed và rà ảnh của **cả 5 demo**, gồm mở lời giải. Ở các trạng thái khảo sát, không còn chữ đọc dưới 12px hay độ đậm 800; ngoại lệ con trỏ trang trí được ghi rõ.
- `academic-lab.cjs`: **PASS 9 nhóm**, gồm 1920×1080, 1366×768, 768×1024, 390×844, 375×844; mở/đóng lời giải, tăng chữ và snapshot.
- axe-core 4.10.3: không phát hiện vi phạm trong **10 lượt quét sáng/tối** của các trạng thái kiểm tra. Các mục incomplete vẫn được lưu để rà thủ công, không coi đây là chứng nhận toàn bộ WCAG.
- `custom-problems.cjs`: **PASS 13 nhóm**; địa chỉ lớn và dữ liệu tự nhập không tràn màn hình.
- Be Vietnam Pro Medium đã tải đúng; không có lỗi JavaScript trong lượt đo font.

[Chi tiết trước](review/typography/before.json) · [Chi tiết sau](review/typography/after.json) · [Kết quả nghiệm thu](review/typography/acceptance.json).

## Ảnh so sánh

| Mẫu | Trước | Sau |
|---|---|---|
| Dịch địa chỉ và lời giải | [Xem](review/typography/x-before.png) | [Xem](review/typography/x-after.png) |
| RAM, bằng chứng và lời giải | [Xem](review/typography/r-before.png) | [Xem](review/typography/r-after.png) |

[Điện thoại 390px](review/typography/x-mobile.png).

Đã kiểm bằng Chromium. Chưa thử trực tiếp máy chiếu hoặc Safari/iOS. Tên miền GitHub Pages vẫn bị giới hạn truy cập từ môi trường; bản kiểm tra được render trên static server cục bộ.
