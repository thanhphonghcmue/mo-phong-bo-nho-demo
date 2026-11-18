# Vibrant Academic Tech Lab — thiết kế và nghiệm thu

Bản nền: `e8a9e43`. Typography đã được nâng cấp tiếp sau bản thiết kế này; xem [báo cáo font](typography.md) để biết thông số và kiểm tra hiện hành. Mục tiêu là nâng chất lượng trình chiếu và khả năng theo dõi từng bước, giữ website HTML/CSS/JavaScript tĩnh và engine hiện có.

## Audit: giao diện nào thực sự chạy?

`index.html` tải `teaching.css`, `teaching-scenes.css`, `teaching-scenes.js`, `teaching.js` và lớp trình bày mới `lab-interface.js`. Hai URL thường và `?view=diagnostic` đều dùng luồng này.

Các file `lessons.js`, `lesson-foundation-allocation.js`, `lesson-paging.js`, `lesson-replacement.js`, `lessons.css`, `lesson-interface.css` vẫn chưa được index tải. Chúng không phải nơi áp dụng bản thiết kế này. `MemoryTeaching` tiếp tục là controller duy nhất. `lab-interface.js` chỉ đọc sự kiện/snapshot, trang trí UI và gọi `seek` của controller khi chọn bước đã xem.

GitHub Pages thật không truy cập được từ môi trường: proxy trả 403 khi kết nối đến `thanhphonghcmue.github.io`. Không coi kiểm tra localhost là xác nhận production. Đã kiểm riêng đường dẫn `/mo-phong-bo-nho-demo/` và biến thể `?view=diagnostic` trên static server để xác minh asset tương đối, SVG, font và một lần bấm chỉ tăng đúng một bước.

## Hướng thiết kế và tokens

Người sử dụng là giảng viên đang trình chiếu và sinh viên đang theo dõi một thuật toán. Điểm dẫn mắt là thao tác hiện tại và trang/địa chỉ/khung liên quan. Header và tab xác định bài; mô hình và bằng chứng giải thích điều đang xảy ra.

| Vai trò | Token / màu sáng | Lý do |
|---|---|---|
| Nhận diện | `--lab-navy: #102447`, navy đậm `#0B1733` | Header học thuật, chữ/logo rõ; gradient chỉ ở nhận diện và hành động chính. |
| Nền / chữ | `#F3F6FC` / `#18243B`, chữ phụ `#52647A` | Tách sân mô phỏng khỏi nền, giữ chữ rõ trên màn chiếu. |
| Hành động | `--lab-action: #6254E8` | Bước tiếp là hành động chính, phân biệt với màu trạng thái thuật toán. |
| Demo 1 | Coral `#DC4267`, nền `#FFF0F4` | Nhận diện bảo vệ, không thay màu xanh/đỏ của kết quả hợp lệ/Trap. |
| Demo 2 | Amber `#D97706`, nền `#FFF4DF` | Gợi quá trình quét, tìm chỗ. |
| Demo 3 | Royal blue `#2563EB`, nền `#EAF2FF` | Luồng địa chỉ, TLB, bảng trang. |
| Demo 4 | Violet `#7C3AED`, nền `#F3EAFF` | Điều khiển OS; dữ liệu nạp vẫn dùng xanh ngọc. |
| Demo 5 | Teal `#0D9488`, nền `#E6F8F4` | Bàn mô phỏng RAM và bằng chứng thay trang. |
| Thành công / lỗi | `#18734E` / `#BB2948` | Các sắc độ đủ đậm cho chữ nhỏ; Hit/Hợp lệ và Trap/Chọn ra có cả nhãn chữ. |
| Đang xét / nạp / ánh xạ | `#8B5200` / `#09776C` / `#7137BF` | Tách ba loại hành động, không dùng màu nhận diện bài thay ngữ nghĩa. |

Mỗi demo còn có `--demo-solid`, `--demo-ink`, `--demo-line` để chữ và badge không dùng máy móc màu accent. Dark mode có bộ nền/chữ/semantic riêng. Khi đổi theme, các cặp màu được đổi cùng lúc để tránh chữ sáng nội suy trên nền sáng.

Be Vietnam Pro và JetBrains Mono được lưu dưới dạng WOFF2 cục bộ, có giấy phép. Nội dung giải thích 14px; số trọng tâm 25–34px; số bước trong vòng tròn 32px; nhãn metadata nhỏ hơn. Cấu trúc dùng nhịp 4px, panel 16px, radius 8/12/16px và bóng đổ nhẹ. Nút chính cao 44px, có hover/pressed/focus/disabled.

## Các thành phần đã thay đổi

