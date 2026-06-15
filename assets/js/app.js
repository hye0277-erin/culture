/* ─────────────────────────────────────────
   CULTURE DIARY — app.js
   Features: CRUD · LocalStorage · Dark/Light · Font toggle
             Calendar · Sticker drag & drop · Star rating
───────────────────────────────────────── */

/* ═══════════════════════════════════════
   CONSTANTS & STORAGE
═══════════════════════════════════════ */
const STORAGE_KEY          = 'cultureDiary.records.v2';
const SETTINGS_KEY         = 'cultureDiary.settings.v1';
const CALENDAR_STICKERS_KEY = 'cultureDiary.calStickers.v1';

const STICKERS = [
  '🎬','🎭','📚','🎵','🎨','🖼️','🌟','💫','✨','🌙',
  '❤️','🧡','💛','💚','💙','💜','🤍','🖤',
  '🌸','🌷','🌻','🍃','☁️','🌈','⭐','🎯',
  '📝','🎪','🎠','🏛️','🎶','🎸','📽️','🎞️',
  '🍵','☕','🧋','🍰','🎂','🫶','🙌','💭'
];

const MOOD_SUGGESTIONS = [
  '잔잔한','먹먹한','오래 남는','고요한','설레는','따뜻한',
  '시각적인','영감을 준','사유적인','깊은','다시 보고 싶은',
  '묵직한','가볍게 즐긴','슬픈','유쾌한','신선한','몰입되는',
  '아름다운','날카로운','위로가 된','복잡한','여운 있는'
];

function makeSeedRecords() {
  return [
    {
      id: crypto.randomUUID(),
      title: '괴물',
      category: '영화',
      consumedDate: '2026-06-03',
      place: 'CGV 용산',
      rating: 4,
      moodTags: ['먹먹한', '잔잔한', '오래 남는'],
      oneLineReview: '조용하지만 오래 흔들리는 이야기.',
      fullReview: '인물의 감정이 과하게 설명되지 않아서 더 오래 남았다. 보고 난 뒤에도 장면들이 천천히 떠오르는 영화였다.',
      imageUrl: '', visibility: 'private',
      createdAt: new Date('2026-06-03').toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: '빛의 시선',
      category: '전시',
      consumedDate: '2026-06-08',
      place: '서울시립미술관',
      rating: 4,
      moodTags: ['고요한', '시각적인', '영감을 준'],
      oneLineReview: '빛과 그림자가 만들어내는 차분한 리듬.',
      fullReview: '공간의 여백이 좋아서 작품을 오래 바라보게 됐다.',
      imageUrl: '', visibility: 'private',
      createdAt: new Date('2026-06-08').toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: '데미안',
      category: '책',
      consumedDate: '2026-06-11',
      place: '집',
      rating: 5,
      moodTags: ['사유적인', '깊은', '다시 보고 싶은'],
      oneLineReview: '불안한 시기에 다시 읽고 싶은 문장들이 많았다.',
      fullReview: '예전에는 어렵게 느껴졌던 부분이 이번에는 명확하게 다가왔다.',
      imageUrl: '', visibility: 'private',
      createdAt: new Date('2026-06-11').toISOString()
    }
  ];
}

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let records       = loadRecords();
let settings      = loadSettings();
let calStickers   = loadCalStickers();   // { 'YYYY-MM-DD': ['🎬', ...] }
let currentImg    = '';
let currentRating = 0;
let dragEmoji     = null;
let archiveViewMode = 'card';          // 'card' | 'list'
let calYear       = new Date().getFullYear();
let calMonth      = new Date().getMonth(); // 0-based

