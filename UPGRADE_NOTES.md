# Nâng cấp mô phỏng phục vụ giảng dạy — 02/11/2026

Nhánh: `feat/teaching-visualizations`. Nâng cấp trực tiếp website tĩnh hiện có; không thêm framework, backend hay dependency chạy ứng dụng.

## Tài liệu ưu tiên

- `tai lieu/DAC_TA_CAI_TIEN_WEB_DEMO_QUAN_LY_BO_NHO.docx`: đặc tả triển khai được cung cấp.
- `tai lieu/He_dieu_hanh_Part4.pdf`: đã đối chiếu 34 trang; các ví dụ chính ở tr.5, 8–9, 13–15, 23–24, 27–29.
- Các tài liệu cũ, README và mã nguồn hiện hành được giữ lại.

## Tệp và cách tích hợp

- `index.html`: nạp lớp mới và adapter; giữ CSS gốc, quy tắc Base/Limit và `simA`. Planner phân trang và `simR` được mở rộng bằng tham số tùy chọn cho kích thước trang/TLB và RAM ban đầu; thêm kiểm tra thiếu khung trống. Dung lượng RAM/kịch bản cấp phát được tham số hóa, giữ nguyên cách chọn/đặt/giải phóng/dồn nén. Kết quả mặc định được kiểm thử hồi quy.
- `teaching.js`: sự kiện, snapshot độc lập, timeline, điều khiển, SVG Clock, luồng dữ liệu và bộ dựng mô hình. Sự kiện có scenarioId, stepId, beforeState, state (sau bước), điều kiện, actor, quyết định và trạng thái. Snapshot chứa dữ liệu thật, không chỉ lời giải thích.
- `teaching.css`: CSS bổ sung với tiền tố `teach-`; chỉ thêm containment cho cột telemetry trên màn hình nhỏ.
- `tests/regression.cjs`: kiểm thử Chromium qua Playwright, gồm bộ tham chiếu độc lập cho 20 trạng thái thay trang.

## Cập nhật đề bài tùy chỉnh

Xem [CUSTOM_PROBLEMS.md](CUSTOM_PROBLEMS.md) để nhập đề mới ở cả 5 demo. Các form áp dụng nguyên tử: lỗi không đổi trạng thái; Reset dùng cấu hình đã áp dụng. Demo 1 nhận Base/A=0 chính xác và thử biên theo số liệu hiện tại. Demo 4 có đọc/ghi, chuỗi tham chiếu và FIFO/LRU/Clock; Demo 5 nhận RAM có sẵn trang và bit/kim ban đầu. Lời giải thích rút gọn; phần vì sao/bước tiếp được mở khi cần.

## Các phần đã triển khai

1. Demo 1: giữ nguyên mô hình, các biên, dữ liệu mẫu, logic và lời giải thích gốc; bổ sung timeline, snapshot, tốc độ, bật/tắt hiển thị.
2. Demo 2: quét từng lỗ theo First/Best/Worst-fit; First-fit dừng sớm; hiển thị phép so sánh, địa chỉ và dư. Cả chế độ RAM trống, bài tập có lỗ, mở/tắt thủ công, gộp lỗ và compaction đều được giữ. Compaction có RAM và địa chỉ trước/sau.
3. Demo 3: CPU/MMU/TLB ở phía xử lý; Page Table nằm trong RAM. TLB miss được tách khỏi page fault. Trạng thái TLB/PTE chỉ commit ở sự kiện tương ứng; có hai mẫu 10000→22288 (4 KB) và 13→9 (4 B).
4. Demo 4: luồng trap, OS, I/O đọc/ghi, bảng trang, RAM và chạy lại lệnh. Mẫu fault có khung trống đúng sáu bước theo tr.24. Có mẫu RAM đầy sạch/dirty dùng FIFO từ `simR`, ngoài miền và không có quyền. RAM, PTE, free list, hit/fault, I/O thay đổi thực sự và quay lui được. Khi đổi yêu cầu trước khi giao dịch hoàn tất, hủy giao dịch dở và khôi phục nền đầu giao dịch; không để trang mồ côi.
5. Demo 5: giữ engine và biểu đồ so sánh; thêm bằng chứng FIFO/LRU/OPT, Page-in và vòng Clock SVG với từng lần kiểm tra R, hạ bit và chuyển kim. Dữ liệu và bộ đếm hiện hành thay vì tổng tương lai được hiển thị trong telemetry.
6. Dùng chung: lịch sử có thể nhấn để phục hồi, tiếp tục từ bước cũ; autoplay dùng cùng timeline, pause không thêm bước; Reset xóa lịch sử phiên; năm tùy chọn hiển thị và tốc độ 0,5×/1×/1,5×/2×. Mũi tên nối thành phần thật, nét đứt cho điều khiển/trap và màu/nhãn riêng cho đọc RAM, page-in, page-out; tôn trọng reduced-motion.

