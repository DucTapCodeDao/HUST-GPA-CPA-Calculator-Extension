//Mission: Scoring functions for GPA calculation

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';

  //Change score from 10 scale to letter grade and 4.0 scale
  //If QT or CK score < 3 => F, not calculated by 10 scale anymore
  HG.change = function (score10, qt, ck) {
    //Round to avoid floating point errors
    score10 = Math.round(score10 * 1e6) / 1e6;
    //Round to 1 decimal place before converting to letter grade.
    score10 = Math.floor(score10 * 10 + 0.5 + 1e-9) / 10;
    if ((qt !== undefined && qt !== null && qt < 3) || (ck !== undefined && ck !== null && ck < 3)) {
      return ['F', 0.0];
    }
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

  //Function to give a note based on the 4.0 scale score
  HG.note = function (score4) {
    if (score4 >= 3.6) return 'Chuc mung cau chu thang lon!';
    if (score4 >= 3.2) return 'Đôi khi chỉ cần biết đủ...';
    if (score4 >= 2.5) return 'Cố lên sắp nổ hũ chuỗi thua rồi!';
    return 'Thôi thì làm sinh viên năm 8 vậy...';
  }

  //Function to parse score value from text
  HG.parseScoreValue = function (text) {
    if (!text) return null;
    const m = text.trim().match(/^([\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  }

  //Function to check MI or SSH course
  HG.checkMIorSSH = function (ID) {
    return /^(MI|SSH)/i.test(ID.trim());
  }

  //Function to check MIL course
  HG.checkMIL = function (ID) {
    return /^MIL/i.test(ID.trim());
  }

  //Function to change 4.0 scale score to 10 scale score
  //Formula: 10 scale score = (4 scale score × a) + b
  //2.0 - 2.5: a = 3.00 ; b = -0.5
  //2.5 - 3.2: a = 1.42 ; b = 3.45
  //3.2 - 4.0: a = 2.50 ; b = 0.00
  HG.convertScale4To10 = function (score4) {
    let a, b;
    if (score4 < 2.5) {
      a = 3.00; b = -0.5;
    } else if (score4 < 3.2) {
      a = 1.42; b = 3.45;
    } else {
      a = 2.50; b = 0.00;
    }
    const score10 = score4 * a + b;
    return Math.max(0, score10);
  }

})(window.__hustGpa);