/* ═══════════════════════════════════════
   STORAGE HELPERS
═══════════════════════════════════════ */
function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    // 이전 버전 키에서 마이그레이션
    const legacy = localStorage.getItem('moodArchiveRecords.v1');
    if (legacy) {
      const migrated = JSON.parse(legacy);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem('moodArchiveRecords.v1');
      return migrated;
    }

    // 저장된 데이터 없으면 시드 데이터 (UUID로 생성)
    const seed = makeSeedRecords();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return makeSeedRecords();
  }
}
function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    // 용량 초과 시 이미지 데이터만 제거하고 재시도
    var slim = records.map(function(r) {
      return Object.assign({}, r, { imageUrl: '' });
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      records = slim;
      alert('저장 공간이 부족해 이미지는 제외하고 저장했습니다.\n이미지는 용량이 작은 파일을 사용해주세요.');
    } catch (e2) {
      alert('저장 실패: localStorage 용량이 가득 찼습니다.\n브라우저 캐시를 정리 후 다시 시도해주세요.');
    }
  }
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { theme: 'light', font: 'paperlogic' }; }
  catch { return { theme: 'light', font: 'paperlogic' }; }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function loadCalStickers() {
  try { return JSON.parse(localStorage.getItem(CALENDAR_STICKERS_KEY)) || {}; }
  catch { return {}; }
}
function saveCalStickers() { localStorage.setItem(CALENDAR_STICKERS_KEY, JSON.stringify(calStickers)); }

