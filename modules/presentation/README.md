# Công cụ tư vấn website F&B

Website tĩnh HTML, CSS, JavaScript thuần. Không cần build, package manager, backend hay secret để triển khai.

## Các tệp của bản trình bày

| Tệp | Vai trò |
|---|---|
| `index.html` | Điểm vào độc lập của module, chuyển tới bản trình bày báo giá |
| `fnb_quote_presentation-3.html` | Giao diện trình bày gồm 4 màn hình: giới thiệu, cấu trúc chi phí, gói giá và quy trình |
| `fnb_quote_presentation-3.css` | Giao diện và kiểu in |
| `fnb_quote_presentation-themes.css` | Bộ chọn theme và giao diện bổ sung, cô lập theo theme |
| `fnb_quote_presentation-3.js` | Chuyển màn hình, chỉnh sửa, lưu và xuất JSON |
| `fnb_quote_presentation-3.json` | Dữ liệu báo giá mặc định |
| `fnb_quote_presentation-hosting.css` | Giao diện bảng Hosting và trình quản lý dữ liệu |
| `fnb_quote_presentation-hosting.js` | Hiển thị, chỉnh sửa, lưu và nhập/xuất dữ liệu Hosting |
| `data/hosting-data.json` | Dữ liệu mặc định của các gói Hosting và quyền lợi chăm sóc |

Các tài nguyên được tham chiếu bằng đường dẫn tương đối để hoạt động tại cả domain gốc lẫn URL GitHub Pages dạng `/ten-repository/`.

Mở **Chỉnh sửa nội dung báo giá** để chọn **Default** hoặc **Verdelo Inspired**. Lựa chọn giao diện được lưu riêng trong `localStorage` bằng key `fnbQuotePresentationThemeV1`; lựa chọn theme không thay đổi nội dung báo giá, key `webQuoteDataV2` hoặc cấu trúc JSON xuất ra. Theme mặc định giữ nguyên stylesheet và hành vi trước đó; các style của Verdelo Inspired chỉ áp dụng khi theme này được chọn. Chuyển động của theme mới tôn trọng tùy chọn `prefers-reduced-motion`.

Trên desktop đủ chiều rộng và chiều cao, mỗi màn hình được bố trí vừa một viewport; trên tablet, mobile hoặc màn hình thấp, nội dung chuyển sang luồng cuộn để giữ khả năng đọc. Mỗi nhóm trong `scope` được hiển thị thành một thẻ; các đầu việc liên quan nằm trong nhóm tương ứng. Dữ liệu `scope` dạng danh sách hạng mục cũ được chuyển đổi khi đọc dữ liệu đã lưu trong trình duyệt.

## Chạy thử trên máy

Trong thư mục dự án, chạy:

```sh
python3 -m http.server 8000
```

Mở `http://localhost:8000/` hoặc `http://localhost:8000/fnb_quote_presentation-3.html`. Cần dùng web server vì trình duyệt không cho trang `file://` đọc dữ liệu JSON bằng `fetch`.

## Triển khai GitHub Pages

1. Đẩy các tệp trong repository lên nhánh `main`.
2. Trên GitHub, mở **Settings → Pages**.
3. Trong **Build and deployment**, chọn **Deploy from a branch**, chọn nhánh `main` và thư mục `/(root)`, rồi bấm **Save**.
4. Sau khi GitHub Pages hoàn tất deploy, mở `https://<username>.github.io/<ten-repository>/modules/presentation/`. Trang `index.html` trong thư mục module sẽ chuyển tới bản trình bày. Có thể mở trực tiếp `https://<username>.github.io/<ten-repository>/modules/presentation/fnb_quote_presentation-3.html`.

## Chỉnh sửa và cập nhật JSON

1. Mở bánh răng trên trang, chọn nhóm nội dung và chỉnh sửa. Nhóm **Web gói** cho phép cấu hình mẫu website, ảnh/liên kết xem trước, mô tả, hosting và giá; chọn gói thiết kế đối chiếu khi nhập giá. Tab Web gói mặc định được ẩn và chỉ hiện khi bật **Hiển thị tab Web gói**.
2. Bấm **Lưu chỉnh sửa** để áp dụng lên giao diện và lưu trong `localStorage` của trình duyệt hiện tại.
3. Bấm **Xuất JSON** để tải toàn bộ dữ liệu thành `fnb_quote_presentation-3.json`.
4. Tự upload file JSON vừa tải lên repository (ghi đè file cũ), rồi commit/push để website trên Pages nhận dữ liệu mới.

Không có upload tự động tới GitHub. Thay đổi chỉ được lưu trong trình duyệt cho tới khi JSON được xuất và cập nhật thủ công trong repository. Không đưa dữ liệu nhạy cảm vào repository công khai.

Màn hình giá có minh họa nội bộ cho Website cơ bản, Responsive và SSL; không tải website bên ngoài. JSON cũ không có cấu hình mới vẫn được mở với Web gói tắt, danh sách Web gói rỗng và các minh họa bật. Chỉ nhập giá, thông tin hosting, ảnh và liên kết mẫu đã được xác nhận; giá Web gói để trống sẽ hiển thị là chưa cấu hình. Giá đã nhập phải thấp hơn gói thiết kế được chọn làm đối chiếu.

## Bảng Hosting và chăm sóc website

Trong màn hình **02 / Chi phí**, chọn **Hosting** hoặc **Chăm sóc website** để xem dữ liệu theo gói. Gói đang chọn được giữ khi chuyển giữa hai mục; các gói không có dữ liệu chăm sóc sẽ hiển thị rõ trạng thái chưa cấu hình thay vì mượn quyền lợi của gói khác.

Nút **Chỉnh sửa bảng giá** mở trình quản lý riêng. Có thể sửa nhóm, giá, thông số, quyền lợi/định mức; thêm, nhân bản hoặc xóa gói; chỉnh sửa, sắp xếp và gán quyền lợi. **Lưu thay đổi** lưu trong `localStorage` bằng key `fnbPresentationHostingDataV1`, độc lập với dữ liệu báo giá cũ `webQuoteDataV2`. **Hủy** bỏ bản nháp chưa lưu. Có thể xuất/nhập riêng `hosting-data.json` hoặc khôi phục dữ liệu mặc định. Việc lưu trình duyệt không tự cập nhật repository; để thay đổi thành dữ liệu mặc định cho mọi người, hãy xuất file rồi thay `data/hosting-data.json` trong repository.
