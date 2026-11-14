# Rà soát giảng dạy: ít thao tác, thấy rõ nguyên nhân

Mục tiêu của lần tinh giản: giữ **5 demo**, mỗi demo trả lời một câu hỏi; nhìn thấy yêu cầu, nơi đang xử lý và thay đổi trong RAM. Không dùng nhiều bảng giải thích để bù cho một hình chưa rõ.

## Tài liệu thực sự đối chiếu

Các PDF không còn trong working tree hiện tại. Đã khôi phục bản đọc từ thư mục `tai lieu/` của commit `b1a6f98` vào `/tmp/memory-course/`, trích bằng `pdftotext`; không đưa tài liệu nặng trở lại repository.

| Nguồn đã đọc | Căn cứ sử dụng |
|---|---|
| Silberschatz, Galvin, Gagne, *Operating System Concepts*, 10th ed. (2018), §9.1.1, hình 9.2, trang in 351–352 | Base là địa chỉ vật lý nhỏ nhất; Limit là kích thước. Cận dưới gồm dấu bằng, cận trên không gồm. Trap khi sai một điều kiện. |
| Cùng sách, §9.2.2–9.2.3, trang in 358–359 | First-fit dừng tại lỗ đủ đầu tiên; Best-fit chọn lỗ đủ nhỏ nhất; Worst-fit chọn lỗ lớn nhất. Hai thuật toán sau quét hết danh sách chưa sắp. Tổng trống đủ nhưng không có vùng liên tục mới gọi là phân mảnh ngoài. |
| Cùng sách, §9.3.2.1, hình 9.12, trang in 365–367 | TLB giữ bản dịch, không giữ dữ liệu trang. Miss phải tra bảng trang nhưng chưa kết luận lỗi trang. Hit vẫn đọc dữ liệu RAM. |
| Cùng sách, §10.2.1, hình 10.5, trang in 394–395 | Kiểm tra truy cập hợp lệ; lấy khung; đọc trang; **sau khi đọc xong** mới cập nhật bảng trang; chạy lại lệnh đã bị ngắt. |
| Cùng sách, §10.4.2–10.4.5.2, trang in 404–410 | FIFO xét thời điểm nạp; LRU xét lần dùng cuối; OPT biết chuỗi tương lai; Clock kiểm tra R rồi xóa R/chuyển kim hoặc chọn R=0. |
| Bài giảng Nguyên lý HĐH — Phạm Quang Dũng, slide 8.21–8.22, 9.29–9.30 | Đối chiếu tiếng Việt về fit, phân mảnh và cơ hội thứ hai. |
| Bài giảng Hệ điều hành — PGS.TS. Ngô Như Khoa, phần thay trang/LRU, trang in 104–105 | Phân biệt thứ tự nạp với thứ tự truy cập gần nhất; dùng lại một trang phải cập nhật lần dùng của LRU. |

## Kết luận về thuật toán hiện có

`simA`, `simR` và các bộ tạo sự kiện trong `assets/js/teaching.js` giữ được các quy tắc trên. Chạy `node tests/seeded-algorithms.cjs`: **320 trace, 6.400 trạng thái và 240 trường hợp tiếp tục từ snapshot đều đạt**. Đây là bằng chứng cho phần đã kiểm tra, không phải khẳng định mọi cấu hình có thể có đều đúng tuyệt đối.

Lớp trình bày cần đọc snapshot hiện tại thay vì tự tính một đáp án khác. Đặc biệt, ở bước **chọn trang ra**, RAM vẫn giữ trang cũ; chỉ bước **nạp trang mới** mới thay nội dung. Lùi bước phải khôi phục cả RAM lẫn bằng chứng chọn trang.

## Những điểm gây rối và hướng sửa

- Nhiều khu giải thích, thuật ngữ, trụ cột, lịch sử và tùy chọn lặp cùng một thông tin: màn hình chính chỉ giữ câu hỏi, sơ đồ, một câu “vì sao” và điều khiển bước.
- Dòng nhãn “Không giới hạn” dễ khiến người mới hiểu RAM vô hạn. Không cần dùng làm thông điệp chính; RAM và khung luôn hữu hạn.
- Không được xếp lại các ô RAM như thể đó là hàng đợi. **Vị trí khung** và **thứ tự ưu tiên loại** là hai dữ liệu riêng; đánh dấu rõ đầu nào ra trước và đầu nào vừa vào.
- FIFO dễ bị hiểu thành “vừa dùng sẽ đứng cuối”: phải minh họa một lần Hit mà hàng đợi **không đổi**.
- LRU cần thể hiện điều ngược lại: dùng lại trang làm thay đổi thứ tự lần dùng, dù RAM không đổi.
- Mỗi bước chỉ tô nổi một việc đang diễn ra. Không làm sáng cả đường đi tương lai hoặc cho thấy kết quả trước khi tới bước quyết định.
- Trang/Frame luôn có nhãn đi kèm cách nói đơn giản “trang dữ liệu/ngăn RAM”; không dùng phép ví von làm thay đổi ý nghĩa thật.

## Ví dụ ngắn cần nhìn là kiểm tra được