/* ═══════════════════════════════════════
   UTILITIES
═══════════════════════════════════════ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function fmtDate(dateString) {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(dateString + 'T00:00:00'));
}

function getTopItem(items) {
  const counts = items.reduce((acc, v) => { if (v) acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function countItems(items) {
  return items.reduce((acc, v) => { if (v) acc[v] = (acc[v] || 0) + 1; return acc; }, {});
}

function stars(rating) {
  const n = Number(rating) || 0;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/* ═══════════════════════════════════════
   THEME & FONT
═══════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  settings.theme = theme;
  saveSettings();
  $$('#themeToggle .toggle-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.theme === theme);
  });
}

function applyFont(font) {
  document.documentElement.dataset.font = font;
  settings.font = font;
  saveSettings();
  $$('#fontToggle .toggle-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.font === font);
  });
}

/* ═══════════════════════════════════════
   VIEW ROUTING
═══════════════════════════════════════ */
function setView(viewId) {
  $$('.view').forEach((v) => v.classList.toggle('is-visible', v.id === viewId));
  $$('.nav-item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.view === viewId));
  const viewEl = document.getElementById(viewId);
  $('#pageTitle').textContent = viewEl?.dataset.title || 'Culture Diary';
  if (viewId === 'new-record' && !$('#recordId').value) resetForm();
  if (viewId === 'calendar') renderCalendar();
  if (viewId === 'report')   renderReport();
  if (viewId === 'archive')  renderArchive();
  if (viewId === 'dashboard') { renderSummary(); renderRecent(); }
}

/* ═══════════════════════════════════════
   FILTER & SORT
═══════════════════════════════════════ */
function getFilteredRecords() {
  const query    = $('#globalSearch').value.trim().toLowerCase();
  const category = $('#categoryFilter')?.value || 'all';
  const sort     = $('#sortFilter')?.value    || 'latest';

  let result = records.filter((r) => {
    const haystack = [r.title, r.category, r.place, r.oneLineReview, r.fullReview, ...(r.moodTags || [])].join(' ').toLowerCase();
    return (!query || haystack.includes(query))
      && (category === 'all' || r.category === category);
  });

  result.sort((a, b) => {
    if (sort === 'oldest') return new Date(a.consumedDate) - new Date(b.consumedDate);
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    return new Date(b.consumedDate) - new Date(a.consumedDate);
  });
  return result;
}

/* ═══════════════════════════════════════
   RENDER — SUMMARY
═══════════════════════════════════════ */
function renderSummary() {
  const curMonth   = new Date().toISOString().slice(0, 7);
  const thisMonth  = records.filter((r) => r.consumedDate?.slice(0, 7) === curMonth);
  const catTop     = getTopItem(records.map((r) => r.category)) || '-';
  const moodTop    = getTopItem(records.flatMap((r) => r.moodTags || [])) || '-';
  const ratedRecs  = records.filter((r) => r.rating);
  const avgRating  = ratedRecs.length
    ? (ratedRecs.reduce((s, r) => s + r.rating, 0) / ratedRecs.length).toFixed(1)
    : '0.0';

  $('#summaryGrid').innerHTML = [
    { label: '전체 기록',    value: records.length },
    { label: '이번 달 기록', value: thisMonth.length },
    { label: '대표 카테고리', value: catTop },
    { label: '평균 평점',    value: avgRating + ' ★' }
  ].map((c) => `
    <article class="summary-card">
      <strong>${c.value}</strong>
      <span>${c.label}</span>
    </article>
  `).join('');
}

/* ═══════════════════════════════════════
   RENDER — RECORD CARD
═══════════════════════════════════════ */
function recordCard(r) {
  const tags  = (r.moodTags || []).slice(0, 3).map((t) => `<span class="tag">${t}</span>`).join('');
  const thumb = r.imageUrl
    ? `<img src="${escAttr(r.imageUrl)}" alt="${escText(r.title)}" />`
    : `<span>${escText(r.category?.slice(0, 1) || 'C')}</span>`;
  return `
    <article class="record-card" role="button" tabindex="0" data-record-id="${escAttr(r.id)}">
      <div class="record-thumb">${thumb}</div>
      <div class="record-body">
        <div class="record-meta">
          <span>${escText(r.category)}</span>
          <span>${fmtDate(r.consumedDate)}</span>
        </div>
        <div class="record-title">${escText(r.title)}</div>
        <p class="record-review">${escText(r.oneLineReview || '')}</p>
        <div class="tag-list">${tags}</div>
      </div>
    </article>`;
}

function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══════════════════════════════════════
   RENDER — RECENT
═══════════════════════════════════════ */
function renderRecent() {
  const recent = [...records].sort((a, b) => new Date(b.consumedDate) - new Date(a.consumedDate)).slice(0, 3);
  $('#recentRecords').innerHTML = recent.length ? recent.map(recordCard).join('') : '<p style="color:var(--muted);font-size:14px;">아직 기록이 없습니다.</p>';
  bindCardEvents('#recentRecords');
}

/* ═══════════════════════════════════════
   RENDER — ARCHIVE
═══════════════════════════════════════ */
function renderArchive() {
  renderFilters();
  const filtered = getFilteredRecords();
  const grid = $('#archiveGrid');
  grid.classList.toggle('is-list', archiveViewMode === 'list');
  grid.innerHTML = filtered.map(recordCard).join('');
  $('#archiveEmpty').hidden = filtered.length > 0;
  bindCardEvents('#archiveGrid');
}

function renderFilters() {
  const cats   = [...new Set(records.map((r) => r.category).filter(Boolean))];
  const prevCat = $('#categoryFilter').value;
  $('#categoryFilter').innerHTML = `<option value="all">전체 카테고리</option>` + cats.map((c) => `<option>${escText(c)}</option>`).join('');
  if (cats.includes(prevCat)) $('#categoryFilter').value = prevCat;
}

/* ═══════════════════════════════════════
   RENDER — REPORT
═══════════════════════════════════════ */
function renderReport() {
  const catCounts  = countItems(records.map((r) => r.category));
  const moodCounts = countItems(records.flatMap((r) => r.moodTags || []));
  const maxCat     = Math.max(1, ...Object.values(catCounts));

  $('#categoryChart').innerHTML = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, n]) => `
    <div class="chart-item">
      <div class="chart-top"><span>${escText(cat)}</span><strong>${n}개</strong></div>
      <div class="chart-bar"><div class="chart-fill" style="width:${Math.round((n / maxCat) * 100)}%"></div></div>
    </div>`).join('') || '<p class="record-review">기록이 쌓이면 카테고리 분석이 표시됩니다.</p>';

  $('#moodCloud').innerHTML = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([m, n]) =>
    `<span class="mood-pill">${escText(m)} · ${n}</span>`).join('') || '<p class="record-review">감정 태그를 입력하면 순위가 표시됩니다.</p>';

  const topCat  = getTopItem(records.map((r) => r.category));
  const topMood = getTopItem(records.flatMap((r) => r.moodTags || []));
  $('#tasteSentence').textContent = records.length
    ? `최근 기록을 보면 ${topCat || '문화 콘텐츠'} 경험이 가장 많고, ${topMood || '다양한'} 감정을 자주 남기고 있어요. 기록이 쌓일수록 취향의 방향이 더 선명해집니다.`
    : '아직 기록이 없습니다. 첫 문화 기록을 남기면 취향 문장이 생성됩니다.';
}

