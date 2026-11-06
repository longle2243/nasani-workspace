# MY WORKSPACE

Hệ thống tĩnh tập trung các công cụ độc lập, triển khai trên GitHub Pages:

- **INCOME** — quản lý và tính toán thu nhập.
- **PRESENTATION** — trình bày dịch vụ, báo giá và quản lý nội dung.

## Chạy local

Từ thư mục repository:

```sh
python3 -m http.server 8000
```

Mở <http://localhost:8000/>. Cần dùng HTTP server để module PRESENTATION có thể tải dữ liệu JSON bằng `fetch`; không mở bằng `file://`.

## Cấu hình trang đăng nhập

Đổi giá trị `WORKSPACE_PASSWORD` trong [`assets/js/auth.js`](./assets/js/auth.js) trước khi sử dụng. Đây chỉ là lớp chặn giao diện phía trình duyệt: mật khẩu và mã nguồn đều có thể được xem bởi người dùng. `sessionStorage` chỉ giữ trạng thái trong phiên trình duyệt; đây **không phải xác thực bảo mật** và không bảo vệ URL, file JSON hay source của các module. Không đặt thông tin nhạy cảm trong repository công khai.

## Triển khai GitHub Pages

Không cần cài package, build step, backend hoặc database. Tất cả trang dùng đường dẫn tương đối để hỗ trợ URL dạng `/nasani-workspace/`.

1. Đẩy nội dung repository lên nhánh `main` (không tự động upload/push từ ứng dụng).
2. Vào **Settings → Pages** trên GitHub.
3. Chọn **Deploy from a branch**, nhánh `main`, thư mục `/(root)`, rồi lưu.
4. Mở `https://longle2243.github.io/nasani-workspace/`. Trang gốc chuyển tới Portfolio F&B; các trang ngành có URL riêng trong `portfolio/`.

GitHub Pages phải được bật cho repository này. Nếu dùng custom domain hoặc đổi tên repository, hãy cập nhật canonical URL và Open Graph metadata trong các trang `portfolio/{fnb,spa,karaoke}/index.html` cùng URL trong trang gốc.

Login nội bộ vẫn hoạt động tại [`login.html`](./login.html); Dashboard và các module tiếp tục dùng cùng cơ chế đăng nhập hiện tại.

## Module

Mỗi module tự chứa điểm khởi chạy `index.html` cùng CSS, JavaScript và dữ liệu riêng. INCOME và PRESENTATION không được nhúng chung vào dashboard; đường dẫn từ dashboard mở ứng dụng độc lập.

Để thêm module, sao chép `modules/_template/` thành thư mục mới dưới `modules/`, cập nhật nội dung và tham chiếu tài nguyên tương đối. Sau đó thêm một card và đường dẫn tương ứng trong `dashboard.html`. Giữ CSS/JS riêng của module để tránh ảnh hưởng các ứng dụng khác.

### Personal Portfolio

Portfolio cá nhân của Long Lê có ba landing page độc lập, mỗi ngành có thiết kế và nội dung riêng:

- F&B: `portfolio/fnb/`
- Spa & Beauty: `portfolio/spa/`
- Karaoke & Entertainment: `portfolio/karaoke/`

Menu ngành dùng liên kết tương đối để hỗ trợ GitHub Pages project site. Danh sách case study nằm trong `portfolio/data/projects.json` theo từng ngành; mỗi mục có thể gồm `name`, `industry`, `image`, `imageAlt`, `problem`, `solution`, `conversionPoints` (mảng) và `result` đã xác minh. Chỉ thêm dự án, ảnh, kết quả và thông tin khách hàng đã được xác nhận quyền sử dụng. Khi chưa có dữ liệu, trang hiển thị trạng thái placeholder thay vì dự án hoặc kết quả giả. Bổ sung kênh liên hệ đã xác nhận vào các trang ngành trước khi gửi Portfolio cho khách hàng.

Portfolio Manager có tại `portfolio-manager.html` trong Dashboard. Không có API hoặc quyền ghi vào repository từ trình duyệt: bản nháp văn bản nằm trong `localStorage`, ảnh nháp trong IndexedDB trên thiết bị hiện tại. **Xuất file chỉ tải `content.json`, `projects.json` và ảnh về máy; không publish.** Tự thay hai JSON trong `portfolio/data/`, chép ảnh theo đúng đường dẫn hiển thị trong Manager, kiểm tra site rồi commit/push để Pages nhận cập nhật. Nếu xóa dữ liệu trình duyệt, sao lưu/export trước; không thể khôi phục bản nháp từ server. Login hiện tại chỉ là lớp chặn giao diện phía client và không bảo vệ Manager hoặc dữ liệu công khai.

### Dữ liệu và lưu trữ hiện tại

- INCOME tiếp tục dùng `localStorage` key `sales-desk-v2`; `config.json` được giữ nguyên cùng module. Cấu hình mặc định và công thức hiện tại vẫn nằm trong `script.js`.
- PRESENTATION tiếp tục tải `fnb_quote_presentation-3.json`, lưu bản chỉnh sửa trên trình duyệt và cho phép tải JSON hoàn chỉnh qua nút **Xuất JSON**. Người dùng tự cập nhật file trên GitHub.
- GitHub Pages phục vụ file tĩnh; không có upload tự động hoặc xử lý dữ liệu phía máy chủ.
