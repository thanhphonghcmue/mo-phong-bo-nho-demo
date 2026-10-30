# Web Demo Quản Lý Bộ Nhớ Hệ Điều Hành (5 Phân Hệ Tiêu Biểu)
### Operating System Memory Management Visualizer · Trường ĐH Sư Phạm TP.HCM (HCMUE)

> 🌐 **LINK TRUY CẬP TRỰC TUYẾN (LINK TĨNH TOÀN CẦU):**  
> 👉 **[https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/)**  
> *(Bất kỳ ai có liên kết này đều có thể truy cập trực tiếp trên Google Chrome, Edge, Safari, điện thoại hoặc máy tính mà không cần cài đặt bất kỳ phần mềm nào).*

---

## 🌟 Giới thiệu Dự án

Trang web mô phỏng trực quan phục vụ học tập, thuyết trình và nghiên cứu đề tài môn **Hệ điều hành** (Khoa Công Nghệ Thông Tin - HCMUE), dựa trên giáo trình chuẩn quốc tế:
**Operating System Concepts (10th ed., Silberschatz, Galvin & Gagne) — Part Four: Memory Management (Chương 9 & 10)**.

### 5 Phân hệ tiêu biểu trên Dashboard:
1. **📁 Phần 1 · Nền tảng (Foundations)**: Mô phỏng bảo vệ địa chỉ bộ nhớ bằng hai thanh ghi phần cứng **Base** và **Limit**. CPU phát địa chỉ $\to$ kiểm tra biên $\to$ cấp quyền truy cập RAM hoặc phát sinh ngắt **TRAP to OS**; Thước đo RAM trực quan phân vùng rõ ràng.
2. **🖴 Phần 2 · Cấp phát bộ nhớ (Allocation — Bãi đỗ xe)**: Cấp phát liên tục với **First-fit, Best-fit, Worst-fit**; quan sát các lỗ trống tự xuất hiện và tự gộp khi mở/tắt chương trình; phân mảnh ngoài và chức năng **Dồn nén RAM (Compaction)**.
3. **⊞ Phần 3 · Phân trang (Paging — Tìm địa chỉ thật)**: Dịch địa chỉ logic $(p, d) \to$ vật lý $(f, d)$ qua bộ đệm dịch nhanh **TLB** (TLB Hit / Miss) và **Bảng trang (Page Table)** đến khung nhớ RAM; chức năng thử lỗi trang.
4. **💾 Phần 4 · Bộ nhớ ảo (Virtual Memory — Demand Paging)**: Quy trình 6 bước xử lý ngắt lỗi trang (*Page Fault*) chuẩn giáo trình (*Reference $\to$ Trap Page Fault $\to$ OS Locate on Disk $\to$ Free-frame List $\to$ Disk I/O $\to$ Restart Instruction*).
5. **🔄 Phần 5 · Thay thế trang (Page Replacement — Bàn đầy, cất trang nào?)**: Mô phỏng 4 thuật toán chuẩn **FIFO, LRU, OPT (Tối ưu), Clock (Cơ hội thứ hai)**; biểu đồ so sánh số lỗi trang; kiểm chứng **Nghịch lý Belady (Belady's Anomaly)**.

### 📊 Giám sát thông số máy tính thực tế (Real-Time Performance Monitor):
Bên dưới mỗi demo đều tích hợp bảng đo lường hiệu năng thời gian thực:
- **Thông số máy thật**: Số luồng CPU logic (`navigator.hardwareConcurrency`), RAM thiết bị ước lượng (`navigator.deviceMemory`), bộ nhớ JS Heap, thời gian xử lý thuật toán (`performance.now()`), thời gian render DOM.
- **Thông số mô hình**: Cập nhật chi tiết theo từng trạng thái thuật toán đang chạy.

---

## 🚀 Hướng dẫn chạy

### 1. Xem trực tiếp trên mạng (Khuyên dùng khi nộp bài hoặc thuyết trình):
Mở liên kết GitHub Pages:  
👉 **[https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/](https://thanhphonghcmue.github.io/mo-phong-bo-nho-demo/)**

### 2. Chạy trên máy nội bộ (Offline):
- Mở trực tiếp file `index.html` bằng trình duyệt web bất kỳ (Chrome, Edge, Firefox, Cốc Cốc).
- Hoặc chạy máy chủ cục bộ bằng lệnh:
  ```bash
  python -m http.server 8080
  ```
  Truy cập: `http://localhost:8080`