/* ═══════════════════════════════════════
   RENDER — CALENDAR
═══════════════════════════════════════ */
function renderCalendar() {
  const title = `${calYear}년 ${calMonth + 1}월`;
  $('#calendarTitle').textContent = title;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
  const prevLast = new Date(calYear, calMonth, 0).getDate();

  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

  // Build record map: 'YYYY-MM-DD' => [{title, category}, ...]
  const recordMap = {};
  records.forEach((r) => {
    if (!r.consumedDate) return;
    if (!recordMap[r.consumedDate]) recordMap[r.consumedDate] = [];
    recordMap[r.consumedDate].push({ title: r.title, category: r.category, id: r.id });
  });

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  let html = weekDays.map((d, i) => `<div class="cal-weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`).join('');

  let day = 1;
  let nextDay = 1;
  const totalCells = Math.ceil((firstDay + lastDate) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let cellDate, isOther = false, dayNum;

    if (i < firstDay) {
      dayNum = prevLast - firstDay + i + 1;
      const prevMonth = calMonth === 0 ? 12 : calMonth;
      const prevYear  = calMonth === 0 ? calYear - 1 : calYear;
      cellDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      isOther = true;
    } else if (day > lastDate) {
      dayNum = nextDay++;
      const nextMonth = calMonth === 11 ? 1 : calMonth + 2;
      const nextYear  = calMonth === 11 ? calYear + 1 : calYear;
      cellDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      isOther = true;
    } else {
      dayNum   = day++;
      cellDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }

    const col    = i % 7;
    const isSun  = col === 0;
    const isSat  = col === 6;
    const isToday = cellDate === today;
    const dayRecords    = recordMap[cellDate] || [];
    const stickersOnDay = calStickers[cellDate] || [];

    const classes = ['cal-cell',
      isOther  ? 'other-month' : '',
      isToday  ? 'today' : '',
      isSun    ? 'sun' : '',
      isSat    ? 'sat' : '',
      dayRecords.length ? 'has-record' : ''
    ].filter(Boolean).join(' ');

    // 라벨: 최대 2개 표시, 초과분은 +N 뱃지
    const CATEGORY_COLOR = {
      '영화':'#7a3e48','전시':'#6f7d5c','공연':'#6d6a99',
      '책':'#c7a24a','음악':'#4a7a8a','드라마':'#8a4a7a','공간':'#4a6e4a'
    };
    const visibleRecs = dayRecords.slice(0, 2);
    const extraCount  = dayRecords.length - visibleRecs.length;
    const labels = visibleRecs.map((r) => {
      const color = CATEGORY_COLOR[r.category] || 'var(--accent)';
      return `<span class="cal-label" data-record-id="${escAttr(r.id)}" style="--label-color:${color}" title="${escAttr(r.title)}">${escText(r.category)}</span>`;
    }).join('');
    const extraBadge = extraCount > 0
      ? `<span class="cal-label-extra">+${extraCount}</span>`
      : '';
    const recordHtml = dayRecords.length
      ? `<div class="cal-labels">${labels}${extraBadge}</div>`
      : '';

    const stickerHtml = stickersOnDay.length
      ? `<div class="cal-stickers">${stickersOnDay.map((s, idx) =>
          `<span class="cal-sticker-placed" data-date="${escAttr(cellDate)}" data-idx="${idx}" title="클릭해서 제거">${s}</span>`
        ).join('')}</div>`
      : '';

    html += `
      <div class="${classes}" data-date="${escAttr(cellDate)}"
           data-drop-target="true"
           aria-label="${cellDate}${isToday ? ' (오늘)' : ''}">
        <span class="cal-date">${dayNum}</span>
        ${recordHtml}
        ${stickerHtml}
      </div>`;
  }

  $('#calendarGrid').innerHTML = html;

  // Bind sticker drop targets (drag-over / drop)
  bindCalendarDrop();

  // Bind sticker-placed click (remove)
  $$('.cal-sticker-placed').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const date = el.dataset.date;
      const idx  = Number(el.dataset.idx);
      if (calStickers[date]) {
        calStickers[date].splice(idx, 1);
        if (!calStickers[date].length) delete calStickers[date];
        saveCalStickers();
        renderCalendar();
      }
    });
  });

  // 라벨 클릭 → 해당 기록 바로 열기
  $$('.cal-label[data-record-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail(el.dataset.recordId);
    });
  });

  // 셀 클릭 → 날짜의 기록 목록 / 단건 상세
  $$('.cal-cell:not(.other-month)').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.classList.contains('cal-sticker-placed')) return;
      if (e.target.closest('.cal-label')) return;
      const date = cell.dataset.date;
      const dayRecs = records.filter((r) => r.consumedDate === date);
      if (dayRecs.length === 1) { openDetail(dayRecs[0].id); return; }
      if (dayRecs.length > 1)   { showDayList(date, dayRecs); }
    });
  });
}

