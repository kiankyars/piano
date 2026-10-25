(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const stages = window.PIANO.stages;
  const select = $('stage-select');
  const url = new URL(window.location.href);
  let savedStage;
  try { savedStage = localStorage.getItem('piano-level'); } catch {}
  let stage = stages.find((item) => item.id === Number(url.searchParams.get('stage') || savedStage)) || stages[0];
  const requestedSeed = url.searchParams.get('exercise');
  let seed = requestedSeed !== null && /^\d+$/.test(requestedSeed) && Number(requestedSeed) <= 0xffffffff ? Number(requestedSeed) : newSeed();
  let exercise;
  let renderedWidth = 0;
  let audioContext;
  let audioNodes = [];
  let playbackEnd;
  let playbackToken = 0;
  let playing = false;

  function newSeed() {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0];
  }

  function updateUrl() {
    url.searchParams.set('stage', String(stage.id));
    url.searchParams.set('exercise', String(seed));
    url.searchParams.delete('revision');
    try { window.history.replaceState(null, '', url); } catch {}
    try { localStorage.setItem('piano-level', String(stage.id)); } catch {}
  }

  function renderScore() {
    if (!exercise) return;
    const width = Math.floor($('score').getBoundingClientRect().width);
    if (!width) return;
    renderedWidth = width;
    try {
      const tunes = window.ABCJS.renderAbc('score', exercise.abc, {
        staffwidth: width - 12,
        paddingleft: 6,
        paddingright: 6,
        paddingtop: 4,
        paddingbottom: 4,
        scale: 1,
        oneSvgPerLine: true,
        add_classes: true,
        stafftopmargin: 12,
        format: { stretchlast: true },
      });
      if (!tunes.length || tunes[0].warnings?.length) throw new Error('Invalid notation');
      $('score').setAttribute('aria-label', `Four-bar piano exercise. ${exercise.key}, ${exercise.meter}. ${exercise.focus}`);
      $('score-error').hidden = true;
      $('play-exercise').disabled = false;
    } catch {
      $('score').replaceChildren();
      $('score-error').textContent = 'The score could not load. Reload this page to try again.';
      $('score-error').hidden = false;
      $('play-exercise').disabled = true;
    }
  }

  function showExercise() {
    stopPlayback();
    exercise = window.PianoExercises.generate({ stage: stage.id, seed });
    select.value = String(stage.id);
    $('exercise-meta').textContent = `${exercise.key} · ${exercise.meter} · 4 bars`;
    $('beat-unit').textContent = exercise.beatUnit;
    for (const key of ['focus', 'notes', 'rhythm', 'gate']) $(`stage-${key}`).textContent = stage[key];
    renderScore();
    updateUrl();
  }

  function stopPlayback() {
    playbackToken += 1;
    clearTimeout(playbackEnd);
    for (const node of audioNodes) {
      try { node.stop(); } catch {}
      node.disconnect();
    }
    audioNodes = [];
    playing = false;
    $('play-exercise').textContent = 'Hear it';
    $('playback-status').textContent = '';
  }

  function tone(frequency, start, duration, volume, waveform) {
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + .008);
    envelope.gain.setValueAtTime(volume * .65, start + Math.max(.009, duration - .045));
    envelope.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(envelope);
    envelope.connect(audioContext.destination);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + .015);
    audioNodes.push(oscillator);
  }

  $('next-exercise').addEventListener('click', () => {
    const previous = exercise.abc;
    do {
      seed = (seed + 1) >>> 0;
      exercise = window.PianoExercises.generate({ stage: stage.id, seed });
    } while (exercise.abc === previous);
    showExercise();
  });

  select.addEventListener('change', () => {
    stage = stages.find((item) => item.id === Number(select.value)) || stages[0];
    seed = newSeed();
    showExercise();
  });

  $('tempo').addEventListener('change', stopPlayback);
  $('play-exercise').addEventListener('click', async () => {
    if (playing) { stopPlayback(); return; }
    const token = ++playbackToken;
    playing = true;
    $('play-exercise').textContent = 'Stop';
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext ||= new AudioContext();
      await audioContext.resume();
      if (token !== playbackToken) return;
      const seconds = 60 / Number($('tempo').value);
      const start = audioContext.currentTime + .15;
      const countIn = exercise.beatsPerBar;
      for (let beat = 0; beat < countIn; beat += 1) tone(beat === 0 ? 1000 : 750, start + beat * seconds, .04, .035, 'sine');
      for (const event of exercise.events) {
        const frequency = 440 * 2 ** ((event.midi - 69) / 12);
        tone(frequency, start + (countIn + event.beat) * seconds, Math.max(.05, event.duration * seconds * .94), event.hand === 'right' ? .07 : .045, 'triangle');
      }
      $('playback-status').textContent = `One bar of clicks, then the exercise. ${exercise.beatUnit} = ${$('tempo').value}.`;
      playbackEnd = setTimeout(() => { stopPlayback(); $('playback-status').textContent = 'Playback finished.'; }, (countIn + exercise.totalBeats) * seconds * 1000 + 250);
    } catch {
      stopPlayback();
      $('playback-status').textContent = 'Audio is unavailable in this browser. You can still read the score.';
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
  window.addEventListener('pagehide', stopPlayback);
  new ResizeObserver(() => {
    if (Math.floor($('score').getBoundingClientRect().width) !== renderedWidth) renderScore();
  }).observe($('score'));

  showExercise();
})();
