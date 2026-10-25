(function (root) {
  'use strict';

  const KEYS = {
    C: { name: 'C major', right: 60, left: 48, letter: 0 },
    G: { name: 'G major', right: 67, left: 43, letter: 4 },
    F: { name: 'F major', right: 65, left: 53, letter: 3 }
  };
  const SCALE = [0, 2, 4, 5, 7, 9, 11];
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const MOTIVES = [
    [0, 1, 2, 1], [0, 0, 1, 2], [0, 2, 1, 2], [0, 1, 0, 1],
    [2, 1, 0, 1], [2, 2, 1, 0], [2, 3, 2, 1], [2, 1, 2, 3],
    [1, 2, 3, 2], [1, 0, 1, 2], [1, 2, 1, 0], [1, 1, 2, 3],
    [2, 3, 4, 2], [2, 4, 3, 2], [3, 2, 1, 2], [3, 4, 3, 2],
    [3, 3, 2, 1], [4, 3, 2, 3], [2, 3, 3, 2], [1, 3, 2, 1]
  ];
  const FOCUS = [
    'Follow the small patterns as the hands take turns. Count through each rest.',
    'Keep the melody moving while the other hand holds its note.',
    'Notice the key signature and keep the paired short notes inside the beat.',
    'Recognize the repeated accompaniment shape while following the melody.',
    'Feel three steady beats in each bar and let the four-bar phrase settle.',
    'Feel two beats per bar, with three equal subdivisions inside each beat.'
  ];

  function random(seed) {
    let state = seed;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pitch(key, degree, hand) {
    const octave = Math.floor(degree / 7);
    const step = ((degree % 7) + 7) % 7;
    const midi = key[hand] + octave * 12 + SCALE[step];
    const letterIndex = ((key.letter + degree) % 7 + 7) % 7;
    const name = LETTERS[letterIndex];
    const writtenOctave = Math.floor(midi / 12) - 1;
    const abc = writtenOctave >= 5
      ? name.toLowerCase() + "'".repeat(writtenOctave - 5)
      : name + ','.repeat(4 - writtenOctave);
    return { midi, abc };
  }

  function note(degrees, ticks) {
    return { degrees: Array.isArray(degrees) ? degrees : [degrees], ticks };
  }

  function simpleBar(motive, shape) {
    if (shape === 0) return motive.map(degree => note(degree, 2));
    if (shape === 1) return [note(motive[0], 4), note(motive[2], 2), note(motive[3], 2)];
    if (shape === 2) return [note(motive[0], 2), note(motive[1], 2), note(motive[2], 4)];
    return [note(motive[0], 4), note(motive[2], 4)];
  }

  function melodyBar(motive, stage, shape) {
    if (stage === 6) {
      if (shape === 0) return [note(motive[0], 1), note(motive[1], 1), note(motive[2], 1), note(motive[3], 3)];
      if (shape === 1) return [note(motive[0], 3), note(motive[1], 1), note(motive[2], 1), note(motive[3], 1)];
      if (shape === 2) return [note(motive[0], 3), note(motive[2], 3)];
      return [0, 1, 2, 3, 2, 1].map(index => note(motive[index], 1));
    }
    if (stage === 5) {
      if (shape === 0) return [note(motive[0], 2), note(motive[1], 2), note(motive[2], 2)];
      if (shape === 1) return [note(motive[0], 2), note(motive[1], 1), note(motive[2], 1), note(motive[3], 2)];
      if (shape === 2) return [note(motive[0], 4), note(motive[2], 2)];
      return [note(motive[0], 2), note(motive[2], 4)];
    }
    if (stage >= 3 && shape === 4) {
      return [note(motive[0], 2), note(motive[1], 1), note(motive[2], 1), note(motive[3], 4)];
    }
    if (stage >= 3 && shape === 5) {
      return [note(motive[0], 2), note(motive[1], 2), note(motive[2], 1), note(motive[3], 1), note(motive[2], 2)];
    }
    return simpleBar(motive, shape);
  }

  function generate(options = {}) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('Exercise options must be an object.');
    }
    const { stage = 1, seed = 0 } = options;
    if (!Number.isInteger(stage) || stage < 1 || stage > 6) {
      throw new RangeError('Stage must be an integer from 1 to 6.');
    }
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
      throw new RangeError('Seed must be an unsigned 32-bit integer.');
    }
    const next = random(seed);
    const choose = length => Math.floor(next() * length);
    const keyCode = stage < 3 ? 'C' : ['C', 'G', 'F'][choose(3)];
    const key = KEYS[keyCode];
    const meter = stage === 6 ? '6/8' : stage === 5 ? '3/4' : '4/4';
    const ticksPerBar = stage >= 5 ? 6 : 8;
    const ticksPerBeat = stage === 6 ? 3 : 2;
    const beatsPerBar = ticksPerBar / ticksPerBeat;
    const openings = MOTIVES.filter(motive => motive[0] <= 2);
    const motive = openings[choose(openings.length)];
    const responses = MOTIVES.filter(response => Math.abs(response[0] - motive[3]) <= 2);
    const response = responses[choose(responses.length)];
    const rhythmCount = stage === 3 || stage === 4 ? 6 : 4;
    const melody = [motive, response, motive].map(bar => melodyBar(bar, stage, choose(rhythmCount)));
    const cadence = choose(4);
    const approach = keyCode === 'G' ? -1 : 1;
    if (stage === 6) {
      melody.push(cadence < 2
        ? [note(cadence === 0 ? 1 : 2, 1), note(approach, 2), note(0, 3)]
        : [note(cadence === 2 ? 1 : 2, 3), note(0, 3)]);
    } else if (cadence < 2) {
      melody.push([note(cadence === 0 ? 2 : 1, 2), note(approach, 2), note(0, ticksPerBar - 4)]);
    } else {
      melody.push([note(cadence === 2 ? 1 : 2, ticksPerBar - 4), note(0, 4)]);
    }

    const voices = { right: [], left: [] };
    if (stage === 1) {
      const startsRight = choose(2) === 0;
      if (choose(8) === 0) melody[3] = [note(0, 8)];
      for (let bar = 0; bar < 4; bar++) {
        const active = (bar % 2 === 0) === startsRight ? 'right' : 'left';
        voices[active].push(melody[bar]);
        voices[active === 'right' ? 'left' : 'right'].push([{ degrees: [], ticks: ticksPerBar }]);
      }
    } else {
      voices.right = melody;
      const broken = choose(2) === 0;
      for (let bar = 0; bar < 4; bar++) {
        if (stage < 4) {
          voices.left.push([note(bar === 1 ? 4 : 0, ticksPerBar)]);
        } else if (bar === 3) {
          voices.left.push([note([0, 2], ticksPerBar)]);
        } else if (broken && stage === 6) {
          voices.left.push((bar === 1 ? [1, 3] : [0, 2]).map(degree => note(degree, 3)));
        } else if (broken) {
          const pattern = bar === 1 ? [1, 3, 1] : [0, 2, 0];
          voices.left.push(pattern.map((degree, index) => note(degree, index === 2 ? ticksPerBar - 4 : 2)));
        } else {
          voices.left.push([note(bar === 1 ? [1, 3] : [0, 2], ticksPerBar)]);
        }
      }
    }

    const events = [];
    const written = {};
    for (const hand of ['right', 'left']) {
      written[hand] = voices[hand].map((bar, barIndex) => {
        let offset = 0;
        const tokens = bar.map(item => {
          const pitches = item.degrees.map(degree => pitch(key, degree, hand));
          for (const current of pitches) {
            events.push({ midi: current.midi, beat: (barIndex * ticksPerBar + offset) / ticksPerBeat, duration: item.ticks / ticksPerBeat, hand });
          }
          const start = offset;
          offset += item.ticks;
          if (!pitches.length) return { text: 'z' + item.ticks, ticks: item.ticks, start };
          const symbol = pitches.length === 1 ? pitches[0].abc : '[' + pitches.map(current => current.abc).join('') + ']';
          return { text: symbol + (item.ticks === 1 ? '' : item.ticks), ticks: item.ticks, start };
        });
        if (offset !== ticksPerBar) throw new Error('Invalid exercise bar duration.');
        return tokens.map((token, index) => {
          const previous = tokens[index - 1];
          const beamed = previous && previous.ticks === 1 && token.ticks === 1 &&
            Math.floor(previous.start / ticksPerBeat) === Math.floor(token.start / ticksPerBeat);
          return (index && !beamed ? ' ' : '') + token.text;
        }).join('');
      });
    }
    const lines = [
      'X:1', 'M:' + meter, 'L:1/8', '%%score { RH | LH }',
      'V:RH clef=treble stafflines=5', 'V:LH clef=bass stafflines=5', 'K:' + keyCode
    ];
    for (let bar = 0; bar < 4; bar += 2) {
      for (const [voice, hand] of [['RH', 'right'], ['LH', 'left']]) {
        lines.push('[V:' + voice + '] ' + written[hand].slice(bar, bar + 2).join(' | ') + (bar === 2 ? ' |]' : ' |'));
      }
    }
    events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
    return {
      abc: lines.join('\n'), key: key.name, meter, focus: FOCUS[stage - 1], events,
      totalBeats: 4 * beatsPerBar, beatsPerBar,
      beatUnit: stage === 6 ? 'dotted quarter' : 'quarter'
    };
  }

  const api = Object.freeze({ generate });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PianoExercises = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
