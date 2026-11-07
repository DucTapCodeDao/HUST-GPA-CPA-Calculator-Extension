//Mission: State & Const

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';

  HG.LETTER_OPTIONS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
  HG.MI_WEIGHT_OPTIONS = ['2-8', '3-7', '4-6', '5-5'];
  HG.WEIGHT_OPTIONS = ['1-9', '2-8', '3-7', '4-6', '5-5', '6-4', '7-3', '8-2', '9-1'];
  HG.LETTER_TO_4 = { 'A+': 4.0, 'A': 4.0, 'B+': 3.5, 'B': 3.0, 'C+': 2.5, 'C': 2.0, 'D+': 1.5, 'D': 1.0, 'F': 0.0 };
  HG.IDs = new Set();
  //List of excluded semesters
  HG.excludedSemesters = new Set();
  //List of collapsed semesters
  HG.collapsedSemesters = new Set();
  //Variable to store the last exported data
  HG.lastExportData = null;
  //Last results
  HG.lastResults = null;
  HG.showScore10 = false;
  HG.miCalcInputs = { cc: '1', lb: '0', sh: '0', gk: '0', ck: '' };

  //Data structure to store user input for each course (custom scores, weights, etc.)
  HG.courseInputs = {};


  HG.STORAGE_KEY = 'hustGpaState_v1';

  HG.saveState = function () {
    try {
      const data = {
        IDs: Array.from(HG.IDs),
        excludedSemesters: Array.from(HG.excludedSemesters),
        collapsedSemesters: Array.from(HG.collapsedSemesters),
        courseInputs: HG.courseInputs,
        showScore10: !!HG.showScore10,
        miCalcInputs: HG.miCalcInputs,
      };
      sessionStorage.setItem(HG.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
    }
  }

  HG.loadState = function () {
    try {
      const raw = sessionStorage.getItem(HG.STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.IDs)) HG.IDs = HG.toStringSet(data.IDs);
      if (Array.isArray(data.excludedSemesters)) HG.excludedSemesters = HG.toStringSet(data.excludedSemesters);
      if (Array.isArray(data.collapsedSemesters)) HG.collapsedSemesters = HG.toStringSet(data.collapsedSemesters);
      HG.courseInputs = HG.sanitizeCourseInputs(data.courseInputs);
      HG.showScore10 = data.showScore10 === true;
      HG.miCalcInputs = HG.sanitizeMiCalcInputs(data.miCalcInputs);
    } catch (e) {
    }
  }

  HG.escapeHtml = function (value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  HG.sanitizeCourseInputs = function (raw) {
    const clean = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    const numText = (v) => (v !== undefined && v !== null && isFinite(parseFloat(v)) ? String(v) : undefined);
    Object.keys(raw).forEach((courseId) => {
      const r = raw[courseId];
      if (!r || typeof r !== 'object' || Array.isArray(r)) return;
      const out = {};
      if (['auto', 'weight', 'letter'].includes(r.mode)) out.mode = r.mode;
      if (HG.WEIGHT_OPTIONS.includes(r.weight)) out.weight = r.weight;
      if (HG.LETTER_OPTIONS.includes(r.letter)) out.letter = r.letter;
      if (typeof r.customToggle === 'boolean') out.customToggle = r.customToggle;
      if (typeof r.customWeightToggle === 'boolean') out.customWeightToggle = r.customWeightToggle;
      if (HG.MI_WEIGHT_OPTIONS.includes(r.customWeight)) out.customWeight = r.customWeight;
      ['customQt', 'customCk', 'fakeQt', 'fakeCk'].forEach((k) => {
        const t = numText(r[k]);
        if (t !== undefined) out[k] = t;
      });
      clean[courseId] = out;
    });
    return clean;
  }

  HG.sanitizeMiCalcInputs = function (raw) {
    const allowed = {
      cc: ['-2', '-1', '0', '1'],
      lb: ['0', '0.5', '1'],
      sh: Array.from({ length: 11 }, (_, i) => String(i)),
      gk: Array.from({ length: 31 }, (_, i) => String(i)),
    };
    const clean = { cc: '1', lb: '0', sh: '0', gk: '0', ck: '' };
    if (!raw || typeof raw !== 'object') return clean;
    Object.keys(allowed).forEach((k) => { if (allowed[k].includes(raw[k])) clean[k] = raw[k]; });
    if (typeof raw.ck === 'string' && raw.ck.length <= 6 && (raw.ck === '' || isFinite(parseFloat(raw.ck)))) clean.ck = raw.ck;
    return clean;
  }

  HG.toStringSet = function (arr) {
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  }

  HG.setCourseInputValue = function (courseId, field, value) {
    if (!HG.courseInputs[courseId]) HG.courseInputs[courseId] = {};
    HG.courseInputs[courseId][field] = value;
    HG.saveState();
    if (HG.refreshSemesterSummaries) HG.refreshSemesterSummaries();
  }

  HG.loadState();

  HG.DARK_MODE_KEY = 'hustGpaDarkMode';

  HG.getDarkModePref = function () {
    try {
      return localStorage.getItem(HG.DARK_MODE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  HG.setDarkModePref = function (isDark) {
    try {
      localStorage.setItem(HG.DARK_MODE_KEY, isDark ? '1' : '0');
    } catch (e) {
    }
  }

})(window.__hustGpa);