(() => {
  'use strict';

  const stages = window.PIANO.stages;
  const select = document.getElementById('stage-select');
  const url = new URL(window.location.href);
  const requestedStage = Number(url.searchParams.get('stage'));
  let stage = stages.find((item) => item.id === requestedStage) || stages[0];

  function render() {
    select.value = String(stage.id);
    document.getElementById('score-link').href = stage.libraryUrl;
    document.getElementById('score-link').textContent = `Open scores: ${stage.library}`;
    document.getElementById('rhythm-link').href = stage.rhythmUrl;
    document.getElementById('reading-instruction').textContent = stage.reading;
    document.getElementById('technique-instruction').textContent = stage.technique;
    for (const key of ['focus', 'notes', 'rhythm', 'gate']) {
      document.getElementById(`stage-${key}`).textContent = stage[key];
    }
    document.getElementById('first-score').hidden = stage.id !== 1;
  }

  select.addEventListener('change', () => {
    stage = stages.find((item) => item.id === Number(select.value)) || stages[0];
    render();
    url.searchParams.set('stage', String(stage.id));
    try {
      window.history.replaceState(null, '', url);
    } catch {
      // Some browsers restrict history changes when opened as a local file.
    }
  });

  render();
})();