| Khu vực | Thay đổi |
|---|---|
| Header | Navy có chiều sâu, 88–96px trên desktop; logo đúng tỉ lệ trong khung sáng; tách tên sản phẩm, dòng phụ và trường/khoa; nút theme có SVG sun/moon. |
| Năm tab | Năm icon Lucide và năm màu riêng; tab active có nền tinted, viền mạnh và icon đặc. Hover nâng 2px. Bàn phím dùng trái/phải, Home/End và roving tab stop. Mobile cuộn ngang. |
| Thanh bước | Tối đa 5 sự kiện desktop, 3 mobile; vòng số/dấu hoàn tất, đường tiến trình và nhãn thao tác thật. Tên bước chưa chạy được che. Bước đã xem gọi đúng `MemoryTeaching.seek`. |
| Cấp phát tự do | Tổng sự kiện có thể tăng khi người học thao tác. Thanh bước ghi “còn tiếp”, không hiển thị một tổng giả hoặc 100% khi còn thao tác. |
| Nhập ví dụ | Gộp chọn ví dụ và đầu vào trên desktop; các nhánh Demand Paging bổ sung nằm trong một mục mở tùy ý. Input/label vẫn là control native. |
| Mô hình | Khối xử lý có SVG và nền theo vai trò; một điểm hiện tại. Chữ/địa chỉ lớn hơn, byte RAM đang đọc rõ hơn. |
| Demo 1 | Chờ kiểm tra dùng nhãn màu hành động; Hợp lệ xanh và Trap đỏ. Bỏ nhấp nháy Trap vô hạn. |
| Demo 2 | Giữ thanh RAM và vùng gạch xám; đang xét amber, chọn xanh. Hiệu ứng nạp chỉ gắn vào chương trình mới ở sự kiện cấp phát thật. |
| Demo 3 | Giữ luồng CPU/MMU → TLB → PTE khi cần → PA → RAM. TLB miss amber, hit xanh; không hiện PA trước bước tính; nhánh OS không có dây chéo. |
| Demo 4 | Pipeline ngang; nhánh Hit bỏ qua OS/đĩa; ghi bẩn RAM → đĩa và nạp đĩa → đúng khung vẫn rõ. PTE tiếp tục chỉ đổi sau I/O. |
| Demo 5 | RAM thành một bàn mô phỏng navy; vị trí các khung cố định. Màu định danh trang nhất quán ở chuỗi/CPU/RAM/bằng chứng. Đang xét amber, chọn ra đỏ, nạp teal, Hit xanh. Kim Clock và R ở đúng khung. |
| Giải thích | Vẫn mở tùy ý bên dưới, có nhãn Đang làm / Vì sao / Tiếp theo. Không thêm dashboard thống kê. |
| Chuyển động | Một lần, 180–320ms, chủ yếu transform/opacity; progress fill bằng transform. `prefers-reduced-motion` tắt hiệu ứng. |

## Skill và nguồn tham khảo đã sử dụng

