# Mô phỏng Quản lý Bộ nhớ (Part Four)

Demo trực quan cho tiểu luận môn **Hệ điều hành**, dựa trên giáo trình
*Operating System Concepts*, 10th ed. (Silberschatz, Galvin, Gagne), **Part Four – Memory Management** (Chương 9 và 10).

## Ba thí nghiệm

| Tab | Mục trong sách | Nội dung |
|---|---|---|
| **Bãi đỗ xe** | 9.2 | Lỗ trống hình thành khi mở/tắt chương trình; First-fit, Best-fit, Worst-fit; phân mảnh ngoài; dồn nén |
| **Tìm địa chỉ thật** | 9.3 | Dịch địa chỉ logic → vật lý qua TLB và bảng trang; lỗi trang |
| **Bàn đầy, cất trang nào?** | 10.4 | Thay thế trang FIFO, LRU, OPT, Clock; so sánh số lỗi trang; Belady's anomaly |

## Cách chạy

- **Trên máy:** tải về rồi mở file `index.html` bằng trình duyệt (Chrome, Edge, Firefox). Không cần cài gì.
- **Trên mạng:** bật GitHub Pages (Settings → Pages → Branch `main`, thư mục `/root`), sau vài phút trang có địa chỉ dạng
  `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

## Kiểm chứng

Với chuỗi tham chiếu trong mục 10.4 của giáo trình và 3 khung trang: FIFO 15 lỗi, LRU 12 lỗi, OPT 9 lỗi.
Ví dụ Belady (1 2 3 4 1 2 5 1 2 3 4 5): FIFO 9 lỗi với 3 khung, 10 lỗi với 4 khung.
