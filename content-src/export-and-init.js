//Mission: Export PDF/Excel & Initialize extension

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';

  HG.exportToPDF = async function () {
    if (!HG.lastExportData) {
      alert('Hãy bấm "Tính GPA / CPA" trước khi xuất file.');
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('Không tải được thư viện xuất PDF. Hãy kiểm tra lại file libs/jspdf.umd.min.js trong extension.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

    let fontName = 'helvetica';
    if (window.__NOTOSANS_VN_BASE64__) {
      fontName = 'NotoSansVN';
      doc.addFileToVFS('NotoSans-VN-normal.ttf', window.__NOTOSANS_VN_BASE64__);
      doc.addFont('NotoSans-VN-normal.ttf', fontName, 'normal');
      doc.addFileToVFS('NotoSans-VN-bold.ttf', window.__NOTOSANS_VN_BASE64__);
      doc.addFont('NotoSans-VN-bold.ttf', fontName, 'bold');
      doc.setFont(fontName, 'normal');
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    const ensureSpace = (y, needed) => {
      if (y + needed > pageHeight - 40) {
        doc.addPage();
        return 40;
      }
      return y;
    };

    doc.setFontSize(16);
    doc.text('Bảng điểm - GPA/CPA (HUST GPA/CPA Calculator)', 40, 40);

    //Add student info (name, ID)
    const { name: studentName, studentId } = HG.lastExportData.studentInfo || {};
    let offsetY = 0;
    doc.setFontSize(11);
    if (studentName || studentId) {
      doc.text(`Sinh viên: ${studentName || '-'}   |   MSSV: ${studentId || '-'}`, 40, 58);
      offsetY = 14;
    }

    const showScore10 = !!HG.lastExportData.showScore10;

    const cpaLine = showScore10
      ? `CPA hệ 4: ${HG.lastExportData.cpa.toFixed(2)}  |  CPA hệ 10: ${HG.lastExportData.cpa10.toFixed(2)} (tổng ${HG.lastExportData.totalCredit_CPA} tín chỉ, ${HG.lastExportData.distinctCourses.length} học phần)`
      : `CPA hệ 4: ${HG.lastExportData.cpa.toFixed(2)} (tổng ${HG.lastExportData.totalCredit_CPA} tín chỉ, ${HG.lastExportData.distinctCourses.length} học phần)`;
    doc.text(cpaLine, 40, 62 + offsetY);
    doc.text(HG.note(HG.lastExportData.cpa), 40, 78 + offsetY);

    //GPA table
    const gpaHead = showScore10 ? ['Học kỳ', 'GPA hệ 4', 'GPA hệ 10', 'Số tín chỉ'] : ['Học kỳ', 'GPA hệ 4', 'Số tín chỉ'];
    const gpaBody = HG.lastExportData.gpaBySemester.map((s) =>
      showScore10 ? [s.name, s.gpa.toFixed(2), s.gpa10.toFixed(2), String(s.tinChi)] : [s.name, s.gpa.toFixed(2), String(s.tinChi)]
    );
    doc.autoTable({
      startY: 96 + offsetY,
      head: [gpaHead],
      body: gpaBody,
      styles: { fontSize: 9, font: fontName },
      headStyles: { fillColor: [192, 39, 45], font: fontName, fontStyle: 'bold' },
    });

    //Detail grade table
    const afterGpaY = ensureSpace(doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 200, 80);
    doc.setFontSize(12);
    doc.text('Bảng điểm chi tiết', 40, afterGpaY);

    const distinctCoursesSorted = HG.lastExportData.distinctCourses.slice().sort((a, b) => a.ID.localeCompare(b.ID));
    const detailHead = showScore10
      ? ['Mã học phần', 'Tên học phần', 'TC', 'Điểm chữ', 'Điểm hệ 4', 'Điểm hệ 10']
      : ['Mã học phần', 'Tên học phần', 'TC', 'Điểm chữ', 'Điểm hệ 4'];
    const detailBody = distinctCoursesSorted.map((it) =>
      showScore10
        ? [it.ID, it.Name, String(it.Credit), it.scoreLetter, it.score4.toFixed(2), HG.convertScale4To10(it.score4).toFixed(2)]
        : [it.ID, it.Name, String(it.Credit), it.scoreLetter, it.score4.toFixed(2)]
    );
    doc.autoTable({
      startY: afterGpaY + 10,
      head: [detailHead],
      body: detailBody,
      styles: { fontSize: 8, font: fontName },
      headStyles: { fillColor: [192, 39, 45], font: fontName, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body' && distinctCoursesSorted[data.row.index] && distinctCoursesSorted[data.row.index].scoreLetter === 'F') {
          data.cell.styles.fillColor = [253, 234, 234];
          data.cell.styles.textColor = [183, 28, 28];
        }
      },
    });

    //Warning table
    const afterDetail1Y = ensureSpace(doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 400, 90);
    doc.setFontSize(12);
    doc.text('Cảnh cáo học tập', 40, afterDetail1Y);
    doc.setFontSize(10);
    doc.text(
      `Tổng số tín chỉ đang nợ: ${HG.lastExportData.canhCaoHienTai.Y} tín chỉ   |   Mức cảnh cáo hiện tại: Mức ${HG.lastExportData.canhCaoHienTai.newLevel}`,
      40,
      afterDetail1Y + 16
    );

    doc.autoTable({
      startY: afterDetail1Y + 26,
      head: [['Học kỳ', 'Số tín chỉ nợ trong kỳ', 'Tổng số tín chỉ đang nợ', 'Mức cảnh cáo']],
      body: HG.lastExportData.historyCanhCao.map((it) => [it.semesterName, String(it.X), String(it.Y), `Mức ${it.newLevel}`]),
      styles: { fontSize: 8, font: fontName },
      headStyles: { fillColor: [192, 39, 45], font: fontName, fontStyle: 'bold' },
    });

    //Credit
    const afterDetailY = ensureSpace(doc.lastAutoTable ? doc.lastAutoTable.finalY + 24 : 500, 20);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Extension được phát triển bởi DucTapCodeDao', 40, afterDetailY);
    doc.setTextColor(0, 0, 0);

    //Add GPA/CPA chart
    if (HG.lastExportData.chartData) {
      try {
        const { labels, pointLabels, gpaValues, cpaValues } = HG.lastExportData.chartData;
        const gpaChartHtml = HG.drawLineChart('GPA - Điểm trung bình học kỳ', labels, gpaValues, '#c0272d', 'pdf-gpa-chart', pointLabels, false, true);
        const cpaChartHtml = HG.drawLineChart('CPA - Điểm trung bình tích lũy', labels, cpaValues, '#c0272d', 'pdf-cpa-chart', pointLabels, false, true);
        const gpaSvg = HG.extractSvgFromChartHtml(gpaChartHtml);
        const cpaSvg = HG.extractSvgFromChartHtml(cpaChartHtml);

        if (gpaSvg && cpaSvg) {
          const [gpaPng, cpaPng] = await Promise.all([
            HG.svgToPngDataUrl(gpaSvg, 640, 250),
            HG.svgToPngDataUrl(cpaSvg, 640, 250),
          ]);

          doc.addPage();
          doc.setFont(fontName, 'bold');
          doc.setFontSize(14);
          doc.text('Biểu đồ GPA/CPA theo học kỳ', 40, 40);
          doc.setFont(fontName, 'normal');

          const imgWidth = 515; //Vừa khít chiều ngang trang A4 (595pt) trừ lề 40pt mỗi bên
          const imgHeight = imgWidth * (250 / 640);
          doc.addImage(gpaPng, 'PNG', 40, 56, imgWidth, imgHeight);
          doc.addImage(cpaPng, 'PNG', 40, 56 + imgHeight + 24, imgWidth, imgHeight);
        }
      } catch (e) {
        console.warn('[HUST GPA] Không thể thêm biểu đồ vào PDF:', e);
      }
    }

    doc.save('bang-diem-gpa-cpa.pdf');
  }

  //Function to export to an Excel file
  HG.exportToExcel = function () {
    if (!HG.lastExportData) {
      alert('Hãy bấm "Tính GPA / CPA" trước khi xuất file.');
      return;
    }
    if (!window.XLSX) {
      alert('Không tải được thư viện xuất Excel. Hãy kiểm tra lại file libs/xlsx.full.min.js trong extension.');
      return;
    }

    const wb = window.XLSX.utils.book_new();
    const showScore10 = !!HG.lastExportData.showScore10;

    //Sheet 1: GPA
    const studentInfoRows = (HG.lastExportData.studentInfo && (HG.lastExportData.studentInfo.name || HG.lastExportData.studentInfo.studentId))
      ? [
          ['Sinh viên', HG.lastExportData.studentInfo.name || '-'],
          ['MSSV', HG.lastExportData.studentInfo.studentId || '-'],
          [],
        ]
      : [];
    const gpaHeaderRow = showScore10 ? ['Học kỳ', 'GPA hệ 4', 'GPA hệ 10', 'Số tín chỉ'] : ['Học kỳ', 'GPA hệ 4', 'Số tín chỉ'];
    const gpaRows = HG.lastExportData.gpaBySemester.map((s) =>
      showScore10 ? [s.name, Number(s.gpa.toFixed(2)), Number(s.gpa10.toFixed(2)), s.tinChi] : [s.name, Number(s.gpa.toFixed(2)), s.tinChi]
    );
    const cpaSummaryRows = showScore10
      ? [
          ['CPA hệ 4', Number(HG.lastExportData.cpa.toFixed(2))],
          ['CPA hệ 10', Number(HG.lastExportData.cpa10.toFixed(2))],
        ]
      : [['CPA hệ 4', Number(HG.lastExportData.cpa.toFixed(2))]];
    const gpaSheetData = [
      ...studentInfoRows,
      gpaHeaderRow,
      ...gpaRows,
      [],
      ...cpaSummaryRows,
      ['Tổng tín chỉ CPA', HG.lastExportData.totalCredit_CPA],
      [],
      ['Extension được phát triển bởi DucTapCodeDao'],
    ];
    const wsGPA = window.XLSX.utils.aoa_to_sheet(gpaSheetData);
    window.XLSX.utils.book_append_sheet(wb, wsGPA, 'GPA-CPA');

    //Sheet 2: Detail grade table
    const distinctCoursesSortedXlsx = HG.lastExportData.distinctCourses.slice().sort((a, b) => a.ID.localeCompare(b.ID));
    const detailHeaderRow = showScore10
      ? ['Mã học phần', 'Tên học phần', 'Số tín chỉ', 'Điểm chữ', 'Điểm hệ 4', 'Điểm hệ 10', 'Trạng thái']
      : ['Mã học phần', 'Tên học phần', 'Số tín chỉ', 'Điểm chữ', 'Điểm hệ 4', 'Trạng thái'];
    const detailSheetData = [
      detailHeaderRow,
      ...distinctCoursesSortedXlsx.map((it) => {
        const row = [it.ID, it.Name, it.Credit, it.scoreLetter, Number(it.score4.toFixed(2))];
        if (showScore10) row.push(Number(HG.convertScale4To10(it.score4).toFixed(2)));
        row.push(it.scoreLetter === 'F' ? 'TRƯỢT' : '');
        return row;
      }),
    ];
    const wsDetail = window.XLSX.utils.aoa_to_sheet(detailSheetData);

    window.XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiet mon');

    //Sheet 3: Warning table
    const warningSheetData = [
      ['Tổng số tín chỉ đang nợ', HG.lastExportData.canhCaoHienTai.Y],
      ['Mức cảnh cáo hiện tại', `Mức ${HG.lastExportData.canhCaoHienTai.newLevel}`],
      [],
      ['Học kỳ', 'Số tín chỉ nợ trong kỳ', 'Tổng số tín chỉ đang nợ', 'Mức cảnh cáo'],
      ...HG.lastExportData.historyCanhCao.map((it) => [it.semesterName, it.X, it.Y, `Mức ${it.newLevel}`]),
    ];
    const wsWarning = window.XLSX.utils.aoa_to_sheet(warningSheetData);
    window.XLSX.utils.book_append_sheet(wb, wsWarning, 'Canh cao hoc tap');

    window.XLSX.writeFile(wb, 'bang-diem-gpa-cpa.xlsx');
  }

  HG.exportInputData = function () {
    const studentInfo = HG.scrapeStudentInfo();
    const data = {
      type: 'hust-gpa-input-data',
      version: 1,
      exportedAt: new Date().toISOString(),
      studentInfo,
      IDs: Array.from(HG.IDs),
      excludedSemesters: Array.from(HG.excludedSemesters),
      courseInputs: HG.courseInputs,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const rawName = (studentInfo && studentInfo.name ? studentInfo.name : '').trim();
    const rawId = (studentInfo && studentInfo.studentId ? studentInfo.studentId : '').trim();
    const safeName = rawName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    let fileName;
    if (safeName && rawId) fileName = `${safeName}_${rawId}.json`;
    else if (safeName) fileName = `${safeName}.json`;
    else if (rawId) fileName = `${rawId}.json`;
    else fileName = 'hust-gpa-du-lieu-da-nhap.json';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  //Function to import input data
  HG.importInputData = function (file) {
    const reader = new FileReader();

    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        alert('Không đọc được file. Hãy chắc chắn đây là file JSON hợp lệ do extension này tạo ra.');
        return;
      }

      if (!data || data.type !== 'hust-gpa-input-data' || !data.courseInputs || typeof data.courseInputs !== 'object' || Array.isArray(data.courseInputs)) {
        alert('File không đúng định dạng dữ liệu của HUST GPA/CPA Calculator. Vui lòng chọn đúng file đã tải xuống trước đó bằng nút "Lưu dữ liệu điểm đã nhập".');
        return;
      }

      const savedId = data.studentInfo && data.studentInfo.studentId;
      const currentId = HG.scrapeStudentInfo().studentId;
      if (savedId && currentId && savedId !== currentId) {
        if (!confirm(`File này được lưu cho MSSV ${savedId}, nhưng bạn đang đăng nhập MSSV ${currentId}. Vẫn nạp dữ liệu?`)) return;
      }

      HG.IDs = HG.toStringSet(data.IDs);
      HG.excludedSemesters = HG.toStringSet(data.excludedSemesters);
      HG.courseInputs = HG.sanitizeCourseInputs(data.courseInputs);
      HG.saveState();

      if (HG.currentCourses) {
        HG.renderCourseInputs(HG.currentCourses);
      }

      const resultEl = document.getElementById('hgm-result');
      if (resultEl) resultEl.innerHTML = '';
      HG.lastExportData = null;
      HG.lastResults = null;
      const pdfBtn = document.getElementById('hgm-export-pdf');
      const excelBtn = document.getElementById('hgm-export-excel');
      if (pdfBtn) pdfBtn.disabled = true;
      if (excelBtn) excelBtn.disabled = true;

      alert('Đã nạp dữ liệu điểm đã lưu thành công! Bấm "Tính GPA / CPA" để xem kết quả.');
    };

    reader.onerror = () => {
      alert('Không thể đọc file, vui lòng thử lại.');
    };

    reader.readAsText(file);
  }

  //Init function
  HG.init = function () {
    if (document.getElementById('hust-gpa-fab')) return;
    const table = HG.findTranscriptTable();
    if (table) {
      HG.buildFloatingButton();
      return;
    }
    const observer = new MutationObserver(() => {
      const t = HG.findTranscriptTable();
      if (t) {
        HG.buildFloatingButton();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  HG.init();

})(window.__hustGpa);