| Demo | Ví dụ dễ theo dõi | Điều học sinh phải trả lời được |
|---|---|---|
| Bảo vệ địa chỉ | Base=100, Limit=40; A=125 được phép, A=140 bị chặn | Vì sao 139 còn ở trong mà 140 ở ngoài? |
| Cấp phát | Lỗ trống theo địa chỉ: 3, 6, 4 KB; cần 4 KB | First-fit chọn 6 vì gặp đủ trước; Best-fit chọn 4 vì vừa nhất; Worst-fit chọn 6 vì lớn nhất. |
| Phân trang | LA=13, cỡ trang=4, trang 3 → khung 2 | 13=3×4+1; PA=2×4+1=9. Số trang đổi, độ lệch 1 giữ nguyên. |
| Bộ nhớ ảo | RAM 2 khung, đọc 3 rồi 1 rồi 3 | Hai lần đầu cần nạp; lần cuối đã có, không nạp lại. Lỗi trang không phải truy cập sai quyền. |
| Thay thế | 3 khung, chuỗi 1 2 3 1 4 2 | Trước khi cần 4: FIFO loại 1 vì **nạp sớm nhất**, LRU loại 2 vì **lâu chưa dùng nhất**. |

Với ví dụ thay thế trên: lần dùng lại 1 không đổi FIFO `[1,2,3]`; LRU theo chiều lâu nhất → vừa dùng trở thành `[2,3,1]`. OPT xét chuỗi phía sau: trang không được dùng lại có ưu tiên loại trước trang sắp dùng; nếu hòa, dùng quy tắc chỉ số khung nhỏ nhất và ghi rõ. Clock: R=1 → hạ 0 và đi tiếp; R=0 → chọn; Hit đặt R=1 nhưng không làm kim tự quay.

## Tiêu chí nghiệm thu sư phạm

1. Nhìn màn hình đầu tiên biết bài toán muốn giải quyết điều gì, không cần mở từ điển trước.
2. Mỗi lần Bước tiếp trả lời được: **đang xét gì → vì sao → thay đổi gì**.
3. Chọn nạn nhân và nạp trang là hai thời điểm phân biệt; bằng chứng của FIFO/LRU/OPT/Clock khớp snapshot.
4. Trang có sẵn không tăng Page Fault; nạp vào khung trống không gọi là thay thế; đọc lại sau fault không đếm thêm một tham chiếu.
5. Quay lại một bước trả RAM, hàng đợi/kim và lời giải về cùng trạng thái.
6. Tự chạy có thể dừng ngay. Màn hình hẹp không mất nhãn hoặc điều khiển; màu luôn có chữ trạng thái.
7. Bảng so sánh, thông số máy thật, tùy chỉnh sâu và lý thuyết dài không chen vào vùng quan sát chính.

Các ví dụ số nhỏ là **minh họa giảng dạy**; bộ mẫu 20 tham chiếu chuẩn vẫn là đối chứng FIFO=15, LRU=12, OPT=9. Không gọi ví dụ tự chọn là nguyên văn giáo trình.


## Kiểm chứng bản tinh giản

- Thuật toán thay trang: 320 trace / 6.400 trạng thái, 240 lần tiếp tục từ snapshot đối chiếu với triển khai tham chiếu độc lập.
- View Demo 5: 24 chuyển trạng thái thật, tách FIFO/LRU, chứng cứ OPT/Clock, không công bố nạn nhân trước bước chọn, không sửa snapshot.
- Giao diện công khai: 11 nhóm kiểm thử Chromium đạt, gồm cả 5 demo, 375/390px, landscape, bàn phím, giảm chuyển động, nhập sai/khôi phục và tạm dừng khi đổi tab.
- Luồng giáo trình sâu: 9 nhóm đạt; xác nhận TLB miss không phải fault, ghi trang dirty trước đọc trang mới, PTE sau I/O, khung bị thay chính xác và lùi khôi phục trạng thái.
- Các trình nhập cũ được kiểm tra qua đường chẩn đoán; không đưa trở lại giao diện người học. Cập nhật fixture để mở các mục thu gọn và dùng kịch bản ẩn bằng API DOM; các assertion nội dung/trạng thái vẫn giữ. Assertion bảng telemetry cũ được thay bằng bảo toàn tổng dung lượng phân đoạn, vì bảng này đã được loại bỏ.
- Bước CPU dùng dữ liệu sau xử lý lỗi trang đi trực tiếp CPU → RAM; không vẽ đường đọc thường xuyên qua OS/đĩa.

Các trường hợp trên xác nhận triển khai và nội dung được kiểm tra; không phải tuyên bố chứng minh hình thức cho mọi cấu hình tùy ý.

## Bổ sung mức vừa phải và phạm vi mô phỏng

Giao diện hiện duyệt đầy đủ sự kiện engine, nhưng số sự kiện không phải số lệnh máy. Các thao tác đang gộp: Demo 3 nạp trang+cập nhật PTE; Demo 4 chọn khung trống+nạp và thử lại+hoàn tất đọc/ghi. Clock trong Demo 4 tổng hợp việc tìm nạn nhân; Demo 5 mới tách lần xét/hạ R. Mô hình không diễn tả chu kỳ CPU, cache dữ liệu, DMA, ngắt hoàn tất I/O hoặc lập lịch tiến trình.

Các mẫu mở sẵn mới dùng dữ liệu nhỏ với nhiều nhánh hơn; mẫu làm quen vẫn giữ để đối chiếu. Demo 1 bổ sung dịch L→PA, Demo 2 xử lý ba yêu cầu trên bốn lỗ, Demo 3 có page fault thật, Demo 4 phối hợp dirty writeback/miss/hit, Demo 5 bắt đầu từ RAM đầy. Khi có RAM ban đầu, thứ tự nạp/dùng được cho rõ, không suy từ vị trí khung. Chỉ ví dụ dirty mới thêm bảng PTE gọn, bit D và I/O để thấy nguyên nhân ghi lại trang.
