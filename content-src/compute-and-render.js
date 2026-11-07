//Mission: Compute and Render Results

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';


  //Function to check if a score value is valid
  //Valid: is a number, within [0, 10], and divisible by 0.5
  HG.isValidScoreValue = function (val) {
    if (isNaN(val)) return false;
    if (val < 0 || val > 10) return false;
    const scaled = val * 2;
    return Math.abs(Math.round(scaled) - scaled) < 1e-9;
  }

  //Function to check if a score input is valid (based on the current value in the input field )
  HG.isScoreInputValid = function (inputEl) {
    if (!inputEl) return true;
    return HG.isValidScoreValue(parseFloat(inputEl.value));
  }

  //Function to validate all score inputs before computation
  //Groups error labels by course and combines them into a single error message
  HG.validateAllScoreInputs = function (courses) {
    const invalidByCourse = [];

    const addError = (courseName, label) => {
      let entry = invalidByCourse.find((e) => e.name === courseName);
      if (!entry) {
        entry = { name: courseName, labels: [] };
        invalidByCourse.push(entry);
      }
      if (!entry.labels.includes(label)) entry.labels.push(label);
    };

    for (const c of courses) {
      if (c.Credit === 0 || HG.checkMIL(c.ID)) continue;
      if (HG.IDs.has(c.id)) continue;
      if (HG.excludedSemesters.has(c.semesterKey)) continue;
      const auto = HG.checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;

      if (auto) {
        //Only check the custom QT/CK inputs when in "Use QT-CK points" mode
        const autoModeEl = document.querySelector(`input[name="mode-${c.id}"]:checked`);
        const toggle = document.getElementById(`custom-toggle-${c.id}`);
        if (toggle && toggle.checked && !(autoModeEl && autoModeEl.value === 'letter')) {
          const qtInput = document.getElementById(`custom-qt-${c.id}`);
          const ckInput = document.getElementById(`custom-ck-${c.id}`);
          if (!HG.isScoreInputValid(qtInput)) addError(c.Name, 'QT');
          if (!HG.isScoreInputValid(ckInput)) addError(c.Name, 'CK');
        }
      } else {
        const modeEl = document.querySelector(`input[name="mode-${c.id}"]:checked`);
        const mode = modeEl ? modeEl.value : 'letter';
        if (mode === 'weight') {
          if (c.qt === null) {
            const fakeQtInput = document.getElementById(`fake-qt-${c.id}`);
            if (!HG.isScoreInputValid(fakeQtInput)) addError(c.Name, 'QT');
          }
          if (c.ck === null) {
            const fakeCkInput = document.getElementById(`fake-ck-${c.id}`);
            if (!HG.isScoreInputValid(fakeCkInput)) addError(c.Name, 'CK');
          }
        }
      }
    }

    if (invalidByCourse.length > 0) {
      const parts = invalidByCourse.map((e) => `điểm ${e.labels.join(' và ')} của học phần ${e.name}`);
      alert(`Không thể tính toán do: ${parts.join(', ')} không hợp lệ. Vui lòng chọn 1 số từ 0 đến 10 và chia hết cho 0.5`);
      return false;
    }
    return true;
  }

  //Function to compute GPA/CPA and render results
  HG.computeAndRender = function (courses) {
    if (!HG.validateAllScoreInputs(courses)) return;

    const results = [];

    for (const c of courses) {
      if (c.Credit === 0 || HG.checkMIL(c.ID)) continue;
      if (HG.IDs.has(c.id)) continue;
      if (HG.excludedSemesters.has(c.semesterKey)) continue;
      const auto = HG.checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;

      let score10 = null, scoreLetter, score4;

      //Calculate points for MI/SSH courses
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
        //Default weight 5-5; if tick "Custom QT-CK weight" then use user-defined weight
        const modeEl = document.querySelector(`input[name="mode-${c.id}"]:checked`);
        let wQt = 0.5, wCk = 0.5;
        const weightToggle = document.getElementById(`custom-weight-toggle-${c.id}`);
        const weightInput = document.getElementById(`custom-weight-input-${c.id}`);
        if (weightToggle && weightToggle.checked && weightInput && !(modeEl && modeEl.value === 'letter')) {
          const parts = weightInput.value.split('-');
          wQt = parseInt(parts[0], 10) / 10;
          wCk = parseInt(parts[1], 10) / 10;
        }
        score10 = qtDefault * wQt + ckDefault * wCk;
        [scoreLetter, score4] = HG.change(score10, qtDefault, ckDefault);

        if (modeEl && modeEl.value === 'letter') {
          const lInput = document.getElementById(`letter-input-${c.id}`);
          scoreLetter = lInput.value;
          score4 = HG.LETTER_TO_4[scoreLetter];
        }

      //Calculate points for remaining courses
      } else {
        const modeEl = document.querySelector(`input[name="mode-${c.id}"]:checked`);
        const mode = modeEl ? modeEl.value : 'letter';
        //Calculate points based on QT-CK weights
        if (mode === 'weight') {
          const wInput = document.getElementById(`weight-input-${c.id}`);
          const parts = (wInput.value || '5-5').split('-');
          const wqt = parseInt(parts[0], 10);
          const wck = parseInt(parts[1], 10);

          //If the course doesn't have real QT/CK scores, use the user-defined fake scores
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
          [scoreLetter, score4] = HG.change(score10, qtDung, ckDung);

        //Calculate points based on letter grades
        } else {
          const lInput = document.getElementById(`letter-input-${c.id}`);
          scoreLetter = lInput.value;
          score4 = HG.LETTER_TO_4[scoreLetter];
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

    const showScore10Checkbox = document.getElementById('hgm-show-score10');
    const showScore10 = !!(showScore10Checkbox && showScore10Checkbox.checked);
    HG.lastResults = results;
    HG.renderResult(results, showScore10);
  }

  //Function to choose a "nice" step size for the Y-axis based on the value range (target ~5-6 tick marks)
  HG.niceStep = function (range) {
    const rawStep = range / 5;
    const steps = [0.1, 0.2, 0.25, 0.5, 1];
    for (const s of steps) {
      if (rawStep <= s) return s;
    }
    return 1;
  }

  //Function to draw Line Chart
  HG.drawLineChart = function (title, labels, values, color, chartId, pointLabels, darkMode, staticLabels) {
    const width = 640, height = 250;
    const padL = 46, padR = 20, padT = 16, padB = 46;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const bands = darkMode
      ? [
          { min: 3.6, max: Infinity, label: 'Xuất sắc', fill: null, textColor: '#ce93d8' },
          { min: 3.2, max: 3.6, label: 'Giỏi', fill: 'rgba(76,175,80,0.28)', textColor: '#81c784' },
          { min: 2.5, max: 3.2, label: 'Khá', fill: 'rgba(255,193,7,0.28)', textColor: '#ffd54f' },
          { min: 2.0, max: 2.5, label: 'Trung bình', fill: 'rgba(255,112,67,0.26)', textColor: '#ffab91' },
          { min: -Infinity, max: 2.0, label: 'Yếu', fill: 'rgba(239,83,80,0.26)', textColor: '#ef9a9a' },
        ]
      : [
          { min: 3.6, max: Infinity, label: 'Xuất sắc', fill: null, textColor: '#8e24aa' },
          { min: 3.2, max: 3.6, label: 'Giỏi', fill: 'rgba(67,160,71,0.18)', textColor: '#2e7d32' },
          { min: 2.5, max: 3.2, label: 'Khá', fill: 'rgba(251,192,45,0.28)', textColor: '#8d6200' },
          { min: 2.0, max: 2.5, label: 'Trung bình', fill: 'rgba(239,108,0,0.18)', textColor: '#c05e00' },
          { min: -Infinity, max: 2.0, label: 'Yếu', fill: 'rgba(211,47,47,0.16)', textColor: '#b71c1c' },
        ];

    const axisColor = darkMode ? '#8a8b90' : '#222';
    const gridColor = darkMode ? '#45464a' : '#dde3ea';
    const textColor = darkMode ? '#cfcfcf' : '#444';

    const validValues = values.length > 0 ? values : [0];
    let dataMin = Math.min(...validValues);
    let dataMax = Math.max(...validValues);
    if (dataMin === dataMax) {
      dataMin -= 0.5;
      dataMax += 0.5;
    }
    const padding = Math.max((dataMax - dataMin) * 0.15, 0.1);
    let minY = Math.max(0, dataMin - padding);
    let maxY = Math.min(4, dataMax + padding);
    if (maxY - minY < 0.5) {
      const mid = (maxY + minY) / 2;
      minY = Math.max(0, mid - 0.25);
      maxY = Math.min(4, mid + 0.25);
    }
    const step = HG.niceStep(maxY - minY);
    minY = Math.max(0, Math.floor(minY / step) * step);
    maxY = Math.min(4, Math.ceil(maxY / step) * step);

    const ticks = [];
    for (let t = minY; t <= maxY + 1e-9; t += step) {
      ticks.push(Math.round(t * 100) / 100);
    }

    const yToPixel = (v) => padT + chartH - ((v - minY) / (maxY - minY)) * chartH;

    const n = labels.length;
    const stepX = n > 1 ? chartW / (n - 1) : 0;

    const points = values.map((v, i) => {
      const x = padL + (n > 1 ? i * stepX : chartW / 2);
      const clampedV = Math.max(minY, Math.min(maxY, v));
      const y = yToPixel(clampedV);
      return { x, y, v };
    });

    const bandRects = bands
      .map((band) => {
        const bandMin = Math.max(band.min, minY);
        const bandMax = Math.min(band.max, maxY);
        if (bandMax <= bandMin) return '';
        const yTop = yToPixel(bandMax);
        const yBottom = yToPixel(bandMin);
        const rect = band.fill ? `<rect x="${padL}" y="${yTop}" width="${chartW}" height="${yBottom - yTop}" fill="${band.fill}"/>` : '';
        const bandHeightPx = yBottom - yTop;
        const label = bandHeightPx >= 14
          ? `<text x="${padL + chartW - 4}" y="${yTop + 12}" font-size="10" font-weight="600" fill="${band.textColor}" text-anchor="end">${band.label}</text>`
          : '';
        return rect + label;
      })
      .join('');

    const gridLines = ticks
      .map((t) => {
        const y = yToPixel(t);
        return `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="${gridColor}" stroke-dasharray="4 3" stroke-width="1"/>
                <text x="${padL - 8}" y="${y + 4}" font-size="12" fill="${textColor}" text-anchor="end">${t.toFixed(2)}</text>`;
      })
      .join('');

    const xLabels = labels
      .map((lb, i) => {
        const x = points[i].x;
        return `<text x="${x}" y="${padT + chartH + 20}" font-size="12" fill="${textColor}" text-anchor="end" transform="rotate(-30 ${x} ${padT + chartH + 20})">${HG.escapeHtml(lb)}</text>`;
      })
      .join('');

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

    const dots = points
      .map((p, i) => {
        const valueText = p.v.toFixed(2);
        const tooltipWidth = Math.max(40, valueText.length * 7 + 16);
        const tooltipAboveY = p.y - 30;
        const tooltipY = tooltipAboveY < padT ? p.y + 14 : tooltipAboveY;
        let tooltipX = p.x - tooltipWidth / 2;
        if (tooltipX < 0) tooltipX = 0;
        if (tooltipX + tooltipWidth > width) tooltipX = width - tooltipWidth;
        const pointId = `${chartId}-pt-${i}`;
        const labelDisplay = staticLabels ? 'block' : 'none';
        return `
          <g>
            <line id="vline-${pointId}" class="hgm-chart-vline" x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${padT + chartH}" stroke="${color}" stroke-width="2.5" style="display:none;" pointer-events="none"></line>
            <circle class="hgm-chart-point" data-tooltip="tooltip-${pointId}" data-vline="vline-${pointId}" cx="${p.x}" cy="${p.y}" r="5.5" fill="${color}" style="cursor:pointer;"></circle>
            <g id="tooltip-${pointId}" class="hgm-chart-tooltip" style="display:${labelDisplay};" pointer-events="none">
              <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipWidth}" height="20" rx="4" fill="${color}"></rect>
              <text x="${tooltipX + tooltipWidth / 2}" y="${tooltipY + 14}" font-size="11" fill="#fff" text-anchor="middle">${valueText}</text>
            </g>
          </g>
        `;
      })
      .join('');

    const svgMarkup = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" class="hgm-chart-svg">
      ${bandRects}
      <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" fill="none" stroke="${axisColor}" stroke-width="1"/>
      ${gridLines}
      ${xLabels}
      <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2.5"/>
      ${dots}
    </svg>`;

    return `
      <div class="hgm-chart-card">
        <div class="hgm-chart-title">${title}</div>
        ${svgMarkup}
      </div>
    `;
  }

  HG.extractSvgFromChartHtml = function (chartHtml) {
    const m = chartHtml && chartHtml.match(/<svg[\s\S]*<\/svg>/);
    return m ? m[0] : null;
  }

  HG.svgToPngDataUrl = function (svgMarkup, pxWidth, pxHeight) {
    return new Promise((resolve, reject) => {
      try {
        const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = pxWidth * scale;
          canvas.height = pxHeight * scale;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(blobUrl);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(blobUrl);
          reject(err);
        };
        img.src = blobUrl;
      } catch (err) {
        reject(err);
      }
    });
  }

  HG.attachChartTooltips = function () {
    document.querySelectorAll('.hgm-chart-point').forEach((point) => {
      const tooltipId = point.getAttribute('data-tooltip');
      const vlineId = point.getAttribute('data-vline');
      const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
      const vline = vlineId ? document.getElementById(vlineId) : null;
      if (!tooltip && !vline) return;
      point.addEventListener('mouseenter', () => {
        if (tooltip) tooltip.style.display = 'block';
        if (vline) vline.style.display = 'block';
      });
      point.addEventListener('mouseleave', () => {
        if (tooltip) tooltip.style.display = 'none';
        if (vline) vline.style.display = 'none';
      });
    });
  }


  //Fomula to calculate academic warning:
  //X = the number of credits failed in the current semester
  //Y = total number of credits failed since the beginning of the program
  //X > 16: up 2 rank | X > 8: up 1 rank | X <= 4 (currently at rank 1 or 2): down 1 rank
  //Currently at rank 3 and Y <= 24: down to rank 2
  //Y > 24: always pushed to at least rank 3 (highest priority)

  //Function to calculate academic warning level for each semester based on the results
  HG.tinhCanhCaoHocTap = function (semesterKeysAsc, results) {
    const attemptsSoFar = {};
    const creditByID = {};
    let oldLevel = 0;
    const history = [];

    semesterKeysAsc.forEach((key) => {
      const itemsThisSem = results.filter((r) => r.semesterKey === key);
      if (itemsThisSem.length === 0) return;

      let X = 0;
      itemsThisSem.forEach((it) => { if (it.score4 === 0) X += it.Credit; });

      //Update the current semester's score table
      itemsThisSem.forEach((it) => {
        creditByID[it.ID] = it.Credit;
        if (attemptsSoFar[it.ID] === undefined || it.score4 > attemptsSoFar[it.ID]) {
          attemptsSoFar[it.ID] = it.score4;
        }
      });

      let Y = 0;
      Object.keys(attemptsSoFar).forEach((id) => {
        if (attemptsSoFar[id] === 0) Y += creditByID[id];
      });

      const isKyHe = /3$/.test(key);

      //Find the new academic warning level based on the current semester's X and total Y
      let newLevel = oldLevel;
      if (isKyHe) {
        newLevel = oldLevel;
      } else if (oldLevel === 3) {
        newLevel = Y <= 24 ? 2 : 3;
      } else if (X > 16) {
        newLevel = Math.min(3, oldLevel + 2);
      } else if (X > 8) {
        newLevel = Math.min(3, oldLevel + 1);
      } else if (X <= 4 && (oldLevel === 1 || oldLevel === 2)) {
        newLevel = oldLevel - 1;
      }
      if (!isKyHe && Y > 24) newLevel = 3;

      history.push({
        semesterKey: key,
        semesterName: itemsThisSem[0].semesterName,
        X,
        Y,
        oldLevel,
        newLevel,
        isKyHe,
      });

      oldLevel = newLevel;
    });

    return history;
  }

  //Function to render GPA/CPA results in a modal
  HG.renderResult = function (results, showScore10) {
    //Calculate GPA by semester
    const bySemester = {};
    results.forEach((r) => {
      if (!bySemester[r.semesterKey]) bySemester[r.semesterKey] = { name: r.semesterName, items: [] };
      bySemester[r.semesterKey].items.push(r);
    });

    const semesterKeysSorted = Object.keys(bySemester).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    const semesterKeysAsc = [...semesterKeysSorted].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    //Calculate academic warning levels for each semester
    const historyCanhCao = HG.tinhCanhCaoHocTap(semesterKeysAsc, results);
    const canhCaoHienTai = historyCanhCao.length > 0 ? historyCanhCao[historyCanhCao.length - 1] : { Y: 0, newLevel: 0 };
    const colorLevel = ['#2e7d32', '#f9a825', '#ef6c00', '#c0272d'];

    //GPA table by semester
    let gpaHtml = '<h3>GPA by Semester</h3><table class="hgm-table"><tr><th>Semester</th><th>GPA (4-point scale)</th>' +
      (showScore10 ? '<th>GPA (10-point scale)</th>' : '') + '<th>Comments</th></tr>';
    semesterKeysSorted.forEach((key) => {
      const sem = bySemester[key];
      let totalScore = 0, totalCredit = 0;
      sem.items.forEach((it) => { totalScore += it.score4 * it.Credit; totalCredit += it.Credit; });
      const gpa = totalCredit > 0 ? (totalScore / totalCredit) : 0;
      const score10Cell = showScore10 ? `<td>${HG.convertScale4To10(gpa).toFixed(2)}</td>` : '';
      gpaHtml += `<tr><td>${HG.escapeHtml(sem.name)}</td><td>${gpa.toFixed(2)}</td>${score10Cell}<td>${HG.note(gpa)}</td></tr>`;
    });
    gpaHtml += '</table>';

    //Academic warning table by semester
    let canhBaoHtml = `
      <h3>Cảnh cáo học tập</h3>
      <div class="hgm-warning-summary" style="border-left-color:${colorLevel[canhCaoHienTai.newLevel]}">
        <div>Tổng số tín chỉ đang nợ: <b>${canhCaoHienTai.Y}</b> tín chỉ</div>
        <div>Mức cảnh cáo hiện tại: <b style="color:${colorLevel[canhCaoHienTai.newLevel]}">Mức ${canhCaoHienTai.newLevel}</b>${canhCaoHienTai.newLevel === 3 ? ' — nguy cơ buộc thôi học nếu tiếp tục bị mức 3 kỳ tiếp theo' : ''}</div>
      </div>
      <table class="hgm-table"><tr><th>Học kỳ</th><th>Số tín chỉ nợ trong kỳ</th><th>Tổng số tín chỉ đang nợ</th><th>Mức cảnh cáo</th></tr>`;
    historyCanhCao.forEach((it) => {
      const tenKy = HG.escapeHtml(it.semesterName) + (it.isKyHe ? ' <span style="color:#999;font-weight:400;font-style:italic;">(không xét cảnh cáo)</span>' : '');
      canhBaoHtml += `<tr><td>${tenKy}</td><td>${it.X}</td><td>${it.Y}</td><td style="color:${colorLevel[it.newLevel]};font-weight:700;">Mức ${it.newLevel}</td></tr>`;
    });
    canhBaoHtml += '</table>';

    //Calculate CPA
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

    const cpa10 = HG.convertScale4To10(cpa);
    const cpaScore10Text = showScore10 ? ` | CPA hệ 10: <b>${cpa10.toFixed(2)}</b>` : '';
    let cpaHtml = `<h3>CPA</h3>
      <div class="hgm-cpa-value">CPA hệ 4: <b>${cpa.toFixed(2)}</b>${cpaScore10Text} (tổng ${totalCredit_CPA} tín chỉ, ${distinctCourses.length} học phần)</div>
      <div class="hgm-cpa-message">${HG.note(cpa)}</div>`;

    //Score table
    cpaHtml += `<table class="hgm-table"><tr><th>Mã học phần</th><th>Tên học phần</th><th>TC</th><th>Điểm chữ</th><th>Điểm hệ 4</th>${showScore10 ? '<th>Điểm hệ 10</th>' : ''}</tr>`;
    distinctCourses
      .sort((a, b) => a.ID.localeCompare(b.ID))
      .forEach((it) => {
        const failClass = it.scoreLetter === 'F' ? ' class="hgm-tr-fail"' : '';
        const score10Cell = showScore10 ? `<td class="hgm-score">${HG.convertScale4To10(it.score4).toFixed(2)}</td>` : '';
        cpaHtml += `<tr${failClass}><td class="hgm-ID">${HG.escapeHtml(it.ID)}</td><td class="hgm-Name">${HG.escapeHtml(it.Name)}</td><td>${it.Credit}</td><td class="hgm-score">${it.scoreLetter}</td><td class="hgm-score">${it.score4.toFixed(2)}</td>${score10Cell}</tr>`;
      });
    cpaHtml += '</table>';

    //Draw GPA/CPA chart by semester
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

    //Full name of each semester
    const semesterFullNames = semesterKeysAsc.map((k) => bySemester[k].name);
    const isDarkMode = !!document.getElementById('hust-gpa-modal')?.classList.contains('hgm-dark');

    const chartHtml =
      '<h3>Biểu đồ GPA/CPA theo học kỳ</h3>' +
      HG.drawLineChart('GPA - Điểm trung bình học kỳ', gpaLabels, gpaValues, '#c0272d', 'gpa-chart', semesterFullNames, isDarkMode) +
      HG.drawLineChart('CPA - Điểm trung bình tích lũy', gpaLabels, cpaValues, '#c0272d', 'cpa-chart', semesterFullNames, isDarkMode);

    document.getElementById('hgm-result').innerHTML = gpaHtml + canhBaoHtml + cpaHtml + chartHtml;

    HG.attachChartTooltips();

    //Save the last computed data for export (PDF/Excel)
    HG.lastExportData = {
      studentInfo: HG.scrapeStudentInfo(),
      showScore10,
      gpaBySemester: semesterKeysSorted.map((key) => {
        const sem = bySemester[key];
        let totalScore = 0, totalCredit = 0;
        sem.items.forEach((it) => { totalScore += it.score4 * it.Credit; totalCredit += it.Credit; });
        const gpa = totalCredit > 0 ? totalScore / totalCredit : 0;
        return { name: sem.name, gpa, gpa10: HG.convertScale4To10(gpa), tinChi: totalCredit };
      }),
      cpa,
      cpa10: HG.convertScale4To10(cpa),
      totalCredit_CPA,
      distinctCourses,
      historyCanhCao,
      canhCaoHienTai,
      chartData: {
        labels: gpaLabels,
        pointLabels: semesterFullNames,
        gpaValues,
        cpaValues,
      },
    };
    const pdfBtn = document.getElementById('hgm-export-pdf');
    const excelBtn = document.getElementById('hgm-export-excel');
    if (pdfBtn) pdfBtn.disabled = false;
    if (excelBtn) excelBtn.disabled = false;
  }

})(window.__hustGpa);