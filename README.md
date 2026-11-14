# Khám phá bên trong bộ nhớ

Web tĩnh phục vụ bài học Hệ điều hành, Khoa CNTT – Trường Đại học Sư phạm TP.HCM. Mục tiêu: **thấy thuật toán đang làm gì, hiểu vì sao, rồi quan sát kết quả**.

[Website trên GitHub Pages](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/)

## Năm demo, mỗi demo một câu hỏi

| Demo | Câu hỏi | Điều cần thấy |
|---|---|---|
| 1. Bảo vệ địa chỉ | Địa chỉ này có được vào RAM? | Hai cận của vùng được cấp; đạt cả hai mới được truy cập. |
| 2. Tìm chỗ trống | Chỗ nào đủ đặt chương trình? | Xét từng lỗ → chọn theo First/Best/Worst-fit → cấp và tính phần dư. |
| 3. Tìm địa chỉ thật | Byte cần tìm ở khung nào? | Tách trang/vị trí → tra TLB hoặc bảng trang → giữ vị trí, đổi số khung. |
| 4. Nạp trang vào RAM | Trang chưa có thì làm gì? | CPU chờ → OS nạp từ đĩa → cập nhật bảng trang → chạy lại lệnh. |
| 5. Chọn trang ra | RAM đầy, ai nhường chỗ? | Thứ tự và bằng chứng riêng cho FIFO, LRU, OPT, Clock. |

Mỗi demo chỉ có một hình chính và bốn nút **Lùi / Bước tiếp / Tự chạy / Làm lại**. Thanh điều khiển và tên bước bám mép dưới màn hình khi quan sát mô hình dài. Bấm **Mở giải thích** để xem lý do và bước tiếp theo, hoặc **Thu gọn giải thích** để tập trung vào mô hình. Lựa chọn được giữ riêng cho từng demo khi chuyển tab, đổi ví dụ hoặc Làm lại. Trong phần giải thích, **Các bước đã xem** cho phép quay lại một bước đã thực hiện; không hiển thị trước các bước tương lai.

Chuyển tab tự dừng chạy. Chỉ khi cần mới mở **Tự đổi ví dụ**. Các số liệu tự nhập được gắn đúng nhãn **Ví dụ tự nhập**, không còn mang tên mẫu cũ. Có điều khiển tab bằng trái/phải, Home/End và mở lời giải bằng Enter/Space; hỗ trợ màn hình nhỏ, focus bàn phím và giảm chuyển động.

Nhãn mục đích theo đúng bài học:

- Demo 1: **AN TOÀN**, màu đỏ.
- Demo 2–3: **HIỆU QUẢ**, màu xanh dương.
- Demo 4–5: **KHÔNG GIỚI HẠN**, màu xanh lá; nghĩa là bộ nhớ ảo/tái sử dụng khung, **RAM thực tế vẫn hữu hạn**.

Giao diện dùng nền sáng ấm, chữ trung tính, nút chính violet và vàng nhạt cho vị trí đang xử lý. Thành công vẫn xanh lá, từ chối/chọn ra vẫn đỏ và luôn có chữ trạng thái. Xem [căn cứ thiết kế từ UI UX Pro Max và Radix](docs/DESIGN_REFERENCES.md).

Mặc định dùng số nhỏ để quan sát. Đây là **ví dụ minh họa**, không phải số liệu đo từ máy thật. Ở Demo 5 vẫn có chuỗi chuẩn giáo trình và Belady để kiểm chứng. Trang/khung, địa chỉ logic/vật lý được phân biệt ngay trong hình.

Mô hình dùng hình minh họa CPU, thanh RAM và SSD theo hình dáng linh kiện ngoài đời, kèm lớp dữ liệu màu để theo dõi từng bước. Bộ ảnh `assets/images/hardware/parts.png` được tạo bằng AI, không phải ảnh chụp hoặc dữ liệu phần cứng từ máy người dùng. Vùng/trang/khung là lớp mô phỏng logic; **một chip thật trên thanh RAM không tương ứng một khung**. GPU chỉ nằm trong mục nhận diện linh kiện tùy chọn và không tham gia năm thuật toán. Lần cập nhật này thay phần trình bày, giữ nguyên engine.

## Vì sao trang đó ra trước?

Với `1 2 3 1 4 2`, ba khung:

- **FIFO:** sau khi dùng lại trang 1, hàng nạp vẫn là `1 → 2 → 3`. Khi cần trang 4, trang **1** ra vì được nạp sớm nhất. Hàng này khác vị trí các khung RAM.
- **LRU:** sau khi dùng lại trang 1, thứ tự lần dùng là `2 → 3 → 1`. Trang **2** ra vì lâu chưa dùng nhất.
- **OPT:** xem dãy yêu cầu còn lại, chọn trang lâu nhất mới cần lại; đây là thuật toán lý tưởng cần biết trước tương lai.
- **Clock:** chỉ xét bit tại khung kim đang trỏ; R=1 được hạ về 0 rồi đi tiếp, R=0 được chọn. Dùng lại đặt R=1, không quay kim.

Màu chỉ hỗ trợ: luôn có chữ “đang xét”, “chọn ra”, “vừa nạp” và tên trang/khung. Bước chọn giữ RAM cũ; bước nạp mới đổi đúng khung. Lùi phục hồi cùng snapshot.

