# Third-party libraries

Extension này đóng gói sẵn (bundle) các thư viện mã nguồn mở sau trong thư mục `libs/`, để tính năng xuất PDF/Excel hoạt động offline mà không cần tải từ CDN (giúp qua được CSP của trang đích):

| Thư viện | Phiên bản | Giấy phép | Trang chủ |
|---|---|---|---|
| jsPDF | xem `libs/jspdf.umd.min.js` | MIT | https://github.com/parallax/jsPDF |
| jspdf-autotable | xem `libs/jspdf.plugin.autotable.min.js` | MIT | https://github.com/simonbengtsson/jsPDF-AutoTable |
| SheetJS (xlsx) | xem `libs/xlsx.full.min.js` | Apache-2.0 | https://github.com/SheetJS/sheetjs |
| Noto Sans (subset tiếng Việt) | — | SIL Open Font License 1.1 | https://fonts.google.com/noto/specimen/Noto+Sans |

Toàn bộ mã nguồn của các thư viện trên vẫn thuộc bản quyền của tác giả gốc tương ứng theo giấy phép đã nêu. Phần code do dự án này viết (`content.js`, `style.css`, `manifest.json`) được cấp phép theo `LICENSE` (MIT) ở thư mục gốc.
