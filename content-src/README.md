# content-src/ — mã nguồn chính của extension

Content script thuần (không dùng bundler), chia thành các module nhỏ.

## Cách hoạt động

Các file **không** dùng `import`/`export`. Mọi state và hàm dùng chung được gắn vào 1 namespace toàn cục: `window.__hustGpa` (viết tắt `HG`). Mỗi file bọc trong 1 IIFE `(function (HG) { ... })(window.__hustGpa);` và tự khởi tạo namespace nếu chưa có.

**Thứ tự nạp rất quan trọng** — đúng như `manifest.json` (`content_scripts[0].js`):

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | `state.js` | Hằng số (`LETTER_OPTIONS`, `WEIGHT_OPTIONS`, `LETTER_TO_4`), state dùng chung (`IDs` = các môn bị loại, `excludedSemesters`, `collapsedSemesters`, `courseInputs`, `showScore10`...), lưu/nạp sessionStorage, Dark Mode, `escapeHtml`, `sanitizeCourseInputs` |
| 2 | `scoring.js` | Hàm xử lý điểm: `change`, `note`, `parseScoreValue`, `checkMIorSSH`, `checkMIL`, `convertScale4To10` |
| 3 | `scraper.js` | Đọc DOM trang QLĐT: `findTranscriptTable`, `scrapeStudentInfo`, `scrapeData` |
| 4 | `lookup.js` | Tab "Tra cứu trọng số": đọc `data/hust_courses_final.csv`, tìm kiếm, chuyển tab |
| 5 | `ui.js` | Modal: `buildFloatingButton`, `openModal`, `renderCourseInputs`, `renderCourseRow`, thu gọn học kỳ |
| 6 | `compute-and-render.js` | Kiểm tra đầu vào, tính điểm, cảnh cáo học tập, bảng kết quả, biểu đồ SVG |
| 7 | `export-and-init.js` | Xuất PDF/Excel, lưu/nạp JSON, `init` (gọi `HG.init()` ở cuối) |

Dữ liệu tra cứu nằm ngoài code: `data/hust_courses_final.csv` (cột `course_code, course_name, duration, credits, tuition_credits, QTweight, CKweight`), được khai báo trong `web_accessible_resources` của `manifest.json`.

Quy ước: mọi chuỗi lấy từ trang web hoặc từ file JSON người dùng nạp phải qua `HG.escapeHtml` trước khi chèn vào `innerHTML`.

## Khi thêm tính năng mới

- Sửa/thêm hàm thuộc đúng "Part" nào thì sửa trong file đó.
- Nếu hàm mới cần dùng ở nhiều Part khác nhau, gắn nó vào `HG.tenHam = function (...) {...}` trong đúng file, các file khác gọi qua `HG.tenHam(...)`.
- Nếu thêm state (biến) cần dùng chung, khai báo trong `state.js` theo dạng `HG.tenBien = ...`.
- Đừng quên: nếu tạo file `.js` mới hoàn toàn, phải thêm đường dẫn vào mảng `js` trong `manifest.json`, đặt **đúng vị trí thứ tự phụ thuộc** (file nào dùng hàm của file khác thì phải nạp sau).

## Debug

Mở DevTools trên trang QLĐT, gõ `window.__hustGpa` để xem toàn bộ state/hàm hiện có — tiện để test nhanh 1 hàm riêng lẻ ngay trong Console, ví dụ:
```js
window.__hustGpa.change(8.5) // ['A', 4]
```
