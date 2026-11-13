# Rà soát độc lập năm demo

Đối tượng: giao diện học công khai và các snapshot thuật toán của bản nền `41ca1de`. Kiểm tra bằng Chromium thực qua Python Playwright, truy cập HTTP cục bộ. Không thay engine trong quá trình rà soát.

## Kết quả nội dung và trạng thái

| Demo | Các trường hợp đã trực tiếp chạy | Kết quả |
|---|---|---|
| Bảo vệ địa chỉ | Base=100, Limit=40, A=99/100/139/140; miền `[0,1)` | Đạt: đúng hai cận, cận trên không bao gồm dấu bằng. |
| Cấp phát | Lỗ 3/6/4 KB, yêu cầu 4 KB, cả First/Best/Worst-fit | Đạt: chọn lần lượt lỗ 2/3/2; RAM chỉ giảm đúng 4 KB khi tới bước cấp. |
| Phân trang | LA=13 với cỡ trang 4/8/16; TLB trống và TLB đã có bản dịch | Đạt: đúng p/d/f/PA; TLB miss không tăng page fault khi trang đã có trong RAM. |
| Bộ nhớ ảo | Còn khung trống, trang đã có sẵn, RAM đầy | Đạt: dữ liệu vào RAM trước khi PTE được cập nhật; Lùi phục hồi đúng trạng thái; thử lại chỉ tính một fault; hit không đọc đĩa; FIFO đầy cho RAM `[3,1]`. |
| Thay thế trang | Toàn bộ các sự kiện của chuỗi 1/2/3/1/4/2 với 3 khung và cả bốn thuật toán | Đạt: từng ô RAM trên hình khớp snapshot; hàng FIFO khớp thời điểm nạp, hàng LRU khớp lần dùng; không hiện dấu chọn nạn nhân trước pha quyết định. |

Với chuỗi ngắn trên, kết quả trực tiếp: FIFO 4 fault/2 hit, LRU 5/1, OPT 4/2, Clock 4/2. Đây là ví dụ minh họa; không thay thế chuỗi đối chứng 20 tham chiếu trong giáo trình.

Các chiều rộng 375, 390, 768 và 1366px: cả năm demo không gây tràn ngang toàn trang. Không có lỗi JavaScript trong các luồng kiểm tra này.

## Vấn đề phát hiện

**Nhãn ví dụ có thể không khớp dữ liệu tự nhập.** Trên bản nền, sau khi đổi A từ 125 sang 140, bộ chọn Ví dụ vẫn ghi “125 · nằm trong vùng”. Sau khi chọn chuỗi giáo trình rồi nhập `1 1`, bộ chọn vẫn ghi “Chuỗi kiểm chứng trong giáo trình”. Engine xử lý dữ liệu mới đúng, nhưng nhãn cũ dễ gây hiểu sai về bài đang xem. **Đã sửa:** dữ liệu tự nhập có nhãn “Ví dụ tự nhập”; chọn lại mẫu trả về đúng nhãn. Đã kiểm thử cả Demo 1 và Demo 5, bao gồm Làm lại và đổi thuật toán.

## Tiêu chí cho phần giải thích mở/thu gọn

1. Mở hoặc đóng không đổi snapshot, vị trí bước, bộ đếm, hàng đợi hay kim.
2. Khi đóng và bấm Bước tiếp, vùng này vẫn đóng; dòng bước hiện tại vẫn được cập nhật.
3. Mở lại phải giải thích đúng bước đang xem, không quay về bước đầu.
4. Lựa chọn mở/đóng riêng của từng demo được giữ khi chuyển tab, đổi ví dụ hoặc Làm lại.
5. Chọn bước đã xem phải phục hồi đúng snapshot của bước đó và dừng tự chạy; không chạy lại hoặc thêm tham chiếu.
6. Không cho lịch sử tiết lộ các bước chưa diễn ra.
7. Nhãn “Không giới hạn” cần được giải thích theo bộ nhớ ảo và tái sử dụng khung; tài nguyên vật lý vẫn hữu hạn.

Đây là kiểm chứng triển khai và nội dung theo các trường hợp nêu trên, không phải phép thử với học sinh hoặc tuyên bố chứng minh hình thức cho mọi dữ liệu tùy ý.


## Kết quả kiểm tra bản cập nhật giao diện

`tests/interface_browser.py` đã hoàn tất **8 nhóm đạt**, 0 JavaScript page error. Trên cả 5 demo, đã kiểm tra thao tác bàn phím mở/thu gọn, trạng thái mở riêng theo demo, nội dung theo đúng bước mới và việc mở/đóng không thay đổi snapshot. Danh sách bước chỉ có các bước đã xem; chọn lại phục hồi đúng snapshot, không tạo scenario mới và dừng tự chạy. Làm lại đặt danh sách đã xem về bước đầu.

Đã xác minh thao tác xem lại không chạy được khi đề đang sửa hoặc sai dữ liệu; khôi phục mẫu hợp lệ mở lại các nút. Các nhãn chủ đề đúng ánh xạ và có chú giải RAM hữu hạn. Cả 5 demo khi mở và đóng lời giải không tràn ngang ở 375, 390, 768 và 1366px.

Tính từ màu kết xuất thực tế: nhãn An toàn 5,69:1, Hiệu quả 5,87:1, Không giới hạn 5,89:1 (trên nền nhãn nhạt; nền nhãn trắng khi chọn còn cao hơn). Nút chính trắng/violet đạt 5,39:1. Các con số này áp dụng cho những thành phần đã kiểm tra, không phải tuyên bố mọi thành phần đạt đầy đủ WCAG.

Bộ nội dung công khai `tests/lessons_browser.py` cũng đạt **11 nhóm**, bộ view giữ nguyên trạng thái đạt 24 chuyển trạng thái, và bộ đối chiếu độc lập đạt 320 trace / 6.400 trạng thái / 240 lần tiếp tục từ snapshot.