function showDayList(date, dayRecords) {
  const list = dayRecords.map((r) => `
    <div style="padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer;" data-record-id="${escAttr(r.id)}">
      <strong>${escText(r.title)}</strong>
      <span style="color:var(--muted);font-size:13px;margin-left:8px;">${escText(r.category)}</span>
    </div>`).join('');

  $('#detailContent').innerHTML = `
    <div style="padding:32px;">
      <p class="eyebrow">${escText(date)}</p>
      <h3 style="font-family:var(--serif);font-size:28px;font-weight:400;margin-bottom:20px;">${fmtDate(date)} 기록</h3>
      ${list}
    </div>`;
  $('#detailDialog').showModal();

  $$('#detailContent [data-record-id]').forEach((el) => {
    el.addEventListener('click', () => { $('#detailDialog').close(); openDetail(el.dataset.recordId); });
  });
}

/* ── Sticker tray ── */
function renderStickerTray() {
  $('#stickerList').innerHTML = STICKERS.map((s) =>
    `<span class="sticker-item" draggable="true" data-emoji="${escAttr(s)}">${s}</span>`
  ).join('');

  $$('.sticker-item').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      dragEmoji = el.dataset.emoji;
      e.dataTransfer.setData('text/plain', dragEmoji);
      e.dataTransfer.effectAllowed = 'copy';
      showGhost(dragEmoji, e.clientX, e.clientY);
    });
    el.addEventListener('dragend', () => hideGhost());

    // Touch support
    el.addEventListener('touchstart', onStickerTouchStart, { passive: true });
  });
}

/* ── Drag ghost ── */
function showGhost(emoji, x, y) {
  const ghost = $('#dragGhost');
  ghost.textContent = emoji;
  ghost.style.display = 'block';
  moveGhost(x, y);
}
function moveGhost(x, y) {
  const ghost = $('#dragGhost');
  ghost.style.left = x + 'px';
  ghost.style.top  = y + 'px';
}
function hideGhost() { $('#dragGhost').style.display = 'none'; }

