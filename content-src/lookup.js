//Mission: Tab "Tra cứu trọng số"

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';

  const MAX_RESULTS = 100;
  const CSV_PATH = 'data/hust_courses_final.csv';
  let index = null;
  let loadPromise = null;

  //Read CSV file
  const parseCsv = (text) => {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  };

  //Read CSV file and build index for searching
  const loadCourses = () => {
    if (HG.COURSE_DB) return Promise.resolve(HG.COURSE_DB);
    if (loadPromise) return loadPromise;
    loadPromise = fetch(chrome.runtime.getURL(CSV_PATH))
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((text) => {
        const rows = parseCsv(text);
        const head = rows.shift().map((h) => h.trim());
        const col = (name) => head.indexOf(name);
        const ix = ['course_code', 'course_name', 'credits', 'tuition_credits', 'QTweight', 'CKweight'].map(col);
        if (ix.some((i) => i < 0)) throw new Error('Thiếu cột trong file CSV');
        HG.COURSE_DB = rows
          .map((r) => [r[ix[0]].trim(), r[ix[1]].trim(), Number(r[ix[2]]), Number(r[ix[3]]), Number(r[ix[4]]), Number(r[ix[5]])])
          .filter((c) => c[0] && !isNaN(c[4]) && !isNaN(c[5]));
        return HG.COURSE_DB;
      })
      .catch((e) => { loadPromise = null; throw e; });
    return loadPromise;
  };

  //Normalize string
  const normalize = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase();

  const escapeHtml = HG.escapeHtml;

  //Round to nearest 0.5
  const pct = (w) => Math.round(w * 1000) / 10;

  //Format QT and CK into a string like "QT-CK" for the weight option
  const toOption = (qt, ck) => {
    const label = `${Math.round(qt * 10)}-${Math.round(ck * 10)}`;
    const exact = Math.abs(qt * 10 - Math.round(qt * 10)) < 1e-9;
    return exact && HG.WEIGHT_OPTIONS.indexOf(label) !== -1 ? label : null;
  };

  const buildIndex = () => {
    const db = HG.COURSE_DB || [];
    index = db.map((c) => ({ c, code: normalize(c[0]), name: normalize(c[1]) }));
  };

  const search = (query) => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const hits = [];
    for (const item of index) {
      let rank = 0;
      let ok = true;
      for (const t of tokens) {
        if (item.code.startsWith(t)) rank += 0;
        else if (item.code.includes(t)) rank += 1;
        else if (item.name.includes(t)) rank += 2;
        else { ok = false; break; }
      }
      if (ok) hits.push({ item, rank });
    }
    hits.sort((a, b) => a.rank - b.rank || a.item.c[0].localeCompare(b.item.c[0]));
    return hits.map((h) => h.item.c);
  };

  const renderRows = (container, query) => {
    if (!query.trim()) {
      container.innerHTML = '<div class="hgm-lookup-hint">Nhập mã học phần (VD: <b>MI1010</b>) hoặc tên học phần (VD: <b>giải tích</b>) để xem trọng số QT-CK. Có thể gõ không dấu.</div>';
      return;
    }
    const found = search(query);
    if (found.length === 0) {
      container.innerHTML = '<div class="hgm-lookup-hint">Không tìm thấy học phần phù hợp.</div>';
      return;
    }
    const shown = found.slice(0, MAX_RESULTS);
    const rows = shown.map((c) => {
      const opt = toOption(c[4], c[5]);
      return `<tr>
        <td class="hgm-ID">${escapeHtml(c[0])}</td>
        <td class="hgm-Name">${escapeHtml(c[1])}</td>
        <td>${c[2]}</td>
        <td>${c[3]}</td>
        <td class="hgm-lookup-weight">${pct(c[4])}% - ${pct(c[5])}%</td>
        <td>${opt ? escapeHtml(opt) : '<span class="hgm-lookup-na">Không có sẵn</span>'}</td>
      </tr>`;
    }).join('');
    const more = found.length > shown.length
      ? ` (chỉ hiển thị ${shown.length} kết quả đầu, hãy gõ cụ thể hơn)` : '';
    container.innerHTML = `
      <div class="hgm-lookup-count">Tìm thấy <b>${found.length}</b> học phần${more}</div>
      <div class="hgm-lookup-scroll">
        <table class="hgm-lookup-table">
          <thead><tr>
            <th>Mã HP</th><th>Tên học phần</th><th>Tín chỉ</th><th>TC học phí</th>
            <th>Trọng số QT - CK</th><th>Chọn ở tab "Tính GPA/CPA"</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  HG.loadCourses = loadCourses;

  //Initialize the "Tra cứu trọng số" tab (called each time the modal is opened)
  HG.initLookupTab = function () {
    const input = document.getElementById('hgm-lookup-input');
    const out = document.getElementById('hgm-lookup-results');
    if (!input || !out) return;
    out.innerHTML = '<div class="hgm-lookup-hint">Đang tải dữ liệu...</div>';
    loadCourses().then(() => {
      if (!index) buildIndex();
      input.addEventListener('input', () => renderRows(out, input.value));
      renderRows(out, input.value);
    }).catch((e) => {
      out.innerHTML = '<div class="hgm-lookup-hint">Không tải được dữ liệu tra cứu (' + escapeHtml(e.message) + ').</div>';
    });
  };

  //Change tab in the modal (called each time a tab button is clicked)
  HG.switchTab = function (name) {
    document.querySelectorAll('#hust-gpa-modal .hgm-tab-btn').forEach((b) => {
      b.classList.toggle('hgm-tab-active', b.dataset.tab === name);
    });
    document.querySelectorAll('#hust-gpa-modal .hgm-tab-panel').forEach((p) => {
      p.style.display = p.dataset.tab === name ? '' : 'none';
    });
    if (name === 'lookup') {
      const input = document.getElementById('hgm-lookup-input');
      if (input) input.focus();
    }
  };

})(window.__hustGpa);