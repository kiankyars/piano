'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../docs/exercises.js');
const abcjs = require('../docs/vendor/abcjs-basic-min.js');

const naturalPitchClasses = [0, 2, 4, 5, 7, 9, 11];
const letters = 'cdefgab';
const ranges = {
  'C major': { right: [60, 67], left: [48, 55], tonic: 0 },
  'G major': { right: [66, 74], left: [43, 50], tonic: 7 },
  'F major': { right: [65, 72], left: [53, 60], tonic: 5 }
};

function scoreEvents(exercise) {
  const tunes = abcjs.parseOnly(exercise.abc);
  assert.equal(tunes.length, 1);
  const tune = tunes[0];
  assert.ok(!tune.warnings || tune.warnings.length === 0, JSON.stringify(tune.warnings));
  const systems = tune.lines.filter(line => line.staff);
  assert.equal(systems.length, 2, 'Two systems of two bars are supplied.');
  const barTicks = exercise.meter === '4/4' ? 8 : 6;
  const ticksPerBeat = exercise.beatUnit === 'quarter' ? 2 : 3;
  const offsets = [0, 0];
  const counts = [0, 0];
  const events = [];
  for (const system of systems) {
    assert.equal(system.staff.length, 2, 'Both staves remain present.');
    system.staff.forEach((staff, handIndex) => {
      assert.equal(staff.clef.type, handIndex === 0 ? 'treble' : 'bass');
      assert.equal(staff.clef.stafflines, 5);
      assert.equal(staff.voices.length, 1);
      assert.equal(staff.brace, handIndex === 0 ? 'start' : 'end');
      assert.equal(staff.connectBarLines, handIndex === 0 ? 'start' : 'end');
      const accidentals = Object.fromEntries(staff.key.accidentals.map(item => [item.note.toLowerCase(), item.acc === 'sharp' ? 1 : -1]));
      let ticks = 0;
      let beamStart = null;
      let barCount = 0;
      for (const item of staff.voices[0]) {
        assert.ok(!item.decoration, 'No fingering or other decorations.');
        assert.ok(!item.chord && !item.lyric, 'No note-name annotations or lyrics.');
        if (item.el_type === 'bar') {
          assert.equal(ticks, barTicks, 'Each hand fills exactly one bar, including rests.');
          assert.equal(beamStart, null, 'Beams must end before the barline.');
          ticks = 0;
          counts[handIndex]++;
          barCount++;
          continue;
        }
        assert.equal(item.el_type, 'note');
        const durationTicks = item.duration * 8;
        assert.ok(Number.isInteger(durationTicks) && durationTicks > 0);
        assert.ok(ticks + durationTicks <= barTicks, 'No note crosses a barline.');
        if (item.startBeam) beamStart = Math.floor(ticks / ticksPerBeat);
        if (beamStart !== null) assert.equal(Math.floor(ticks / ticksPerBeat), beamStart, 'Beams stay inside the beat.');
        if (item.endBeam) beamStart = null;
        for (const pitch of item.pitches || []) {
          assert.ok(!pitch.accidental, 'All alterations come from the key signature.');
          const degree = ((pitch.pitch % 7) + 7) % 7;
          const midi = 60 + 12 * Math.floor(pitch.pitch / 7) + naturalPitchClasses[degree] + (accidentals[letters[degree]] || 0);
          events.push({ midi, beat: offsets[handIndex] / ticksPerBeat, duration: durationTicks / ticksPerBeat, hand: handIndex === 0 ? 'right' : 'left' });
        }
        if (item.rest) assert.equal(item.rest.type, 'whole', 'Single empty bars use ordinary whole-bar rests.');
        ticks += durationTicks;
        offsets[handIndex] += durationTicks;
      }
      assert.equal(barCount, 2);
    });
  }
  assert.deepEqual(counts, [4, 4]);
  assert.deepEqual(offsets, [barTicks * 4, barTicks * 4]);
  return events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}

test('Options are deterministic and reject invalid stage and seed values', () => {
  assert.deepEqual(generate(), generate({ stage: 1, seed: 0 }));
  for (const seed of [0, 42, 0xFFFFFFFF]) {
    for (let stage = 1; stage <= 6; stage++) assert.deepEqual(generate({ stage, seed }), generate({ stage, seed }));
  }
  for (const stage of [0, 7, 1.5, NaN, Infinity, '1', null]) assert.throws(() => generate({ stage }), RangeError);
  for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity, '42', null]) assert.throws(() => generate({ seed }), RangeError);
  for (const options of [null, 'x', 1, []]) assert.throws(() => generate(options), TypeError);
});