/* ── Desktop drag-and-drop on calendar ── */
function bindCalendarDrop() {
  $$('[data-drop-target]').forEach((cell) => {
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      const emoji = e.dataTransfer.getData('text/plain') || dragEmoji;
      if (!emoji) return;
      const date = cell.dataset.date;
      if (!calStickers[date]) calStickers[date] = [];
      calStickers[date].push(emoji);
      saveCalStickers();
      renderCalendar();
      dragEmoji = null;
    });
  });
}

/* ── Touch drag-and-drop ── */
let touchSticker = null;
function onStickerTouchStart(e) {
  const el = e.currentTarget;
  touchSticker = el.dataset.emoji;
  showGhost(touchSticker, e.touches[0].clientX, e.touches[0].clientY);

  function onMove(ev) {
    ev.preventDefault();
    moveGhost(ev.touches[0].clientX, ev.touches[0].clientY);
  }
  function onEnd(ev) {
    hideGhost();
    const touch = ev.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = target?.closest('[data-drop-target]');
    if (cell && touchSticker) {
      const date = cell.dataset.date;
      if (!calStickers[date]) calStickers[date] = [];
      calStickers[date].push(touchSticker);
      saveCalStickers();
      renderCalendar();
    }
    touchSticker = null;
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
  }

  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}

/* ── Also allow clicking a sticker in the tray to open a date picker ── */
function onStickerClick(emoji) {
  const date = prompt('스티커를 붙일 날짜를 입력하세요 (YYYY-MM-DD):', new Date().toLocaleDateString('sv-SE'));
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (!calStickers[date]) calStickers[date] = [];
  calStickers[date].push(emoji);
  saveCalStickers();
  if ($('#calendar').classList.contains('is-visible')) renderCalendar();
}

/* ═══════════════════════════════════════
   DETAIL DIALOG
═══════════════════════════════════════ */
function openDetail(id) {
  const r = records.find((item) => item.id === id);
  if (!r) return;

  const image = r.imageUrl
    ? `<img src="${escAttr(r.imageUrl)}" alt="${escText(r.title)}" />`
    : `<span>${escText(r.category?.slice(0, 1) || 'C')}</span>`;

  const tags = (r.moodTags || []).map((t) => `<span class="tag">${escText(t)}</span>`).join('');

  $('#detailContent').innerHTML = `
    <div class="detail-layout">
      <div class="detail-image">${image}</div>
      <div class="detail-info">
        <p class="eyebrow">${escText(r.category)} · Private Record</p>
        <h3>${escText(r.title)}</h3>
        <p class="record-review" style="font-size:14px;">
          ${fmtDate(r.consumedDate)} · ${escText(r.place || '장소 미입력')} · ${stars(r.rating)}
        </p>
        <div class="tag-list" style="margin:12px 0">${tags}</div>
        <h4 style="margin-top:18px;font-size:14px;">한 줄 감상</h4>
        <p style="color:var(--text)">${escText(r.oneLineReview || '-')}</p>
        <h4 style="font-size:14px;">상세 감상</h4>
        <p class="full">${escText(r.fullReview || '상세 감상이 없습니다.')}</p>
        <div class="detail-actions">
          <button class="btn" data-edit-id="${escAttr(r.id)}">수정</button>
          <button class="btn danger" data-delete-id="${escAttr(r.id)}">삭제</button>
        </div>
      </div>
    </div>`;

  $('#detailDialog').showModal();
  $('[data-edit-id]').addEventListener('click', () => editRecord(r.id));
  $('[data-delete-id]').addEventListener('click', () => deleteRecord(r.id));
}

function bindCardEvents(parentSel) {
  $$(parentSel + ' .record-card').forEach((card) => {
    card.onclick    = () => openDetail(card.dataset.recordId);
    card.onkeydown  = (e) => { if (e.key === 'Enter') openDetail(card.dataset.recordId); };
  });
}

