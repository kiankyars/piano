(() => {
  'use strict';

  const curriculum = window.PIANO;
  const SETTINGS_KEY = 'piano-practice.settings.v1';
  const LOG_KEY = 'piano-practice.log.v1';
  const $ = (id) => document.getElementById(id);
  let storageAvailable = true;

  function storageNotice(message) {
    $('storage-status').textContent = message;
    $('storage-status').hidden = false;
  }

  function readSaved(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      if (error instanceof SyntaxError) {
        storageNotice('A saved browser record could not be read. This page will use fresh settings; keep any previous exports.');
      } else {
        storageAvailable = false;
        storageNotice('Browser storage is unavailable. You can still practice and log this session; export your log before closing the page.');
      }
      return fallback;
    }
  }

  function persist(key, value) {
    if (!storageAvailable) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      storageAvailable = false;
      storageNotice('Your browser could not save the latest changes. They are available in this open page; export your log before closing it.');
      return false;
    }
  }

  const savedSettings = readSaved(SETTINGS_KEY, {});
  let stageIndex = curriculum.stages.findIndex((stage) => stage.id === savedSettings?.stage);
  if (stageIndex < 0) stageIndex = 0;
  let dayIndex = Number.isInteger(savedSettings?.day) && savedSettings.day >= 0 && savedSettings.day < curriculum.days.length ? savedSettings.day : 0;
  const storedLog = readSaved(LOG_KEY, []);
  let entries = Array.isArray(storedLog) ? storedLog.filter((entry) => entry && typeof entry === 'object' && typeof entry.excerpt === 'string' && typeof entry.date === 'string') : [];
  let activeBlock = 0;
  let remainingMs = curriculum.blocks[0].minutes * 60000;
  let deadline = null;
  let interval = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function saveSettings() {
    persist(SETTINGS_KEY, { stage: curriculum.stages[stageIndex].id, day: dayIndex });
  }

  function localDate() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  function resourceLink(url, label) {
    const link = element('a', 'resource-link', `${label} ↗`);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function safeScoreUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function accuracyLabel(name, value) {
    return Number.isFinite(value) ? `${name} ≈ ${value}%` : `${name}: not estimated`;
  }

  function renderStage() {
    const stage = curriculum.stages[stageIndex];
    $('stage-select').value = String(stage.id);
    $('stage-number').textContent = `Stage ${String(stage.id).padStart(2, '0')} / ${String(curriculum.stages.length).padStart(2, '0')}`;
    for (const key of ['title', 'weeks', 'focus', 'notes', 'rhythm', 'reading', 'technique', 'gate']) {
      $(`stage-${key}`).textContent = stage[key];
    }
    $('main-library-link').href = stage.libraryUrl;
    $('library-name').textContent = stage.library;
    $('first-score').hidden = stage.id !== 1;
    renderBlocks();
  }

  function renderDay() {
    const day = curriculum.days[dayIndex];
    $('session-label').textContent = `Session ${dayIndex + 1}`;
    $('session-title').textContent = day.title;
    $('session-description').textContent = day.focus;
    [...$('session-buttons').children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === dayIndex)));
  }

  function chooseDay(index) {
    dayIndex = (index + curriculum.days.length) % curriculum.days.length;
    renderDay();
    saveSettings();
  }

  function renderBlocks() {
    const stage = curriculum.stages[stageIndex];
    const container = $('practice-blocks');
    container.replaceChildren();
    curriculum.blocks.forEach((block, index) => {
      if (index === 0 || index === 4) {
        container.append(element('div', 'block-group-label', index === 0 ? '30 minutes · Build your reading' : '30 minutes · Build your playing'));
      }
      const card = element('article', 'practice-card');
      card.append(element('span', 'block-number', String(index + 1).padStart(2, '0')));
      const body = element('div');
      const top = element('div', 'card-top');
      top.append(element('h3', '', block.title));
      const timerButton = element('button', 'minute-select', `${block.minutes} min`);
      timerButton.type = 'button';
      timerButton.dataset.block = String(index);
      timerButton.setAttribute('aria-pressed', String(index === activeBlock));
      timerButton.setAttribute('aria-label', `Select ${block.minutes}-minute timer for ${block.title}`);
      timerButton.addEventListener('click', () => selectBlock(index));
      top.append(timerButton);
      body.append(top, element('p', '', block.text));
      if (block.dynamic === 'library') body.append(element('p', '', stage.reading));
      if (index === 4) body.append(element('p', '', stage.technique));
      const url = block.dynamic === 'rhythm' ? stage.rhythmUrl : block.dynamic === 'library' ? stage.libraryUrl : block.link;
      if (url) body.append(resourceLink(url, block.label));
      card.append(body);
      container.append(card);
    });
  }

  function stopInterval() {
    if (interval !== null) window.clearInterval(interval);
    interval = null;
  }

  function renderTimer() {
    const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
    $('timer-display').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('timer-block-title').textContent = curriculum.blocks[activeBlock].title;
    $('timer-toggle').textContent = deadline !== null ? 'Pause' : remainingMs === 0 ? 'Start again' : 'Start timer';
  }

  function tick() {
    if (deadline === null) return;
    remainingMs = Math.max(0, deadline - Date.now());
    if (remainingMs === 0) {
      deadline = null;
      stopInterval();
      $('timer-status').textContent = 'Time complete. Finish the phrase, then choose your next block.';
    }
    renderTimer();
  }

  function selectBlock(index) {
    stopInterval();
    deadline = null;
    activeBlock = index;
    remainingMs = curriculum.blocks[index].minutes * 60000;
    document.querySelectorAll('.minute-select').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.block) === index)));
    $('timer-status').textContent = `${curriculum.blocks[index].title} selected. Ready when you are.`;
    renderTimer();
  }

  function renderLog() {
    const container = $('log-entries');
    container.replaceChildren();
    $('log-count').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${entries.length > 10 ? ' · last 10 shown' : ''}`;
    $('export-log').disabled = entries.length === 0;
    if (!entries.length) {
      const empty = element('div', 'empty-log');
      empty.append(element('h4', '', 'A fresh page.'), element('p', '', 'Your first attempt is a starting point. Choose something easy enough to keep a steady pulse, then leave one honest note here.'));
      container.append(empty);
      return;
    }
    entries.slice(-10).reverse().forEach((entry) => {
      const item = element('article', 'log-entry');
      item.append(element('p', 'log-meta', `${entry.date} · Stage ${entry.stage} · Session ${entry.session}`), element('h4', '', entry.excerpt));
      const stats = element('div', 'log-stats');
      [ `Bars ${entry.bars}`, `${entry.tempo} bpm`, `Pulse: ${entry.pulse === 'yes' ? 'continuous' : 'interrupted'}`, accuracyLabel('Pitch', entry.pitch), accuracyLabel('Rhythm', entry.rhythm) ].forEach((text) => stats.append(element('span', '', text)));
      item.append(stats);
      if (entry.note) item.append(element('p', 'log-note', entry.note));
      const actions = element('div', 'log-entry-actions');
      const scoreUrl = safeScoreUrl(entry.scoreUrl);
      if (scoreUrl) actions.append(resourceLink(scoreUrl, 'Open score'));
      const remove = element('button', 'remove-entry', 'Remove entry');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove entry: ${entry.excerpt}, ${entry.date}`);
      remove.addEventListener('click', () => {
        entries = entries.filter((savedEntry) => savedEntry !== entry);
        const saved = persist(LOG_KEY, entries);
        renderLog();
        $('log-status').textContent = saved ? 'Entry removed from this browser.' : 'Entry removed for this session. Export the updated log before closing.';
        $('log-excerpt').focus();
      });
      actions.append(remove);
      item.append(actions);
      container.append(item);
    });
  }

  curriculum.stages.forEach((stage) => {
    const option = element('option', '', `${stage.id}. ${stage.title}`);
    option.value = String(stage.id);
    $('stage-select').append(option);
  });

  curriculum.days.forEach((day, index) => {
    const button = element('button', 'session-button');
    button.type = 'button';
    button.append(element('span', 'session-number', String(index + 1).padStart(2, '0')), element('span', 'session-name', day.title));
    button.setAttribute('aria-label', `Session ${index + 1}: ${day.title}`);
    button.addEventListener('click', () => chooseDay(index));
    $('session-buttons').append(button);
  });

  $('stage-select').addEventListener('change', (event) => {
    stageIndex = curriculum.stages.findIndex((stage) => stage.id === Number(event.target.value));
    renderStage();
    saveSettings();
  });
  $('previous-session').addEventListener('click', () => chooseDay(dayIndex - 1));
  $('next-session').addEventListener('click', () => chooseDay(dayIndex + 1));

  $('timer-toggle').addEventListener('click', () => {
    if (deadline !== null) {
      remainingMs = Math.max(0, deadline - Date.now());
      deadline = null;
      stopInterval();
      $('timer-status').textContent = 'Timer paused.';
    } else {
      if (remainingMs === 0) remainingMs = curriculum.blocks[activeBlock].minutes * 60000;
      deadline = Date.now() + remainingMs;
      interval = window.setInterval(tick, 250);
      $('timer-status').textContent = 'Timer running. Take your time with the music.';
    }
    renderTimer();
  });
  $('timer-reset').addEventListener('click', () => selectBlock(activeBlock));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  $('log-score-url').addEventListener('input', () => $('log-score-url').setCustomValidity(''));

  $('practice-log-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const excerpt = data.get('excerpt').trim();
    const bars = data.get('bars').trim();
    const enteredUrl = data.get('scoreUrl').trim();
    const scoreUrl = safeScoreUrl(enteredUrl);
    if (enteredUrl && !scoreUrl) {
      $('log-score-url').setCustomValidity('Use a complete http:// or https:// score URL.');
      $('log-score-url').reportValidity();
      return;
    }
    if (!excerpt || !bars) {
      $('log-status').textContent = 'Please add a title and the bars you read.';
      (excerpt ? $('log-bars') : $('log-excerpt')).focus();
      return;
    }
    entries.push({
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: data.get('date'), stage: curriculum.stages[stageIndex].id, session: dayIndex + 1,
      excerpt, scoreUrl, bars, tempo: Number(data.get('tempo')), pulse: data.get('pulse'),
      pitch: data.get('pitch') === '' ? null : Number(data.get('pitch')),
      rhythm: data.get('rhythm') === '' ? null : Number(data.get('rhythm')),
      note: data.get('note').trim(), firstAttempt: true, recordedAt: new Date().toISOString()
    });
    const saved = persist(LOG_KEY, entries);
    renderLog();
    form.reset();
    $('log-date').value = localDate();
    $('log-status').textContent = saved ? 'First attempt saved in this browser.' : 'Added for this session. Export before closing.';
  });

  $('export-log').addEventListener('click', () => {
    const exportData = { format: 'piano-practice-log', version: 1, exportedAt: new Date().toISOString(), measurement: 'Self-reported estimates of fresh first attempts; no automatic audio assessment.', entries };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
    const link = element('a');
    link.href = url;
    link.download = `piano-reading-log-${localDate()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('log-status').textContent = 'Log export requested. Keep the downloaded JSON file as your backup.';
  });

  $('log-date').value = localDate();
  renderStage();
  renderDay();
  renderTimer();
  renderLog();
})();
