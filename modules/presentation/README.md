# Công cụ tư vấn website F&B

Website tĩnh HTML, CSS, JavaScript thuần. Không cần build, package manager, backend hay secret để triển khai.

## Các tệp của bản trình bày

| Tệp | Vai trò |
|---|---|
| `index.html` | Trang vào mặc định của GitHub Pages, chuyển tới bản trình bày báo giá |
| `fnb_quote_presentation-3.html` | Giao diện trình bày gồm 3 màn hình |
| `fnb_quote_presentation-3.css` | Giao diện và kiểu in |
| `fnb_quote_presentation-3.js` | Chuyển màn hình, chỉnh sửa, lưu và xuất JSON |
| `fnb_quote_presentation-3.json` | Dữ liệu báo giá mặc định |

Các tài nguyên được tham chiếu bằng đường dẫn tương đối để hoạt động tại cả domain gốc lẫn URL GitHub Pages dạng `/ten-repository/`.

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
4. Sau khi GitHub Pages hoàn tất deploy, mở `https://<username>.github.io/<ten-repository>/`. Trang `index.html` sẽ chuyển tới bản trình bày. Có thể mở trực tiếp `https://<username>.github.io/<ten-repository>/fnb_quote_presentation-3.html`.

## Chỉnh sửa và cập nhật JSON

1. Mở bánh răng trên trang, chọn nhóm nội dung và chỉnh sửa.
2. Bấm **Lưu chỉnh sửa** để áp dụng lên giao diện và lưu trong `localStorage` của trình duyệt hiện tại.
3. Bấm **Xuất JSON** để tải toàn bộ dữ liệu thành `fnb_quote_presentation-3.json`.
4. Tự upload file JSON vừa tải lên repository (ghi đè file cũ), rồi commit/push để website trên Pages nhận dữ liệu mới.

Không có upload tự động tới GitHub. Thay đổi chỉ được lưu trong trình duyệt cho tới khi JSON được xuất và cập nhật thủ công trong repository. Không đưa dữ liệu nhạy cảm vào repository công khai.