/* ═══════════════════════════════════════
   FORM — STAR RATING
═══════════════════════════════════════ */
function setStarRating(val) {
  currentRating = val;
  $('#rating').value = val;
  $$('.star').forEach((s) => s.classList.toggle('active', Number(s.dataset.val) <= val));
}

function bindStars() {
  $$('.star').forEach((s) => {
    s.addEventListener('click', () => setStarRating(Number(s.dataset.val)));
    s.addEventListener('mouseover', () => {
      $$('.star').forEach((x) => x.classList.toggle('active', Number(x.dataset.val) <= Number(s.dataset.val)));
    });
    s.addEventListener('mouseleave', () => setStarRating(currentRating));
  });
}

/* ═══════════════════════════════════════
   FORM — MOOD SUGGESTIONS
═══════════════════════════════════════ */
function renderMoodSuggest() {
  $('#moodSuggest').innerHTML = MOOD_SUGGESTIONS.map((m) =>
    `<button type="button" class="mood-chip" data-mood="${escAttr(m)}">${m}</button>`
  ).join('');

  $$('.mood-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cur  = $('#moodTags').value;
      const list = cur.split(',').map((s) => s.trim()).filter(Boolean);
      if (!list.includes(chip.dataset.mood)) {
        list.push(chip.dataset.mood);
        $('#moodTags').value = list.join(', ');
      }
    });
  });
}

/* ═══════════════════════════════════════
   FORM — RESET / POPULATE
═══════════════════════════════════════ */
function resetForm() {
  $('#recordForm').reset();
  $('#recordId').value = '';
  $('#formTitle').textContent = '문화 기록 등록';
  $('#consumedDate').value = new Date().toLocaleDateString('sv-SE');
  currentImg    = '';
  currentRating = 0;
  setStarRating(0);
  $('#imagePreview').innerHTML = '이미지 미리보기';
}

function editRecord(id) {
  const r = records.find((item) => item.id === id);
  if (!r) return;
  $('#detailDialog').close();
  $('#recordId').value = r.id;
  $('#formTitle').textContent = '문화 기록 수정';
  $('#category').value = r.category;
  $('#title').value    = r.title;
  $('#consumedDate').value = r.consumedDate;
  $('#place').value    = r.place || '';
  $('#moodTags').value = (r.moodTags || []).join(', ');
  $('#oneLineReview').value = r.oneLineReview || '';
  $('#fullReview').value    = r.fullReview    || '';
  currentImg    = r.imageUrl || '';
  currentRating = r.rating   || 0;
  setStarRating(currentRating);
  $('#imagePreview').innerHTML = currentImg ? `<img src="${escAttr(currentImg)}" alt="이미지 미리보기" />` : '이미지 미리보기';
  setView('new-record');
}