| Nguồn | Cài đặt / sử dụng thực tế |
|---|---|
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Cài cục bộ tại `.agents/skills/ui-ux-pro-max`, đọc SKILL và checklist, chạy design-system search cùng truy vấn `keyboard focus not obscured`, `reduced motion status changes`. Áp dụng tương phản, focus, nhãn SVG, trạng thái live và chuyển động. |
| [Interface Design](https://github.com/Dammyjay93/interface-design) | Cài cục bộ tại `.agents/skills/interface-design`; áp dụng domain exploration, hierarchy, token/surface, native controls và critique ảnh render. Lưu quyết định ở `.interface-design/system.md`. |
| [Radix Colors](https://github.com/radix-ui/colors) | Đọc light/dark scales, tham khảo cách tách surface/border/solid/text. Không cài thư viện React. |
| [Lucide](https://github.com/lucide-icons/lucide) | Tạo sprite từ 20 SVG chính thức, giữ giấy phép ISC/MIT. Dùng cho tab, pipeline, điều khiển và theme. |

Hai skill được copy từ nguồn đã đọc và pin revision, chỉ trong workspace, không ghi đè skill có sẵn hay cài global. [Manifest nguồn](design-skill-sources.json) lưu SHA. Kết quả style tự động trả về hướng portfolio/trẻ em không phù hợp mô phỏng Hệ điều hành; không dùng chúng làm design system. Palette và phong cách theo yêu cầu người dùng, các kết quả UX phù hợp được áp dụng thật.

## Bảo toàn thuật toán

So sánh trực tiếp với bản nền xác nhận `buildX`, `buildV`, `buildA`, `buildR` không đổi. Các hàm engine trong index không đổi; phần index chỉnh header, asset và font. Bổ sung trong teaching.js chỉ liên quan icon, trạng thái CSS và đánh dấu đúng chương trình vừa được cấp phát.

Các ví dụ mức Thử thêm vẫn là mặc định. Công thức p/d/PA, TLB hit/miss, hit/fault, FIFO/LRU/OPT/Clock, dirty write-back, bounds, nhập liệu, Lùi/Tiếp/Tự chạy/Làm lại và phục hồi snapshot được kiểm tra lại bằng các bộ hiện có.

## Kiểm thử

| Bộ kiểm tra | Kết quả |
|---|---|
| `seeded-algorithms.cjs` | PASS: 320 trace, 6400 trạng thái, 240 continuation với mô hình đối chứng độc lập. |
| `regression.cjs` | PASS: 11 nhóm về thuật toán, kết quả giáo trình, restore và giao diện. |
| `custom-problems.cjs` | PASS: 13 nhóm về tự nhập, RAM ban đầu, dirty/quyền, lỗi nhập và responsive. |
| `teaching-flow.cjs` | PASS: 9 nhóm về điểm xử lý, đường đi, I/O, lịch sử và autoplay. |
| `scenes-browser.cjs` | PASS: 8 nhóm về UI công khai, snapshot, bằng chứng và kích thước màn hình. |
| `academic-lab.cjs` | PASS: 9 nhóm về stepper, bàn phím, identity, semantic, ảnh render, reduced motion, phóng to chữ nội dung và đường dẫn thư mục con. |
| axe-core 4.10.3 | Không phát hiện vi phạm trong 10 lần quét A/AA (5 demo × 2 theme) ở các trạng thái đã chọn. Kết quả chi tiết và các mục cần xem thủ công nằm trong JSON. |

Viewport đã kiểm: 1920×1080, 1366×768, 768×1024, 390×844, 375×844. Mở/đóng giải thích giữ nguyên snapshot. Một lần bấm Next chỉ tăng một bước. Không có lỗi JavaScript hoặc asset lỗi trong bộ nghiệm thu. Một số test chỉ đổi cách mở các fixture Demand Paging đã được thu gọn; không đổi giá trị kỳ vọng thuật toán.

Chạy với static server cổng 8080 và Playwright/Chromium có sẵn:

```sh
node tests/seeded-algorithms.cjs
node tests/regression.cjs
node tests/custom-problems.cjs
node tests/teaching-flow.cjs
node tests/scenes-browser.cjs
curl -fLsS https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js -o /tmp/memory-axe.min.js
MEMORY_AXE_PATH=/tmp/memory-axe.min.js node tests/academic-lab.cjs
```

Để kiểm subpath, chạy static server ở thư mục cha cổng 8089 và thêm `MEMORY_SUBPATH_URL=http://127.0.0.1:8089/mo-phong-bo-nho-demo/`. axe chỉ phục vụ QA, không được tải vào website production.

## Ảnh đối chiếu

Ảnh trước được chụp trên bản nền ngay trước khi đổi thiết kế. Một số ảnh thể hiện các trạng thái khác nhau để thấy rõ hiệu ứng; chúng là minh chứng bố cục, còn tính đúng được đối chiếu qua test/snapshot.

| Khu vực | Trước | Sau |
|---|---|---|
| Header | [Trước](review/academic-lab/header-before.png) | [Sau](review/academic-lab/header-after.png) |
| Năm tab | [Trước](review/academic-lab/tabs-before.png) | [Sau](review/academic-lab/tabs-after.png) |
| Demo 1 | [Trước](review/academic-lab/b-before.png) | [Sau](review/academic-lab/b-after.png) |
| Demo 2 | [Trước](review/academic-lab/a-before.png) | [Sau](review/academic-lab/a-after.png) |
| Demo 3 | [Trước](review/academic-lab/x-before.png) | [Sau](review/academic-lab/x-after.png) |
| Demo 4 | [Trước](review/academic-lab/v-before.png) | [Sau](review/academic-lab/v-after.png) |
| Demo 5 | [Trước](review/academic-lab/r-before.png) | [Sau](review/academic-lab/r-after.png) |

Mobile: [Demo 3](review/academic-lab/x-mobile.png) · [Demo 4](review/academic-lab/v-mobile.png) · [Demo 5](review/academic-lab/r-mobile.png).
Dark: [Demo 3](review/academic-lab/x-dark.png) · [Demo 5](review/academic-lab/r-dark.png).
[Kết quả máy đọc được](review/academic-lab/results.json).

## Tệp thay đổi

- `index.html`: asset đang tải, header và font.
- `assets/css/teaching-scenes.css`: design tokens, theme, typography, header/tab, stepper, mô hình, responsive/motion.
- `assets/js/lab-interface.js`: lớp trình bày chỉ đọc, cửa sổ bước, bàn phím và icon.
- `assets/js/teaching-scenes.js`: SVG chung và tiêu đề khối; giữ view từ snapshot.
- `assets/js/teaching.js`: icon play/pause và trạng thái trình bày thực tế.
- `assets/icons/`, `assets/fonts/`: asset cục bộ và license.
- `.agents/skills/`, `.interface-design/system.md`, `docs/design-skill-sources.json`: skill và quyết định có thể tái sử dụng.
- `tests/academic-lab.cjs`, hai bộ test truy cập fixture thu gọn; README và báo cáo/ảnh trong docs.

## Giới hạn

Chưa xác nhận website production trên tên miền Pages, chưa kiểm Safari/iOS hoặc máy chiếu thật. axe không phải chứng nhận toàn bộ WCAG; các kết quả incomplete, gradient, SVG và hiệu ứng cần xem ảnh/kiểm tra thủ công. Đã rà ảnh Chromium sáng/tối và mobile, sửa các lỗi tràn và tương phản tìm được. Pipeline dài trên điện thoại dùng luồng dọc nên cần cuộn. Các bước gộp của mô phỏng giảng dạy vẫn như README, không tuyên bố mô phỏng từng chu kỳ CPU.
