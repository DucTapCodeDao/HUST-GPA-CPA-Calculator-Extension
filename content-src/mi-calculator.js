//Mission: Tab "Tính điểm học phần MI"

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';

  //Min and max values for each input field in the MI calculator
  HG.MI_FIELDS = {
    cc: { label: 'Chuyên cần', hint: '-2|-1|0|1', values: [-2, -1, 0, 1], def: '1' },
    lb: { label: 'Lên bảng', hint: '0|0.5|1', values: [0, 0.5, 1], def: '0' },
    sh: { label: 'Bài Số hóa', hint: '0|1|2|...|9|10', values: Array.from({ length: 11 }, (_, i) => i), def: '0' },
    gk: { label: 'Giữa kỳ', hint: '0|1|2|...|28|29|30', values: Array.from({ length: 31 }, (_, i) => i), def: '0' },
  };
  HG.MI_THRESHOLD = 3;

  const roundHalf = (x) => Math.floor(x * 2 + 0.5 + 1e-9) / 2;
  const roundTenth = (x) => Math.floor(x * 10 + 0.5 + 1e-9) / 10;

  //Function to compute MI QT grade
  HG.computeMiProcess = function (cc, lb, sh, gk) {
    const raw = cc + lb + 0.2 * sh + (0.6 * gk) / 3;
    return { raw: raw, qt: Math.max(0, roundHalf(raw)) };
  }

  //Function to compute MI final grade (QT + CK)
  HG.computeMiGrade = function (cc, lb, sh, gk, ck) {
    const p = HG.computeMiProcess(cc, lb, sh, gk);
    const out = { qtRaw: p.raw, qt: p.qt, ck: ck, qtFail: p.qt < HG.MI_THRESHOLD, ckFail: false, score: null, letter: null, score4: null };
    if (ck === null || ck === undefined) return out;
    out.ckFail = ck < HG.MI_THRESHOLD;
    out.score = roundTenth(0.5 * p.qt + 0.5 * ck);
    //HG.change dùng chung với tab Tính GPA/CPA: tự xử lý luật "QT hoặc CK < 3 thì F" và quy đổi điểm chữ / thang 4
    const g = HG.change(0.5 * p.qt + 0.5 * ck, p.qt, ck);
    out.letter = g[0];
    out.score4 = g[1];
    return out;
  }

  const fmt = (x) => (Math.round(x * 100) / 100).toString();

  //Build the HTML for the MI calculator tab
  HG.buildMiCalcHtml = function () {
    const selects = Object.keys(HG.MI_FIELDS).map((k) => {
      const f = HG.MI_FIELDS[k];
      const saved = HG.miCalcInputs[k];
      const opts = f.values.map((v) => `<option value="${v}" ${String(v) === saved ? 'selected' : ''}>${v}</option>`).join('');
      return `<label class="hgm-mi-field"><span class="hgm-mi-label">${f.label} <small>(${f.hint})</small></span>
        <select id="hgm-mi-${k}">${opts}</select></label>`;
    }).join('');
    return `
      <div class="hgm-mi-note">
        Dành cho học phần <b>MI</b>. Điểm quá trình (QT) = <b>Chuyên cần + Lên bảng + 0.2 × Số hóa + 0.6 × Giữa kỳ ÷ 3</b>, làm tròn đến 0.5.
        Điểm học phần = <b>0.5 × QT + 0.5 × CK</b>, làm tròn đến 0.1. QT hoặc CK dưới 3 thì học phần bị F.
      </div>
      <div class="hgm-mi-grid">
        ${selects}
        <label class="hgm-mi-field"><span class="hgm-mi-label">Cuối kỳ (CK) <small>0|0.5|1|...|9|9.5|10</small></span>
          <input type="number" id="hgm-mi-ck" min="0" max="10" step="0.5" placeholder="Nhập điểm CK" value="${HG.escapeHtml(HG.miCalcInputs.ck)}"></label>
      </div>
      <div id="hgm-mi-result"></div>`;
  }

  const renderResult = () => {
    const out = document.getElementById('hgm-mi-result');
    if (!out) return;
    const v = HG.miCalcInputs;
    const ckEl = document.getElementById('hgm-mi-ck');
    const ckText = v.ck.trim();
    let ck = null;
    let ckError = '';
    if (ckText !== '') {
      const n = parseFloat(ckText);
      if (HG.isValidScoreValue(n)) ck = n;
      else ckError = 'Điểm CK không hợp lệ. Vui lòng nhập 1 số từ 0 đến 10 và chia hết cho 0.5.';
    }
    if (ckEl) ckEl.classList.toggle('hgm-mi-invalid', ckError !== '');

    const r = HG.computeMiGrade(Number(v.cc), Number(v.lb), Number(v.sh), Number(v.gk), ck);
    const rows = [];
    rows.push(`<tr><td>Điểm quá trình (QT)</td><td class="hgm-mi-val${r.qtFail ? ' hgm-mi-bad' : ''}">${fmt(r.qt)}</td>
      <td class="hgm-mi-sub">trước khi làm tròn: ${fmt(r.qtRaw)}${r.qtFail ? ' — <b>liệt QT (&lt; 3)</b>' : ''}</td></tr>`);
    if (r.score !== null) {
      rows.push(`<tr><td>Điểm cuối kỳ (CK)</td><td class="hgm-mi-val${r.ckFail ? ' hgm-mi-bad' : ''}">${fmt(r.ck)}</td>
        <td class="hgm-mi-sub">${r.ckFail ? '<b>liệt CK (&lt; 3)</b>' : ''}</td></tr>`);
      rows.push(`<tr><td>Điểm học phần</td><td class="hgm-mi-val${r.letter === 'F' ? ' hgm-mi-bad' : ''}">${fmt(r.score)}</td><td class="hgm-mi-sub"></td></tr>`);
      rows.push(`<tr><td>Điểm chữ</td><td class="hgm-mi-val${r.letter === 'F' ? ' hgm-mi-bad' : ''}">${r.letter}</td><td class="hgm-mi-sub">${r.letter === 'F' && (r.qtFail || r.ckFail) ? 'học phần bị F do liệt QT/CK' : ''}</td></tr>`);
      rows.push(`<tr><td>Điểm thang 4</td><td class="hgm-mi-val${r.letter === 'F' ? ' hgm-mi-bad' : ''}">${r.score4.toFixed(1)}</td><td class="hgm-mi-sub"></td></tr>`);
    }
    const hint = ckError
      ? `<div class="hgm-mi-error">${ckError}</div>`
      : (r.score === null ? '<div class="hgm-lookup-hint">Nhập điểm cuối kỳ (CK) để tính điểm học phần.</div>' : '');
    out.innerHTML = `<table class="hgm-mi-table"><tbody>${rows.join('')}</tbody></table>${hint}`;
  }

  HG.initMiCalcTab = function () {
    Object.keys(HG.MI_FIELDS).forEach((k) => {
      const el = document.getElementById(`hgm-mi-${k}`);
      if (!el) return;
      el.addEventListener('change', () => {
        HG.miCalcInputs[k] = el.value;
        HG.saveState();
        renderResult();
      });
    });
    const ck = document.getElementById('hgm-mi-ck');
    if (ck) {
      ck.addEventListener('input', () => {
        HG.miCalcInputs.ck = ck.value;
        HG.saveState();
        renderResult();
      });
    }
    renderResult();
  }

})(window.__hustGpa);