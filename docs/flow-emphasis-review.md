# Mũi tên và bước đang thực hiện

Bản bổ sung trên `design/memory-workbench`, dựa trên `4f0ccee` và giữ các cập nhật giao diện của nhánh. Luồng và thuật toán giữ nguyên; thay đổi tập trung vào vị trí bắt đầu, bước hiện tại, hướng di chuyển và biểu mẫu cơ bản.

## Thay đổi nhìn thấy

| Phần | Cách trình bày |
|---|---|
| Bước đầu | Số bước và nhãn “Bắt đầu tại đây”; thành phần bắt đầu có khung nổi bật |
| Đang chạy | Viền 3px, màu nền theo thao tác, mũi tên liền 4px và đầu mũi tên rõ ngay khi bấm |
| Luồng tổng thể | Mũi tên nền giữ màu trung tính; chỉ đường đang thực hiện dùng màu nổi bật |
| Nhập Demo 1 | Mặc định chỉ Base, Limit, địa chỉ và nút kiểm tra; phần đổi chế độ/ví dụ có thể mở thêm |
| Chọn trang ra | Số thứ tự trên khung RAM và bằng chứng chọn trang, tách khỏi thao tác nạp trang mới |

Giải thích chi tiết vẫn nằm dưới mô hình và do người dùng mở. Không thêm ảnh phần cứng để thay cho luồng hoạt động.

## Hướng mũi tên theo thao tác

- **Demo 1:** CPU → kiểm tra cận dưới → kiểm tra cận trên/bộ cộng → RAM khi được phép. Khi cận dưới hoặc độ lệch sai, đường trap bắt đầu từ đúng phép kiểm tra bị lỗi và vòng ngoài cận trên/bộ cộng bị bỏ qua để tới hệ điều hành. RAM vẫn khóa; trên điện thoại đường này không cắt qua cổng RAM.
- **Demo 2:** yêu cầu tiến trình → lỗ đang xét/được chọn. Chọn vùng và ghi tiến trình vào RAM là hai thao tác riêng.
- **Demo 3:** tra cứu đi qua TLB/bảng trang theo trạng thái. Bước điền TLB có hướng **bảng trang → TLB**. TLB hit đi thẳng tới phần tính địa chỉ vật lý. Khi đọc xong, RAM trả dữ liệu về CPU.
- **Demo 4:** ghi trang bẩn có hướng **RAM → đĩa**; nạp trang mới có hướng **đĩa → RAM**. Cập nhật bảng trang diễn ra sau nạp, với mũi tên riêng.
- **Demo 5:** FIFO đánh số thứ tự nạp, LRU đánh số thứ tự lần dùng; vị trí 1 có mô tả “Nạp sớm nhất” hoặc “Lâu chưa dùng nhất”. Bước chọn trang giữ nguyên nội dung RAM. Bước nạp sau đó mới vẽ bộ nhớ phụ → khung được chọn. Clock vẫn theo từng lần xét/hạ bit/chọn khung.

Mũi tên là chú giải cho thao tác đang quan sát trong snapshot, không phải một chu kỳ CPU hay mô phỏng bus phần cứng.

## Ảnh kết quả

| Trạng thái | Ảnh |
|---|---|
| Demo 1, bước đầu và form cơ bản | [Bắt đầu tại CPU](review/flow-emphasis/demo1-first.png) |
| Demo 1, bỏ qua cận trên | [Trap đi từ cận dưới tới OS](review/flow-emphasis/demo1-denied.png) |
| Demo 1, điện thoại | [Đường đi vòng ngoài RAM](review/flow-emphasis/demo1-mobile.png) |
| Demo 2 | [Đang chọn vùng](review/flow-emphasis/demo2-selection.png) |
| Demo 3, điền TLB | [Bảng trang → TLB](review/flow-emphasis/demo3-refill.png) |
| Demo 3, TLB hit | [Bỏ qua bảng trang](review/flow-emphasis/demo3-hit.png) |
| Demo 4, ghi lại | [RAM → đĩa](review/flow-emphasis/demo4-write-back.png) |
| Demo 4, nạp trang | [Đĩa → RAM](review/flow-emphasis/demo4-page-in.png) |
| Demo 5, chọn trang | [Thứ tự FIFO](review/flow-emphasis/demo5-fifo-selection.png) |
| Demo 5, nạp trang | [Bộ nhớ phụ → khung RAM](review/flow-emphasis/demo5-page-in.png) |

## Cấu trúc

`StudioBase` dựng lại phần trình bày Demo 1 và tính vị trí đường nối trong chính bảng mô phỏng. `studio-flow.js` đọc `MemoryTeaching.event/snapshot/position` rồi đánh dấu nguồn/đích và vẽ đường cho các demo còn lại. Phép tính, trace, dữ liệu RAM, bảng trang và thứ tự chọn của engine không đổi.

Các bộ kiểm thử cũ mở phần tùy chọn bằng summary trước khi dùng chế độ/preset. Bộ `flow-emphasis.cjs` kiểm tra riêng trạng thái mặc định thu gọn và biểu mẫu cơ bản.

## Kiểm tra

Chạy các bộ trong README với máy chủ cổng 8080. Bộ mới:

```sh
node tests/flow-emphasis.cjs
MEMORY_AXE_PATH=/path/to/axe.min.js node tests/flow-emphasis.cjs
```

Bộ mới kiểm tra nguồn/đích và vị trí đầu mũi tên; các trường hợp trap, điền TLB, hit, ghi trang bẩn, nạp trang; chọn FIFO trước khi thay dữ liệu; Lùi/Tiếp, thay đổi kích thước, sáng/tối và giảm chuyển động. Biến `MEMORY_AXE_PATH` bật thêm kiểm tra tự động WCAG A/AA.

Kết quả và ảnh được lưu cùng nhánh để đối chiếu: [luồng nổi bật](review/flow-emphasis/results.json), [giao diện sáng/tối](review/flow-emphasis/accessibility-results.json).

Đã đạt 9 nhóm kiểm tra luồng nổi bật (có axe), 59 nhóm của các bộ trình duyệt hiện có, cùng 320 trace/6400 trạng thái/240 lần tiếp tục của bộ đối chứng thuật toán. Không có lỗi JavaScript hoặc tài nguyên bị thiếu. Đã xem ảnh thực tế máy tính/điện thoại và kiểm tra tự động sáng/tối; các phép quét tự động không thay thế toàn bộ đánh giá accessibility.