## Chạy và kiểm thử

```bash
# Từ thư mục checkout
python3 -m http.server 8080 --bind 0.0.0.0
# Terminal khác, môi trường có Playwright và Chromium
node tests/regression.cjs
node tests/custom-problems.cjs
node tests/seeded-algorithms.cjs
```

Không cần npm install để chạy ứng dụng. Playwright và `/usr/bin/chromium` đã có trong cloud hiện tại; có thể đặt `CHROMIUM_PATH` cho máy khác. Kiểm thử ghi kết quả JSON tại `/workspace/artifacts/memory-demo/test-results.json`.

Kết quả đã chạy: 11 nhóm hồi quy và 13 nhóm đề tùy chỉnh đạt; 320 trace/6.400 trạng thái và 240 ca tiếp tục từ snapshot khớp bộ tham chiếu; không có lỗi JavaScript. Bao gồm biên Base/Limit, sáu bước fault với PTE cập nhật sau I/O, hit không I/O, dirty mới ghi, denied không page-in, TLB miss không fault, hai mẫu dịch địa chỉ, cả 20 trạng thái của FIFO/LRU/OPT/Clock (15/12/9/14 fault), vi bước Clock, snapshots/lịch sử, toggle không đổi kết quả, pause, Belady 9→10, cả ba chiến lược cấp phát, compaction, thao tác thủ công, nhập sai, đổi kịch bản, responsive và sáng/tối.

## Quy ước và giới hạn

- Demo 4 là mô hình giả định: mẫu mặc định có 8 trang; mẫu RAM đầy mở rộng 12 trang trên 8 khung để tạo thay trang có ý nghĩa. Trang 7 trong mẫu phân quyền bị từ chối; có nhãn riêng. FIFO là chính sách mặc định của mẫu RAM đầy; đề tự nhập có thể chọn LRU/Clock, thứ tự ban đầu, bit R và kim. Thao tác STORE đặt dirty khi ghi RAM.
- Demo 5 là mô hình trang sạch/chỉ đọc: thay trang không vẽ I/O ghi giả. Ghi dirty được minh họa riêng ở Demo 4.
- Bảng trang được vẽ nằm trong RAM theo mục đích sư phạm; các khung dữ liệu không tính dung lượng bảng trang thành một bộ cấp phát thứ hai.
- Thời gian thuật toán là thời gian xây dựng trace/sự kiện bằng performance.now; không phải độ trễ phần cứng MMU/SSD. Thời gian render đo cập nhật DOM, không phải FPS/GPU. API trình duyệt không cho đo CPU/RAM toàn máy; mục này vẫn ghi không khả dụng.
- Lịch sử trong bộ nhớ phiên trình duyệt, không lưu lâu dài qua reload. Sự kiện tương lai chỉ xuất hiện trong lịch sử sau khi người dùng chạy đến.
- Chưa mở rộng COW, Buddy/Slab, Thrashing vì ngoài phạm vi ưu tiên 5 demo. Chưa kiểm thử Firefox/Safari, chưa đẩy lên GitHub hay xuất bản GitHub Pages.

Bản cập nhật đề tùy chỉnh, ảnh và kết quả kiểm thử ở `/workspace/artifacts/memory-demo-custom/`.

Ảnh trước/sau, ảnh chi tiết Page-in/Clock, ảnh điện thoại/sáng tối và báo cáo Word được lưu tại `/workspace/artifacts/memory-demo/`.
