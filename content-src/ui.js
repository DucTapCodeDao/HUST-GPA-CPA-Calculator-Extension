//Mission: Build UI modal

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';


  HG.buildFloatingButton = function () {
    const btn = document.createElement('button');
    btn.id = 'hust-gpa-fab';
    btn.textContent = '📊 Tính GPA/CPA';
    btn.addEventListener('click', HG.openModal);
    document.body.appendChild(btn);
  }

  HG.openModal = function () {
    const courses = HG.scrapeData();
    if (!courses || courses.length === 0) {
      alert('Không tìm thấy bảng điểm trên trang. Hãy đảm bảo bạn đang ở trang "Xem điểm" và bảng đã load xong.');
      return;
    }

    const existing = document.getElementById('hust-gpa-overlay');
    if (existing) existing.remove();
    HG.lastResults = null;
    HG.lastExportData = null;

    const overlay = document.createElement('div');
    overlay.id = 'hust-gpa-overlay';

    const modal = document.createElement('div');
    modal.id = 'hust-gpa-modal';

    modal.innerHTML = `
      <div class="hgm-header">
        <h2>Tính GPA / CPA</h2>
        <div class="hgm-header-actions">
          <label class="hgm-theme-switch" title="Chuyển giao diện sáng/tối">
            <input type="checkbox" id="hgm-dark-toggle">
            <span class="hgm-theme-switch-track">
              <span class="hgm-theme-switch-thumb" id="hgm-dark-toggle-thumb">☀️</span>
            </span>
          </label>
          <button id="hgm-close">✕</button>
        </div>
      </div>
      <div class="hgm-tabs">
        <button type="button" class="hgm-tab-btn hgm-tab-active" data-tab="calc">🧮 Tính GPA / CPA</button>
        <button type="button" class="hgm-tab-btn" data-tab="lookup">🔎 Tra cứu trọng số</button>
        <button type="button" class="hgm-tab-btn" data-tab="mi">📐 Tính điểm học phần MI</button>
      </div>
      <div class="hgm-tab-panel" data-tab="mi" style="display:none;">
        ${HG.buildMiCalcHtml()}
      </div>
      <div class="hgm-tab-panel" data-tab="lookup" style="display:none;">
        <div class="hgm-lookup-bar">
          <input type="text" id="hgm-lookup-input" placeholder="Nhập mã học phần hoặc tên học phần..." autocomplete="off">
        </div>
        <div id="hgm-lookup-results"></div>
      </div>
      <div class="hgm-tab-panel" data-tab="calc">
      <div class="hgm-note">
        Học phần bắt đầu bằng <b>MI</b> hoặc <b>SSH</b> mặc định dùng trọng số QT-CK = 5-5;
        có thể chọn "Tự nhập điểm QT-CK" hoặc "Tự chọn trọng số QT-CK". Các học phần khác có thể chọn chế độ nhập: "Chọn trọng số QT-CK" hoặc "Nhập điểm chữ".
      </div>
      <div class="hgm-upload-bar">
        <button id="hgm-load-data" class="hgm-export-btn">📂 Upload dữ liệu điểm đã lưu</button>
        <input type="file" id="hgm-load-data-input" accept="application/json,.json" style="display:none;">
      </div>
      <div id="hgm-body"></div>
      <div class="hgm-option-row hgm-option-row-center">
        <label><input type="checkbox" id="hgm-show-score10"> <b>Quy đổi cả điểm hệ 10</b> (theo QĐ 3320/QĐ-ĐHBK-ĐTĐH, áp dụng cho điểm trung bình học kỳ/CPA)</label>
      </div>
      <div class="hgm-footer">
        <div class="hgm-footer-row">
          <button id="hgm-save-data" class="hgm-export-btn">💾 Lưu dữ liệu điểm đã nhập</button>
        </div>
        <div class="hgm-footer-row">
          <button id="hgm-calc">Tính GPA / CPA</button>
          <button id="hgm-export-pdf" class="hgm-export-btn" disabled>📄 Xuất PDF</button>
          <button id="hgm-export-excel" class="hgm-export-btn" disabled>📊 Xuất Excel</button>
        </div>
      </div>
      <div id="hgm-result"></div>
      </div>
      <div class="hgm-credit">Extension được phát triển bởi DucTapCodeDao</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const darkToggleInput = document.getElementById('hgm-dark-toggle');
    const darkToggleThumb = document.getElementById('hgm-dark-toggle-thumb');
    const applyDarkMode = (isDark) => {
      modal.classList.toggle('hgm-dark', isDark);
      darkToggleInput.checked = isDark;
      darkToggleThumb.textContent = isDark ? '🌙' : '☀️';
    };
    const score10Checkbox = document.getElementById('hgm-show-score10');
    score10Checkbox.checked = !!HG.showScore10;
    score10Checkbox.addEventListener('change', () => {
      HG.showScore10 = score10Checkbox.checked;
      HG.saveState();
    });
    applyDarkMode(HG.getDarkModePref());
    darkToggleInput.addEventListener('change', () => {
      const isDark = darkToggleInput.checked;
      applyDarkMode(isDark);
      HG.setDarkModePref(isDark);
      if (HG.lastResults) {
        const showScore10Checkbox = document.getElementById('hgm-show-score10');
        const showScore10 = !!(showScore10Checkbox && showScore10Checkbox.checked);
        HG.renderResult(HG.lastResults, showScore10);
      }
    });

    modal.querySelectorAll('.hgm-tab-btn').forEach((b) => b.addEventListener('click', () => HG.switchTab(b.dataset.tab)));
    HG.initLookupTab();
    HG.initMiCalcTab();

    document.getElementById('hgm-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    HG.renderCourseInputs(courses);
    HG.currentCourses = courses;
    document.getElementById('hgm-calc').addEventListener('click', () => HG.computeAndRender(courses));

    document.getElementById('hgm-export-pdf').addEventListener('click', HG.exportToPDF);
    document.getElementById('hgm-export-excel').addEventListener('click', HG.exportToExcel);

    document.getElementById('hgm-save-data').addEventListener('click', HG.exportInputData);

    const loadDataInput = document.getElementById('hgm-load-data-input');
    document.getElementById('hgm-load-data').addEventListener('click', () => loadDataInput.click());
    loadDataInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) HG.importInputData(file);
      e.target.value = '';
    });
  }

  HG.renderCourseInputs = function (courses) {
    const body = document.getElementById('hgm-body');
    const grouped = {};

    courses.forEach((c) => {
      if (c.Credit === 0 || HG.checkMIL(c.ID)) return; 
      const groupKey = 's_' + c.semesterKey;
      if (!grouped[groupKey]) grouped[groupKey] = { semesterKey: c.semesterKey, name: c.semesterName, items: [] };
      grouped[groupKey].items.push(c);
    });

    let html = '';
    for (const groupKey of Object.keys(grouped)) {
      const semKey = grouped[groupKey].semesterKey;
      const semExcluded = HG.excludedSemesters.has(semKey);
      const semCollapsed = HG.collapsedSemesters.has(semKey);
      html += `<div class="hgm-semester${semExcluded ? ' hgm-semester-excluded' : ''}${semCollapsed ? ' hgm-semester-collapsed' : ''}" data-sem-key="${HG.escapeHtml(semKey)}">
        <div class="hgm-semester-title" title="Bấm để thu gọn / mở rộng học kỳ này">
          <span class="hgm-chevron">›</span>
          <span class="hgm-semester-name">${HG.escapeHtml(grouped[groupKey].name)}</span>
          <span class="hgm-semester-summary"></span>
          <button class="hgm-remove-btn hgm-remove-semester-btn" data-remove-semester="${HG.escapeHtml(semKey)}" title="Loại cả học kỳ này khỏi tính toán">${semExcluded ? '+' : '−'}</button>
        </div>`;
      grouped[groupKey].items.forEach((c) => {
        const auto = HG.checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
        html += HG.renderCourseRow(c, auto);
      });
      html += `</div>`;
    }
    body.innerHTML = html;

    document.querySelectorAll('.hgm-semester-title').forEach((title) => {
      title.addEventListener('click', () => {
        const semEl = title.parentNode;
        const semKey = semEl.getAttribute('data-sem-key');
        const collapsed = semEl.classList.toggle('hgm-semester-collapsed');
        if (collapsed) HG.collapsedSemesters.add(semKey); else HG.collapsedSemesters.delete(semKey);
        HG.saveState();
      });
    });
    HG.refreshSemesterSummaries();

    document.querySelectorAll('.hgm-remove-semester-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const semKey = btn.getAttribute('data-remove-semester');
        const semEl = document.querySelector(`.hgm-semester[data-sem-key="${semKey}"]`);
        if (HG.excludedSemesters.has(semKey)) {
          HG.excludedSemesters.delete(semKey);
          semEl.classList.remove('hgm-semester-excluded');
          btn.textContent = '−';
          btn.title = 'Loại cả học kỳ này khỏi tính toán';
        } else {
          HG.excludedSemesters.add(semKey);
          semEl.classList.add('hgm-semester-excluded');
          btn.textContent = '+';
          btn.title = 'Đưa học kỳ này trở lại tính toán';
        }
        HG.saveState();
      });
    });

    document.querySelectorAll('.hgm-remove-btn[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-id');
        const rowEl = document.querySelector(`.hgm-row[data-id="${id}"]`);
        if (HG.IDs.has(id)) {
          HG.IDs.delete(id);
          rowEl.classList.remove('hgm-row-excluded');
          btn.textContent = '−';
          btn.title = 'Loại học phần này khỏi tính toán';
        } else {
          HG.IDs.add(id);
          rowEl.classList.add('hgm-row-excluded');
          btn.textContent = '+';
          btn.title = 'Đưa học phần này trở lại tính toán';
        }
        HG.saveState();
      });
    });

    courses.forEach((c) => {
      if (c.Credit === 0 || HG.checkMIL(c.ID)) return;
      const auto = HG.checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
      if (!auto) return;

      const autoRadios = document.querySelectorAll(`input[name="mode-${c.id}"]`);
      autoRadios.forEach((r) => {
        r.addEventListener('change', () => {
          const letterBox = document.getElementById(`letter-box-${c.id}`);
          const customBox = document.getElementById(`custom-box-${c.id}`);
          const toggle = document.getElementById(`custom-toggle-${c.id}`);
          const weightToggle = document.getElementById(`custom-weight-toggle-${c.id}`);
          const weightBox = document.getElementById(`custom-weight-box-${c.id}`);
          const optsWrap = document.getElementById(`auto-opts-${c.id}`);
          if (r.value === 'auto') {
            letterBox.style.display = 'none';
            optsWrap.style.display = '';
            customBox.style.display = toggle && toggle.checked ? '' : 'none';
            weightBox.style.display = weightToggle && weightToggle.checked ? '' : 'none';
          } else {
            letterBox.style.display = '';
            optsWrap.style.display = 'none';
            customBox.style.display = 'none';
            weightBox.style.display = 'none';
          }
          HG.setCourseInputValue(c.id, 'mode', r.value);
        });
      });

      const toggle = document.getElementById(`custom-toggle-${c.id}`);
      if (toggle) {
        toggle.addEventListener('change', () => {
          const box = document.getElementById(`custom-box-${c.id}`);
          box.style.display = toggle.checked ? '' : 'none';
          HG.setCourseInputValue(c.id, 'customToggle', toggle.checked);
        });
      }

      const weightToggle = document.getElementById(`custom-weight-toggle-${c.id}`);
      if (weightToggle) {
        weightToggle.addEventListener('change', () => {
          document.getElementById(`custom-weight-box-${c.id}`).style.display = weightToggle.checked ? '' : 'none';
          HG.setCourseInputValue(c.id, 'customWeightToggle', weightToggle.checked);
        });
      }
      const customWeightInput = document.getElementById(`custom-weight-input-${c.id}`);
      if (customWeightInput) {
        customWeightInput.addEventListener('change', () => HG.setCourseInputValue(c.id, 'customWeight', customWeightInput.value));
      }

      const customQtInput = document.getElementById(`custom-qt-${c.id}`);
      if (customQtInput) {
        customQtInput.addEventListener('input', () => HG.setCourseInputValue(c.id, 'customQt', customQtInput.value));
      }
      const customCkInput = document.getElementById(`custom-ck-${c.id}`);
      if (customCkInput) {
        customCkInput.addEventListener('input', () => HG.setCourseInputValue(c.id, 'customCk', customCkInput.value));
      }
      const autoLetterInput = document.getElementById(`letter-input-${c.id}`);
      if (autoLetterInput) {
        autoLetterInput.addEventListener('change', () => HG.setCourseInputValue(c.id, 'letter', autoLetterInput.value));
      }
    });

    courses.forEach((c) => {
      if (c.Credit === 0 || HG.checkMIL(c.ID)) return;
      const auto = HG.checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
      if (auto) return;
      const radios = document.querySelectorAll(`input[name="mode-${c.id}"]`);
      radios.forEach((r) => {
        r.addEventListener('change', () => {
          const weightBox = document.getElementById(`weight-box-${c.id}`);
          const letterBox = document.getElementById(`letter-box-${c.id}`);
          if (r.value === 'weight') {
            weightBox.style.display = '';
            letterBox.style.display = 'none';
          } else {
            weightBox.style.display = 'none';
            letterBox.style.display = '';
          }
          HG.setCourseInputValue(c.id, 'mode', r.value);
        });
      });

      const weightInput = document.getElementById(`weight-input-${c.id}`);
      if (weightInput) {
        weightInput.addEventListener('change', () => HG.setCourseInputValue(c.id, 'weight', weightInput.value));
      }
      const letterInput = document.getElementById(`letter-input-${c.id}`);
      if (letterInput) {
        letterInput.addEventListener('change', () => HG.setCourseInputValue(c.id, 'letter', letterInput.value));
      }
      const fakeQtInput = document.getElementById(`fake-qt-${c.id}`);
      if (fakeQtInput) {
        fakeQtInput.addEventListener('input', () => HG.setCourseInputValue(c.id, 'fakeQt', fakeQtInput.value));
      }
      const fakeCkInput = document.getElementById(`fake-ck-${c.id}`);
      if (fakeCkInput) {
        fakeCkInput.addEventListener('input', () => HG.setCourseInputValue(c.id, 'fakeCk', fakeCkInput.value));
      }
    });
  }

  HG.refreshSemesterSummaries = function () {
    const courses = HG.currentCourses || [];
    document.querySelectorAll('.hgm-semester').forEach((semEl) => {
      const semKey = semEl.getAttribute('data-sem-key');
      let total = 0, done = 0;
      courses.forEach((c) => {
        if (c.semesterKey !== semKey || c.Credit === 0 || HG.checkMIL(c.ID)) return;
        total++;
        const auto = HG.checkMIorSSH(c.ID) && c.qt !== null && c.ck !== null;
        const saved = HG.courseInputs[c.id] || {};
        const usingLetter = saved.mode === 'letter';
        if (auto || usingLetter || saved.weight !== undefined) done++;
      });
      const el = semEl.querySelector('.hgm-semester-summary');
      if (!el) return;
      el.textContent = total ? `${done}/${total} học phần đã chọn trọng số/điểm chữ` : '';
      el.classList.toggle('hgm-summary-done', total > 0 && done === total);
    });
  }

  HG.renderCourseRow = function (c, auto) {
    const qtText = c.qt !== null ? c.qt : '-';
    const ckText = c.ck !== null ? c.ck : '-';
    const tnthText = c.tnth !== null ? ` | <b>TN/TH:</b> <span class="hgm-score">${c.tnth}</span>` : '';
    const rowExcluded = HG.IDs.has(c.id);
    const removeBtn = `<button class="hgm-remove-btn" data-remove-id="${HG.escapeHtml(c.id)}" title="${rowExcluded ? 'Đưa học phần này trở lại tính toán' : 'Loại học phần này khỏi tính toán'}">${rowExcluded ? '+' : '−'}</button>`;
    const rowExcludedClass = rowExcluded ? ' hgm-row-excluded' : '';

    const saved = HG.courseInputs[c.id] || {};

    if (auto) {
      const modeVal = saved.mode === 'letter' ? 'letter' : 'auto';
      const customToggleChecked = !!saved.customToggle;
      const customQtVal = saved.customQt !== undefined ? saved.customQt : (c.qt !== null ? c.qt : 0);
      const customCkVal = saved.customCk !== undefined ? saved.customCk : (c.ck !== null ? c.ck : 0);
      const letterVal = saved.letter || HG.LETTER_OPTIONS[0];
      const letterOptions = HG.LETTER_OPTIONS.map((l) => `<option value="${l}" ${l === letterVal ? 'selected' : ''}>${l}</option>`).join('');
      const letterBoxDisplay = modeVal === 'letter' ? '' : 'none';
      const toggleRowDisplay = modeVal === 'auto' ? '' : 'none';
      const customBoxDisplay = modeVal === 'auto' && customToggleChecked ? '' : 'none';

      const customWeightChecked = !!saved.customWeightToggle;
      const customWeightVal = HG.MI_WEIGHT_OPTIONS.includes(saved.customWeight) ? saved.customWeight : '5-5';
      const customWeightOptions = HG.MI_WEIGHT_OPTIONS.map(
        (w) => `<option value="${w}" ${w === customWeightVal ? 'selected' : ''}>${w} (QT ${w.split('-')[0]}0% - CK ${w.split('-')[1]}0%)</option>`
      ).join('');
      const customWeightBoxDisplay = modeVal === 'auto' && customWeightChecked ? '' : 'none';

      return `
        <div class="hgm-row hgm-row-auto${rowExcludedClass}" data-id="${HG.escapeHtml(c.id)}">
          ${removeBtn}
          <div class="hgm-row-main">
            <span class="hgm-ID">${HG.escapeHtml(c.ID)}</span> - <span class="hgm-Name">${HG.escapeHtml(c.Name)}</span> (${c.Credit} TC)
            <span class="hgm-badge">Tự động 5-5</span>
          </div>
          <div class="hgm-row-sub"><b>QT:</b> <span class="hgm-score">${qtText}</span> | <b>CK:</b> <span class="hgm-score">${ckText}</span>${tnthText}</div>
          <div class="hgm-row-mode">
            <label><input type="radio" name="mode-${c.id}" value="auto" ${modeVal === 'auto' ? 'checked' : ''}> <b>Sử dụng điểm QT-CK</b></label>
            <label><input type="radio" name="mode-${c.id}" value="letter" ${modeVal === 'letter' ? 'checked' : ''}> <b>Nhập điểm chữ</b></label><br>
            <span id="auto-opts-${c.id}" style="display:${toggleRowDisplay};">
              <label><input type="checkbox" id="custom-toggle-${c.id}" ${customToggleChecked ? 'checked' : ''}> <b>Tự nhập điểm QT-CK</b></label>
              <label><input type="checkbox" id="custom-weight-toggle-${c.id}" ${customWeightChecked ? 'checked' : ''}> <b>Tự chọn trọng số QT-CK</b></label>
            </span>
          </div>
          <div id="custom-weight-box-${c.id}" class="hgm-row-input" style="display:${customWeightBoxDisplay};">
            <b>Trọng số (QT-CK):</b> <select id="custom-weight-input-${c.id}">${customWeightOptions}</select>
          </div>
          <div id="custom-box-${c.id}" class="hgm-row-input" style="display:${customBoxDisplay};">
            <b>QT giả định:</b> <input type="number" step="0.5" min="0" max="10" id="custom-qt-${c.id}" value="${HG.escapeHtml(customQtVal)}" style="width:60px;">
            <b>CK giả định:</b> <input type="number" step="0.5" min="0" max="10" id="custom-ck-${c.id}" value="${HG.escapeHtml(customCkVal)}" style="width:60px;">
          </div>
          <div id="letter-box-${c.id}" class="hgm-row-input" style="display:${letterBoxDisplay};">
            <b>Điểm chữ:</b> <select id="letter-input-${c.id}">${letterOptions}</select>
          </div>
        </div>
      `;
    }

    const canWeight = c.qt !== null && c.ck !== null;
    const modeVal = saved.mode === 'letter' ? 'letter' : 'weight';
    const weightVal = saved.weight || '5-5';
    const letterVal = saved.letter || HG.LETTER_OPTIONS[0];
    const fakeQtVal = saved.fakeQt !== undefined ? saved.fakeQt : 0;
    const fakeCkVal = saved.fakeCk !== undefined ? saved.fakeCk : 0;

    const letterOptions = HG.LETTER_OPTIONS.map((l) => `<option value="${l}" ${l === letterVal ? 'selected' : ''}>${l}</option>`).join('');
    const weightOptions = HG.WEIGHT_OPTIONS.map(
      (w) => `<option value="${w}" ${w === weightVal ? 'selected' : ''}>${w} (QT ${w.split('-')[0]}0% - CK ${w.split('-')[1]}0%)</option>`
    ).join('');
    const weightBoxDisplay = modeVal === 'weight' ? '' : 'none';
    const letterBoxDisplay = modeVal === 'letter' ? '' : 'none';

    const fakeScoreRow = canWeight
      ? ''
      : `<br><b>QT:</b> <input type="number" step="0.5" min="0" max="10" id="fake-qt-${c.id}" placeholder="Nhập QT giả định" value="${HG.escapeHtml(fakeQtVal)}" style="width:60px;">
         &nbsp; <b>CK:</b> <input type="number" step="0.5" min="0" max="10" id="fake-ck-${c.id}" placeholder="Nhập CK giả định" value="${HG.escapeHtml(fakeCkVal)}" style="width:60px;">`;

    return `
      <div class="hgm-row${rowExcludedClass}" data-id="${HG.escapeHtml(c.id)}">
        ${removeBtn}
        <div class="hgm-row-main">
          <span class="hgm-ID">${HG.escapeHtml(c.ID)}</span> - <span class="hgm-Name">${HG.escapeHtml(c.Name)}</span> (${c.Credit} TC)
        </div>
        <div class="hgm-row-sub"><b>QT:</b> <span class="hgm-score">${qtText}</span> | <b>CK:</b> <span class="hgm-score">${ckText}</span>${tnthText}</div>
        <div class="hgm-row-mode">
          <label><input type="radio" name="mode-${c.id}" value="weight" ${modeVal === 'weight' ? 'checked' : ''}> <b>Chọn trọng số QT-CK</b>${canWeight ? '' : ' (điểm giả định)'}</label>
          <label><input type="radio" name="mode-${c.id}" value="letter" ${modeVal === 'letter' ? 'checked' : ''}> <b>Nhập điểm chữ</b></label>
        </div>
        <div id="weight-box-${c.id}" class="hgm-row-input" style="display:${weightBoxDisplay};">
          <b>Trọng số (QT-CK):</b> <select id="weight-input-${c.id}">${weightOptions}</select>${fakeScoreRow}
        </div>
        <div id="letter-box-${c.id}" class="hgm-row-input" style="display:${letterBoxDisplay};">
          <b>Điểm chữ:</b> <select id="letter-input-${c.id}">${letterOptions}</select>
        </div>
      </div>
    `;
  }


})(window.__hustGpa);