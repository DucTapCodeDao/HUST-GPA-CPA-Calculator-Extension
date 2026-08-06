# HUST GPA/CPA Calculator

Chrome/Edge extension tự động đọc bảng điểm cá nhân trên **QLĐT HUST** (Đại học Bách khoa Hà Nội) và tính GPA/CPA.

![license](https://img.shields.io/badge/license-MIT-blue.svg)

## Tính năng

- Tự động đọc bảng điểm ngay trên trang `qldt.hust.edu.vn`.
- Tính GPA theo từng học kỳ, CPA toàn khóa.
- Cho phép nhập điểm quá trình/cuối kỳ giả định để tính toán.
- Cho phép loại 1 hoặc nhiều môn trong quá trình tính toán.
- Hỗ trợ vẽ biểu đồ GPA/CPA theo học kỳ.
- Xuất bảng điểm ra file **PDF** và **Excel (.xlsx)**.

## Cài đặt

1. Tải hoặc `git clone` repo này về máy.
2. Vào `chrome://extensions` (Chrome/Edge).
3. Bật **Developer mode** (Chế độ nhà phát triển).
4. Bấm **Tải tiện ích đã giải nén** → chọn thư mục gốc của repo (thư mục chứa `manifest.json`).

## Cách dùng

1. Đăng nhập `qldt.hust.edu.vn` → **Học tập → Xem điểm** → tab **Điểm chi tiết**.
2. Đợi bảng điểm load xong, bấm biểu tượng **Tiện ích**(hình mảnh ghép) ở góc trên bên phải màn hình.
3. Bấm vào icon 3 dấu chấm cùng hàng với tiện ích **HUST GPA/CPA Calculator**, ở mục **Tiện ích này có thể đọc và thay đổi dữ liệu trang web**, chọn **Khi bạn nhấp vào tiện ích**. Những lần sau có thể bỏ qua bước 3.
4. Bấm vào tiện ích **HUST GPA/CPA Calculator**, sau đó nhấn phím F5 để load lại trang. Sau đó bấm nút nổi **📊 Tính GPA/CPA** ở góc dưới phải màn hình.
4. Chọn cấu hình trọng số/điểm chữ cho từng môn cần thiết, sau đó bấm **Tính GPA/CPA**.
5. Xem kết quả, hoặc bấm **Xuất PDF** / **Xuất Excel** để tải bảng điểm về máy.

## Cấu trúc project

```
hust-gpa-extension/
├── manifest.json
├── content.js
├── style.css
├── icons/
└── libs/
    ├── xlsx.full.min.js
    ├── jspdf.umd.min.js
    ├── jspdf.plugin.autotable.min.js
    └── notosans-vn-font.js
```

## Giấy phép

Mã nguồn của project này phát hành theo giấy phép [MIT](LICENSE). Xem [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) để biết giấy phép của các thư viện bên thứ 3 được đóng gói kèm.

## Tác giả

**DucTapCodeDao**
