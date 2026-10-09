# sxnhom — Một Nhà · Xưởng nhôm

Hai phần dùng chung một bộ logic sản xuất (`src/mnwd-sanxuat.js`):

| Thư mục | Là gì |
| --- | --- |
| `dist/extension/` | Tiện ích Chrome **Một Nhà · Vẽ cửa** cho WindoorCraft (ln.windoorcraft.com): vẽ cửa theo mẫu, báo giá, giá vốn/lãi (ẩn bằng PIN cho nhân viên), bản vẽ sản xuất tiếng Việt, file cắt nhôm Excel, gửi máy cắt. |
| `server/` | Máy chủ xưởng **sxnhom.motnha.vn**: nhận đơn cắt từ tiện ích, trang `/may` cho máy cắt Haffner, chương trình tự lấy file trên Windows 7. Hướng dẫn: `server/HUONG_DAN_MAY_CHU.txt`. |

## Cài tiện ích (một lần mỗi máy)
1. Tải kho này (Code → Download ZIP) hoặc chép thư mục `dist/extension`.
2. Chrome → `chrome://extensions` → bật *Developer mode* → *Load unpacked* → chọn `dist/extension`.
3. Từ đó tiện ích **tự cập nhật**: mỗi lần mở WindoorCraft nó hỏi `dist/phat-hanh.json` trên kho này, tải bản mới, **kiểm chữ ký** rồi mới chạy. Mất mạng thì dùng bản đã tải lần trước, hoặc bản đi kèm tiện ích.

## Phát hành bản mới
```
npm test                                   # dựng + chạy toàn bộ phép thử
MNWD_KHOA=/duong/dan/khoa-ky-phat-hanh.pem node phat-hanh.js "ghi chú"
git add -A && git commit -m "vX.Y.Z" && git push origin main
```
Khoá riêng `khoa-ky-phat-hanh.pem` **không** nằm trong kho (giữ ở máy của công ty). Bản không có chữ ký đúng sẽ không bao giờ chạy trên máy nào, kể cả khi kho GitHub bị sửa. Đổi khoá thì phải cài lại tiện ích một lần trên mỗi máy.

## Mã nguồn
`src/` (lõi, xem trước, sản xuất, điều khiển WindoorCraft, giao diện, bộ nạp), `test/` (Node + Playwright), `build.js`.
