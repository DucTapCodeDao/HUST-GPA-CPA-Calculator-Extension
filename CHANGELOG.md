# Changelog

Tất cả thay đổi đáng chú ý của project sẽ được ghi lại trong file này.

## [Unreleased]
- None.

## [2.0.0]
### Added
- Tách `content.js` thành các module trong `content-src/`.
- Ô nhập điểm QT/CK bước 0.5, kiểm tra hợp lệ và báo lỗi gộp trong 1 thông báo.
- Lưu các ô đã nhập qua các lần trang tự tải lại (sessionStorage).
- Lưu/nạp dữ liệu điểm đã nhập bằng file JSON (`HoTen_MSSV.json`).
- Tùy chọn "Quy đổi cả điểm hệ 10" (GPA/CPA, bảng chi tiết, PDF, Excel).
- Biểu đồ: trục Y tự co giãn, dải màu theo xếp loại, tooltip khi rê chuột; PDF có trang biểu đồ riêng.
- Chế độ giao diện tối (Dark Mode).
- Tab "Tra cứu trọng số" đọc từ `data/hust_courses_final.csv`.
- Thu gọn/mở rộng từng học kỳ, kèm bộ đếm số học phần đã chọn trọng số/điểm chữ.
-Thêm tính năng tính điểm các học phần MI.
### Changed
- Học phần có điểm QT hoặc CK < 3 bị tính F ngay; học phần `MIL*` bị loại như học phần 0 tín chỉ.
### Fixed
- Class CSS `hgm-mamon`/`hgm-tenmon` không khớp JS (`hgm-ID`/`hgm-Name`).
- Sai số số thực làm học phần rơi sát mốc điểm bị xếp thấp hơn 1 bậc (VD 6.999999 → C+ thay vì B).
- Không còn báo lỗi nhầm các ô QT/CK tự nhập đang bị ẩn (khi chọn "Nhập điểm chữ").
- PDF: tiêu đề/đoạn chữ không còn bị đặt ngoài trang khi bảng dài; thiếu font không làm hỏng file.
- Escape HTML cho tên học phần/học kỳ; làm sạch dữ liệu khi nạp file JSON; cảnh báo khi file thuộc MSSV khác.
- Bỏ đoạn tô màu ô Excel không có tác dụng (SheetJS bản miễn phí không hỗ trợ).

## [1.2.0] - 2026-08-07
### Added
- Thêm thông tin về cảnh cáo học tập.
- Tô màu đỏ cho những học phần bị điểm F.

## [1.1.0] - 2026-08-07
### Added
- Thêm tính năng loại 1 học kỳ ra khỏi quá trình tính toán.
- Cho phép nhập điểm QT/CK giả định cho các học phần chưa có điểm thật trên hệ thống.
- Thêm họ tên và mã số sinh viên vào file PDF/Excel xuất ra.

## [1.0.0] - 2026-08-03
### Added
- Phiên bản đầu tiên: tự động đọc bảng điểm cá nhân trên QLĐT HUST.
- Tính GPA theo từng học kỳ.
- Tính CPA.
- Học phần `MI`/`SSH` tự động áp trọng số QT-CK = 5-5.
- Các học phần khác cho chọn nhập trọng số QT-CK tùy ý hoặc nhập thẳng điểm chữ.
- Tự động loại bỏ các học phần có 0 tín chỉ khỏi phép tính.
