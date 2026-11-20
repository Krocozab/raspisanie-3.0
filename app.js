(function () {
  'use strict';

  const DATA = window.SCHEDULE;
  const contentEl = document.getElementById('content');

  if (!DATA || !Array.isArray(DATA.weeks) || DATA.weeks.length === 0) {
    contentEl.innerHTML =
      '<div class="empty"><div class="emoji">⚠️</div>' +
      '<div class="title">Нет данных</div>' +
      '<div class="hint">Проверьте файл schedule.js рядом с приложением.</div></div>';
    return;
  }

  const WEEKS = DATA.weeks;
  const N = WEEKS.length;
  const MINUTES_ONLY = !!(DATA.meta && DATA.meta.minutesOnly);

  const DAYS = [
    { key: 'mon', short: 'Пн', full: 'Понедельник' },
    { key: 'tue', short: 'Вт', full: 'Вторник' },
    { key: 'wed', short: 'Ср', full: 'Среда' },
    { key: 'thu', short: 'Чт', full: 'Четверг' },
    { key: 'fri', short: 'Пт', full: 'Пятница' },
    { key: 'sat', short: 'Сб', full: 'Суббота' },
    { key: 'sun', short: 'Вс', full: 'Воскресенье' },
  ];

  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  /* ---------------- даты ---------------- */

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function mondayOf(date) {
    const d = startOfDay(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }

  function parseDate(str) {
    if (!str) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  }

  const TODAY = new Date();
  const TODAY_IDX = (TODAY.getDay() + 6) % 7;
  const BASE_MONDAY = mondayOf(TODAY);

  const semesterStart = parseDate(DATA.meta && DATA.meta.semesterStart);

  function rawCycleIndex(monday) {
    if (!semesterStart) return 0;
    const passed = Math.floor(daysBetween(mondayOf(semesterStart), monday) / 7);
    return ((passed % N) + N) % N;
  }

  function loadCalib() {
    try {
      const v = parseInt(localStorage.getItem('schedule.calib'), 10);
      return Number.isFinite(v) ? ((v % N) + N) % N : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveCalib(v) {
    try { localStorage.setItem('schedule.calib', String((v % N + N) % N)); } catch (e) { /* ignore */ }
  }

  let calib = loadCalib();

  function autoIndex() {
    return (rawCycleIndex(BASE_MONDAY) + calib) % N;
  }

  /* ---------------- состояние ---------------- */

  const state = {
    offset: 0,
    day: TODAY_IDX,
  };

  function currentWeek() {
    return WEEKS[(autoIndex() + state.offset) % N] || WEEKS[0];
  }

  function shownMonday() {
    return addDays(BASE_MONDAY, state.offset * 7);
  }

  function hasLessons(week, dayKey) {
    const list = week && week.days && week.days[dayKey];
    return Array.isArray(list) && list.length > 0;
  }

  function lessonsFor(week, dayKey) {
    const list = week && week.days && week.days[dayKey];
    return Array.isArray(list) ? list.slice() : [];
  }

  (function pickSmartDay() {
    if (hasLessons(currentWeek(), DAYS[TODAY_IDX].key)) return;
    for (let i = 0; i < 7; i++) {
      const idx = (TODAY_IDX + i) % 7;
      if (hasLessons(currentWeek(), DAYS[idx].key)) { state.day = idx; return; }
    }
    state.day = TODAY_IDX < 5 ? TODAY_IDX : 0;
  })();

  /* ---------------- время ---------------- */

  function toMinutes(hhmm) {
    const m = /^(\d{1,2})[:.\-](\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  /** «47 мин» / «2 ч 05 мин» — минуты всегда на первом месте. */
  function humanMinutes(total) {
    const m = Math.max(0, Math.round(total));
    if (MINUTES_ONLY || m < 60) return m + ' мин';
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return h + ' ч' + (rest ? ' ' + String(rest).padStart(2, '0') + ' мин' : '');
  }

  /* ---------------- элементы ---------------- */

  const weekSwitchEl = document.getElementById('weekSwitch');
  const dayTabsEl = document.getElementById('dayTabs');
  const groupNameEl = document.getElementById('groupName');
  const footnoteEl = document.getElementById('footnote');
  const todayBtn = document.getElementById('todayBtn');
  const themeBtn = document.getElementById('themeBtn');
  const themeMenu = document.getElementById('themeMenu');
  const weatherCard = document.getElementById('weatherCard');
  const weatherIcon = document.getElementById('weatherIcon');
  const weatherTemp = document.getElementById('weatherTemp');
  const weatherDetails = document.getElementById('weatherDetails');
  const weatherForecast = document.getElementById('weatherForecast');
  const weatherHourly = document.getElementById('weatherHourly');
  const weatherDayButton = document.getElementById('weatherDayButton');
  const weatherDayMenu = document.getElementById('weatherDayMenu');
  const weatherStatus = document.getElementById('weatherStatus');
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=45.0355&longitude=38.9753&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=4';

  if (DATA.meta && DATA.meta.group) {
    groupNameEl.textContent = DATA.meta.group;
  } else if (groupNameEl) {
    groupNameEl.hidden = true;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------- погода ---------------- */

  const WEATHER_CODES = {
    0: ['☀️', 'Ясно'],
    1: ['🌤️', 'Преимущественно ясно'],
    2: ['⛅', 'Переменная облачность'],
    3: ['☁️', 'Пасмурно'],
    45: ['🌫️', 'Туман'],
    48: ['🌫️', 'Изморозь'],
    51: ['🌦️', 'Морось'],
    53: ['🌦️', 'Морось'],
    55: ['🌧️', 'Сильная морось'],
    61: ['🌦️', 'Небольшой дождь'],
    63: ['🌧️', 'Дождь'],
    65: ['🌧️', 'Сильный дождь'],
    71: ['🌨️', 'Небольшой снег'],
    73: ['🌨️', 'Снег'],
    75: ['❄️', 'Сильный снег'],
    80: ['🌦️', 'Ливни'],
    81: ['🌧️', 'Ливни'],
    82: ['⛈️', 'Сильные ливни'],
    95: ['⛈️', 'Гроза'],
    96: ['⛈️', 'Гроза с градом'],
    99: ['⛈️', 'Гроза с градом'],
  };

  function weatherInfo(code) {
    return WEATHER_CODES[Number(code)] || ['🌡️', 'Неизвестно'];
  }

  function formatWeatherTemp(value) {
    return Number.isFinite(Number(value)) ? Math.round(value) + '°' : '—';
  }

  function weatherDayLabel(dateString, index) {
    if (index === 0) return 'Сегодня';
    if (index === 1) return 'Завтра';
    const date = new Date(dateString + 'T12:00:00');
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
      .format(date)
      .replace('.', '');
  }

  function weatherHourLabel(dateString, index, isCurrentDay) {
    if (isCurrentDay && index === 0) return 'Сейчас';
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
      .format(new Date(dateString));
  }

  let selectedWeatherDay = 0;
  let latestWeatherData = null;

  function renderWeatherDayMenu(daily) {
    const dates = Array.isArray(daily.time) ? daily.time : [];
    if (!dates.length) return;
    if (selectedWeatherDay >= dates.length) selectedWeatherDay = 0;
    weatherDayButton.textContent = weatherDayLabel(dates[selectedWeatherDay], selectedWeatherDay) + ' ▾';
    weatherDayMenu.innerHTML = dates.map(function (date, index) {
      return '<button type="button" class="weather-day-option" role="option" aria-selected="' +
        (index === selectedWeatherDay ? 'true' : 'false') + '" data-weather-day="' + index + '">' +
        esc(weatherDayLabel(date, index)) + '</button>';
    }).join('');
  }

  function renderHourlyWeather(data) {
    const current = data.current || {};
    const hourly = data.hourly || {};
    const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
    const dayStart = selectedWeatherDay * 24;
    const morningHour = 5;
    let firstHour = dayStart + morningHour;
    if (selectedWeatherDay === 0 && current.time) {
      const currentHour = hourlyTimes.findIndex(function (time) { return time >= current.time; });
      if (currentHour >= 0) firstHour = Math.max(dayStart + morningHour, currentHour);
    }
    const hourlyItems = hourlyTimes.slice(firstHour, firstHour + 12).map(function (time, i) {
      const dataIndex = firstHour + i;
      const hourInfo = weatherInfo(hourly.weather_code && hourly.weather_code[dataIndex]);
      const chance = hourly.precipitation_probability && hourly.precipitation_probability[dataIndex];
      return '<div class="weather-hour">' +
        '<span class="weather-hour-time">' + esc(weatherHourLabel(time, i, selectedWeatherDay === 0)) + '</span>' +
        '<span class="weather-hour-icon" aria-hidden="true">' + hourInfo[0] + '</span>' +
        '<strong>' + formatWeatherTemp(hourly.temperature_2m && hourly.temperature_2m[dataIndex]) + '</strong>' +
        '<span class="weather-hour-rain">' + (chance == null ? '—' : Math.round(chance) + '%') + '</span>' +
        '</div>';
    });
    weatherHourly.innerHTML = hourlyItems.length ? hourlyItems.join('') : '<span class="weather-hourly-empty">Почасовой прогноз недоступен</span>';
  }

  function renderWeather(data) {
    latestWeatherData = data;
    const current = data.current || {};
    const daily = data.daily || {};
    const info = weatherInfo(current.weather_code);
    const humidity = Number.isFinite(Number(current.relative_humidity_2m)) ? Math.round(current.relative_humidity_2m) : '—';
    const wind = Number.isFinite(Number(current.wind_speed_10m)) ? Math.round(current.wind_speed_10m) : '—';

    weatherCard.classList.remove('is-loading', 'is-error');
    weatherIcon.textContent = info[0];
    weatherIcon.setAttribute('aria-label', info[1]);
    weatherTemp.textContent = formatWeatherTemp(current.temperature_2m);
    weatherDetails.innerHTML =
      '<span>' + esc(info[1]) + '</span>' +
      '<span>Ощущается ' + formatWeatherTemp(current.apparent_temperature) + '</span>' +
      '<span>Влажность ' + humidity + '%</span>' +
      '<span>Ветер ' + wind + ' км/ч</span>';

    weatherForecast.innerHTML = '';
    renderWeatherDayMenu(daily);
    renderHourlyWeather(data);

    const updated = current.time ? new Date(current.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    weatherStatus.textContent = updated ? 'Обновлено в ' + updated + ' · прогноз Open-Meteo' : 'Прогноз Open-Meteo';
  }

  function showWeatherError() {
    weatherCard.classList.remove('is-loading');
    weatherCard.classList.add('is-error');
    weatherIcon.textContent = '⚠️';
    weatherIcon.setAttribute('aria-label', 'Ошибка загрузки');
    weatherTemp.textContent = '—';
    weatherDetails.innerHTML = '<span>Погода временно недоступна</span>';
    weatherForecast.innerHTML = '';
    weatherHourly.innerHTML = '';
    weatherStatus.textContent = 'Проверьте подключение к интернету';
  }

  let weatherRequestInFlight = false;

  async function loadWeather() {
    if (!weatherCard || weatherRequestInFlight) return;
    weatherRequestInFlight = true;
    weatherCard.classList.add('is-loading');
    try {
      const response = await fetch(WEATHER_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Weather request failed');
      renderWeather(await response.json());
    } catch (error) {
      showWeatherError();
    } finally {
      weatherRequestInFlight = false;
    }
  }

  if (weatherDayButton && weatherDayMenu) {
    weatherDayButton.addEventListener('click', function () {
      const isOpen = !weatherDayMenu.hidden;
      weatherDayMenu.hidden = isOpen;
      weatherDayButton.setAttribute('aria-expanded', String(!isOpen));
    });

    weatherDayMenu.addEventListener('click', function (event) {
      const option = event.target.closest && event.target.closest('[data-weather-day]');
      if (!option) return;
      selectedWeatherDay = Number(option.getAttribute('data-weather-day')) || 0;
      weatherDayMenu.hidden = true;
      weatherDayButton.setAttribute('aria-expanded', 'false');
      if (latestWeatherData) renderWeather(latestWeatherData);
    });

    document.addEventListener('click', function (event) {
      if (!weatherCard.contains(event.target)) {
        weatherDayMenu.hidden = true;
        weatherDayButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- отрисовка ---------------- */

  function renderWeekSwitch() {
    const active = (autoIndex() + state.offset) % N;
    weekSwitchEl.innerHTML = '';

    WEEKS.forEach(function (week, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.textContent = week.label || ('Неделя ' + (i + 1));
      btn.setAttribute('aria-selected', String(i === active));
      btn.addEventListener('click', function () {
        state.offset = (i - autoIndex() + N) % N;
        render();
      });
      weekSwitchEl.appendChild(btn);
    });
  }

  function renderDayTabs() {
    const monday = shownMonday();
    const week = currentWeek();
    dayTabsEl.innerHTML = '';

    DAYS.forEach(function (day, i) {
      const date = addDays(monday, i);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-tab';
      btn.setAttribute('role', 'tab');

      const isSelected = i === state.day;
      btn.setAttribute('aria-selected', String(isSelected));

      if (i === TODAY_IDX && state.offset === 0) {
        btn.classList.add('is-today');
        btn.setAttribute('aria-current', 'true');
      }
      if (!hasLessons(week, day.key)) btn.classList.add('is-empty');

      btn.innerHTML =
        '<span class="d-name">' + day.short + '</span>' +
        '<span class="d-date">' + date.getDate() + '</span>';

      btn.addEventListener('click', function () {
        state.day = i;
        render();
      });

      dayTabsEl.appendChild(btn);

      if (isSelected) {
        requestAnimationFrame(function () {
          btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      }
    });
  }

  /** Находит пару, которая идёт сейчас, и следующую по времени. */
  function pickCurrentAndNext(lessons, now) {
    let current = -1;
    let next = -1;

    lessons.forEach(function (lesson, i) {
      const s = toMinutes(lesson.start);
      const e = toMinutes(lesson.end);
      if (s == null) return;
      if (e != null && now >= s && now < e) {
        if (current === -1) current = i;
        return;
      }
      if (now < s && next === -1) next = i;
    });

    return { current: current, next: next };
  }

  function statusHTML(lessons, now) {
    const found = pickCurrentAndNext(lessons, now);

    if (found.current >= 0) {
      const lesson = lessons[found.current];
      const end = toMinutes(lesson.end);
      const left = end == null ? null : end - now;
      return '<div class="status status-live">' +
        '<span class="status-label">Идёт пара</span>' +
        '<span class="status-value">' + (left == null ? 'сейчас' : humanMinutes(left)) + '</span>' +
        '<span class="status-sub">' + (left == null ? '' : 'до конца · ') +
          esc(lesson.subject || '') + (lesson.room ? ' · ' + esc(lesson.room) : '') + '</span>' +
        '</div>';
    }

    if (found.next >= 0) {
      const lesson = lessons[found.next];
      const diff = toMinutes(lesson.start) - now;
      return '<div class="status">' +
        '<span class="status-label">До начала пары</span>' +
        '<span class="status-value">' + humanMinutes(diff) + '</span>' +
        '<span class="status-sub">' + esc(lesson.start) + ' · ' + esc(lesson.subject || '') +
          (lesson.room ? ' · ' + esc(lesson.room) : '') + '</span>' +
        '</div>';
    }

    return '<div class="status status-done">' +
      '<span class="status-label">На сегодня</span>' +
      '<span class="status-sub">пар больше нет</span>' +
      '</div>';
  }

  function renderContent(still) {
    if (still) contentEl.classList.add('still');

    const week = currentWeek();
    const dayKey = DAYS[state.day].key;
    const lessons = lessonsFor(week, dayKey);

    lessons.sort(function (a, b) {
      const am = toMinutes(a.start);
      const bm = toMinutes(b.start);
      return (am == null ? 9999 : am) - (bm == null ? 9999 : bm);
    });

    if (lessons.length === 0) {
      const isWeekend = state.day >= 5;
      contentEl.innerHTML =
        '<div class="empty">' +
        '<div class="emoji">' + (isWeekend ? '🌿' : '☕️') + '</div>' +
        '<div class="title">' + (isWeekend ? 'Выходной' : 'Пар нет') + '</div>' +
        '<div class="hint">' + esc(DAYS[state.day].full) + ' — занятий не найдено.</div>' +
        '</div>';
      if (still) requestAnimationFrame(function () { contentEl.classList.remove('still'); });
      return;
    }

    const onToday = state.offset === 0 && state.day === TODAY_IDX;
    const now = nowMinutes();
    const found = onToday ? pickCurrentAndNext(lessons, now) : { current: -1, next: -1 };

    let html = '';

    if (onToday) html += statusHTML(lessons, now);

    lessons.forEach(function (lesson, idx) {
      const start = toMinutes(lesson.start);
      const end = toMinutes(lesson.end);
      const isNow = onToday && start != null && end != null && now >= start && now < end;
      const isPast = onToday && end != null && now >= end;
      const isNext = idx === found.next;

      const cls = ['lesson'];
      if (isNow) cls.push('now');
      else if (isPast) cls.push('past');

      html += '<article class="' + cls.join(' ') + '" style="animation-delay:' + (idx * 22) + 'ms">';

      if (isNow) html += '<span class="badge-now">сейчас</span>';

      html += '<div class="lesson-time">' +
        '<span class="t-start">' + esc(lesson.start || '') + '</span>' +
        (lesson.end ? '<span class="t-end">' + esc(lesson.end) + '</span>' : '');

      if (isNext && start != null) {
        html += '<span class="t-left">через ' + humanMinutes(start - now) + '</span>';
      } else if (isNow && end != null) {
        html += '<span class="t-left">ещё ' + humanMinutes(end - now) + '</span>';
      }

      html += '</div>';

      html += '<div class="lesson-body"><p class="lesson-subject">';
      if (lesson.kind) html += '<span class="kind">' + esc(lesson.kind) + '</span>';
      html += esc(lesson.subject || 'Без названия');
      html += '</p>';

      const chips = [];
      if (lesson.room) chips.push('<span class="chip room">' + esc(lesson.room) + '</span>');
      if (lesson.teacher) chips.push('<span class="chip teacher">' + esc(lesson.teacher) + '</span>');
      if (chips.length) html += '<p class="lesson-meta">' + chips.join('') + '</p>';

      if (lesson.note) html += '<p class="lesson-note">' + esc(lesson.note) + '</p>';

      html += '</div></article>';
    });

    contentEl.innerHTML = html;

    if (still) requestAnimationFrame(function () { contentEl.classList.remove('still'); });
  }

  function renderFootnote() {
    const monday = shownMonday();
    const sunday = addDays(monday, 6);
    const week = currentWeek();

    const range =
      monday.getDate() + ' ' + MONTHS[monday.getMonth()] + ' — ' +
      sunday.getDate() + ' ' + MONTHS[sunday.getMonth()];

    footnoteEl.innerHTML =
      '<span>' + esc(week.label || 'Неделя') + ' · ' + range + '</span>' +
      '<button type="button" class="link-btn" id="calibBtn" title="Если приложение считает неделю неверно">не та неделя?</button>';
  }

  function renderTodayBtn() {
    todayBtn.hidden = state.offset === 0 && state.day === TODAY_IDX;
  }

  function render() {
    renderWeekSwitch();
    renderDayTabs();
    renderContent(false);
    renderFootnote();
    renderTodayBtn();
    document.title = (currentWeek().label || 'Расписание') + ' · Расписание';
  }

  todayBtn.addEventListener('click', function () {
    state.offset = 0;
    state.day = TODAY_IDX;
    render();
  });

  footnoteEl.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('#calibBtn');
    if (!btn) return;
    calib = (calib + 1) % N;
    saveCalib(calib);
    state.offset = 0;
    render();
  });

  /* ---------------- тема ---------------- */

  const THEME_META_COLORS = {
    dark: '#0d1220',
    light: '#f1f4fb',
    ocean: '#071a2d',
    sunset: '#24131b',
    forest: '#0e1e19',
  };

  function applyTheme(theme) {
    if (!THEME_META_COLORS[theme]) theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_META_COLORS[theme]);
    try { localStorage.setItem('schedule.theme', theme); } catch (e) { /* ignore */ }
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('schedule.theme'); } catch (e) { saved = null; }
    if (saved && THEME_META_COLORS[saved]) {
      applyTheme(saved);
    } else {
      const light = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(light ? 'light' : 'dark');
    }
  })();

  themeBtn.addEventListener('click', function () {
    const isOpen = !themeMenu.hidden;
    themeMenu.hidden = isOpen;
    themeBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  themeMenu.addEventListener('click', function (event) {
    const option = event.target.closest && event.target.closest('[data-theme-option]');
    if (!option) return;
    applyTheme(option.getAttribute('data-theme-option'));
    themeMenu.hidden = true;
    themeBtn.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.theme-picker')) {
      themeMenu.hidden = true;
      themeBtn.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------------- живое обновление счётчика ---------------- */

  function refreshLive() {
    if (state.offset !== 0 || state.day !== TODAY_IDX) return;
    renderContent(true);
  }

  setInterval(function () {
    if (document.hidden) return;
    refreshLive();
  }, 20000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      refreshLive();
      loadWeather();
    }
  });

  render();
  loadWeather();
  setInterval(function () {
    if (!document.hidden) loadWeather();
  }, 30 * 60 * 1000);

  /* ---------------- обновление приложения ---------------- */

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      const updateBtn = document.getElementById('appUpdateBtn');
      let registration = null;
      let updateAccepted = false;

      function showUpdateButton() {
        if (!updateBtn) return;
        updateBtn.hidden = false;
        updateBtn.setAttribute('aria-label', 'Доступно обновление приложения');
      }

      navigator.serviceWorker.register('sw.js').then(function (reg) {
        registration = reg;

        function revealWaitingUpdate() {
          if (reg.waiting && navigator.serviceWorker.controller) showUpdateButton();
        }

        // Проверяем обновление сразу при открытии приложения.
        revealWaitingUpdate();
        reg.update().then(revealWaitingUpdate).catch(function () { /* без обновления */ });

        reg.addEventListener('updatefound', function () {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateButton();
            }
          });
        });

        setInterval(function () {
          if (!document.hidden) reg.update().then(revealWaitingUpdate).catch(function () { /* без обновления */ });
        }, 30 * 60 * 1000);
      }).catch(function () { /* без офлайна */ });

      if (updateBtn) {
        updateBtn.addEventListener('click', function () {
          updateAccepted = true;
          updateBtn.disabled = true;
          updateBtn.textContent = 'Обновляем…';
          if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            window.location.reload();
          }
        });
      }

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (updateAccepted) window.location.reload();
      });
    });
  }
})();