for (let stage = 1; stage <= 6; stage++) {
  test(`Stage ${stage}: notation and playback agree across 256 seeds`, () => {
    const observedKeys = new Set();
    for (let index = 0; index < 256; index++) {
      const seed = (Math.imul(index, 2654435761) + 12345) >>> 0;
      const exercise = generate({ stage, seed });
      observedKeys.add(exercise.key);
      assert.deepEqual(scoreEvents(exercise), exercise.events, `ABC/playback mismatch for stage ${stage}, seed ${seed}`);
      assert.equal(exercise.meter, stage === 6 ? '6/8' : stage === 5 ? '3/4' : '4/4');
      assert.equal(exercise.beatsPerBar, stage === 6 ? 2 : stage === 5 ? 3 : 4);
      assert.equal(exercise.totalBeats, exercise.beatsPerBar * 4);
      assert.equal(exercise.beatUnit, stage === 6 ? 'dotted quarter' : 'quarter');
      assert.doesNotMatch(exercise.abc.replace('%%score { RH | LH }', ''), /[!"{}]/);
      assert.doesNotMatch(exercise.abc, /^T:|^w:|^W:|\bZ\b/m);
      for (const hand of ['right', 'left']) {
        const notes = exercise.events.filter(event => event.hand === hand);
        assert.ok(notes.length > 0);
        const [low, high] = ranges[exercise.key][hand];
        for (let i = 0; i < notes.length; i++) {
          const current = notes[i];
          assert.ok(current.midi >= low && current.midi <= high, `${hand} stays inside its specified range.`);
          assert.ok(current.beat >= 0 && current.duration > 0);
          assert.ok(current.beat + current.duration <= exercise.totalBeats + 1e-9);
          if (i) assert.ok(Math.abs(current.midi - notes[i - 1].midi) <= 7, 'No leap exceeds a fifth.');
          if (stage < 3) assert.ok(Number.isInteger(current.duration), 'Early stages contain no eighth notes.');
          if (stage === 6 && hand === 'left') {
            assert.ok(Number.isInteger(current.beat));
            assert.ok(Number.isInteger(current.duration), 'Compound-meter bass follows dotted-quarter beats.');
          }
        }
      }
      if (stage === 1) {
        const activeHands = [];
        for (let bar = 0; bar < 4; bar++) {
          const active = new Set(exercise.events.filter(event => Math.floor(event.beat / 4) === bar).map(event => event.hand));
          assert.equal(active.size, 1, 'Only one hand sounds in each early-stage bar.');
          activeHands.push([...active][0]);
        }
        assert.notEqual(activeHands[0], activeHands[1]);
        assert.deepEqual(activeHands.slice(0, 2), activeHands.slice(2));
      }
      const lastBeat = Math.max(...exercise.events.map(event => event.beat));
      const last = exercise.events.filter(event => event.beat === lastBeat && (stage === 1 || event.hand === 'right'));
      assert.ok(last.some(event => event.midi % 12 === ranges[exercise.key].tonic), 'The melody settles on the tonic.');
    }
    assert.deepEqual([...observedKeys].sort(), stage < 3 ? ['C major'] : ['C major', 'F major', 'G major']);
  });
}

test('Each level has thousands of genuine score variations', () => {
  for (let stage = 1; stage <= 6; stage++) {
    const scores = new Set();
    for (let seed = 0; seed < 10000; seed++) scores.add(generate({ stage, seed }).abc);
    assert.ok(scores.size >= 9000, `Stage ${stage} only produced ${scores.size} unique scores.`);
    assert.notEqual(generate({ stage, seed: 0 }).abc, generate({ stage, seed: 1 }).abc);
  }
});

test('Key signatures alter sounded pitches, and eighth-note groups are beamed', () => {
  let heardSharp = false;
  let heardFlat = false;
  let pairedEighths = false;
  let groupedCompoundEighths = false;
  for (let seed = 0; seed < 128; seed++) {
    const exercise = generate({ stage: 3, seed });
    if (exercise.key === 'G major') heardSharp ||= exercise.events.some(event => event.midi % 12 === 6);
    if (exercise.key === 'F major') heardFlat ||= exercise.events.some(event => event.midi % 12 === 10);
    pairedEighths ||= /[A-Ga-g][A-Ga-g]/.test(exercise.abc);
    const compound = generate({ stage: 6, seed });
    groupedCompoundEighths ||= /[A-Ga-g]{3}/.test(compound.abc);
  }
  assert.ok(heardSharp && heardFlat && pairedEighths && groupedCompoundEighths);
});