## Chạy web tĩnh

Không cần npm, framework, build hay backend. Từ thư mục repository:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Dùng trình duyệt mở máy chủ HTTP vừa chạy, cổng 8080. GitHub Pages dùng branch chứa thay đổi, thư mục `/ (root)`; giữ cùng cấu trúc `index.html` và `assets/`. Không có bước build.

## Cấu trúc

```text
index.html                                 Engine gốc và các nút nối nội bộ
assets/js/teaching.js                       Các sự kiện, snapshot và timeline
assets/js/lessons.js                        Màn hình học tinh giản, ví dụ, điều khiển
assets/js/lesson-foundation-allocation.js   Hình Demo 1–2
assets/js/lesson-paging.js                  Hình Demo 3–4
assets/js/lesson-replacement.js             Hình và thứ tự chọn trang Demo 5
assets/js/hardware-scenes.js                CPU/RAM/SSD và màu nhận diện trang dùng chung
assets/css/lessons.css                      Bố cục học cơ bản
assets/css/lesson-interface.css             Màu chủ đề và phần giải thích tùy chọn
assets/css/hardware-*.css                   Linh kiện và lớp dữ liệu mô phỏng
assets/images/hardware/parts.png            Bộ hình linh kiện minh họa tạo bằng AI
assets/css/lesson-*.css                     Chi tiết từng mô hình
legacy/index.original.html                 Bản gốc để đối chiếu
```

Bản tinh giản bỏ khỏi màn hình chính: bảng thống kê máy, biểu đồ so sánh dài, bảng đánh giá lặp, các checkbox hiển thị, chế độ tối và các bài tương tác phụ. Giải thích và danh sách bước đã xem chỉ mở khi người học chọn. Không thêm demo thứ sáu. Mã cũ vẫn được giữ để đối chiếu và chạy hồi quy, không phải các menu mà người học phải đi qua.

## Kiến thức và tài liệu

Đã khôi phục PDF từ thư mục `tai lieu/` trong lịch sử Git để đọc lại các phần liên quan: *Operating System Concepts* (2018), Chương 9–10 và hai bài giảng Hệ điều hành tiếng Việt. Không đưa các PDF trở lại repository.

[Nhận xét giảng dạy và đối chiếu nguồn](docs/TEACHING_REVIEW.md) ghi rõ các phần đã đọc và tiêu chí quan sát. [Đối chiếu chi tiết các engine](docs/ACADEMIC_ALIGNMENT.md) lưu quy tắc kỹ thuật.

Các điểm cần giữ đúng:

- Base là địa chỉ đầu; Limit là độ dài; cận trên không bao gồm dấu bằng.
- TLB Miss không đồng nghĩa lỗi trang. TLB giữ bản dịch, không giữ dữ liệu trang.
- Nạp xong dữ liệu rồi mới đánh dấu trang thường trú; thử lại lệnh không tính thêm một lỗi trang.
- FIFO theo lúc nạp, LRU theo lúc dùng; vị trí khung không phải thứ tự ưu tiên.
- CPU chỉ đọc/ghi dữ liệu trong RAM. Mô hình không biến RAM thực thành vô hạn.

## Kiểm thử

Thuật toán độc lập và view đơn giản, không cần thư viện ngoài Node:

```sh
node tests/seeded-algorithms.cjs
node tests/lesson-views.cjs
```

Bộ đầu đối chiếu 320 trace / 6.400 trạng thái và 240 lần tiếp tục từ snapshot; bộ sau kiểm tra 24 chuyển trạng thái thật, bằng chứng FIFO/LRU/OPT/Clock, không lộ nạn nhân sớm và không sửa snapshot.

Với máy chủ tĩnh ở cổng 8080, Python Playwright và Chromium:

```sh
python3 tests/lessons_browser.py
python3 tests/interface_browser.py
python3 tests/hardware_browser.py
```

Bộ `lessons_browser.py` kiểm tra **giao diện công khai**: năm demo, lý do chọn, trước/sau, biên, nhập sai, Lùi, tự chạy, 375/390px và bàn phím. Ảnh/kết quả lưu ở `/tmp/memory-lessons-review/`. Bộ `interface_browser.py` kiểm tra mở/thu gọn, bàn phím, phục hồi bước đã xem, giữ lựa chọn theo demo, nhãn chủ đề và nhãn ví dụ tự nhập; ảnh ở `/tmp/memory-interface-tests/`. Bộ `hardware_browser.py` dành cho lớp hình linh kiện. Có thể đặt `MEMORY_DEMO_URL` và `CHROMIUM_PATH`.

Các bộ hồi quy cũ chạy qua `?view=diagnostic`, chỉ dành cho người bảo trì. Cách này giữ nguyên các assertion về nội dung/engine và cho phép kiểm tra lại các fixture cũ mà không đưa bảng điều khiển dài trở lại bài học:

```sh
node tests/teaching-flow.cjs
node tests/regression.cjs
node tests/custom-problems.cjs
node tests/visual-concepts.cjs
node tests/beginner-guidance.cjs
```

Không có dữ liệu CPU/RAM giả, dịch vụ giám sát cục bộ hay yêu cầu quyền hệ thống trong giao diện học.
