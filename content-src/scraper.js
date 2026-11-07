//Mission: Scrap data from page QLĐT (Web Scraper)

window.__hustGpa = window.__hustGpa || {};
(function (HG) {
  'use strict';


  //Scrap personal transcript table from the website
  HG.findTranscriptTable = function () {
    const tables = document.querySelectorAll('table');
    for (const t of tables) {
      if (t.querySelector('tbody.ant-table-tbody tr[data-row-key]')) return t;
    }
    return null;
  }

  //Function to read student name and ID from the website
  HG.scrapeStudentInfo = function () {
    const text = document.body.innerText || '';
    const match = text.match(/Bảng điểm chi tiết:\s*([^\n\r-]+?)\s*-\s*(\d+)/);
    if (match) {
      return { name: match[1].trim(), studentId: match[2].trim() };
    }
    return { name: '', studentId: '' };
  }

  //Function to scrape data from the transcript table
  HG.scrapeData = function () {
    const table = HG.findTranscriptTable();
    if (!table) return null;

    const rows = table.querySelectorAll('tbody.ant-table-tbody > tr');
    let currentSemesterKey = null;
    let currentSemesterName = null;
    const courses = [];

    rows.forEach((row) => {
      if (row.classList.contains('ant-table-measure-row')) return;
      const key = row.getAttribute('data-row-key');
      if (!key) return;

      //Level 0: Semester, Level 1: Course
      if (row.classList.contains('ant-table-row-level-0')) {
        currentSemesterKey = key;
        const titleEl = row.querySelector('.title-semester');
        const titleNode = titleEl && titleEl.childNodes[0];
        currentSemesterName = titleNode ? titleNode.textContent.trim() : key;
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
          const val = HG.parseScoreValue(valText);
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


})(window.__hustGpa);