function deleteRecord(id) {
  if (!confirm('이 기록을 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return;
  records = records.filter((r) => r.id !== id);
  saveRecords();
  $('#detailDialog').close();
  renderArchive();
  renderSummary();
  renderRecent();
}

/* ═══════════════════════════════════════
   FORM — SUBMIT
═══════════════════════════════════════ */
/* 이미지를 최대 600px로 리사이즈 + JPEG 0.75 압축해서 반환
   → localStorage 용량 초과 방지 */
function readImageFile(file) {
  return new Promise(function(resolve) {
    if (!file) { resolve(currentImg); return; }

    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var MAX = 600;
        var w = img.width;
        var h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        var canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = function() { resolve(''); };
      img.src = ev.target.result;
    };
    reader.onerror = function() { resolve(''); };
    reader.readAsDataURL(file);
  });
}

function handleSubmit(e) {
  e.preventDefault();

  // 필수 항목 검증
  const titleVal = $('#title').value.trim();
  const dateVal  = $('#consumedDate').value.trim();
  if (!titleVal) { alert('제목을 입력해주세요.'); $('#title').focus(); return; }
  if (!dateVal)  { alert('감상 날짜를 선택해주세요.'); $('#consumedDate').focus(); return; }

  const editingId = $('#recordId').value.trim();
  const isEdit    = editingId !== '' && records.some(function(r) { return r.id === editingId; });
  const id        = isEdit ? editingId : crypto.randomUUID();

  // 이미지는 currentImg 사용 (이미 change 이벤트에서 읽어둠)
  const payload = {
    id:            id,
    title:         titleVal,
    category:      $('#category').value,
    consumedDate:  dateVal,
    place:         $('#place').value.trim(),
    rating:        currentRating,
    moodTags:      $('#moodTags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean),
    oneLineReview: $('#oneLineReview').value.trim(),
    fullReview:    $('#fullReview').value.trim(),
    imageUrl:      currentImg,
    visibility:    'private',
    createdAt:     isEdit ? records.find(function(r) { return r.id === id; }).createdAt : new Date().toISOString(),
    updatedAt:     new Date().toISOString()
  };

  if (isEdit) {
    var idx = records.findIndex(function(r) { return r.id === id; });
    records[idx] = payload;
  } else {
    records.unshift(payload);
  }

  try {
    saveRecords();
  } catch(err) {
    alert('저장 중 오류가 발생했습니다: ' + err.message);
    return;
  }

  resetForm();
  setView('archive');
}

/* ═══════════════════════════════════════
   CALENDAR NAV
═══════════════════════════════════════ */
function initCalendarNav() {
  $('#calPrev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0)  { calMonth = 11; calYear--; }
    renderCalendar();
  });
  $('#calNext').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });
  $('#calToday').addEventListener('click', () => {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    renderCalendar();
  });
}

/* ═══════════════════════════════════════
   BIND ALL EVENTS
═══════════════════════════════════════ */
function bindEvents() {
  // Navigation
  $$('.nav-item').forEach((btn) => btn.addEventListener('click', () => setView(btn.dataset.view)));
  $$('[data-view-trigger]').forEach((btn) => btn.addEventListener('click', () => setView(btn.dataset.viewTrigger)));

  // Search
  $('#globalSearch').addEventListener('input', () => {
    if (!$('#archive').classList.contains('is-visible')) setView('archive');
    else renderArchive();
  });

  // Filters
  ['categoryFilter', 'sortFilter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', renderArchive);
  });

  // Form
  $('#recordForm').addEventListener('submit', handleSubmit);
  $('#cancelForm').addEventListener('click', () => setView('dashboard'));
  $('#imageFile').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    readImageFile(file).then(function(data) {
      currentImg = data;
      $('#imagePreview').innerHTML = data
        ? '<img src="' + escAttr(data) + '" alt="이미지 미리보기" />'
        : '이미지 미리보기';
    });
  });

  // Archive view toggle
  $$('#archiveViewToggle .view-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      archiveViewMode = btn.dataset.viewMode;
      $$('#archiveViewToggle .view-toggle-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      renderArchive();
    });
  });

  // Dialog close
  $('#closeDialog').addEventListener('click', () => $('#detailDialog').close());
  $('#detailDialog').addEventListener('click', (e) => {
    if (e.target === $('#detailDialog')) $('#detailDialog').close();
  });

  // Theme toggle
  $$('#themeToggle .toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // Font toggle
  $$('#fontToggle .toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyFont(btn.dataset.font));
  });

  // Drag ghost follow mouse
  document.addEventListener('dragover', (e) => moveGhost(e.clientX, e.clientY));
  document.addEventListener('dragend',  () => hideGhost());

  // Calendar nav
  initCalendarNav();
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
function init() {
  // Restore settings
  applyTheme(settings.theme || 'light');
  applyFont(settings.font  || 'paperlogic');

  // Init sticker tray
  renderStickerTray();

  // Init star rating
  bindStars();

  // Init mood suggestions
  renderMoodSuggest();

  // Bind all events
  bindEvents();

  // Initial render
  resetForm();
  renderSummary();
  renderRecent();
  renderArchive();
}

init();
