(function () {
  'use strict';

//Part 1: Các hàm xử lý điểm

  //Quy đổi thang điểm hệ 10 sang thang điểm hệ 4 và thang điểm hệ chữ
  function change(score10) {
    if (score10 >= 9.5) return ['A+', 4.0];
    if (score10 >= 8.5) return ['A', 4.0];
    if (score10 >= 8.0) return ['B+', 3.5];
    if (score10 >= 7.0) return ['B', 3.0];
    if (score10 >= 6.5) return ['C+', 2.5];
    if (score10 >= 5.5) return ['C', 2.0];
    if (score10 >= 5.0) return ['D+', 1.5];
    if (score10 >= 4.0) return ['D', 1.0];
    return ['F', 0.0];
  }

  const LETTER_OPTIONS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
  const WEIGHT_OPTIONS = ['1-9', '2-8', '3-7', '4-6', '5-5', '6-4', '7-3', '8-2', '9-1'];
  const LETTER_TO_4 = { 'A+': 4.0, 'A': 4.0, 'B+': 3.5, 'B': 3.0, 'C+': 2.5, 'C': 2.0, 'D+': 1.5, 'D': 1.0, 'F': 0.0 };

  //Hàm in ghi chú theo thang điểm hệ 4
  function note(score4) {
    if (score4 >= 3.6) return 'Chuc mung cau chu thang lon!';
    if (score4 >= 3.2) return 'Đôi khi chỉ cần biết đủ...';
    if (score4 >= 2.5) return 'Cố lên sắp nổ hũ chuỗi thua rồi!';
    return 'Thôi thì làm sinh viên năm 8 vậy...';
  }

  const IDs = new Set();

//Part 5 (bổ sung): Xuất báo cáo PDF / Excel

  //Biến lưu lại dữ liệu tính toán gần nhất để 2 nút xuất file dùng lại
  let lastExportData = null;

  //Hàm trích xuất điểm
  function parseScoreValue(text) {
    if (!text) return null;
    const m = text.trim().match(/^([\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  }

  //Hàm check môn MI/SSH
  function checkMIorSSH(ID) {
    return /^(MI|SSH)/i.test(ID.trim());
  }

//Part 2: Web Scraper

  //Scrap bảng điểm cá nhân từ trang web
  function findTranscriptTable() {
    const tables = document.querySelectorAll('table');
    for (const t of tables) {
      if (t.querySelector('tbody.ant-table-tbody tr[data-row-key]')) return t;
    }
    return null;
  }

  //Đọc dữ liệu từ bảng điểm
  function scrapeData() {
    const table = findTranscriptTable();
    if (!table) return null;

    const rows = table.querySelectorAll('tbody.ant-table-tbody > tr');
    let currentSemesterKey = null;
    let currentSemesterName = null;
    const courses = [];

    rows.forEach((row) => {
      if (row.classList.contains('ant-table-measure-row')) return;
      const key = row.getAttribute('data-row-key');
      if (!key) return;

      // Level 0: Semester, Level 1: Course
      if (row.classList.contains('ant-table-row-level-0')) {
        currentSemesterKey = key;
        const titleEl = row.querySelector('.title-semester');
        currentSemesterName = titleEl ? titleEl.childNodes[0].textContent.trim() : key;
        return;
      }

      if (row.classList.contains('ant-table-row-level-1')) {
        const tds = row.querySelectorAll('td');
        if (tds.length < 5) return;

        const ID = tds[1].textContent.trim();
        const Name = tds[2].textContent.trim();
        const Credit = parseFloat(tds[3].textContent.trim()) || 0;

        let qt = null, ck = null, tnth = null;
        tds[4].querySelectorAll('.score-map-item').forEach((item) => {
          const keyText = item.querySelector('.score-map-item-key').textContent.trim();
          const valText = item.querySelector('.score-map-item-value').textContent.trim();
          const val = parseScoreValue(valText);
          if (keyText.startsWith('QT')) qt = val;
          else if (keyText.startsWith('CK')) ck = val;
          else if (keyText.startsWith('TN')) tnth = val;
        });

        courses.push({
          id: `${key}__${ID}`,
          ID,
          Name,
          Credit,
          qt,
          ck,
          tnth,
          semesterKey: currentSemesterKey,
          semesterName: currentSemesterName,
        });
      }
    });

    return courses;
  }

//Part 3: UI

  //Hàm tạo Button nổi trên trang
  function buildFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'hust-gpa-fab';
    btn.textContent = '📊 Tính GPA/CPA';
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);
  }

  //Hàm mở Modal
  function openModal() {
    const courses = scrapeData();
    if (!courses || courses.length === 0) {
      alert('Không tìm thấy bảng điểm trên trang. Hãy đảm bảo bạn đang ở trang "Xem điểm" và bảng đã load xong.');
      return;
    }
    IDs.clear();

    const existing = document.getElementById('hust-gpa-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hust-gpa-overlay';

    const modal = document.createElement('div');
    modal.id = 'hust-gpa-modal';

    modal.innerHTML = `
      <div class="hgm-header">
        <h2>Tính GPA / CPA</h2>
        <button id="hgm-close">✕</button>
      </div>
      <div class="hgm-note">
        Môn bắt đầu bằng <b>MI</b> hoặc <b>SSH</b> mặc định dùng trọng số QT-CK = 5-5;
        có thể chọn "Tự nhập điểm QT-CK". Các môn khác có thể chọn chế độ nhập: "Chọn trọng số QT-CK" hoặc "Nhập điểm chữ".
      </div>
      <div id="hgm-body"></div>
      <div class="hgm-footer">
        <button id="hgm-calc">Tính GPA / CPA</button>
        <button id="hgm-export-pdf" class="hgm-export-btn" disabled>📄 Xuất PDF</button>
        <button id="hgm-export-excel" class="hgm-export-btn" disabled>📊 Xuất Excel</button>
      </div>
      <div id="hgm-result"></div>
      <div class="hgm-credit">Extension được phát triển bởi DucTapCodeDao</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('hgm-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    renderCourseInputs(courses);
    document.getElementById('hgm-calc').addEventListener('click', () => computeAndRender(courses));

    //Gắn event cho 2 nút xuất file (chỉ bật sau khi đã tính GPA/CPA ít nhất 1 lần)
    document.getElementById('hgm-export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('hgm-export-excel').addEventListener('click', exportToExcel);
  }

  //Hàm xử lý danh sách Course và render ra modal
  function renderCourseInputs(courses) {
    const body = document.getElementById('hgm-body');
    const grouped = {};

    //Nhóm các Course theo Semester
    courses.forEach((c) => {
      if (c.Credit === 0) return; //Bỏ các Course có Credit = 0
      if (!grouped[c.semesterName]) grouped[c.semesterName] = [];
      grouped[c.semesterName].push(c);
    });

    let html = '';
    for (const semName of Object.keys(grouped)) {
      html += `<div class="hgm-semester"><div class="hgm-semester-title">${semName}</div>`;
      grouped[semName].forEach((c) => {
        const auto = checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
        html += renderCourseRow(c, auto);
      });
      html += `</div>`;
    }
    body.innerHTML = html;

    //Gắn event cho button loại Course khỏi tính toán
    document.querySelectorAll('.hgm-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-id');
        const rowEl = document.querySelector(`.hgm-row[data-id="${id}"]`);
        if (IDs.has(id)) {
          IDs.delete(id);
          rowEl.classList.remove('hgm-row-excluded');
          btn.textContent = '−';
          btn.title = 'Loại môn này khỏi tính toán';
        } else {
          IDs.add(id);
          rowEl.classList.add('hgm-row-excluded');
          btn.textContent = '+';
          btn.title = 'Đưa môn này trở lại tính toán';
        }
      });
    });

    //Gắn event toggle chế độ tự nhập QT-CK cho các Course MI hoặc SSH
    courses.forEach((c) => {
      if (c.Credit === 0) return;
      const auto = checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
      if (!auto) return;
      const toggle = document.getElementById(`custom-toggle-${c.id}`);
      if (!toggle) return;
      toggle.addEventListener('change', () => {
        const box = document.getElementById(`custom-box-${c.id}`);
        box.style.display = toggle.checked ? '' : 'none';
      });
    });

    //Gắn event đổi chế độ nhập cho các Course còn lại
    courses.forEach((c) => {
      if (c.Credit === 0) return;
      const auto = checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
      if (auto) return;
      const radios = document.querySelectorAll(`input[name="mode-${c.id}"]`);
      radios.forEach((r) => {
        r.addEventListener('change', () => {
          //weightBox: chọn trọng số QT-CK, letterBox: nhập điểm chữ
          const weightBox = document.getElementById(`weight-box-${c.id}`);
          const letterBox = document.getElementById(`letter-box-${c.id}`);
          if (r.value === 'weight') {
            weightBox.style.display = '';
            letterBox.style.display = 'none';
          } else {
            weightBox.style.display = 'none';
            letterBox.style.display = '';
          }
        });
      });
    });
  }

  //Hàm tạo HTML cho 1 Course
  function renderCourseRow(c, auto) {
    const qtText = c.qt !== null ? c.qt : '-';
    const ckText = c.ck !== null ? c.ck : '-';
    const tnthText = c.tnth !== null ? ` | <b>TN/TH:</b> <span class="hgm-score">${c.tnth}</span>` : '';
    const removeBtn = `<button class="hgm-remove-btn" data-remove-id="${c.id}" title="Loại môn này khỏi tính toán">−</button>`;

    if (auto) {
      return `
        <div class="hgm-row hgm-row-auto" data-id="${c.id}">
          ${removeBtn}
          <div class="hgm-row-main">
            <span class="hgm-ID">${c.ID}</span> - <span class="hgm-Name">${c.Name}</span> (${c.Credit} TC)
            <span class="hgm-badge">Tự động 5-5</span>
          </div>
          <div class="hgm-row-sub"><b>QT:</b> <span class="hgm-score">${qtText}</span> | <b>CK:</b> <span class="hgm-score">${ckText}</span>${tnthText}</div>
          <div class="hgm-row-mode">
            <label><input type="checkbox" id="custom-toggle-${c.id}"> <b>Tự nhập điểm QT-CK</b></label>
          </div>
          <div id="custom-box-${c.id}" class="hgm-row-input" style="display:none;">
            <b>QT giả định:</b> <input type="number" step="0.1" min="0" max="10" id="custom-qt-${c.id}" value="${c.qt !== null ? c.qt : 0}" style="width:60px;">
            <b>CK giả định:</b> <input type="number" step="0.1" min="0" max="10" id="custom-ck-${c.id}" value="${c.ck !== null ? c.ck : 0}" style="width:60px;">
          </div>
        </div>
      `;
    }

    const letterOptions = LETTER_OPTIONS.map((l) => `<option value="${l}">${l}</option>`).join('');
    const weightOptions = WEIGHT_OPTIONS.map(
      (w) => `<option value="${w}" ${w === '5-5' ? 'selected' : ''}>${w} (QT ${w.split('-')[0]}0% - CK ${w.split('-')[1]}0%)</option>`
    ).join('');
    const canWeight = c.qt !== null && c.ck !== null;

    //Nếu môn chưa có điểm QT/CK thật, cho phép nhập điểm giả định
    const fakeScoreRow = canWeight
      ? ''
      : `<br><b>QT:</b> <input type="number" step="0.1" min="0" max="10" id="fake-qt-${c.id}" placeholder="Nhập QT giả định" value="0" style="width:60px;">
         &nbsp; <b>CK:</b> <input type="number" step="0.1" min="0" max="10" id="fake-ck-${c.id}" placeholder="Nhập CK giả định" value="0" style="width:60px;">`;

    return `
      <div class="hgm-row" data-id="${c.id}">
        ${removeBtn}
        <div class="hgm-row-main">
          <span class="hgm-ID">${c.ID}</span> - <span class="hgm-Name">${c.Name}</span> (${c.Credit} TC)
        </div>
        <div class="hgm-row-sub"><b>QT:</b> <span class="hgm-score">${qtText}</span> | <b>CK:</b> <span class="hgm-score">${ckText}</span>${tnthText}</div>
        <div class="hgm-row-mode">
          <label><input type="radio" name="mode-${c.id}" value="weight" checked> <b>Chọn trọng số QT-CK</b>${canWeight ? '' : ' (điểm giả định)'}</label>
          <label><input type="radio" name="mode-${c.id}" value="letter"> <b>Nhập điểm chữ</b></label>
        </div>
        <div id="weight-box-${c.id}" class="hgm-row-input">
          <b>Trọng số (QT-CK):</b> <select id="weight-input-${c.id}">${weightOptions}</select>${fakeScoreRow}
        </div>
        <div id="letter-box-${c.id}" class="hgm-row-input" style="display:none;">
          <b>Điểm chữ:</b> <select id="letter-input-${c.id}">${letterOptions}</select>
        </div>
      </div>
    `;
  }

//Part 4: Tính toán và render kết quả

  //Hàm tính toán GPA/CPA và render kết quả
  function computeAndRender(courses) {
    const results = [];

    for (const c of courses) {
      if (c.Credit === 0) continue;
      if (IDs.has(c.id)) continue;
      const auto = checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;

      let score10 = null, scoreLetter, score4;

      //Tính điểm các môn MI/SSH
      if (auto) {
        let qtDefault = c.qt, ckDefault = c.ck;
        const toggle = document.getElementById(`custom-toggle-${c.id}`);
        if (toggle && toggle.checked) {
          const qtInput = document.getElementById(`custom-qt-${c.id}`);
          const ckInput = document.getElementById(`custom-ck-${c.id}`);
          const qtVal = parseFloat(qtInput.value);
          const ckVal = parseFloat(ckInput.value);
          if (!isNaN(qtVal)) qtDefault = qtVal;
          if (!isNaN(ckVal)) ckDefault = ckVal;
        }
        score10 = qtDefault * 0.5 + ckDefault * 0.5;
        [scoreLetter, score4] = change(score10);

      //Tính điểm các môn còn lại
      } else {
        const modeEl = document.querySelector(`input[name="mode-${c.id}"]:checked`);
        const mode = modeEl ? modeEl.value : 'letter';
        //Tính điểm theo trọng số QT-CK
        if (mode === 'weight') {
          const wInput = document.getElementById(`weight-input-${c.id}`);
          const parts = (wInput.value || '5-5').split('-');
          const wqt = parseInt(parts[0], 10);
          const wck = parseInt(parts[1], 10);

          //Nếu môn chưa có điểm QT/CK thật thì lấy điểm giả định người dùng tự nhập
          let qtDung = c.qt, ckDung = c.ck;
          if (c.qt === null) {
            const fakeQtInput = document.getElementById(`fake-qt-${c.id}`);
            const fakeQtVal = fakeQtInput ? parseFloat(fakeQtInput.value) : NaN;
            qtDung = isNaN(fakeQtVal) ? 0 : fakeQtVal;
          }
          if (c.ck === null) {
            const fakeCkInput = document.getElementById(`fake-ck-${c.id}`);
            const fakeCkVal = fakeCkInput ? parseFloat(fakeCkInput.value) : NaN;
            ckDung = isNaN(fakeCkVal) ? 0 : fakeCkVal;
          }

          score10 = qtDung * (wqt / 10) + ckDung * (wck / 10);
          [scoreLetter, score4] = change(score10);

        //Tính điểm theo điểm chữ
        } else {
          const lInput = document.getElementById(`letter-input-${c.id}`);
          scoreLetter = lInput.value;
          score4 = LETTER_TO_4[scoreLetter];
        }
      }

      results.push({
        ID: c.ID,
        Name: c.Name,
        Credit: c.Credit,
        semesterKey: c.semesterKey,
        semesterName: c.semesterName,
        scoreLetter,
        score4,
      });
    }

    renderResult(results);
  }

  //Hàm vẽ Line Chart
  function drawLineChart(title, labels, values, color) {
    const width = 640, height = 250;
    const padL = 46, padR = 20, padT = 16, padB = 46;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const maxY = 4.0;
    const ticks = [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6];

    const n = labels.length;
    const stepX = n > 1 ? chartW / (n - 1) : 0;

    const points = values.map((v, i) => {
      const x = padL + (n > 1 ? i * stepX : chartW / 2);
      const y = padT + chartH - (Math.min(v, maxY) / maxY) * chartH;
      return { x, y, v };
    });

    const gridLines = ticks
      .map((t) => {
        const y = padT + chartH - (t / maxY) * chartH;
        return `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#dde3ea" stroke-dasharray="4 3" stroke-width="1"/>
                <text x="${padL - 8}" y="${y + 4}" font-size="12" fill="#444" text-anchor="end">${t.toFixed(1)}</text>`;
      })
      .join('');

    const xLabels = labels
      .map((lb, i) => {
        const x = points[i].x;
        return `<text x="${x}" y="${padT + chartH + 20}" font-size="12" fill="#444" text-anchor="end" transform="rotate(-30 ${x} ${padT + chartH + 20})">${lb}</text>`;
      })
      .join('');

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

    const dots = points
      .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${color}"><title>${p.v.toFixed(2)}</title></circle>`)
      .join('');

    return `
      <div class="hgm-chart-card">
        <div class="hgm-chart-title">${title}</div>
        <svg viewBox="0 0 ${width} ${height}" class="hgm-chart-svg">
          <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="none" stroke="#222" stroke-width="1"/>
          ${gridLines}
          ${xLabels}
          <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2.5"/>
          ${dots}
        </svg>
      </div>
    `;
  }

  //Hàm render kết quả GPA/CPA ra modal
  function renderResult(results) {
    //Tính GPA theo học kỳ
    const bySemester = {};
    results.forEach((r) => {
      if (!bySemester[r.semesterKey]) bySemester[r.semesterKey] = { name: r.semesterName, items: [] };
      bySemester[r.semesterKey].items.push(r);
    });

    const semesterKeysSorted = Object.keys(bySemester).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

    let gpaHtml = '<h3>GPA theo học kỳ</h3><table class="hgm-table"><tr><th>Học kỳ</th><th>GPA hệ 4</th></tr>';
    semesterKeysSorted.forEach((key) => {
      const sem = bySemester[key];
      let tongDiem4TC = 0, tongTC = 0;
      sem.items.forEach((it) => { tongDiem4TC += it.score4 * it.Credit; tongTC += it.Credit; });
      const gpa = tongTC > 0 ? (tongDiem4TC / tongTC) : 0;
      gpaHtml += `<tr><td>${sem.name}</td><td>${gpa.toFixed(2)}</td><td>${note(gpa)}</td></tr>`;
    });
    gpaHtml = gpaHtml.replace('<th>GPA hệ 4</th>', '<th>GPA hệ 4</th><th>Nhận xét</th>');
    gpaHtml += '</table>';

    //Tính CPA
    const bestByID = {};
    results.forEach((r) => {
      const existing = bestByID[r.ID];
      if (!existing || r.score4 > existing.score4) {
        bestByID[r.ID] = r;
      }
    });
    const distinctCourses = Object.values(bestByID);

    let totalScore_CPA = 0, totalCredit_CPA = 0;
    distinctCourses.forEach((it) => { totalScore_CPA += it.score4 * it.Credit; totalCredit_CPA += it.Credit; });
    const cpa = totalCredit_CPA > 0 ? (totalScore_CPA / totalCredit_CPA) : 0;

    let cpaHtml = `<h3>CPA</h3>
      <div class="hgm-cpa-value">CPA hệ 4: <b>${cpa.toFixed(2)}</b> (tổng ${totalCredit_CPA} tín chỉ, ${distinctCourses.length} môn)</div>
      <div class="hgm-cpa-message">${note(cpa)}</div>`;

    //Bảng điểm tích lũy
    cpaHtml += '<table class="hgm-table"><tr><th>Mã môn</th><th>Tên môn</th><th>TC</th><th>Điểm chữ</th><th>Điểm hệ 4</th></tr>';
    distinctCourses
      .sort((a, b) => a.ID.localeCompare(b.ID))
      .forEach((it) => {
        cpaHtml += `<tr><td class="hgm-ID">${it.ID}</td><td class="hgm-Name">${it.Name}</td><td>${it.Credit}</td><td class="hgm-score">${it.scoreLetter}</td><td class="hgm-score">${it.score4.toFixed(2)}</td></tr>`;
      });
    cpaHtml += '</table>';

    //Vẽ biểu đồ GPA/CPA theo học kỳ
    const semesterKeysAsc = [...semesterKeysSorted].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const gpaLabels = semesterKeysAsc.map((k) => k);
    const gpaValues = semesterKeysAsc.map((k) => {
      const sem = bySemester[k];
      let totalScore_GPA = 0, totalCredit_GPA = 0;
      sem.items.forEach((it) => { totalScore_GPA += it.score4 * it.Credit; totalCredit_GPA += it.Credit; });
      return totalCredit_GPA > 0 ? totalScore_GPA / totalCredit_GPA : 0;
    });

    const cpaValues = [];
    semesterKeysAsc.forEach((k, idx) => {
      const semKeysSoFar = semesterKeysAsc.slice(0, idx + 1);
      const resultsSoFar = results.filter((r) => semKeysSoFar.includes(r.semesterKey));
      const bestSoFar = {};
      resultsSoFar.forEach((r) => {
        const existing = bestSoFar[r.ID];
        if (!existing || r.score4 > existing.score4) bestSoFar[r.ID] = r;
      });
      const list = Object.values(bestSoFar);
      let totalScore_CPA = 0, totalCredit_CPA = 0;
      list.forEach((it) => { totalScore_CPA += it.score4 * it.Credit; totalCredit_CPA += it.Credit; });
      cpaValues.push(totalCredit_CPA > 0 ? totalScore_CPA / totalCredit_CPA : 0);
    });

    const chartHtml =
      '<h3>Biểu đồ GPA/CPA theo học kỳ</h3>' +
      drawLineChart('GPA - Điểm trung bình học kỳ', gpaLabels, gpaValues, '#c0272d') +
      drawLineChart('CPA - Điểm trung bình tích lũy', gpaLabels, cpaValues, '#c0272d');

    document.getElementById('hgm-result').innerHTML = gpaHtml + cpaHtml + chartHtml;

    //Lưu lại dữ liệu vừa tính để phục vụ xuất PDF/Excel, đồng thời bật 2 nút xuất file
    lastExportData = {
      gpaBySemester: semesterKeysSorted.map((key) => {
        const sem = bySemester[key];
        let tongDiem4TC = 0, tongTC = 0;
        sem.items.forEach((it) => { tongDiem4TC += it.score4 * it.Credit; tongTC += it.Credit; });
        return { name: sem.name, gpa: tongTC > 0 ? tongDiem4TC / tongTC : 0, tinChi: tongTC };
      }),
      cpa,
      totalCredit_CPA,
      distinctCourses,
    };
    const pdfBtn = document.getElementById('hgm-export-pdf');
    const excelBtn = document.getElementById('hgm-export-excel');
    if (pdfBtn) pdfBtn.disabled = false;
    if (excelBtn) excelBtn.disabled = false;
  }

  //Hàm xuất bảng điểm ra file PDF (dùng thư viện jsPDF + jspdf-autotable nạp local trong libs/)
  function exportToPDF() {
    if (!lastExportData) {
      alert('Hãy bấm "Tính GPA / CPA" trước khi xuất file.');
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('Không tải được thư viện xuất PDF. Hãy kiểm tra lại file libs/jspdf.umd.min.js trong extension.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

    // Nhúng font Noto Sans (hỗ trợ dấu tiếng Việt) để tránh lỗi font mặc định của jsPDF không có dấu
    const fontName = 'NotoSansVN';
    if (window.__NOTOSANS_VN_BASE64__) {
      doc.addFileToVFS('NotoSans-VN-normal.ttf', window.__NOTOSANS_VN_BASE64__);
      doc.addFont('NotoSans-VN-normal.ttf', fontName, 'normal');
      doc.addFileToVFS('NotoSans-VN-bold.ttf', window.__NOTOSANS_VN_BASE64__);
      doc.addFont('NotoSans-VN-bold.ttf', fontName, 'bold');
      doc.setFont(fontName, 'normal');
    }

    doc.setFontSize(16);
    doc.text('Bảng điểm - GPA/CPA (HUST GPA/CPA Calculator)', 40, 40);

    doc.setFontSize(11);
    doc.text(`CPA hệ 4: ${lastExportData.cpa.toFixed(2)} (tổng ${lastExportData.totalCredit_CPA} tín chỉ, ${lastExportData.distinctCourses.length} môn)`, 40, 62);
    doc.text(note(lastExportData.cpa), 40, 78);

    //Bảng GPA theo học kỳ
    doc.autoTable({
      startY: 96,
      head: [['Học kỳ', 'GPA hệ 4', 'Số tín chỉ']],
      body: lastExportData.gpaBySemester.map((s) => [s.name, s.gpa.toFixed(2), String(s.tinChi)]),
      styles: { fontSize: 9, font: fontName },
      headStyles: { fillColor: [192, 39, 45], font: fontName, fontStyle: 'bold' },
    });

    //Bảng điểm chi tiết
    const afterGpaY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 200;
    doc.setFontSize(12);
    doc.text('Bảng chi tiết môn (dùng để tính CPA)', 40, afterGpaY);

    doc.autoTable({
      startY: afterGpaY + 10,
      head: [['Mã môn', 'Tên môn', 'TC', 'Điểm chữ', 'Điểm hệ 4']],
      body: lastExportData.distinctCourses
        .slice()
        .sort((a, b) => a.ID.localeCompare(b.ID))
        .map((it) => [it.ID, it.Name, String(it.Credit), it.scoreLetter, it.score4.toFixed(2)]),
      styles: { fontSize: 8, font: fontName },
      headStyles: { fillColor: [192, 39, 45], font: fontName, fontStyle: 'bold' },
    });

    // Dòng credit ở cuối file PDF
    const afterDetailY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 24 : 500;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Extension được phát triển bởi DucTapCodeDao', 40, afterDetailY);

    doc.save('bang-diem-gpa-cpa.pdf');
  }

  //Hàm xuất bảng điểm ra file Excel (dùng thư viện SheetJS/xlsx nạp local trong libs/)
  function exportToExcel() {
    if (!lastExportData) {
      alert('Hãy bấm "Tính GPA / CPA" trước khi xuất file.');
      return;
    }
    if (!window.XLSX) {
      alert('Không tải được thư viện xuất Excel. Hãy kiểm tra lại file libs/xlsx.full.min.js trong extension.');
      return;
    }

    const wb = window.XLSX.utils.book_new();

    //Sheet 1: GPA theo học kỳ
    const gpaSheetData = [
      ['Học kỳ', 'GPA hệ 4', 'Số tín chỉ'],
      ...lastExportData.gpaBySemester.map((s) => [s.name, Number(s.gpa.toFixed(2)), s.tinChi]),
      [],
      ['CPA hệ 4', Number(lastExportData.cpa.toFixed(2))],
      ['Tổng tín chỉ CPA', lastExportData.totalCredit_CPA],
      [],
      ['Extension được phát triển bởi DucTapCodeDao'],
    ];
    const wsGPA = window.XLSX.utils.aoa_to_sheet(gpaSheetData);
    window.XLSX.utils.book_append_sheet(wb, wsGPA, 'GPA-CPA');

    //Sheet 2: Bảng điểm chi tiết
    const detailSheetData = [
      ['Mã môn', 'Tên môn', 'Số tín chỉ', 'Điểm chữ', 'Điểm hệ 4'],
      ...lastExportData.distinctCourses
        .slice()
        .sort((a, b) => a.ID.localeCompare(b.ID))
        .map((it) => [it.ID, it.Name, it.Credit, it.scoreLetter, Number(it.score4.toFixed(2))]),
    ];
    const wsDetail = window.XLSX.utils.aoa_to_sheet(detailSheetData);
    window.XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiet mon');

    window.XLSX.writeFile(wb, 'bang-diem-gpa-cpa.xlsx');
  }


  function init() {
    if (document.getElementById('hust-gpa-fab')) return;
    const table = findTranscriptTable();
    if (table) {
      buildFloatingButton();
      return;
    }
    const observer = new MutationObserver(() => {
      const t = findTranscriptTable();
      if (t) {
        buildFloatingButton();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();