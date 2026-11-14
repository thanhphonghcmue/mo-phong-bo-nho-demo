# Căn cứ thiết kế cho năm demo

Mục tiêu của lần chỉnh giao diện này: mô hình là trọng tâm, người xem tự mở/thu gọn lời giải, và ba ý nghĩa học phần **An toàn / Hiệu quả / Không giới hạn** được nhận biết rõ. Giữ web HTML/CSS/JavaScript tĩnh; không chuyển sang React chỉ để dùng component.

## Nguồn GitHub đã đọc

| Nguồn | Phiên bản đã đọc | Nội dung thực sự dùng |
|---|---|---|
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `6ae86f61f520d6ca229d2f40e070410638c908c5` | SKILL.md, công cụ tìm UX/màu và bộ hướng dẫn: độ tương phản, không truyền đạt bằng màu đơn độc, nội dung dài có thể mở rộng, nhãn rõ ràng, điều khiển chạy/dừng. |
| [Radix Colors](https://github.com/radix-ui/colors) | `dbdb85470547c7d34b9001f48fddb08ded335979` | README và `src/light.ts`: thang màu trung tính Sand, các mức nền nhạt/biên/chữ cho Red, Blue, Green, Violet. |
| [Radix Primitives](https://github.com/radix-ui/primitives) | `eb3a2b7091293e27df8f9ba906632d8daa3d81a3` | README và `packages/react/collapsible/src/collapsible.tsx`: trigger là button, có trạng thái mở, `aria-expanded`, liên kết với nội dung, hỗ trợ trạng thái mặc định đóng. Áp dụng nguyên tắc bằng phần tử HTML native thay vì thêm dependency React. |

Các kho được đọc trực tiếp qua HTTPS Git; không suy luận mức phổ biến từ số sao hay đưa ra số sao chưa kiểm chứng. Không cài npm hoặc thư viện runtime mới cho phần thiết kế này.

## Kết quả UI UX Pro Max và cách chọn lọc

Đã chạy những truy vấn cục bộ sau trong skill tải từ GitHub:

```sh
python3 scripts/search.py 'semantic color states' --domain ux -n 3
python3 scripts/search.py 'education learning calm' --domain color -n 2
python3 scripts/search.py 'collapse expand content' --domain ux -n 3
python3 scripts/search.py 'education learning minimal' --design-system \
  -p 'Memory Lessons' --variance 3 --motion 1 --density 4 -f markdown
```

- Truy vấn màu ngữ nghĩa trả về **Color Only**, **Color Contrast** và **Hover States**: giữ chữ trạng thái bên cạnh màu, chữ thường đạt ít nhất 4,5:1, phản hồi hover không làm xê dịch bố cục.
- Truy vấn giáo dục trả về bảng màu LMS với teal/amber và bảng màu Kids Learning nhiều màu. Chọn nền sáng và nhấn màu có vai trò; không dùng toàn bộ bảng nhiều màu như trò chơi.
- Truy vấn đầu về `progressive disclosure accordion` trả kết quả typography không phù hợp. Đã bỏ kết quả đó, truy vấn lại `collapse expand content` cho hướng dẫn nội dung dài có tùy chọn mở rộng và điều khiển nội dung tự chạy. Không nhận là skill có một mẫu accordion chuyên biệt.
- Truy vấn design system trả về **Minimalism & Swiss Style**, nhưng phần trang tiếp thị/CTA lặp và phông chữ trẻ em không phù hợp bài giảng đại học. Chỉ giữ phân cấp rõ, khoảng trắng, chuyển động tiết chế, light mode và một hành động chính.

## Màu và vai trò đề xuất

Nền không cần phủ xanh dương. Dùng trắng ấm và chữ trung tính để trang/trang bị thay là phần nổi bật:

| Vai trò | Màu | Ý nghĩa |
|---|---|---|
| Nền toàn trang | `#F9F9F8` | Sand 2, dịu và gần trung tính |
| Bề mặt mô hình | `#FFFFFF` | Vùng quan sát sạch |
| Chữ chính | `#21201C` | Sand 12, tương phản mạnh |
| Chữ phụ | `#63635E` | Sand 11, dễ đọc trên trắng |
| Hành động chính | `#6E56CF` với chữ trắng | Violet 9, tách khỏi xanh dương nhãn học phần |
| Bước đang xử lý | teal đậm `#087F72` và nền teal nhạt | Chỉ nơi đang hoạt động; có chữ “đang xét” |
| Đạt/thành công | xanh lá và chữ trạng thái | Không dùng để biểu thị trang bị chọn ra |
| Từ chối/chọn ra | đỏ và chữ trạng thái | Không chỉ có viền đỏ |

Ba nhãn học phần đi cùng demo:

| Demo | Nhãn | Chữ / nền nhãn | Tương phản tính từ sRGB |
|---|---|---|---|
| 1 | AN TOÀN | `#B4232D` / `#FEEBEC` | 5,69:1 |
| 2–3 | HIỆU QUẢ | `#0B5FA5` / `#E6F4FE` | 5,87:1 |
| 4–5 | KHÔNG GIỚI HẠN | `#176A45` / `#E6F6EB` | 5,89:1 |

Đã tính trước: chữ trắng trên Violet 9 `#6E56CF` đạt 5,39:1; trên teal đậm `#087F72` đạt 4,90:1. Không lấy màu Radix 11 rồi mặc định rằng mọi cặp nền nhạt đều đạt: blue11/blue3 chỉ 4,25:1 và green11/green3 chỉ 4,21:1, nên chữ nhãn được làm đậm hơn. Cần kiểm tra lại màu kết xuất thực tế nếu có opacity hoặc lớp nền khác.

“Không giới hạn” là nhãn chủ đề bộ nhớ ảo/tái sử dụng khung theo bài học, **không có nghĩa RAM hay dung lượng vật lý là vô hạn**. Giải nghĩa ngắn nằm ở nhãn hoặc lời giới thiệu, không thêm một panel lý thuyết dài.

## Hành vi lời giải tùy chọn

- Giữ tên bước hiện tại dễ thấy; phần lời giải chi tiết mở/đóng theo ý người xem.
- Dùng `details/summary` native hoặc button có `aria-expanded` và `aria-controls`; thao tác bàn phím Enter/Space hoạt động.
- Thu gọn lời giải không chuyển bước, không đặt lại RAM, không đổi hàng FIFO hay kim Clock.
- Bấm Bước tiếp vẫn cập nhật đúng lời giải của bước mới dù panel đang đóng. Mở lại phải hiển thị đúng snapshot hiện tại.
- Người xem mở ở demo nào thì lựa chọn đó không bị tự đóng sau mỗi lần Bước tiếp hoặc sau khi đổi tab quay lại.
- Không tự mở nội dung dài khi Tự chạy; không dùng chuyển động trượt gây xô hình. Tôn trọng reduced motion.
- Màu chủ đề chỉ giúp định hướng; trạng thái xử lý/đúng/sai vẫn có quy tắc chung giữa cả năm demo.

## Tiêu chí kiểm tra

Kiểm tra cả năm demo ở desktop và 375/390px: nhãn không bị cắt; mở/đóng lời giải bằng chuột và bàn phím; lựa chọn mở giữ qua bước/chuyển tab; snapshot không đổi bởi thao tác disclosure; bước Lùi/Tiếp và tự chạy vẫn chính xác; chữ/nút/focus rõ trên nền thực; các nhãn dùng đúng đỏ/xanh dương/xanh lá theo yêu cầu người dùng.


## Quyết định triển khai cuối

`assets/css/lesson-interface.css` dùng nền ấm `#F6F5F1`, bề mặt trắng, chữ `#292D33`, violet `#6E56CF` cho hành động chính và ba cặp nhãn đỏ/xanh dương/xanh lá đã kiểm tra ở trên. Sau khi xem hình thực tế, chọn vàng nhạt `#FFF5DC` / viền `#AC7418` cho nơi đang xử lý để tách rõ với xanh lá thành công và đỏ bị chọn ra. Đây là quyết định thích ứng với sơ đồ giảng dạy, không sao chép toàn bộ bảng màu đề xuất của skill.

Phần giải thích sử dụng `details/summary` native, mặc định đóng. Chỉ dòng tên bước cập nhật trong vùng live; mở/thu gọn không phát lệnh sang engine. Danh sách bước được tạo khi người xem mở, chỉ gồm các bước đã thấy và lựa chọn quay lại dừng tự chạy.

Truy vấn kiểm tra bổ sung `expand option` không trả kết quả; đã dùng truy vấn hẹp `truncation` và xác nhận quy tắc Content / Truncation. Căn cứ disclosure chính vẫn là Radix Collapsible và ngữ nghĩa HTML native, không nhận rằng UI UX Pro Max đã trả về một accordion dành riêng cho dự án.

## Linh kiện gần với hình dáng ngoài đời

Lần cập nhật phần cứng dùng bộ hình CPU, thanh RAM, SSD và GPU được tạo bằng AI tại `assets/images/hardware/parts.png`. Đây là hình minh họa linh kiện, không phải ảnh chụp hay thông tin lấy từ máy người dùng, và không lấy hình từ các kho skill kể trên. CPU/RAM/SSD nằm ngay trong mô hình học; mục nhận diện linh kiện mặc định đóng. GPU chỉ giúp nhận biết linh kiện, có chú thích không tham gia các thuật toán này.

Nhãn địa chỉ, lỗ trống, trang và khung được đặt trên lớp mô phỏng của thanh RAM. Chú thích phân biệt lớp logic với phần cứng thật: một chip RAM không tương ứng một khung trang. TLB/bảng trang vẫn là bản dịch, không được trình bày thành nơi chứa dữ liệu trang. Màu trang được giữ nhất quán giữa dãy yêu cầu, RAM và hàng thứ tự; số trang và chữ trạng thái luôn đi kèm màu. Hàng FIFO/LRU tách khỏi vị trí chip để tránh hiểu thứ tự khung là thứ tự thay thế.

`hardware-scenes.js` chỉ tạo phần hiển thị; các engine, snapshot và luật chọn trang không đổi. Khi bộ ảnh không tải được, hình linh kiện bằng CSS và các nhãn dữ liệu vẫn hiện. Mục tiêu là thấy CPU đang cần gì, RAM đang chứa gì và lúc nào SSD thực sự nạp dữ liệu, trong cùng năm demo và bốn nút điều khiển.
