'use strict';
/* Rybki – gra w łowienie ryb i krabów dla najmłodszych.
   Szata graficzna według projektu „Rybki — szata graficzna”: kształty to ścieżki SVG z projektu
   rysowane na canvasie (Path2D), dźwięk generowany przez Web Audio. */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ---------- pomocnicze ----------
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const deg = (d) => (d * Math.PI) / 180;
  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  const FONT = '"Outfit", system-ui, -apple-system, "Segoe UI", sans-serif';
  const font = (px, w = 500) => `${w} ${Math.round(px)}px ${FONT}`;
  const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* tryb prywatny */ } },
  };

  // ---------- kształty z projektu (ścieżki SVG) ----------
  const P = (d) => new Path2D(d);
  const SHAPE = {
    fishTail: P('M-44 0 L-70 -22 L-63 0 L-70 22Z'),
    fishFin: P('M-6 -27 L16 -40 L24 -25Z'),
    fishBody: P('M52 0 C34 -30 -10 -34 -46 0 C-10 34 34 30 52 0Z'),
    fishBelly: P('M-46 0 C-10 34 34 30 52 0Z'),
    fishStripes: P('M-6 -24 L-6 24 M-20 -15 L-20 15'),
    fishGill: P('M14 -23 C7 -8 7 8 14 23'),
    fishSil: P('M52 0 C34 -30 -10 -34 -46 0 L-70 -22 L-63 0 L-70 22 L-46 0 C-10 34 34 30 52 0Z'),
    pufferTail: P('M-28 0 L-46 -14 L-41 0 L-46 14Z'),
    pufferSpikes: P('M0 -32 v-9 M18 -26 l5 -7 M-18 -26 l-5 -7 M29 -12 l8 -4 M0 32 v9 M18 26 l5 7 M-18 26 l-5 7 M29 12 l8 4'),
    pufferBelly: P('M-32 4 C-18 32 18 32 32 4Z'),
    pufferMouth: P('M28 6 q4 3 0 6'),
    crabLegs: P('M-22 6 L-38 12 L-44 24 M-20 12 L-33 22 L-36 32 M-15 16 L-24 28 L-25 36'),
    crabArm: P('M-24 -4 L-40 -16'),
    crabClaw: P('M-40 -14 C-58 -12 -64 -32 -52 -40 L-47 -29 L-40 -34 C-33 -26 -34 -16 -40 -14Z'),
    crabClawR: P('M40 -14 C58 -12 64 -32 52 -40 L47 -29 L40 -34 C33 -26 34 -16 40 -14Z'),
    crabStalk: P('M-8 -12 L-10 -25'),
    crabShine: P('M-26 -2 C-16 -15 16 -15 26 -2 C16 -8 -16 -8 -26 -2Z'),
    cageRoof: P('M-32 -70 L0 -88 L32 -70'),
    cageBars: P('M-45 -70 V0 M-30 -70 V0 M-15 -70 V0 M0 -70 V0 M15 -70 V0 M30 -70 V0 M45 -70 V0 M-60 -52 H60 M-60 -35 H60 M-60 -18 H60'),
    cageFunnels: P('M-60 -50 L-36 -40 L-36 -30 L-60 -20Z M60 -50 L36 -40 L36 -30 L60 -20Z'),
    reed1: P('M0 0 C-6 -40 8 -80 2 -130'),
    reed2: P('M10 0 C14 -30 4 -60 12 -96'),
    reed3: P('M-10 0 C-16 -26 -8 -50 -18 -78'),
    glint: P('M0 -10 L1.5 -1.5 L10 0 L1.5 1.5 L0 10 L-1.5 1.5 L-10 0 L-1.5 -1.5Z'),
    star5: P('M0 -15 L4 -5 L14 -4.5 L6 2 L9 13 L0 7 L-9 13 L-6 2 L-14 -4.5 L-4 -5Z'),
    bigStar: P('M0 -40 L11.8 -16.2 L38 -12.4 L19 6.2 L23.5 32.4 L0 20 L-23.5 32.4 L-19 6.2 L-38 -12.4 L-11.8 -16.2Z'),
    hookJ: P('M0 -1 L0 22 C0 34 18 34 18 22 L13 18'),
    worm: P('M2 26 C6 34 14 34 16 27 C18 20 24 22 24 28'),
    bobberTop: P('M-7 0 A7 9 0 0 1 7 0Z'),
    hullBody: P('M-100 -14 L100 -14 L84 30 Q80 38 70 38 L-70 38 Q-80 38 -84 30Z'),
    hullPlanks: P('M-96 -2 L96 -2 M-90 12 L90 12 M-86 25 L86 25'),
    flag: P('M-88 -78 L-58 -70 L-88 -62Z'),
    coat: P('M-36 -16 C-38 -54 -24 -66 -6 -66 C12 -66 22 -54 20 -16Z'),
    coatShade: P('M-6 -66 C12 -66 22 -54 20 -16 L6 -16 C8 -40 4 -58 -6 -66Z'),
    coatJump: P('M-36 -14 C-38 -54 -24 -66 -6 -66 C12 -66 22 -54 20 -14Z'),
    coatJumpShade: P('M-6 -66 C12 -66 22 -54 20 -14 L6 -14 C8 -40 4 -58 -6 -66Z'),
    scarf: P('M-24 -62 Q-6 -54 12 -62 L10 -54 Q-6 -46 -22 -54Z'),
    beard: P('M-20 -84 C-20 -64 10 -62 13 -80 C6 -76 -10 -76 -20 -84Z'),
    cap: P('M-22 -88 C-22 -110 14 -110 14 -88Z'),
    nose: P('M12 -84 L16.5 -79.5 L12 -78.5Z'),
    happyEye: P('M3 -85 q3 -3.5 6 0'),
    jellyBell: P('M-26 0 C-26 -34 26 -34 26 0 C18 4 10 0 0 4 C-10 0 -18 4 -26 0Z'),
    jellyShine: P('M-18 -14 C-14 -24 -4 -26 4 -26'),
    coral: P('M0 0 V-40 M0 -20 L-14 -34 V-50 M0 -28 L12 -42 V-58 M-14 -34 L-24 -42'),
    chestLid: P('M-34 -24 C-34 -46 34 -46 34 -24Z'),
    lhRock: P('M-50 0 C-40 -22 40 -22 50 0Z'),
    lhTower: P('M-13 -14 L-9 -84 L9 -84 L13 -14Z'),
    lhStripes: P('M-12 -32 L12 -32 L11.4 -44 L-11.4 -44Z M-10.4 -58 L10.4 -58 L10 -70 L-10 -70Z'),
    lhRoof: P('M-13 -96 L0 -108 L13 -96Z'),
    lhBeam: P('M-14 -88 L-60 -150 L-30 -150Z'),
    houseRoof: P('M-16 -3 L0 -16 L16 -3Z'),
    moon: P('M0 -26 A26 26 0 1 0 20 18 A21 21 0 1 1 0 -26Z'),
    shell: P('M-14 4 C-14 -12 14 -12 14 4Z'),
    shellRidges: P('M0 4 V-8 M-7 4 L-5 -6 M7 4 L5 -6'),
    trophyHandles: P('M-40 -48 C-66 -48 -66 -14 -34 -12 M40 -48 C66 -48 66 -14 34 -12'),
    trophyCup: P('M-44 -66 L44 -66 C44 -12 22 6 0 8 C-22 6 -44 -12 -44 -66Z'),
    trophyShine: P('M-34 -60 C-34 -30 -24 -14 -12 -6 C-22 -20 -26 -40 -24 -60Z'),
    medalCheck: P('M-9 0 L-2 7 L10 -7'),
    // ikony w siatce 24×24
    iLeft: P('M14.5 5 L7.5 12 L14.5 19'),
    iRight: P('M9.5 5 L16.5 12 L9.5 19'),
    iHook: P('M14 5.5 V14 a5 5 0 0 1 -10 0 l2.4 -2.4'),
    iHookEye: P('M15.8 3.6 A1.8 1.8 0 1 1 12.2 3.6 A1.8 1.8 0 1 1 15.8 3.6Z'),
    iPlay: P('M8.5 5.5 C8.5 4.8 9.3 4.4 9.9 4.8 L18.6 11.3 C19.1 11.7 19.1 12.3 18.6 12.7 L9.9 19.2 C9.3 19.6 8.5 19.2 8.5 18.5Z'),
    iSpeaker: P('M4 9.5v5h3.5l5 4v-13l-5 4H4z'),
    iWaves: P('M16 9a4.5 4.5 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2'),
    iMute: P('M16 9.5l5 5M21 9.5l-5 5'),
    iLevelWaves: P('M3 15 q3 -3 6 0 t6 0 t6 0 M3 19 q3 -3 6 0 t6 0 t6 0'),
    iLevelPeak: P('M8 11 L12 5 L16 11Z'),
    iCageRoof: P('M8 7 L12 4 L16 7'),
    iCageBox: P('M6 7 H18 Q20.5 7 20.5 9.5 V16.5 Q20.5 19 18 19 H6 Q3.5 19 3.5 16.5 V9.5 Q3.5 7 6 7Z'),
    iCageBars: P('M8 7 V19 M12 7 V19 M16 7 V19 M3.5 13 H20.5'),
    iReplayArc: P('M19 12 a7 7 0 1 1 -2.05 -4.95'),
    iReplayHead: P('M17.5 3.5 V7.5 H13.5'),
    iBucket: P('M5 10 H19 L17.4 20 H6.6Z'),
    iMound: P('M7.5 10 C8.5 6.5 15.5 6.5 16.5 10'),
    iWorm: P('M3.5 15 C5.5 10.5 8.5 10.5 10 14 C11.5 17.5 14.5 17.5 16 13.5 C17 11 19 10.5 20.5 12.5'),
    iSpark: P('M18 2.5 V8.5 M15 5.5 H21'),
    iBolt: P('M13.5 2.5 L5.5 13.5 H11.5 L10.5 21.5 L18.5 10 H12.5Z'),
    // rekin – przyjazny, płaski jak ryby z projektu; zwrócony w prawo, długość ok. 220
    sharkTail: P('M-86 -2 L-122 -42 L-108 -2 L-124 32Z'),
    sharkDorsal: P('M-10 -27 L8 -66 L30 -27Z'),
    sharkFin: P('M8 14 L-12 44 L30 18Z'),
    sharkBody: P('M96 4 C82 -22 32 -34 -30 -27 C-60 -23 -80 -11 -92 -2 C-80 8 -60 18 -30 22 C32 30 82 26 96 4Z'),
    sharkBelly: P('M96 4 C82 26 32 30 -30 22 C-60 18 -80 8 -92 -2 C-56 8 24 16 96 4Z'),
    sharkGills: P('M48 -12 C44 -3 44 5 48 13 M40 -12 C36 -3 36 5 40 13'),
    sharkSmile: P('M72 11 Q81 15 89 9'),
    sharkMouth: P('M97 4 L68 9 L93 17Z'),
    sharkTeeth: P('M92 6 L89 10 L86 7 L83 10 L80 7 L77 10 L74 8'),
    iCannon: P('M3.5 13.5 L15.5 8 L17.5 12.5 L5.5 18Z M9.5 20.5 A2.6 2.6 0 1 1 9.5 15.3 A2.6 2.6 0 1 1 9.5 20.5Z M19.5 7.5 L21.5 6 M20 10.5 H22.5'),
    crown: P('M-14 0 L-16 -16 L-7 -8 L0 -20 L7 -8 L16 -16 L14 0Z'),
    lamp: P('M-5 -6 H5 L4 4 H-4Z'),
    iHome: P('M3.5 11.5 L12 4 L20.5 11.5 M6.5 9.5 V19.5 H17.5 V9.5 M10 19.5 V14.5 H14 V19.5'),
  };
  const C = {
    light: '#FFF2D8', cream: '#F4EBDD', ink: '#13252F', eye: '#10232E',
    coral: '#E8775A', coralDown: '#CF6248', ochre: '#D9A441', ochreDown: '#C08E33', green: '#4E9A62',
  };
  const CONFETTI = ['#E8775A', '#E3B04B', '#4FB3A9', '#FFF2D8', '#D9779A', '#8A7FD1'];

  // ---------- dane: ryby, kraby, motywy, poziomy ----------
  const FISH = {
    coral: { b: '#E8775A', f: '#B9503A', size: 34 },
    ochre: { b: '#E3B04B', f: '#B07F22', size: 31 },
    rose: { b: '#D9779A', f: '#A44D6C', size: 32 },
    sea: { b: '#4FB3A9', f: '#2C7F78', size: 35 },
    violet: { b: '#8A7FD1', f: '#5E54A6', size: 33 },
    sky: { b: '#79B8DD', f: '#3F84AE', size: 36 },
    puffer: { b: '#E3B04B', f: '#B07F22', size: 30, puffer: true },
    gold: { b: '#F2C14E', f: '#C58F1E', size: 40, shiny: true },
    glowCyan: { b: '#7FE3E0', f: '#2FB5B0', size: 34, glow: '127,227,224' },
    glowMint: { b: '#9FE7C4', f: '#3FB38A', size: 31, glow: '159,231,196' },
    glowViolet: { b: '#C9B6F2', f: '#8A7FD1', size: 32, glow: '201,182,242' },
    // tylko w trybie normalnym: rzadka, szybka tęczowa ryba i ryba-szef, którą trzeba wyholować
    rainbow: { b: '#E8775A', f: '#6E63B8', size: 31, rainbow: true },
    boss: { b: '#4A6FA5', f: '#2E4C7A', size: 66, boss: true },
  };
  // punkty za złowienie (tryb normalny); pozostałe ryby 10 pkt, krab 25 pkt
  const FISH_PTS = { puffer: 15, glowCyan: 15, glowMint: 15, glowViolet: 15, gold: 50, rainbow: 100, boss: 200 };
  const fishPts = (type) => FISH_PTS[type] || 10;
  const CRAB_PTS = 25;
  const CRABS = {
    rust: { b: '#C8553D', d: '#9E3F2B', a: '#B84B34', s: '#A9432F' },
    sand: { b: '#D9A066', d: '#A9733E', a: '#C48A52', s: '#B98448' },
    blue: { b: '#5E86B5', d: '#3F6590', a: '#4F76A3', s: '#4A6F99' },
  };

  const THEME_DEFAULTS = {
    body: null, bodyX: 0.75, bodyY: 0.5, bodyR: 40, bodyColor: '#FFF2D8', halo: 150, reflect: false,
    clouds: 0.5, birds: true, stars: false, rainbow: false,
    hills: [], forest: null, house: null, lighthouse: false,
    shafts: 0.05, reeds: ['#2F6A62', '#3F7F72'], corals: false, chest: false, jelly: false, deco: 'lake',
    crabs: ['rust'], rock: null,
  };
  const THEMES = {
    lake: {
      sky: [[0, '#A3C4D3'], [0.7, '#E9D3BA'], [1, '#F4D2AE']],
      water: [[0, '#5E9FA8'], [0.35, '#2F6E7F'], [1, '#0E2E40']],
      body: 'sun', bodyX: 0.7, bodyY: 0.72, bodyR: 40, halo: 150, reflect: true,
      hills: [{ kind: 'jagged', color: '#9DB4C2', top: 140, low: 40, step: 125 }, { kind: 'jagged', color: '#7C98A8', top: 62, low: 14, step: 130 }],
      forest: '#2F5450', house: 'day', bed: ['#163C4A', '#0F2E3A'], crabs: ['rust'], deco: 'lake',
    },
    bay: {
      sky: [[0, '#A9D5DC'], [1, '#EEF0E2']],
      water: [[0, '#4FC0BE'], [1, '#145F72']],
      body: 'sun', bodyX: 0.8, bodyY: 0.4, bodyR: 34, halo: 120, reflect: true, clouds: 0.6,
      lighthouse: true, shafts: 0.07, bed: ['#1E6B78', '#E1C99C'], reeds: ['#3FA08F', '#2F8A7C'], corals: true, crabs: ['sand', 'rust'], deco: 'sand',
    },
    sunset: {
      sky: [[0, '#C98E9C'], [1, '#F4C79C']],
      water: [[0, '#8E7AA6'], [1, '#2A2850']],
      body: 'sun', bodyX: 0.69, bodyY: 0.97, bodyR: 46, bodyColor: '#FFE1B8', halo: 170, reflect: true, clouds: 0.35,
      hills: [{ kind: 'jagged', color: '#8A6F8C', top: 75, low: 15, step: 110 }],
      bed: ['#2A2850', '#1E1C3A'], reeds: ['#4A3F6E', '#5B4E80'], crabs: ['rust', 'sand'], deco: 'dark',
    },
    night: {
      sky: [[0, '#0E1A2E'], [1, '#26405F']],
      water: [[0, '#1E3A55'], [1, '#060E1A']],
      body: 'moon', bodyX: 0.8, bodyY: 0.34, bodyR: 26, halo: 70, clouds: 0, birds: false, stars: true,
      hills: [{ kind: 'rolling', color: '#17263A', top: 52, low: 10, step: 170 }],
      house: 'night', shafts: 0.02, bed: ['#0A1626', '#040A12'], reeds: ['#1F3A48', '#264857'], jelly: true, crabs: ['blue'], deco: 'dark',
    },
    reef: {
      sky: [[0, '#A8D4DE'], [1, '#F2E3C4']],
      water: [[0, '#5DBDB8'], [0.4, '#2D8592'], [1, '#13455A']],
      rainbow: true, clouds: 0.6, shafts: 0.07, bed: ['#1F6476', '#E1C99C'], reeds: ['#3FA08F', '#2F8A7C'],
      corals: true, chest: true, crabs: ['rust', 'sand', 'blue'], deco: 'sand',
    },
    dawn: {
      sky: [[0, '#B9B4D6'], [0.6, '#EBC9C9'], [1, '#F6DCC4']],
      water: [[0, '#9DB7C4'], [0.4, '#5B8798'], [1, '#1E3E52']],
      body: 'sun', bodyX: 0.25, bodyY: 0.86, bodyR: 36, bodyColor: '#FFE8D0', halo: 160, reflect: true, clouds: 0.55,
      hills: [{ kind: 'rolling', color: '#A7A6C6', top: 110, low: 50, step: 160 }, { kind: 'rolling', color: '#8C8EB2', top: 55, low: 18, step: 140 }],
      forest: '#4E5E78', bed: ['#24435A', '#1A3346'], reeds: ['#3E5E6E', '#4F7080'], crabs: ['sand', 'rust'], deco: 'lake',
    },
    autumn: {
      sky: [[0, '#E2B48A'], [0.7, '#F2D2A4'], [1, '#F6DDB4']],
      water: [[0, '#7FA49A'], [0.4, '#3E6E6A'], [1, '#14303A']],
      body: 'sun', bodyX: 0.78, bodyY: 0.6, bodyR: 38, halo: 150, reflect: true, clouds: 0.4,
      hills: [{ kind: 'rolling', color: '#C99A72', top: 90, low: 30, step: 150 }],
      forest: '#8E4A2A', house: 'day', bed: ['#2A3E3A', '#1C2C2A'], reeds: ['#8A6A3A', '#6E5A2E'], crabs: ['rust'], deco: 'lake',
    },
    lagoon: {
      sky: [[0, '#8FD0E0'], [1, '#F1F2DE']],
      water: [[0, '#6FD6CC'], [0.45, '#2FA3A6'], [1, '#0F5468']],
      body: 'sun', bodyX: 0.6, bodyY: 0.3, bodyR: 32, halo: 120, reflect: true, clouds: 0.7, shafts: 0.08,
      bed: ['#2A8090', '#E8D3A6'], reeds: ['#3FA08F', '#5BB59A'], corals: true, crabs: ['sand', 'blue'], deco: 'sand',
    },
    storm: {
      sky: [[0, '#7A8C9C'], [1, '#C3CBCF']],
      water: [[0, '#5E7E8A'], [0.4, '#355564'], [1, '#101E28']],
      clouds: 0.75, lighthouse: true, shafts: 0.03,
      hills: [{ kind: 'jagged', color: '#6C7C88', top: 70, low: 20, step: 120 }],
      bed: ['#1E3440', '#14242E'], reeds: ['#2F4E52', '#3D5E60'], crabs: ['blue', 'rust'], deco: 'dark',
    },
    deep: {
      sky: [[0, '#13284A'], [1, '#2E5277']],
      water: [[0, '#1C4466'], [0.5, '#0C2440'], [1, '#03091A']],
      body: 'moon', bodyX: 0.22, bodyY: 0.4, bodyR: 22, halo: 60, clouds: 0, birds: false, stars: true,
      shafts: 0.02, bed: ['#0A1A2E', '#050C18'], reeds: ['#1F3A48', '#2B4A5E'], corals: true, jelly: true, crabs: ['blue'], deco: 'dark',
    },
    sharks: {
      sky: [[0, '#7DB4CF'], [0.7, '#DCE9EC'], [1, '#F1E6CF']],
      water: [[0, '#3E97AE'], [0.4, '#1D6680'], [1, '#062236']],
      body: 'sun', bodyX: 0.82, bodyY: 0.45, bodyR: 34, halo: 130, reflect: true, clouds: 0.55, shafts: 0.06,
      hills: [{ kind: 'jagged', color: '#8FAAB8', top: 60, low: 15, step: 140 }],
      bed: ['#17506A', '#D8C49A'], reeds: ['#2F8A7C', '#3FA08F'], corals: true, crabs: ['sand', 'blue'], deco: 'sand',
    },
    winter: {
      sky: [[0, '#B8CCDC'], [0.7, '#E4ECF2'], [1, '#F2F5F7']],
      water: [[0, '#4E7F92'], [0.4, '#2A5568'], [1, '#0B2333']],
      body: 'sun', bodyX: 0.3, bodyY: 0.8, bodyR: 30, bodyColor: '#FFF6E8', halo: 120, clouds: 0.6,
      hills: [{ kind: 'jagged', color: '#E3EBF1', top: 150, low: 45, step: 120 }, { kind: 'jagged', color: '#C4D3DE', top: 70, low: 18, step: 130 }],
      forest: '#3E5A5A', house: 'day', shafts: 0.03, bed: ['#183847', '#10293A'], reeds: ['#2F5458', '#3D6466'], crabs: ['blue'], deco: 'lake',
    },
    river: {
      sky: [[0, '#A6CFC4'], [0.7, '#E6E2C2'], [1, '#F2DDB0']],
      water: [[0, '#6FA89A'], [0.4, '#3A7A72'], [1, '#13383A']],
      body: 'sun', bodyX: 0.75, bodyY: 0.55, bodyR: 36, halo: 140, reflect: true, clouds: 0.45,
      hills: [{ kind: 'rolling', color: '#8DAE8A', top: 100, low: 40, step: 150 }],
      forest: '#3F6A4A', shafts: 0.05, bed: ['#24433A', '#1A322C'], reeds: ['#4E8A5A', '#3F7A4C'], crabs: ['rust', 'sand'], deco: 'lake',
    },
  };
  for (const k in THEMES) THEMES[k] = Object.assign({}, THEME_DEFAULTS, THEMES[k]);
  // kolory skał: [jasna krawędź, ściana, cień]
  const rockPalette = (th) => th.rock || (th.deco === 'dark' ? ['#6A7088', '#454B60', '#2A2E40'] : th.deco === 'sand' ? ['#B0A694', '#857B6C', '#5E5548'] : ['#8E989E', '#626E75', '#414B51']);

  // poziom łatwy: pięć pierwotnych plansz i 15 kolejnych.
  // Z każdym poziomem ryby są szybsze, a magnes słabszy (obie wartości rosną/maleją ściśle), cel rośnie co kilka poziomów.
  const EASY_BASE = [
    { name: 'Słoneczne jezioro', theme: 'lake', goal: 3, crabGoal: 1, fish: ['coral', 'ochre'], count: 6, speed: 0.6, magnet: 185, crabs: ['rust'] },
    { name: 'Wesoła zatoka', theme: 'bay', goal: 4, crabGoal: 1, fish: ['sky', 'rose', 'coral', 'ochre'], count: 7, speed: 0.75, magnet: 165, crabs: ['sand', 'rust'] },
    { name: 'Różowy zachód', theme: 'sunset', goal: 5, crabGoal: 2, fish: ['violet', 'puffer', 'rose', 'coral'], count: 8, speed: 0.9, magnet: 150, crabs: ['rust', 'sand'] },
    { name: 'Nocne łowy', theme: 'night', goal: 6, crabGoal: 2, fish: ['glowCyan', 'glowMint', 'glowViolet'], count: 8, speed: 1.0, magnet: 145, crabs: ['blue'] },
    { name: 'Tęczowa rafa', theme: 'reef', goal: 7, crabGoal: 3, fish: ['coral', 'sky', 'rose', 'violet', 'sea', 'ochre', 'gold'], count: 10, speed: 1.1, magnet: 135, crabs: ['rust', 'sand', 'blue'] },
  ];
  const EASY_EXTRA = [
    ['Poranna mgiełka', 'dawn', ['rose', 'sky', 'coral', 'ochre']],
    ['Jesienne jezioro', 'autumn', ['ochre', 'coral', 'rose', 'puffer']],
    ['Turkusowa laguna', 'lagoon', ['sea', 'sky', 'coral', 'violet']],
    ['Wietrzny dzień', 'storm', ['sky', 'sea', 'violet', 'ochre']],
    ['Głębokie morze', 'deep', ['glowCyan', 'glowViolet', 'glowMint', 'puffer']],
    ['Złota godzina', 'lake', ['coral', 'ochre', 'rose', 'gold']],
    ['Latarnia na skale', 'bay', ['sky', 'rose', 'sea', 'puffer']],
    ['Fioletowy wieczór', 'sunset', ['violet', 'rose', 'puffer', 'coral']],
    ['Zatoka rekinów', 'sharks', ['sky', 'sea', 'coral', 'ochre']],
    ['Skarb na dnie', 'reef', ['coral', 'sky', 'violet', 'sea', 'gold']],
    ['Różowy świt', 'dawn', ['rose', 'violet', 'sky', 'gold']],
    ['Liście na wodzie', 'autumn', ['ochre', 'coral', 'puffer', 'gold']],
    ['Ciepła laguna', 'lagoon', ['sea', 'sky', 'rose', 'puffer', 'gold']],
    ['Rekinia rafa', 'sharks', ['sky', 'sea', 'violet', 'puffer', 'gold']],
    ['Królestwo meduz', 'deep', ['glowCyan', 'glowViolet', 'glowMint', 'gold']],
  ];
  const LEVELS_EASY = EASY_BASE.concat(EASY_EXTRA.map(([name, theme, fish], k) => {
    const i = k + EASY_BASE.length, n = i - 4;
    const goal = Math.min(10, 7 + Math.floor(n / 3));
    return {
      name, theme, fish, goal, crabGoal: i < 12 ? 3 : 4, count: goal + 4, crabs: THEMES[theme].crabs,
      speed: 1.1 + n * 0.045, magnet: Math.round(135 - n * 2.5),
      sharks: theme === 'sharks' ? (i < 15 ? 1 : 2) : 0,   // w łatwym rekin tylko płoszy ryby
    };
  }));

  // poziom normalny: świat szerszy niż ekran, skały na dnie zrywają haczyk, pływające skały trzeba rozbić łódką.
  // Każdy kolejny poziom: szybsze ryby, słabszy magnes, szerszy świat, więcej i wyższych skał.
  const NORMAL_LIST = [
    ['Kamienista zatoczka', 'lake', ['coral', 'ochre', 'rose']],
    ['Skalisty brzeg', 'bay', ['sky', 'rose', 'coral', 'ochre']],
    ['Dryfujące głazy', 'sunset', ['violet', 'puffer', 'rose', 'coral']],
    ['Nocne skały', 'night', ['glowCyan', 'glowMint', 'glowViolet']],
    ['Rafa i głazy', 'reef', ['coral', 'sky', 'violet', 'sea', 'gold']],
    ['Zamarznięte jezioro', 'winter', ['sky', 'sea', 'violet', 'ochre']],
    ['Rwąca rzeka', 'river', ['ochre', 'coral', 'sea', 'rose']],
    ['Laguna piratów', 'lagoon', ['sea', 'sky', 'coral', 'gold'], { fog: true }],
    ['Sztormowe morze', 'storm', ['sky', 'sea', 'violet', 'puffer'], { storm: true }],
    ['Rów oceaniczny', 'deep', ['glowCyan', 'glowViolet', 'glowMint', 'puffer'], { dark: true }],
    ['Daleka wyprawa', 'lake', ['coral', 'ochre', 'rose', 'sky', 'gold']],
    ['Zatoka rekinów', 'sharks', ['sky', 'sea', 'rose', 'puffer']],
    ['Kamienny zachód', 'sunset', ['violet', 'rose', 'puffer', 'gold']],
    ['Księżycowy labirynt', 'night', ['glowCyan', 'glowMint', 'glowViolet', 'puffer'], { fog: true }],
    ['Zatopiony skarb', 'reef', ['coral', 'sky', 'violet', 'sea', 'ochre', 'gold']],
    ['Lodowa kraina', 'winter', ['sky', 'violet', 'sea', 'puffer', 'gold']],
    ['Górski potok', 'river', ['ochre', 'coral', 'rose', 'puffer', 'gold']],
    ['Rekinia rafa', 'sharks', ['sea', 'sky', 'violet', 'puffer', 'gold']],
    ['Oko cyklonu', 'storm', ['sky', 'sea', 'violet', 'puffer', 'gold'], { storm: true }],
    ['Królestwo głębin', 'deep', ['glowCyan', 'glowViolet', 'glowMint', 'puffer', 'gold'], { dark: true }],
  ];
  const LEVELS_NORMAL = NORMAL_LIST.map(([name, theme, fish, opt = {}], i) => {
    const goal = 4 + Math.floor(i * 0.4);
    const width = 2400 + i * 190;
    const crabGoal = 1 + Math.floor(i / 6);
    const ice = theme === 'winter';
    return {
      name, theme, fish, goal, crabGoal, crabs: THEMES[theme].crabs,
      speed: 0.85 + i * 0.055, magnet: 150 - i * 3, width, count: goal + Math.round(width / 700),
      rocks: 3 + Math.floor(i * 0.6),         // skały na dnie
      rockH: 0.25 + i * 0.018,                // maks. wysokość skały jako ułamek głębokości
      floaters: ice ? 0 : 1 + Math.floor(i / 3),   // pływające skały (zimą jezioro jest zamarznięte)
      floaterHp: 2 + Math.floor(i / 6),       // ile uderzeń wytrzymuje skała
      tie: 2 + i * 0.05,                      // ile sekund rybak wiąże nowy haczyk
      // rekiny przegryzają żyłkę: od 9. poziomu wszędzie, a w zatoce rekinów jest ich więcej
      sharks: ice ? 0 : (theme === 'sharks' ? 2 : 0) + (i >= 8 ? 1 + Math.floor((i - 8) / 6) : 0),
      boss: i >= 4,                           // ryba-szef do wyholowania
      ice,                                    // lód: łowi się tylko przez wyrąbane przeręble
      flow: theme === 'river' ? (i < 10 ? 1 : -1.35) : 0,   // nurt rzeki (kierunek i siła)
      storm: !!opt.storm, fog: !!opt.fog, dark: !!opt.dark,
      par: Math.round(35 + goal * 12 + crabGoal * 15 + width / 150),  // limit czasu na trzecią gwiazdkę (s)
    };
  });
  const MODES = { easy: LEVELS_EASY, normal: LEVELS_NORMAL };
  const levelKey = (m) => (m === 'normal' ? 'rybki-level-normal' : 'rybki-level');
  const HILL_PAR = 0.25;  // paralaksa gór przy przewijaniu świata

  // bonusy: zanęta zwabia ryby, magiczny robak wzmacnia haczyk, turbo przyspiesza łódkę
  const ITEM_KEYS = ['bait', 'worm', 'turbo'];
  const ITEM_HOTKEYS = { bait: ['1', 'z', 'Z'], worm: ['2', 'x', 'X'], turbo: ['3', 'v', 'V'] };
  const CAGE_KEYS = ['c', 'C', '4'];
  const TURBO_TIME = 10, BAIT_TIME = 12, WORM_CASTS = 3, CAGE_WAIT = 7;
  const BS = 0.85;        // skala łódki z rybakiem
  const CAGE_S = 0.62;    // skala klatki
  const ROD_REACH = 210 * BS;
  // true: dotknięcie wody/dna podpływa łódką i zarzuca wędkę lub klatkę; false: łódką steruje się tylko strzałkami
  const TAP_TO_MOVE = false;
  const CANNON_KEYS = ['f', 'F', '5'];
  const CANNON_CD = 1.1;     // przerwa między strzałami armatki (s)
  const CHOP_HITS = 3;       // tyle uderzeń wyrąbuje przerębel
  const HOLE_W = 76;         // szerokość przerębla

  // ---------- dźwięk (Web Audio, bez plików) ----------
  const Sound = {
    ac: null, master: null, sfx: null, mus: null, noiseBuf: null, timer: null,
    on: store.get('rybki-sound', '1') === '1',
    init() {
      if (this.ac) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ac = new AC(); } catch (e) { return; }
      this.master = this.ac.createGain();
      this.master.gain.value = this.on ? 0.8 : 0;
      this.master.connect(this.ac.destination);
      this.sfx = this.ac.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.mus = this.ac.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
      const len = this.ac.sampleRate;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startMusic();
    },
    resume() { if (this.ac && this.ac.state === 'suspended') this.ac.resume(); },
    toggle() {
      this.on = !this.on;
      store.set('rybki-sound', this.on ? '1' : '0');
      if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ac.currentTime, 0.05);
    },
    tone(freq, dur, opt = {}) {
      if (!this.ac) return;
      const { type = 'sine', vol = 0.25, delay = 0, slide = null, dest = this.sfx, attack = 0.01 } = opt;
      const t0 = this.ac.currentTime + delay;
      const o = this.ac.createOscillator();
      const g = this.ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },
    noise(dur, vol, freq, delay = 0) {
      if (!this.ac) return;
      const t0 = this.ac.currentTime + delay;
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(100, freq * 0.25), t0 + dur);
      const g = this.ac.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(this.sfx);
      src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
    },
    splash() { this.noise(0.45, 0.35, 1600); this.tone(320, 0.25, { slide: 110, vol: 0.1 }); },
    plop() { this.noise(0.18, 0.18, 1000); this.tone(520, 0.12, { slide: 240, vol: 0.1 }); },
    bite() { this.tone(380, 0.18, { slide: 900, vol: 0.25 }); this.tone(760, 0.14, { delay: 0.09, slide: 1300, vol: 0.12 }); },
    caught() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, { type: 'triangle', vol: 0.22, delay: i * 0.08 })); },
    star() { this.tone(1320, 0.22, { type: 'triangle', vol: 0.14 }); this.tone(1760, 0.3, { vol: 0.09, delay: 0.05 }); },
    bump() { this.tone(150, 0.16, { slide: 80, vol: 0.14 }); this.noise(0.15, 0.08, 500); },
    click() { this.tone(700, 0.08, { type: 'triangle', vol: 0.12 }); },
    collect() {
      [784, 988, 1175].forEach((f, i) => this.tone(f, 0.16, { type: 'square', vol: 0.05, delay: i * 0.06 }));
      this.tone(1568, 0.45, { type: 'triangle', vol: 0.14, delay: 0.18 });
    },
    whoosh() { this.noise(0.3, 0.2, 2500); this.tone(300, 0.25, { slide: 700, vol: 0.08 }); },
    magic() { for (let i = 0; i < 6; i++) this.tone(880 * Math.pow(2, i / 5), 0.25, { type: 'triangle', vol: 0.09, delay: i * 0.05 }); },
    vroom() { this.tone(70, 0.8, { type: 'sawtooth', vol: 0.1, slide: 220 }); this.tone(105, 0.8, { type: 'square', vol: 0.04, slide: 330 }); },
    snap() { this.tone(1200, 0.05, { type: 'square', vol: 0.08 }); this.tone(900, 0.05, { type: 'square', vol: 0.08, delay: 0.07 }); },
    twang() { this.tone(1500, 0.06, { type: 'square', vol: 0.07 }); this.tone(260, 0.4, { type: 'sawtooth', vol: 0.08, slide: 70, delay: 0.03 }); },
    boom() { this.noise(0.5, 0.5, 900); this.tone(70, 0.35, { type: 'sine', vol: 0.3, slide: 40 }); },
    chop() { this.tone(900, 0.06, { type: 'square', vol: 0.08 }); this.noise(0.12, 0.25, 3000); },
    thunder() { this.noise(1.8, 0.35, 400, 0.25); this.tone(55, 1.4, { type: 'sine', vol: 0.18, slide: 35, delay: 0.25 }); },
    chomp() { this.tone(180, 0.12, { type: 'square', vol: 0.12, slide: 90 }); this.tone(160, 0.12, { type: 'square', vol: 0.12, slide: 80, delay: 0.14 }); this.noise(0.15, 0.2, 700, 0.02); },
    sharkAlert() { this.tone(82, 0.35, { type: 'sawtooth', vol: 0.08 }); this.tone(87, 0.35, { type: 'sawtooth', vol: 0.08, delay: 0.4 }); },
    crack() { this.noise(0.2, 0.4, 900); this.tone(130, 0.18, { type: 'square', vol: 0.09, slide: 60 }); },
    crash() {
      this.noise(0.7, 0.5, 1400); this.tone(95, 0.5, { type: 'sawtooth', vol: 0.12, slide: 40 });
      this.tone(660, 0.3, { type: 'triangle', vol: 0.1, delay: 0.2, slide: 1100 });
    },
    fanfare() {
      const n = [523, 659, 784, 1047, 784, 1047, 1319];
      const d = [0, 0.13, 0.26, 0.39, 0.62, 0.75, 0.88];
      n.forEach((f, i) => {
        const last = i === n.length - 1;
        this.tone(f, last ? 0.9 : 0.24, { type: 'triangle', vol: 0.22, delay: d[i] });
        if (last) this.tone(f / 2, 0.9, { type: 'sine', vol: 0.12, delay: d[i] });
      });
    },
    startMusic() {
      if (this.timer || !this.ac) return;
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19];
      const bass = [0, -5, -3, -7];
      let step = 0, idx = 4;
      this.timer = setInterval(() => {
        if (!this.on || this.ac.state !== 'running' || document.hidden) return;
        if (step % 8 === 0) {
          const b = bass[(step / 8) % 4];
          this.tone(130.81 * Math.pow(2, b / 12), 2.2, { type: 'sine', vol: 0.16, dest: this.mus, attack: 0.05 });
        }
        if (step % 2 === 0 || Math.random() < 0.25) {
          idx = clamp(idx + Math.floor(rand(-2, 3)), 0, scale.length - 1);
          this.tone(261.63 * Math.pow(2, scale[idx] / 12), 0.6, { type: 'triangle', vol: 0.12, dest: this.mus });
        }
        step++;
      }, 290);
    },
  };

  // ---------- rozmiar ekranu i świata ----------
  // VW – szerokość ekranu, WW – szerokość świata (w trybie normalnym większa), camX – przesunięcie kamery
  let DPR = 1, CW = 0, CH = 0, S = 1, VW = 1280, VH = 720, WATER = 240, BOTTOM = 675, WW = 1280, camX = 0, hillW = 1280;

  // ---------- stan gry ----------
  let T = 0;
  let state = 'title';          // title | play | levelDone
  let mode = store.get('rybki-mode', 'easy') === 'normal' ? 'normal' : 'easy';
  let titleSel = mode;
  let LEVELS = MODES[mode];
  const savedLevel = (m) => clamp(parseInt(store.get(levelKey(m), '0'), 10) || 0, 0, MODES[m].length - 1);
  let levelIndex = savedLevel(mode);
  let level = LEVELS[levelIndex];
  let theme = THEMES[level.theme];
  let caught = 0, caughtTypes = [], slotPop = [];
  let crabsCaught = 0, crabTypes = [], crabPop = [];
  let fishes = [], spawnQueue = [], flyers = [];
  let crabs = [], crabQueue = [], trap = null;
  let particles = [], uiParticles = [], bubbles = [];
  let clouds = [], birds = [], stars = [], reeds = [], jellies = [], forest = [], hillLayers = [], ripples = [];
  let bedDeco = null, sandPh = 0;
  let rocks = [], floaters = [], snags = [], sharks = [];
  // tryb normalny: pogoda, lód, armatka, wynik poziomu
  let waveAmp = 1, rain = [], snow = [], leaves = [], flash = 0, thunderT = 8;
  let holes = [], chops = [], balls = [], cannonCd = 0;
  let score = 0, hooksLost = 0, levelTime = 0, earnedStars = 3, toast = null;
  let veil = null;   // osobne płótno na mgłę i ciemność głębin
  const loadStars = () => { try { const a = JSON.parse(store.get('rybki-stars-normal', '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  let bestStars = loadStars();
  const totalStars = () => bestStars.reduce((s, v) => s + (v || 0), 0);
  let bannerT = 0, doneT = 0, doneDelay = 0, idleTime = 0, celebrateT = 0, bubbleT = 0;
  let tapMarker = null, usedPointer = isTouch;
  const press = { cast: 0, cage: 0, cannon: 0 };
  const inv = { bait: 0, worm: 0, turbo: 0 };
  try {
    const saved = JSON.parse(store.get('rybki-inv', '{}'));
    for (const k of ITEM_KEYS) inv[k] = clamp(parseInt(saved[k], 10) || 0, 0, 9);
  } catch (e) { /* uszkodzony zapis */ }
  const saveInv = () => store.set('rybki-inv', JSON.stringify(inv));
  const itemPop = { bait: 0, worm: 0, turbo: 0 };
  let gifts = [], giftTimer = 6, itemFlyers = [];
  let baitThrow = null, baitCloud = null, wormCasts = 0, turboT = 0;

  const boat = { x: 300, y: 0, vx: 0, ang: 0, facing: 1, face: 1, target: null, onArrive: null, blink: 2, bounceT: 0 };
  // stany haczyka: idle | down | up | tie (rybak wiąże nowy haczyk po zerwaniu na skale)
  const hook = { x: 300, y: 0, prevY: 0, state: 'idle', fish: null, bend: 0, magic: false, tieT: 0, tieMax: 1, fight: null, lockX: null };
  const hookOut = () => hook.state === 'down' || hook.state === 'up';
  const hasCannon = () => !!level.width && !level.ice;   // armatka: tryb normalny, ale nie na lodzie
  const reelHeld = () => keys.reel || [...pointers.values()].includes('reel');
  const worldWidth = () => (level.width ? Math.max(VW, level.width) : VW);

  const waveY = (x) => WATER + (Math.sin(x * 0.02 + T * 1.4) * 3.5 + Math.sin(x * 0.045 - T * 1.9) * 1.8 + (waveAmp > 1 ? Math.sin(x * 0.006 - T * 1.1) * 6 : 0)) * waveAmp;
  const ICE_TOP = 9;   // grubość lodu nad lustrem wody
  const holeAt = (x, pad = 8) => holes.find((h) => Math.abs(x - h.x) < h.w / 2 - pad);
  const sandY = (x) => BOTTOM + Math.sin(x * 0.006 + sandPh) * 7 + Math.sin(x * 0.017 + sandPh * 2) * 4;
  const fishMinY = () => WATER + 75;
  const fishMaxY = () => BOTTOM - 70;
  const crabScale = (c) => c.s * 0.6;
  const fishFlying = () => flyers.filter((f) => f.kind === 'fish').length;
  const crabFlying = () => flyers.filter((f) => f.kind === 'crab').length;
  const fishDone = () => caught + fishFlying() + (hook.fish ? 1 : 0) >= level.goal;
  const crabsDone = () => crabsCaught + crabFlying() + (trap && trap.crab ? 1 : 0) >= level.crabGoal;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    CW = window.innerWidth; CH = window.innerHeight;
    canvas.width = Math.round(CW * DPR); canvas.height = Math.round(CH * DPR);
    canvas.style.width = CW + 'px'; canvas.style.height = CH + 'px';
    S = CH / 720; VW = CW / S; VH = 720;
    if (VW < 640) { S = CW / 640; VW = 640; VH = CH / S; }
    WATER = Math.round(VH * 0.34);
    BOTTOM = VH - 40;
    WW = worldWidth();
    buildScene();
    boat.x = clamp(boat.x, 100, WW - 100);
    for (const f of fishes) {
      f.x = clamp(f.x, -80, WW + 80);
      f.baseY = clamp(f.baseY, fishMinY(), fishMaxY());
      f.y = clamp(f.y, fishMinY(), fishMaxY());
    }
    for (const c of crabs) c.x = clamp(c.x, 30, WW - 30);
    for (const r of floaters) r.x0 = clamp(r.x0, 300, WW - 150);
    if (trap) trap.x = clamp(trap.x, 60, WW - 60);
    updateCamera();
  }
  function updateCamera() {
    camX = clamp(camX, boat.x - VW * 0.66, boat.x - VW * 0.34);
    camX = clamp(camX, 0, Math.max(0, WW - VW));
  }

  // ---------- budowa sceny ----------
  function buildScene() {
    const R = mulberry(levelIndex * 7919 + 31);
    const th = theme;
    sandPh = R() * 10;
    clouds = [];
    if (th.clouds > 0) {
      const n = Math.max(3, Math.round(VW / 300));
      for (let i = 0; i < n; i++) clouds.push({ x: (i + R() * 0.8) * (VW / n), y: WATER * (0.15 + R() * 0.35), w: 70 + R() * 50, v: 4 + R() * 9 });
    }
    birds = [];
    if (th.birds) for (let i = 0; i < 2; i++) birds.push({ x: R() * VW, y: WATER * (0.3 + R() * 0.25), v: 18 + R() * 14, ph: R() * TAU });
    stars = [];
    if (th.stars) for (let i = 0; i < Math.round(VW / 14); i++) stars.push({ x: R() * VW, y: R() * (WATER - 50), r: 0.8 + R() * 1.4, ph: R() * TAU });
    // góry przesuwają się wolniej niż woda, więc są szersze od ekranu tylko o część świata
    hillW = VW + HILL_PAR * (WW - VW);
    hillLayers = th.hills.map((h) => {
      const pts = [];
      if (h.kind === 'jagged') {
        let i = 0;
        for (let x = -h.step; x <= hillW + h.step; x += h.step * (0.75 + R() * 0.5), i++) {
          const peak = i % 2 === 0;
          pts.push([x, WATER - (peak ? h.top * (0.55 + R() * 0.45) : h.low * (0.4 + R() * 0.8))]);
        }
      } else {
        for (let x = -h.step; x <= hillW + h.step * 2; x += h.step) pts.push([x, WATER - (h.low + R() * (h.top - h.low))]);
      }
      return { kind: h.kind, color: h.color, pts };
    });
    forest = [];
    if (th.forest) {
      const addTrees = (x0, x1) => {
        for (let x = x0; x < x1; x += 14 + R() * 8) forest.push({ x, w: 22 + R() * 4, h: 28 + R() * 26 });
      };
      addTrees(-10, hillW * 0.1);
      addTrees(hillW * 0.83, hillW + 10);
    }
    reeds = [];
    if (th.reeds) {
      for (let i = 0; i < Math.round(WW / 170); i++) {
        const x = R() * WW;
        reeds.push({ x, s: 0.7 + R() * 0.5, c: th.reeds[Math.floor(R() * th.reeds.length)], ph: R() * TAU });
      }
    }
    jellies = [];
    if (th.jelly) for (let i = 0; i < Math.round((3 * WW) / VW); i++) jellies.push({ x: R() * WW, base: WATER + 120 + R() * (BOTTOM - WATER - 280), ph: R() * TAU, s: 0.6 + R() * 0.4 });
    ripples = [];
    for (let i = 0; i < Math.max(3, Math.round(VW / 320)); i++) ripples.push({ x: R() * VW, y: 30 + R() * 50, w: 24 + R() * 16, v: 6 + R() * 6 });
    buildBed(R);
    buildRocks();
  }

  // dekoracje dna jako dane – rysowane co klatkę tylko w widocznym fragmencie świata
  function buildBed(R) {
    const th = theme;
    bedDeco = { corals: [], mounds: [], small: [], chest: th.chest ? WW * 0.64 : null };
    if (th.corals) {
      const cols = ['#E8775A', '#D9779A', '#E3B04B', '#8A7FD1', '#4FB3A9'];
      for (let i = 0; i < Math.round(WW / 130); i++) {
        const x = R() * WW, s = 0.8 + R() * 0.5;
        bedDeco.corals.push({ x, s: R() < 0.5 ? -s : s, col: cols[Math.floor(R() * cols.length)] });
      }
    }
    for (let i = 0; i < Math.max(1, Math.round(WW / 600)); i++) {
      bedDeco.mounds.push({ x: R() * WW, rx: 40 + R() * 22, ry: 16 + R() * 8 });
    }
    for (let i = 0; i < Math.round(WW / 260); i++) {
      const x = R() * WW, dy = 12 + R() * 14;
      bedDeco.small.push(R() < 0.5 ? { x, dy, star: true, rot: R() * TAU } : { x, dy, star: false });
    }
  }

  // skały na dnie (tryb normalny): grzbiet z kilku punktów; haczyk, który go dotknie, zrywa się
  function buildRocks() {
    rocks = [];
    if (!level.rocks) return;
    const R = mulberry(levelIndex * 104729 + 977);
    const depth = BOTTOM - WATER, n = level.rocks, span = (WW - 500) / n;
    for (let k = 0; k < n; k++) {
      const w = 90 + R() * 130;
      const x = 380 + span * (k + 0.15 + R() * 0.7);
      const h = depth * level.rockH * (0.45 + R() * 0.55);
      const base = sandY(x) + 18, ground = sandY(x);
      const m = 5 + Math.floor(R() * 3);
      const pts = [];
      for (let j = 0; j <= m; j++) {
        const u = j / m, edge = j === 0 || j === m;
        const px = x - w / 2 + w * u + (edge ? 0 : (R() - 0.5) * w * 0.08);
        pts.push([px, edge ? base : ground - h * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.78 + R() * 0.3)]);
      }
      const top = Math.min(...pts.map((p) => p[1]));
      const cracks = [];
      for (let c = 0; c < 2; c++) {
        let cx = x + (R() - 0.5) * w * 0.4, cy = lerp(top, ground, 0.25 + R() * 0.3);
        const line = [[cx, cy]];
        for (let s = 0; s < 3; s++) { cx += (R() - 0.5) * 18; cy += 8 + R() * 10; line.push([cx, cy]); }
        cracks.push(line);
      }
      const moss = [];
      if (R() < 0.7) for (let j = 1; j < m; j++) if (R() < 0.6) moss.push({ j, len: 10 + R() * 16, ph: R() * TAU });
      rocks.push({ x, w, top, ground, pts, cracks, moss });
    }
  }
  // najwyższy punkt skały nad danym x (Infinity, gdy nad x nie ma skały)
  function rockTopAt(x) {
    let top = Infinity;
    for (const r of rocks) {
      const p = r.pts;
      if (x <= p[0][0] || x >= p[p.length - 1][0]) continue;
      for (let j = 1; j < p.length; j++) {
        if (x <= p[j][0]) { top = Math.min(top, lerp(p[j - 1][1], p[j][1], (x - p[j - 1][0]) / (p[j][0] - p[j - 1][0]))); break; }
      }
    }
    return top;
  }

  // pływające skały (tryb normalny): blokują łódkę, rozbija się je taranem (turbo rozbija szybciej)
  function buildFloaters() {
    floaters = [];
    if (!level.floaters) return;
    const R = mulberry(levelIndex * 7717 + 13);
    const n = level.floaters, span = (WW - 900) / n;
    for (let k = 0; k < n; k++) {
      const w = 84 + R() * 60;
      const x = 800 + span * (k + 0.25 + R() * 0.5);
      const pts = [];
      for (let j = 0; j < 9; j++) {
        const a = (j / 9) * TAU, rr = 0.82 + R() * 0.25;
        pts.push([Math.cos(a) * (w / 2) * rr, Math.sin(a) * w * 0.36 * rr]);
      }
      const cracks = [];
      for (let c = 0; c < 4; c++) {
        let a = R() * TAU, cx = (R() - 0.5) * w * 0.2, cy = (R() - 0.7) * w * 0.15;
        const line = [[cx, cy]];
        for (let s = 0; s < 3; s++) { a += (R() - 0.5) * 1.2; cx += Math.cos(a) * w * 0.12; cy += Math.sin(a) * w * 0.08; line.push([cx, cy]); }
        cracks.push(line);
      }
      const hp = level.floaterHp + (w > 125 ? 1 : 0);
      floaters.push({ x, x0: x, w, pts, cracks, hp, max: hp, ph: R() * TAU, shake: 0, hitCd: 0 });
    }
  }

  function drawChest(c, x, y) {
    c.save(); c.translate(x, y);
    const g = c.createRadialGradient(0, -20, 0, 0, -20, 50);
    g.addColorStop(0, 'rgba(255,242,216,0.45)'); g.addColorStop(1, 'rgba(255,242,216,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, -20, 50, 0, TAU); c.fill();
    c.fillStyle = '#8E4A2A'; roundRect(c, -34, -24, 68, 34, 4); c.fill();
    c.fillStyle = '#B8643C'; c.fill(SHAPE.chestLid);
    c.fillStyle = '#E3B04B'; c.fillRect(-35, -27, 70, 5);
    roundRect(c, -5, -31, 10, 14, 2); c.fill();
    c.strokeStyle = '#7A3E22'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-34, -6); c.lineTo(34, -6); c.stroke();
    c.restore();
  }

  // ---------- poziomy ----------
  function loadLevel(i, grant = false) {
    // nic nie przepada przy zmianie poziomu: bonusy w locie wracają do plecaka
    for (const f of itemFlyers) inv[f.item] = Math.min(9, inv[f.item] + 1);
    levelIndex = i; level = LEVELS[i]; theme = THEMES[level.theme];
    store.set(levelKey(mode), String(i));
    WW = worldWidth();
    if (level.width) { boat.x = 300; boat.vx = 0; boat.target = null; boat.facing = 1; hook.x = boat.x; }
    boat.x = clamp(boat.x, 100, WW - 100);
    camX = 0; updateCamera();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.sky[0][1]);
    caught = 0; caughtTypes = []; slotPop = [];
    crabsCaught = 0; crabTypes = []; crabPop = [];
    flyers = []; spawnQueue = []; crabQueue = []; particles = []; bubbles = [];
    doneT = 0; doneDelay = 0; idleTime = 0; celebrateT = 0;
    hook.state = 'idle'; hook.fish = null; hook.magic = false;
    trap = null; snags = [];
    gifts = []; giftTimer = 6; itemFlyers = []; baitThrow = null; baitCloud = null; wormCasts = 0; turboT = 0;
    if (grant) itemFlyers.push({ item: 'bait', sx: CW / 2, sy: CH * 0.45, t: -1.8 });
    saveInv();
    buildScene();
    buildFloaters();
    fishes = [];
    for (let k = 0; k < level.count; k++) fishes.push(makeFish(fishType(), false));
    crabs = [];
    const nCrabs = level.crabGoal + 2 + (level.width ? Math.floor(WW / 1400) : 0);
    for (let k = 0; k < nCrabs; k++) crabs.push(makeCrab(false));
    sharks = [];
    for (let k = 0; k < (level.sharks || 0); k++) sharks.push(makeShark(k));
    if (level.boss) fishes.push(makeBoss());
    // tryb normalny: pogoda, lód, armatka, wynik
    waveAmp = level.ice ? 0 : level.storm ? 2.6 : 1;
    flash = 0; thunderT = rand(5, 10); balls = []; cannonCd = 0;
    score = 0; hooksLost = 0; levelTime = 0; earnedStars = 3; toast = null;
    hook.fight = null; hook.lockX = null;
    holes = []; chops = [];
    if (level.ice) {
      // jeden przerębel na start obok łódki, kilka dalej w świecie
      holes.push({ x: boat.x + ROD_REACH, w: HOLE_W });
      for (let x = 900; x < WW - 200; x += rand(700, 1200)) holes.push({ x, w: HOLE_W });
    }
    rain = []; snow = []; leaves = [];
    if (level.storm) for (let k = 0; k < 140; k++) rain.push({ x: rand(0, VW), y: rand(0, VH), v: rand(700, 950) });
    if (level.ice) for (let k = 0; k < 90; k++) snow.push({ x: rand(0, VW), y: rand(0, VH), v: rand(25, 60), r: rand(1.5, 3.5), ph: rand(0, TAU) });
    if (level.flow) for (let k = 0; k < 14; k++) leaves.push({ x: rand(camX - 100, camX + VW + 100), rot: rand(0, TAU), c: pick(['#C98A3E', '#B8643C', '#D9A441', '#8E9A4A']) });
    bannerT = 2.6;
    if (level.boss && levelIndex === LEVELS.findIndex((l) => l.boss)) showToast('W głębinie pływa ryba-szef: trzymaj przycisk, ale nie za mocno!');
    else if (level.ice) showToast('Lód! Zarzucaj nad przeręblem albo uderzaj w lód, żeby go wyrąbać');
    else if (level.flow) showToast('Nurt rzeki znosi łódkę i haczyk');
    else if (level.dark) showToast('Ciemno! Lampka na haczyku oświetla wodę');
    else if (level.fog) showToast('Mgła – widać tylko wodę przy łódce');
    else if (level.storm) showToast('Sztorm! Fale znoszą łódkę');
    else if (level.floaters && levelIndex === 0) showToast('Pływającą skałę rozbijesz taranem albo armatką');
  }
  function showToast(text) { toast = { text, t: 5.5 }; }
  // ryba-szef: duża, powolna, pływa przy dnie
  function makeBoss() {
    const f = makeFish('boss', false);
    f.size = FISH.boss.size; f.speed *= 0.55;
    f.baseY = f.y = rand(lerp(fishMinY(), fishMaxY(), 0.55), fishMaxY());
    f.x = rand(WW * 0.4, WW - 200);
    return f;
  }
  // w trybie normalnym czasem pojawia się rzadka tęczowa ryba
  const fishType = () => (level.width && Math.random() < 0.08 ? 'rainbow' : pick(level.fish));
  // rekin: na łatwym wpływa zza ekranu (na początku jest spokojnie), na normalnym pływa gdzieś w świecie
  function makeShark(k) {
    const dir = k % 2 === 0 ? -1 : 1;
    const x = level.width ? rand(800, WW - 200) : (dir > 0 ? -220 - k * 300 : WW + 220 + k * 300);
    const y = rand(fishMinY() + 30, fishMaxY() - 30);
    return { x, y, baseY: y, dir, speed: rand(45, 60) * (0.8 + level.speed * 0.3), t: rand(0, 10), state: 'patrol', wait: 0, cool: 0, s: 0.95 };
  }
  // nowe zwierzaki wpływają tuż zza krawędzi widocznego ekranu
  function makeFish(type, fromSide) {
    const F = FISH[type];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = rand(fishMinY(), fishMaxY());
    return {
      type, size: F.size * rand(0.88, 1.12), dir, puff: 0, scared: 0,
      x: fromSide ? clamp(dir > 0 ? camX - 70 : camX + VW + 70, -70, WW + 70) : rand(60, WW - 60),
      y, baseY: y, speed: rand(38, 70) * level.speed * (F.rainbow ? 1.7 : 1), ph: rand(0, TAU), t: rand(0, 10), turn: rand(3, 9),
    };
  }
  function makeCrab(fromSide) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      kind: pick(level.crabs), x: fromSide ? clamp(dir > 0 ? camX - 30 : camX + VW + 30, -30, WW + 30) : rand(60, WW - 60), y: BOTTOM, dir,
      speed: rand(22, 38) * (0.8 + level.speed * 0.3), s: rand(0.8, 0.95), t: rand(0, 10), turn: rand(2, 6), pause: 0, walking: true, state: 'walk',
    };
  }
  function setMode(m) {
    mode = m; titleSel = m; LEVELS = MODES[m];
    store.set('rybki-mode', m);
    levelIndex = savedLevel(m); level = LEVELS[levelIndex];
  }
  function startGame(m = titleSel) {
    Sound.init(); Sound.resume(); Sound.click();
    if (isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setMode(m);
    loadLevel(levelIndex, true);
    state = 'play';
  }
  // powrót do ekranu startowego (wybór poziomu trudności); postęp poziomów zostaje zapisany
  function goTitle() {
    Sound.click();
    uiParticles = [];
    loadLevel(levelIndex);
    state = 'title';
    boat.x = clamp(VW * 0.16, 100, WW - 100); boat.vx = 0; boat.target = null;
    hook.x = boat.x; hook.y = WATER - 80;
    camX = 0; updateCamera();
  }
  // gwiazdki w trybie normalnym: za ukończenie, za maks. 2 zerwane haczyki i za zmieszczenie się w limicie czasu
  const starChecks = () => [true, hooksLost <= 2, levelTime <= level.par];
  function finishLevel() {
    state = 'levelDone'; doneT = 0;
    Sound.fanfare();
    if (level.width) {
      earnedStars = starChecks().filter(Boolean).length;
      if ((bestStars[levelIndex] || 0) < earnedStars) {
        bestStars[levelIndex] = earnedStars;
        store.set('rybki-stars-normal', JSON.stringify(bestStars));
      }
    } else earnedStars = 3;
    for (let i = 0; i < 120; i++) {
      uiParticles.push({
        kind: 'confetti', x: rand(0, CW), y: rand(-CH * 0.3, -10), vx: rand(-40, 40), vy: rand(80, 220),
        rot: rand(0, TAU), vr: rand(-6, 6), life: rand(3, 5), max: 5, color: pick(CONFETTI),
      });
    }
  }
  function nextLevel() {
    Sound.click();
    uiParticles = [];
    loadLevel((levelIndex + 1) % LEVELS.length, true);
    state = 'play';
  }

  // ---------- akcje ----------
  function cast() {
    if (state !== 'play') return;
    if (hook.state === 'idle' || (hook.state === 'up' && !hook.fish && hook.y < waveY(hook.x) + 40)) {
      idleTime = 0; press.cast = 0.15;
      // na lodzie haczyk przechodzi tylko przez przerębel; gdzie go nie ma, wędka rąbie lód
      if (level.ice) {
        const tx = clamp(rodTip().x, 30, WW - 30), h = holeAt(tx);
        if (!h) { if (hook.state === 'idle') chopIce(tx); return; }
        hook.lockX = h.x;
      }
      hook.state = 'down';
      if (!hook.magic && wormCasts > 0) { wormCasts--; hook.magic = true; }
      Sound.click();
    }
  }
  function reel() {
    if (state === 'play' && hook.state === 'down') hook.state = 'up';
  }
  function dropCage() {
    if (state !== 'play' || trap || crabsDone()) return;
    let x = clamp(boat.x, 60, WW - 60);
    press.cage = 0.15; idleTime = 0;
    if (level.ice) {
      const h = holeAt(x, 0);
      if (!h) { chopIce(x); return; }
      x = h.x;
    }
    trap = { x, y: waveY(x) + 4, state: 'sink', t: 0, crab: null, onRock: false };
    splash(x, false);
  }
  // uderzenie w lód: po CHOP_HITS uderzeniach w tym samym miejscu powstaje przerębel
  function chopIce(x) {
    let c = chops.find((o) => Math.abs(o.x - x) < 40);
    if (!c) { c = { x, hits: 0 }; chops.push(c); }
    c.hits++;
    Sound.chop();
    for (let i = 0; i < 8; i++) particles.push({ kind: 'chunk', x: c.x + rand(-14, 14), y: WATER - ICE_TOP, vx: rand(-90, 90), vy: rand(-220, -80), g: 600, r: rand(2, 4.5), rot: rand(0, TAU), vr: rand(-8, 8), life: 0.8, max: 0.8, color: pick(['#F4FAFC', '#CFE3EC', '#A9C8D6']) });
    if (c.hits >= CHOP_HITS) {
      chops = chops.filter((o) => o !== c);
      holes.push({ x: c.x, w: HOLE_W });
      splash(c.x, true);
    }
  }
  // armatka: kula leci w stronę dzioba, kruszy pływającą skałę, a po wpadnięciu do wody płoszy rekiny
  function fireCannon() {
    if (state !== 'play' || !hasCannon() || cannonCd > 0) return;
    cannonCd = CANNON_CD; press.cannon = 0.15; idleTime = 0;
    const dir = boat.facing, x = boat.x + dir * 100 * BS, y = boat.y - 40 * BS;
    balls.push({ x, y, vx: dir * 640 + boat.vx * 0.5, vy: -40 });
    Sound.boom();
    for (let i = 0; i < 8; i++) particles.push({ kind: 'puff', x: x + dir * 10, y, vx: dir * rand(30, 90) + rand(-20, 20), vy: rand(-40, 10), g: 0, r: rand(5, 10), life: 0.7, max: 0.7, color: 'rgba(240,240,236,0.6)' });
  }
  function updateBalls(dt) {
    if (cannonCd > 0) cannonCd -= dt;
    for (const b of balls) {
      b.vy += 220 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      for (const r of floaters) {
        if (Math.abs(b.x - r.x) < r.w * 0.45 && b.y > waveY(r.x) - r.w * 0.45) {
          b.dead = true; r.hitCd = 0;
          hitFloater(r, 0, 1);
          break;
        }
      }
      if (!b.dead && b.y > waveY(b.x)) {
        b.dead = true;
        splash(b.x, true);
        for (const sh of sharks) if (Math.abs(sh.x - b.x) < 260) { sh.cool = 8; sh.state = 'patrol'; sh.dir = sh.x > b.x ? 1 : -1; }
      }
      if (b.x < camX - 200 || b.x > camX + VW + 200) b.dead = true;
    }
    balls = balls.filter((b) => !b.dead);
  }
  function useItem(k) {
    if (state !== 'play' || inv[k] <= 0) return;
    if (k === 'bait') {
      if (baitThrow) return;
      let dir = boat.facing;
      if (boat.x + dir * 160 > WW - 40 || boat.x + dir * 160 < 40) dir = -dir;
      baitThrow = { x: boat.x, y: boat.y - 80, vx: dir * 170, vy: -260 };
      Sound.whoosh();
    } else if (k === 'worm') {
      if (wormCasts > 0 || hook.magic) return;
      wormCasts = WORM_CASTS;
      Sound.magic();
    } else if (k === 'turbo') {
      if (turboT > 0) return;
      turboT = TURBO_TIME;
      Sound.vroom();
    }
    inv[k]--; itemPop[k] = 1; idleTime = 0;
    saveInv();
  }
  const giftItem = () => { const r = Math.random(); return r < 0.45 ? 'bait' : r < 0.75 ? 'worm' : 'turbo'; };
  const giftColor = () => pick(['#E8775A', '#4FB3A9', '#8A7FD1', '#E3B04B']);
  function spawnGift() {
    const lo = camX + 140, hi = camX + VW - 140;
    let x = rand(lo, hi);
    if (Math.abs(x - boat.x) < 160) x = clamp(boat.x + (boat.x < camX + VW / 2 ? 1 : -1) * rand(200, 350), lo, hi);
    gifts.push({ item: giftItem(), x, y: -40, t: 0, ft: 0, state: 'fall', color: giftColor() });
  }
  function sparkBurst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(60, 170);
      particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 100, r: rand(0.5, 0.9), life: rand(0.6, 1), max: 1 });
    }
  }
  function collectGift(g) {
    g.state = 'gone';
    Sound.collect();
    sparkBurst(g.x, g.y);
    itemFlyers.push({ item: g.item, sx: (g.x - camX) * S, sy: g.y * S, t: 0 });
  }
  // haczyk zahaczył o skałę: zrywa się i zostaje na skale, ryba ucieka, rybak wiąże nowy
  function snapHook(byShark = false) {
    if (!byShark) snags.push({ x: hook.x, y: hook.y, t: 0 });
    hooksLost++; hook.fight = null; hook.lockX = null;
    if (hook.fish) {
      const f = hook.fish, k = f.size / 48;
      f.x = hook.x + 9; f.y = hook.y + 22 + 52 * k;
      f.baseY = clamp(f.y, fishMinY(), fishMaxY());
      f.scared = 2.5; f.dir = Math.random() < 0.5 ? -1 : 1;
      hook.fish = null;
    }
    if (byShark) {
      Sound.chomp();
      for (let i = 0; i < 10; i++) bubbles.push({ x: hook.x + rand(-20, 20), y: hook.y + rand(0, 30), r: rand(2.5, 6), v: rand(50, 90), ph: rand(0, TAU) });
    } else Sound.twang();
    sparkBurst(hook.x + 6, hook.y + 16, 8);
    for (let i = 0; i < 6; i++) particles.push({ kind: 'puff', x: hook.x + rand(-10, 10), y: hook.y + 20, vx: rand(-40, 40), vy: rand(-30, -5), g: 0, r: rand(4, 8), life: 0.8, max: 0.8, color: 'rgba(255,242,216,0.35)' });
    hook.state = 'tie'; hook.tieT = hook.tieMax = level.tie || 2; hook.magic = false;
    const tip = rodTip();
    hook.x = tip.x; hook.y = tip.y + 40;
  }
  function chunkBurst(x, y, n, cols) {
    for (let i = 0; i < n; i++) {
      particles.push({ kind: 'chunk', x: x + rand(-20, 20), y: y + rand(-15, 10), vx: rand(-160, 160), vy: rand(-320, -90), g: 700, r: rand(3, 8), rot: rand(0, TAU), vr: rand(-8, 8), life: rand(0.8, 1.3), max: 1.3, color: pick(cols) });
    }
  }
  // łódka uderzyła w pływającą skałę: szybkie uderzenie ją kruszy, turbo kruszy mocniej
  function hitFloater(r, impact, forced = null) {
    if (r.hitCd > 0) return;
    r.hitCd = 0.25;
    const dmg = forced !== null ? forced : turboT > 0 ? 3 : impact > 80 ? 1 : 0;
    const y = waveY(r.x) - r.w * 0.1;
    if (!dmg) { Sound.bump(); return; }
    r.hp -= dmg; r.shake = 0.3; idleTime = 0;
    const pal = rockPalette(theme);
    if (r.hp > 0) {
      Sound.crack();
      chunkBurst(r.x - Math.sign(r.x - boat.x) * r.w * 0.4, y, 5, pal);
      return;
    }
    Sound.crash();
    chunkBurst(r.x, y, 16, pal);
    sparkBurst(r.x, y - 10, 10);
    splash(r.x, true);
    floaters = floaters.filter((o) => o !== r);
    // nagroda: czasem w skale schowany był prezent
    if (Math.random() < 0.35 && gifts.length < 2) gifts.push({ item: giftItem(), x: r.x, y: waveY(r.x) - 6, t: 0, ft: 0, state: 'float', color: giftColor() });
  }
  function rodTip() {
    const lx = (210 - hook.bend * 14) * BS * boat.face, ly = (-150 + hook.bend * 30) * BS;
    const c = Math.cos(boat.ang), s = Math.sin(boat.ang);
    return { x: boat.x + lx * c - ly * s, y: boat.y + lx * s + ly * c };
  }
  // dotknięcie wody: łódka podpływa tak, żeby koniec wędki był nad palcem (bez zawracania, jeśli się da)
  function planBoatFor(wx) {
    let c = wx - ROD_REACH * boat.facing;
    if (c < 100 || c > WW - 100) {
      boat.facing = -boat.facing;
      c = wx - ROD_REACH * boat.facing;
    }
    return clamp(c, 100, WW - 100);
  }

  // ---------- aktualizacja ----------
  function update(dt) {
    T += dt;
    for (const c of clouds) { c.x += c.v * dt; if (c.x > VW + 160) c.x = -160; }
    for (const b of birds) { b.x += b.v * dt; if (b.x > VW + 40) { b.x = -40; b.y = WATER * rand(0.3, 0.55); } }
    const flow = level.flow || 0;
    for (const r of ripples) {
      r.x += (r.v + flow * 90) * dt;
      if (r.x > VW + 40) r.x = -40;
      if (r.x < -60) r.x = VW + 40;
    }
    for (const j of jellies) j.x += Math.sin(T * 0.2 + j.ph) * 8 * dt;
    updateWeather(dt);
    updateBalls(dt);
    if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
    for (const r of floaters) {
      // nurt rzeki powoli znosi pływające skały
      if (flow) {
        r.x0 += flow * 16 * dt;
        if ((r.x0 > WW - 150 || r.x0 < 300) && !visible(r.x0, 200)) r.x0 = flow > 0 ? 320 : WW - 170;
      }
      r.x = r.x0 + Math.sin(T * 0.25 + r.ph) * 14;
      if (r.shake > 0) r.shake -= dt;
      if (r.hitCd > 0) r.hitCd -= dt;
    }
    for (const s of snags) s.t += dt;
    snags = snags.filter((s) => s.t < 8);
    updateBoat(dt);
    updateCamera();
    updateHook(dt);
    updateSharks(dt);
    updateFish(dt);
    updateCrabs(dt);
    updateItems(dt);
    updateBubbles(dt);
    updateParticles(particles, dt, true);
    updateParticles(uiParticles, dt, false);
    updateFlyers(dt);
    for (let i = 0; i < slotPop.length; i++) if (slotPop[i] > 0) slotPop[i] = Math.max(0, slotPop[i] - dt * 2.5);
    for (let i = 0; i < crabPop.length; i++) if (crabPop[i] > 0) crabPop[i] = Math.max(0, crabPop[i] - dt * 2.5);
    if (bannerT > 0) bannerT -= dt;
    if (celebrateT > 0) celebrateT -= dt;
    if (tapMarker) { tapMarker.t -= dt; if (tapMarker.t <= 0) tapMarker = null; }
    for (const k in press) if (press[k] > 0) press[k] -= dt;

    if (state === 'play') {
      if (bannerT <= 0) levelTime += dt;
      if (hook.state === 'idle' && boat.target === null) idleTime += dt;
      if (caught >= level.goal && crabsCaught >= level.crabGoal && flyers.length === 0) {
        doneDelay += dt;
        if (doneDelay > 0.7) finishLevel();
      }
    } else if (state === 'levelDone') {
      const prev = doneT;
      doneT += dt;
      [0.35, 0.6, 0.85].forEach((t, i) => { if (i < earnedStars && prev < t && doneT >= t) Sound.star(); });
    }
  }

  // deszcz i błyskawice w sztormie, śnieg zimą, liście płynące z nurtem rzeki (deszcz i śnieg w układzie ekranu)
  function updateWeather(dt) {
    for (const d of rain) { d.y += d.v * dt; d.x -= d.v * 0.25 * dt; if (d.y > VH) { d.y = rand(-40, 0); d.x = rand(0, VW + 200); } }
    for (const s of snow) {
      s.y += s.v * dt; s.x += Math.sin(T + s.ph) * 18 * dt;
      if (s.y > VH) { s.y = -5; s.x = rand(0, VW); }
    }
    for (const l of leaves) {
      l.x += level.flow * 85 * dt; l.rot += dt * 0.8;
      if (l.x > camX + VW + 120) l.x = camX - 100;
      if (l.x < camX - 120) l.x = camX + VW + 100;
    }
    if (flash > 0) flash -= dt;
    if (level.storm) {
      thunderT -= dt;
      if (thunderT <= 0) { thunderT = rand(7, 14); flash = 0.35; Sound.thunder(); }
    }
  }

  function updateBoat(dt) {
    let dir = 0;
    if (state === 'play') {
      const held = new Set(pointers.values());
      dir = (keys.left || held.has('left') ? -1 : 0) + (keys.right || held.has('right') ? 1 : 0);
      // tuż po odbiciu od skały łódka cofa się sama, żeby nabrać rozpędu do kolejnego uderzenia
      if (boat.bounceT > 0.1) dir = 0;
      // podczas holowania ryby-szefa i gdy haczyk jest pod lodem, łódka stoi
      else if (hook.state === 'fight' || (level.ice && hookOut())) { dir = 0; boat.target = null; }
      else if (dir) { boat.target = null; boat.onArrive = null; idleTime = 0; }
      else if (boat.target !== null) {
        const d = boat.target - boat.x;
        if (Math.abs(d) < 10) {
          boat.target = null;
          const act = boat.onArrive; boat.onArrive = null;
          if (act === 'cast') cast();
          if (act === 'cage') dropCage();
        } else dir = Math.sign(d) * Math.min(1, Math.abs(d) / 70);
      }
    }
    const maxV = turboT > 0 ? 440 : 240;
    // nurt rzeki i fale sztormu znoszą łódkę
    const drift = (level.flow || 0) * 75 + (level.storm ? Math.sin(T * 0.37) * 80 : 0);
    boat.vx = lerp(boat.vx, dir * maxV + (state === 'play' ? drift : 0), 1 - Math.pow(0.02, dt));
    boat.x += boat.vx * dt;
    if (boat.x < 100) { boat.x = 100; boat.vx = 0; }
    if (boat.x > WW - 100) { boat.x = WW - 100; boat.vx = 0; }
    // pływające skały zatrzymują łódkę; uderzenie z rozpędu je kruszy, a łódka odbija się do tyłu
    if (boat.bounceT > 0) boat.bounceT -= dt;
    for (const r of floaters) {
      const reach = 82 + r.w * 0.42, dx = r.x - boat.x;
      if (Math.abs(dx) >= reach) continue;
      const side = Math.sign(dx) || 1;
      boat.x = r.x - side * reach;
      if (boat.vx * side > 0) {
        const impact = Math.abs(boat.vx);
        boat.vx = -side * Math.max(170, impact * 0.7);
        boat.bounceT = 0.4;
        hitFloater(r, impact);
      }
    }
    // przy dopływaniu do celu i przy odbiciu od skały łódka nie zawraca – wędka zostaje po tej samej stronie
    if (boat.target === null && dir !== 0 && Math.sign(boat.vx) === Math.sign(dir) && Math.abs(boat.vx) > 25) boat.facing = Math.sign(dir);
    boat.face = lerp(boat.face, boat.facing, 1 - Math.pow(0.0005, dt));
    // zimą łódka stoi na lodzie jak sanki
    boat.y = waveY(boat.x) - (level.ice ? ICE_TOP + 26 : 0) + (turboT > 0 ? Math.sin(T * 60) * 0.8 : 0);
    boat.ang = Math.atan((waveY(boat.x + 40) - waveY(boat.x - 40)) / 80) * 0.9;
    if (!level.ice && Math.abs(boat.vx) > 70 && Math.random() < dt * (turboT > 0 ? 90 : 30)) {
      const sx = boat.x - Math.sign(boat.vx) * 90;
      particles.push({ kind: 'drop', x: sx, y: waveY(sx) - 2, vx: -boat.vx * 0.3 + rand(-20, 20), vy: rand(-90, -40), g: 400, r: rand(2, 3.5), life: 0.5, max: 0.5 });
    }
    boat.blink -= dt;
    if (boat.blink < -0.15) boat.blink = rand(2, 5);
  }

  function updateHook(dt) {
    const tip = rodTip();
    const idleY = tip.y + 62;
    const tipX = clamp(tip.x, 30, WW - 30);
    const depthScale = Math.max(1, (BOTTOM - WATER) / 450);
    hook.prevY = hook.y;
    hook.bend = lerp(hook.bend, hook.fish ? 1 : 0, 1 - Math.pow(0.01, dt));
    if (hook.state === 'idle' || hook.state === 'tie') {
      hook.x = lerp(hook.x, tipX, 1 - Math.pow(0.0001, dt));
      hook.y = lerp(hook.y, idleY + Math.sin(T * 2) * 2, 1 - Math.pow(0.0001, dt));
      if (hook.state === 'tie') {
        hook.tieT -= dt;
        if (hook.tieT <= 0) { hook.state = 'idle'; Sound.star(); sparkBurst(hook.x + 6, hook.y + 6, 8); }
      }
      hook.lockX = null;
      return;
    }
    // pod lodem haczyk zostaje w przeręblu, a nurt rzeki znosi go tym mocniej, im głębiej
    let tx = level.ice && hook.lockX !== null ? hook.lockX : tipX;
    if (level.flow) tx += level.flow * 120 * clamp((hook.y - WATER) / (BOTTOM - WATER), 0, 1);
    if (hook.state === 'fight') {
      // holowanie: trzymanie przycisku przyciąga rybę, ale napina żyłkę; gdy ryba szarpie, trzeba popuścić
      const fg = hook.fight;
      fg.surge = Math.pow(Math.max(0, Math.sin(T * 1.7 + fg.ph)), 2);
      if (reelHeld()) { fg.p += 0.22 * dt; fg.ten += (0.28 + fg.surge * 0.9) * dt; }
      else { fg.p -= 0.05 * dt; fg.ten -= 0.55 * dt; }
      fg.p = clamp(fg.p, 0, 1); fg.ten = clamp(fg.ten, 0, 1);
      hook.x = fg.x0 + Math.sin(T * 2.3) * 45 * (1 - fg.p) + (fg.surge > 0.3 ? Math.sin(T * 40) * 3 : 0);
      hook.y = lerp(fg.y0, waveY(hook.x) + 60, fg.p);
      if (fg.surge > 0.3 && Math.random() < dt * 12) bubbles.push({ x: hook.x + rand(-30, 30), y: hook.y + 30, r: rand(2.5, 5), v: rand(50, 90), ph: rand(0, TAU) });
      if (fg.ten >= 1) { snapHook(); showToast('Żyłka pękła! Popuszczaj, gdy ryba szarpie'); return; }
      if (fg.p >= 1) { hook.fight = null; hook.state = 'up'; Sound.bite(); }
      return;
    } else if (hook.state === 'down') {
      hook.y += 240 * depthScale * dt;
      hook.x = lerp(hook.x, tx, 1 - Math.pow(0.25, dt));
      if (hook.y >= BOTTOM - 45) {
        hook.y = BOTTOM - 45; hook.state = 'up';
        Sound.bump();
        for (let i = 0; i < 6; i++) particles.push({ kind: 'puff', x: hook.x + rand(-10, 10), y: hook.y + 25, vx: rand(-40, 40), vy: rand(-30, -5), g: 0, r: rand(4, 8), life: 0.8, max: 0.8, color: 'rgba(255,242,216,0.35)' });
      }
    } else if (hook.state === 'up') {
      hook.y -= (hook.fish ? 330 : 380) * depthScale * dt;
      hook.x = lerp(hook.x, hook.y < WATER - 20 ? tipX : tx, 1 - Math.pow(0.05, dt));
      if (hook.y <= idleY) {
        hook.y = idleY; hook.state = 'idle'; hook.magic = false;
        if (hook.fish) landFish();
      }
    }
    if (hookOut() && rocks.length && hook.y + 18 >= rockTopAt(hook.x + 6)) { snapHook(); return; }
    const wl = waveY(hook.x);
    if (hook.prevY < wl && hook.y >= wl) splash(hook.x, false);
    if (hook.prevY > wl && hook.y <= wl) splash(hook.x, !!hook.fish);
    if (hook.y > wl + 20 && hookOut() && Math.random() < dt * 6) {
      bubbles.push({ x: hook.x + rand(-4, 4), y: hook.y, r: rand(2.5, 5), v: rand(40, 70), ph: rand(0, TAU) });
    }
  }

  function splash(x, big) {
    if (big) Sound.splash(); else Sound.plop();
    const y = waveY(x);
    const n = big ? 22 : 12;
    for (let i = 0; i < n; i++) {
      particles.push({ kind: 'drop', x: x + rand(-8, 8), y, vx: rand(-130, 130), vy: rand(-280, -110) * (big ? 1.2 : 0.8), g: 650, r: rand(2, 4.5), life: rand(0.6, 1), max: 1 });
    }
    particles.push({ kind: 'ring', x, y, r: 6, life: 0.8, max: 0.8 });
  }

  function landFish() {
    const f = hook.fish;
    hook.fish = null;
    fishes = fishes.filter((o) => o !== f);
    spawnQueue.push(rand(1.2, 2.5));
    celebrateT = 1.1;
    Sound.caught();
    sparkBurst(hook.x, hook.y + 30, 16);
    flyers.push({ kind: 'fish', type: f.type, sx: (hook.x + 9 - camX) * S, sy: (hook.y + 40) * S, s0: Math.min(f.size, 44) * S, t: 0, slot: caught + fishFlying() });
    addScore(fishPts(f.type), hook.x, hook.y - 20);
  }
  function addScore(pts, x, y) {
    if (!level.width) return;
    score += pts;
    particles.push({ kind: 'text', text: `+${pts}`, big: pts >= 50, x, y, vx: 0, vy: -45, g: 0, life: 1.4, max: 1.4 });
  }
  function landCrab(cr, x, y) {
    crabs = crabs.filter((c) => c !== cr);
    crabQueue.push(rand(3, 6));
    celebrateT = 1.1;
    Sound.caught();
    sparkBurst(x, y);
    flyers.push({ kind: 'crab', type: cr.kind, sx: (x - camX) * S, sy: y * S, s0: crabScale(cr) * S, t: 0, slot: crabsCaught + crabFlying() });
    addScore(CRAB_PTS, x, y - 40);
  }

  function updateFlyers(dt) {
    for (const fl of flyers) {
      fl.t += dt / 0.9;
      if (fl.t >= 1 && !fl.done) {
        fl.done = true;
        let c;
        if (fl.kind === 'fish') {
          caughtTypes[fl.slot] = fl.type; slotPop[fl.slot] = 1;
          caught = caughtTypes.filter(Boolean).length;
          c = slotCenter(fl.slot);
        } else {
          crabTypes[fl.slot] = fl.type; crabPop[fl.slot] = 1;
          crabsCaught = crabTypes.filter(Boolean).length;
          c = crabSlotCenter(fl.slot);
        }
        Sound.star();
        for (let i = 0; i < 12; i++) {
          const a = rand(0, TAU), sp = rand(60, 160);
          uiParticles.push({ kind: 'spark', x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, r: rand(0.6, 1), life: 0.6, max: 0.6 });
        }
      }
    }
    flyers = flyers.filter((f) => !f.done);
  }

  const sharkMouth = (sh) => ({ x: sh.x + sh.dir * 88 * sh.s, y: sh.y + 8 * sh.s });
  // rekiny patrolują wodę; poza ekranem chwilę czekają, więc są też spokojne chwile.
  // Na normalnym poziomie rekin, który zobaczy haczyk w wodzie, płynie do niego i przegryza żyłkę.
  function updateSharks(dt) {
    const hookY = hook.y + 20, bites = !!level.width && state === 'play';
    const hookInWater = hookOut() && hook.y > waveY(hook.x) + 30;
    for (const sh of sharks) {
      sh.t += dt;
      if (sh.cool > 0) sh.cool -= dt;
      if (sh.wait > 0) { sh.wait -= dt; continue; }
      const m = sharkMouth(sh), dx = hook.x + 9 - m.x, dy = hookY - m.y, d = Math.hypot(dx, dy);
      const wasChasing = sh.state === 'chase';
      sh.state = bites && hookInWater && sh.cool <= 0 && d < 300 ? 'chase' : 'patrol';
      if (sh.state === 'chase') {
        if (!wasChasing) Sound.sharkAlert();
        const sp = sh.speed * 1.8;
        sh.x += (dx / d) * sp * dt; sh.y += (dy / d) * sp * dt;
        if (Math.abs(dx) > 10) sh.dir = dx > 0 ? 1 : -1;
        sh.baseY = sh.y;
        if (d < 34) {
          snapHook(true);
          sh.state = 'patrol'; sh.cool = 5; sh.dir = -sh.dir;
        }
      } else {
        sh.x += sh.dir * sh.speed * dt;
        sh.y = lerp(sh.y, sh.baseY + Math.sin(sh.t * 0.8) * 14, 1 - Math.pow(0.3, dt));
        if ((sh.x < -220 && sh.dir < 0) || (sh.x > WW + 220 && sh.dir > 0)) {
          sh.dir = -sh.dir; sh.wait = rand(3, 7);
          sh.baseY = sh.y = rand(fishMinY() + 30, fishMaxY() - 30);
        }
      }
      sh.y = clamp(sh.y, fishMinY(), fishMaxY());
    }
  }

  function updateFish(dt) {
    for (let i = spawnQueue.length - 1; i >= 0; i--) {
      spawnQueue[i] -= dt;
      if (spawnQueue[i] <= 0) { spawnQueue.splice(i, 1); fishes.push(makeFish(fishType(), true)); }
    }
    const hookWet = hookOut() && !hook.fish && hook.y > waveY(hook.x) + 15;
    const canBite = state === 'play' && !fishDone();
    let magnet = level.magnet;
    if (hook.magic) magnet = Math.max(magnet * 2.2, 330);
    if (baitCloud && Math.hypot(hook.x - baitCloud.x, hook.y - baitCloud.y) < 130) magnet = Math.max(magnet, 230);
    for (const f of fishes) {
      f.t += dt;
      if (f === hook.fish) continue;
      let attracted = false;
      if (f.scared > 0) f.scared -= dt;
      // ryby uciekają przed bliskim rekinem i wtedy nie biorą
      for (const sh of sharks) {
        if (sh.wait > 0 || Math.abs(sh.x - f.x) > 240 || Math.abs(sh.y - f.y) > 170) continue;
        f.scared = Math.max(f.scared, 0.8);
        f.dir = f.x > sh.x ? 1 : -1;
        f.baseY = clamp(f.y + (f.y > sh.y ? 40 : -40), fishMinY(), fishMaxY());
      }
      if (hookWet && canBite && f.scared <= 0) {
        const dx = hook.x + 9 - f.x, dy = hook.y + 14 - f.y, d = Math.hypot(dx, dy);
        // tęczowa ryba i ryba-szef są ostrożne: biorą tylko z bliska
        const FF = FISH[f.type];
        if (d < magnet * (FF.rainbow ? 0.55 : FF.boss ? 0.6 : 1)) {
          attracted = true;
          const sp = Math.max(f.speed * 2, 90);
          f.x += (dx / d) * sp * dt;
          f.y += (dy / d) * sp * dt;
          f.baseY = f.y;
          if (Math.abs(dx) > 3) f.dir = dx > 0 ? 1 : -1;
          if (d < f.size * 0.9 + 16 && !hook.fish) {
            hook.fish = f; hook.state = 'up';
            Sound.bite();
            // holowanie zaczyna się od spokojnej chwili (faza szarpnięć ustawiona na dolinę)
            if (FF.boss) { hook.state = 'fight'; hook.fight = { p: 0, ten: 0, surge: 0, x0: hook.x, y0: hook.y, ph: Math.PI - 1.7 * T }; Sound.sharkAlert(); }
            for (let k = 0; k < 6; k++) bubbles.push({ x: f.x + rand(-10, 10), y: f.y, r: rand(2.5, 5), v: rand(50, 90), ph: rand(0, TAU) });
          }
        }
      }
      if (!attracted && baitCloud && f.scared <= 0) {
        if (!f.bo) f.bo = { x: rand(-95, 95), y: rand(-55, 55) };
        const dx = baitCloud.x + f.bo.x - f.x, dy = baitCloud.y + f.bo.y - f.y, d = Math.hypot(dx, dy);
        if (d > 6) {
          const sp = Math.min(d * 2, Math.max(f.speed * 2.2, 110));
          f.x += (dx / d) * sp * dt; f.y += (dy / d) * sp * dt;
        }
        f.dir = d > 20 ? (dx > 0 ? 1 : -1) : (baitCloud.x > f.x ? 1 : -1);
        f.baseY = clamp(f.y, fishMinY(), fishMaxY());
        attracted = true;
      }
      f.puff = lerp(f.puff, attracted && FISH[f.type].puffer ? 1 : 0, 1 - Math.pow(0.05, dt));
      if (!attracted) {
        f.x += (f.dir * f.speed * (f.scared > 0 ? 2.5 : 1) + (level.flow || 0) * 25) * dt;
        f.y = lerp(f.y, f.baseY + Math.sin(f.t * 1.5 + f.ph) * 12, 1 - Math.pow(0.2, dt));
        if (f.x < -80) f.dir = 1;
        if (f.x > WW + 80) f.dir = -1;
        f.turn -= dt;
        if (f.turn < 0) {
          f.turn = rand(4, 10);
          if (Math.random() < 0.4 && f.x > 0 && f.x < WW) f.dir *= -1;
          f.baseY = clamp(f.baseY + rand(-80, 80), fishMinY(), fishMaxY());
        }
      }
      if ((FISH[f.type].shiny || FISH[f.type].rainbow) && Math.random() < dt * 3) {
        particles.push({ kind: 'spark', x: f.x + rand(-f.size, f.size), y: f.y + rand(-f.size * 0.5, f.size * 0.5), vx: 0, vy: -10, g: 0, r: rand(0.5, 0.8), life: 0.7, max: 0.7 });
      }
    }
  }

  function updateCrabs(dt) {
    for (let i = crabQueue.length - 1; i >= 0; i--) {
      crabQueue[i] -= dt;
      if (crabQueue[i] <= 0) { crabQueue.splice(i, 1); crabs.push(makeCrab(true)); }
    }
    // klatka postawiona na skale nie zwabi kraba – trzeba ją opuścić na piasek
    const lure = trap && trap.state === 'wait' && !trap.crab && !trap.onRock ? trap : null;
    let nearest = null;
    if (lure) for (const c of crabs) if (c.state === 'walk' && (!nearest || Math.abs(c.x - lure.x) < Math.abs(nearest.x - lure.x))) nearest = c;
    for (const c of crabs) {
      c.t += dt;
      if (c.state !== 'walk') continue;
      if (lure && (c === nearest || Math.abs(c.x - lure.x) < 340)) {
        const dx = lure.x - c.x;
        c.walking = true;
        if (Math.abs(dx) < 6 && !lure.crab) {
          lure.crab = c; lure.state = 'caught'; lure.t = 0; c.state = 'trapped';
          Sound.snap();
          continue;
        }
        c.x += Math.sign(dx) * Math.min(Math.abs(dx), c.speed * 2.4 * dt);
      } else {
        c.turn -= dt;
        if (c.turn < 0) {
          c.turn = rand(2, 6);
          c.dir = Math.random() < 0.5 ? -1 : 1;
          c.pause = Math.random() < 0.35 ? rand(0.8, 2) : 0;
        }
        if (c.pause > 0) { c.pause -= dt; c.walking = false; }
        else { c.x += c.dir * c.speed * dt; c.walking = true; }
        if (c.x < 30) c.dir = 1;
        if (c.x > WW - 30) c.dir = -1;
      }
      c.y = sandY(c.x) - 30 * crabScale(c);
    }
    if (!trap) return;
    const tr = trap;
    tr.t += dt;
    const sandFloor = sandY(tr.x) + 6;
    const floor = Math.min(sandFloor, rockTopAt(tr.x) + 4);
    tr.onRock = floor < sandFloor - 8;
    const depthScale = Math.max(1, (BOTTOM - WATER) / 450);
    if (tr.state === 'sink') {
      tr.y += 200 * depthScale * dt;
      if (tr.y >= floor) {
        tr.y = floor; tr.state = 'wait'; tr.t = 0;
        Sound.bump();
        for (let i = 0; i < 8; i++) particles.push({ kind: 'puff', x: tr.x + rand(-30, 30), y: floor - 4, vx: rand(-40, 40), vy: rand(-30, -5), g: 0, r: rand(4, 9), life: 0.8, max: 0.8, color: 'rgba(255,242,216,0.3)' });
      }
    } else if (tr.state === 'wait') {
      tr.y = floor;
      if (tr.t > CAGE_WAIT) tr.state = 'lift';
    } else if (tr.state === 'caught') {
      tr.y = floor;
      if (tr.t > 1) tr.state = 'lift';
    } else if (tr.state === 'lift') {
      tr.y -= 240 * depthScale * dt;
      if (tr.y - 70 * CAGE_S <= waveY(tr.x)) {
        splash(tr.x, !!tr.crab);
        if (tr.crab) landCrab(tr.crab, tr.x, tr.y - 30);
        trap = null;
      }
    }
  }

  function updateItems(dt) {
    for (const k of ITEM_KEYS) if (itemPop[k] > 0) itemPop[k] = Math.max(0, itemPop[k] - dt * 2.5);
    if (turboT > 0) turboT -= dt;
    if (baitThrow) {
      const b = baitThrow;
      b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.vy > 0 && b.y >= waveY(b.x)) {
        splash(b.x, false);
        baitCloud = { x: b.x, y: waveY(b.x) + 10, ty: lerp(fishMinY(), fishMaxY(), 0.35), life: BAIT_TIME, max: BAIT_TIME };
        baitThrow = null;
      }
    }
    if (baitCloud) {
      const c = baitCloud;
      c.life -= dt;
      c.y = lerp(c.y, c.ty, 1 - Math.pow(0.3, dt));
      if (c.life > 1 && Math.random() < dt * 25) {
        particles.push({ kind: 'crumb', x: c.x + rand(-45, 45), y: c.y + rand(-25, 25), vx: rand(-8, 8), vy: rand(8, 25), g: 0, r: rand(1.5, 3.2), life: rand(1, 2), max: 2, color: pick(['#B8643C', '#E3B04B', '#8E4A2A']) });
      }
      if (c.life <= 0) { baitCloud = null; for (const f of fishes) f.bo = null; }
    }
    if (hook.magic && hook.state !== 'idle' && Math.random() < dt * 20) {
      particles.push({ kind: 'spark', x: hook.x + rand(-14, 24), y: hook.y + rand(-6, 30), vx: rand(-20, 20), vy: rand(-30, 0), g: 0, r: rand(0.4, 0.7), life: 0.6, max: 0.6 });
    }
    if (state === 'play') {
      giftTimer -= dt;
      if (giftTimer <= 0 && gifts.length === 0) { giftTimer = rand(16, 26); spawnGift(); }
    }
    for (const g of gifts) {
      g.t += dt;
      const dx = Math.abs(boat.x - g.x);
      if (g.state === 'fall') {
        g.y += 55 * dt; g.x += Math.sin(g.t * 1.3) * 12 * dt;
        if (dx < 90 && g.y > boat.y - 150) collectGift(g);
        else if (g.y + 6 >= waveY(g.x) - (level.ice ? ICE_TOP : 0)) {
          g.state = 'float';
          Sound.plop();
          particles.push({ kind: 'ring', x: g.x, y: g.y, r: 6, life: 0.8, max: 0.8 });
        }
      } else if (g.state === 'float') {
        g.y = waveY(g.x) - 6 - (level.ice ? ICE_TOP : 0);
        // w szerokim świecie zapomniany prezent po czasie tonie, żeby mogły spadać nowe
        g.ft += dt;
        if (level.width && g.ft > 30) { g.state = 'gone'; particles.push({ kind: 'ring', x: g.x, y: g.y, r: 6, life: 0.8, max: 0.8 }); continue; }
        if (Math.random() < dt * 3) particles.push({ kind: 'spark', x: g.x + rand(-20, 20), y: g.y + rand(-25, 5), vx: 0, vy: -15, g: 0, r: rand(0.4, 0.7), life: 0.6, max: 0.6 });
        if (dx < 100) collectGift(g);
      }
    }
    gifts = gifts.filter((g) => g.state !== 'gone');
    for (const f of itemFlyers) {
      f.t += dt / 0.8;
      if (f.t >= 1 && !f.done) {
        f.done = true;
        inv[f.item] = Math.min(9, inv[f.item] + 1); itemPop[f.item] = 1;
        saveInv(); Sound.star();
      }
    }
    itemFlyers = itemFlyers.filter((f) => !f.done);
  }

  function updateBubbles(dt) {
    bubbleT -= dt;
    if (bubbleT <= 0) {
      bubbleT = rand(0.3, 0.7);
      const x = rand(camX, camX + VW);
      bubbles.push({ x, y: sandY(x) - rand(10, 60), r: rand(2.5, 6), v: rand(30, 60), ph: rand(0, TAU) });
    }
    for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(T * 3 + b.ph) * 12 * dt; }
    bubbles = bubbles.filter((b) => b.y > waveY(b.x) + 3);
  }

  function updateParticles(list, dt, world) {
    for (const p of list) {
      p.life -= dt;
      if (p.kind === 'ring') { p.r += 60 * dt; continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'confetti') { p.rot += p.vr * dt; p.vx += Math.sin(T * 3 + p.rot) * 30 * dt; }
      if (p.kind === 'chunk') {
        p.rot += p.vr * dt;
        if (world && p.vy > 0 && p.y > waveY(p.x)) { p.vy *= 0.85; p.vx *= 0.9; }  // odłamki toną powoli
      }
      if (p.kind === 'puff') p.r += 10 * dt;
      if (world && p.kind === 'drop' && p.vy > 0 && p.y > waveY(p.x)) p.life = 0;
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
  }

  // ---------- rysowanie: postacie i obiekty (działają w każdym układzie współrzędnych) ----------
  function drawFish(c, type, x, y, size, dir, t, angle = 0, puff = 0) {
    const F = FISH[type];
    const k = size / 48;
    const a0 = c.globalAlpha;
    c.save(); c.translate(x, y); if (angle) c.rotate(angle); c.scale(dir * k, k);
    if (F.glow) {
      const g = c.createRadialGradient(-6, 0, 0, -6, 0, 78);
      g.addColorStop(0, `rgba(${F.glow},${0.5 + 0.15 * Math.sin(t * 3)})`); g.addColorStop(1, `rgba(${F.glow},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(-6, 0, 78, 0, TAU); c.fill();
    }
    if (F.shiny) {
      const g = c.createRadialGradient(-6, 0, 0, -6, 0, 70);
      g.addColorStop(0, 'rgba(255,242,216,0.4)'); g.addColorStop(1, 'rgba(255,242,216,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-6, 0, 70, 0, TAU); c.fill();
    }
    const wag = Math.sin(t * 9) * 0.22;
    if (F.puffer) {
      const s = 1 + puff * 0.3;
      c.scale(s, s);
      c.fillStyle = F.f;
      c.save(); c.translate(-28, 0); c.rotate(wag); c.translate(28, 0); c.fill(SHAPE.pufferTail); c.restore();
      c.strokeStyle = F.f; c.lineWidth = 3.5; c.lineCap = 'round'; c.stroke(SHAPE.pufferSpikes);
      c.fillStyle = F.b; c.beginPath(); c.arc(0, 0, 32, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill(SHAPE.pufferBelly);
      c.fillStyle = C.eye; c.beginPath(); c.arc(14, -8, 5, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(15.5, -9.5, 1.5, 0, TAU); c.fill();
      c.strokeStyle = C.eye; c.lineWidth = 2.2; c.stroke(SHAPE.pufferMouth);
    } else {
      c.fillStyle = F.f;
      c.save(); c.translate(-44, 0); c.rotate(wag); c.translate(44, 0); c.fill(SHAPE.fishTail); c.restore();
      c.fill(SHAPE.fishFin);
      if (F.rainbow) {
        // tęczowe pasy przesuwają się wzdłuż ciała
        const g = c.createLinearGradient(-46, 0, 52, 0), sh = (t * 0.4) % 1;
        ['#E8775A', '#E3B04B', '#9FC27E', '#4FB3A9', '#79B8DD', '#8A7FD1', '#E8775A'].forEach((col, i) => g.addColorStop(((i / 6) + sh) % 1, col));
        c.fillStyle = g;
      } else c.fillStyle = F.b;
      c.fill(SHAPE.fishBody);
      c.fillStyle = 'rgba(255,255,255,0.16)'; c.fill(SHAPE.fishBelly);
      c.strokeStyle = F.f;
      c.globalAlpha = a0 * 0.6; c.lineWidth = 4; c.stroke(SHAPE.fishStripes);
      c.globalAlpha = a0 * 0.8; c.lineWidth = 2.5; c.stroke(SHAPE.fishGill);
      c.globalAlpha = a0;
      c.fillStyle = C.eye; c.beginPath(); c.arc(31, -6, 4.5, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(32.5, -7.5, 1.4, 0, TAU); c.fill();
      if (F.boss) {
        c.save(); c.translate(14, -30); c.rotate(0.15);
        c.fillStyle = C.ochre; c.fill(SHAPE.crown);
        c.fillStyle = C.coral; c.beginPath(); c.arc(0, -6, 2.6, 0, TAU); c.fill();
        c.restore();
      }
    }
    c.restore();
  }
  // rybka w oknie 132×88 (jak w liczniku z projektu), środkiem w (x, y)
  function drawFishIcon(c, type, x, y, w) {
    const k = w / 132;
    drawFish(c, type, x + 10 * k, y, 48 * k, 1, T);
  }
  function drawFishSil(c, x, y, w, lw) {
    const k = w / 132;
    c.save(); c.translate(x + 10 * k, y); c.scale(k, k);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill(SHAPE.fishSil);
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = lw / k; c.lineJoin = 'round'; c.stroke(SHAPE.fishSil);
    c.restore();
  }

  function drawCrab(c, kind, x, y, s, t, walking) {
    const K = CRABS[kind];
    c.save(); c.translate(x, y); c.scale(s, s);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const step = walking ? Math.sin(t * 14) * 2.5 : 0;
    const snap = Math.sin(t * 5) * 0.14;
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      c.save(); c.translate(0, side < 0 ? step : -step);
      c.strokeStyle = K.d; c.lineWidth = 4; c.stroke(SHAPE.crabLegs);
      c.restore();
      c.strokeStyle = K.a; c.lineWidth = 6; c.stroke(SHAPE.crabArm);
      c.save(); c.translate(-40, -14); c.rotate(snap); c.translate(40, 14);
      c.fillStyle = K.b; c.fill(SHAPE.crabClaw);
      c.restore();
      c.strokeStyle = K.d; c.lineWidth = 3; c.stroke(SHAPE.crabStalk);
      c.fillStyle = C.cream; c.beginPath(); c.arc(-10, -27, 4.5, 0, TAU); c.fill();
      c.fillStyle = C.eye; c.beginPath(); c.arc(-9, -27, 2.2, 0, TAU); c.fill();
      c.restore();
    }
    c.fillStyle = K.b; c.beginPath(); c.ellipse(0, 4, 30, 19, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fill(SHAPE.crabShine);
    c.fillStyle = K.s;
    c.beginPath(); c.arc(-10, 6, 2.5, 0, TAU); c.arc(8, 10, 2, 0, TAU); c.arc(14, 2, 1.8, 0, TAU); c.fill();
    c.restore();
  }
  // krab w oknie 132×94 (licznik)
  function drawCrabIcon(c, kind, x, y, w, t) { drawCrab(c, kind, x, y + w / 132, w / 132, t, false); }
  function drawCrabSil(c, x, y, w, lw) {
    const k = w / 132;
    c.save(); c.translate(x, y + k); c.scale(k, k);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = lw / k; c.lineJoin = 'round';
    c.beginPath(); c.ellipse(0, 4, 30, 19, 0, 0, TAU); c.fill(); c.stroke();
    c.fill(SHAPE.crabClaw); c.stroke(SHAPE.crabClaw);
    c.fill(SHAPE.crabClawR); c.stroke(SHAPE.crabClawR);
    c.restore();
  }

  function drawCage(c, x, y, s, crab) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (crab) drawCrab(c, crab.kind, 0, -26, 0.52, crab.t, true);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#3A2A20'; c.lineWidth = 3; c.stroke(SHAPE.cageRoof);
    c.fillStyle = 'rgba(12,34,46,0.3)'; roundRect(c, -60, -70, 120, 70, 10); c.fill();
    c.strokeStyle = 'rgba(201,183,156,0.6)'; c.lineWidth = 1.5; c.stroke(SHAPE.cageBars);
    c.fillStyle = 'rgba(201,183,156,0.25)'; c.fill(SHAPE.cageFunnels);
    c.strokeStyle = '#C9B79C'; c.stroke(SHAPE.cageFunnels);
    if (!crab) { c.fillStyle = '#E3B04B'; c.beginPath(); c.ellipse(0, -12, 10, 5, 0, 0, TAU); c.fill(); }
    c.strokeStyle = '#3A2A20'; c.lineWidth = 4; roundRect(c, -60, -70, 120, 70, 10); c.stroke();
    c.restore();
  }

  function drawBobber(c, x, y, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.strokeStyle = C.coral; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -20); c.lineTo(0, -8); c.stroke();
    c.fillStyle = C.cream; c.beginPath(); c.ellipse(0, 0, 7, 9, 0, 0, TAU); c.fill();
    c.fillStyle = C.coral; c.fill(SHAPE.bobberTop);
    c.restore();
  }

  function drawFisher(blinking) {
    const tx = 210 - hook.bend * 14, ty = -150 + hook.bend * 30;
    ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(20, -44); ctx.quadraticCurveTo(115, -97 + hook.bend * 12, tx, ty); ctx.stroke();
    ctx.fillStyle = '#D9A441'; ctx.fill(SHAPE.coat);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fill(SHAPE.coatShade);
    ctx.fillStyle = '#2F5A55'; ctx.fill(SHAPE.scarf);
    ctx.fillStyle = '#E9B48F'; ctx.beginPath(); ctx.arc(-4, -84, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5A3A28'; ctx.fill(SHAPE.beard);
    ctx.fillStyle = '#2F5A55'; ctx.fill(SHAPE.cap);
    ctx.fillStyle = '#24474A'; roundRect(ctx, -23, -93, 38, 7, 3); ctx.fill();
    ctx.fillStyle = C.eye;
    if (blinking) ctx.fillRect(4, -84.5, 5, 1.6);
    else { ctx.beginPath(); ctx.arc(6, -84, 2.2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#D99A74'; ctx.fill(SHAPE.nose);
    ctx.strokeStyle = '#C99335'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(26, -44); ctx.stroke();
    ctx.fillStyle = '#E9B48F'; ctx.beginPath(); ctx.arc(28, -44, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8C99A3'; ctx.beginPath(); ctx.arc(24, -36, 5, 0, TAU); ctx.fill();
  }
  function drawFisherJump() {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#24474A'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-22, -16); ctx.lineTo(-28, 8); ctx.moveTo(6, -16); ctx.lineTo(12, 8); ctx.stroke();
    ctx.fillStyle = '#1A2E36';
    ctx.beginPath(); ctx.ellipse(-31, 11, 10, 5, 0, 0, TAU); ctx.ellipse(15, 11, 10, 5, 0, 0, TAU); ctx.fill();
    const wave = Math.sin(T * 10) * 4;
    ctx.strokeStyle = '#C99335';
    ctx.beginPath(); ctx.moveTo(-30, -54); ctx.lineTo(-48 - wave, -96); ctx.moveTo(16, -54); ctx.lineTo(34 + wave, -96); ctx.stroke();
    ctx.fillStyle = '#E9B48F';
    ctx.beginPath(); ctx.arc(-50 - wave, -100, 6, 0, TAU); ctx.arc(36 + wave, -100, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#D9A441'; ctx.fill(SHAPE.coatJump);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fill(SHAPE.coatJumpShade);
    ctx.fillStyle = '#2F5A55'; ctx.fill(SHAPE.scarf);
    ctx.fillStyle = '#E9B48F'; ctx.beginPath(); ctx.arc(-4, -84, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5A3A28'; ctx.fill(SHAPE.beard);
    ctx.fillStyle = '#2F5A55'; ctx.fill(SHAPE.cap);
    ctx.fillStyle = '#24474A'; roundRect(ctx, -23, -93, 38, 7, 3); ctx.fill();
    ctx.strokeStyle = C.eye; ctx.lineWidth = 2; ctx.stroke(SHAPE.happyEye);
    ctx.fillStyle = '#D99A74'; ctx.fill(SHAPE.nose);
  }
  function drawHull() {
    ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-88, -22); ctx.lineTo(-88, -78); ctx.stroke();
    ctx.save(); ctx.translate(-88, -70); ctx.scale(1 + Math.sin(T * 5) * 0.08, 1); ctx.translate(88, 70);
    ctx.fillStyle = C.coral; ctx.fill(SHAPE.flag);
    ctx.restore();
    ctx.fillStyle = '#7A3E22'; roundRect(ctx, -106, -22, 212, 10, 3); ctx.fill();
    ctx.fillStyle = '#B8643C'; ctx.fill(SHAPE.hullBody);
    ctx.strokeStyle = '#8E4A2A'; ctx.lineWidth = 2; ctx.stroke(SHAPE.hullPlanks);
  }
  function drawBoat() {
    const jumping = celebrateT > 0 || state === 'levelDone';
    ctx.save(); ctx.translate(boat.x, boat.y); ctx.rotate(boat.ang); ctx.scale(boat.face * BS, BS);
    if (turboT > 0) {
      ctx.strokeStyle = '#3E4F58'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-118, -16); ctx.lineTo(-118, 30); ctx.stroke();
      ctx.fillStyle = '#3E4F58'; roundRect(ctx, -132, -44, 28, 30, 7); ctx.fill();
      ctx.fillStyle = '#E3B04B'; roundRect(ctx, -128, -38, 20, 5, 2); ctx.fill();
      ctx.fillStyle = C.cream; ctx.beginPath(); ctx.ellipse(-118, 32, 3, 10 * Math.abs(Math.sin(T * 40)) + 1, 0, 0, TAU); ctx.fill();
    }
    if (jumping) {
      ctx.save(); ctx.translate(0, -50 - Math.abs(Math.sin(T * 7)) * 16); drawFisherJump(); ctx.restore();
    } else drawFisher(boat.blink <= 0);
    drawHull();
    if (hasCannon()) {
      // armatka na dziobie (tryb normalny); po strzale lufa odskakuje
      const kick = cannonCd > CANNON_CD - 0.2 ? (cannonCd - (CANNON_CD - 0.2)) * 40 : 0;
      ctx.save(); ctx.translate(72 - kick, -30); ctx.rotate(-0.22);
      ctx.fillStyle = '#3E4F58'; roundRect(ctx, -6, -7, 40, 14, 6); ctx.fill();
      ctx.fillStyle = '#2A363D'; roundRect(ctx, 30, -9, 7, 18, 3); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#7A3E22'; ctx.beginPath(); ctx.arc(70 - kick, -24, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = C.ochre; ctx.beginPath(); ctx.arc(70 - kick, -24, 3, 0, TAU); ctx.fill();
    }
    if (level.ice) {
      // płozy sanek
      ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-80, 46); ctx.lineTo(84, 46); ctx.quadraticCurveTo(100, 46, 102, 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-50, 38); ctx.lineTo(-50, 46); ctx.moveTo(50, 38); ctx.lineTo(50, 46); ctx.stroke();
      ctx.restore();
      return;
    }
    // zanurzona część kadłuba
    ctx.beginPath(); ctx.rect(-110, 3, 220, 45); ctx.clip();
    ctx.globalAlpha = 0.45; ctx.fillStyle = theme.water[1][1]; ctx.fill(SHAPE.hullBody);
    ctx.restore();
  }

  function drawLineAndHook() {
    if (celebrateT > 0 || state === 'levelDone') return;
    const tip = rodTip();
    if (hook.state === 'tie') {
      // zerwana żyłka zwisa z wędki, dopóki rybak nie zawiąże nowego haczyka
      const sway = Math.sin(T * 3) * 6;
      ctx.strokeStyle = 'rgba(244,235,221,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo(tip.x + sway, tip.y + 20, tip.x + sway * 1.5, tip.y + 34); ctx.stroke();
      return;
    }
    const hx = hook.x, hy = hook.y - 32;
    ctx.strokeStyle = 'rgba(244,235,221,0.75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo(lerp(tip.x, hx, 0.5) + (tip.x - hx) * 0.12, lerp(tip.y, hy, 0.55), hx, hy);
    ctx.stroke();
    if (hook.y > waveY(hook.x) + 10) {
      const t = clamp((WATER - tip.y) / (hy - tip.y), 0, 1);
      const bx = lerp(tip.x, hx, t);
      drawBobber(ctx, bx, waveY(bx));
    }
    ctx.save(); ctx.translate(hook.x, hook.y - 10);
    ctx.fillStyle = '#55636B'; ctx.beginPath(); ctx.ellipse(0, -16, 3.5, 5.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#DCE3E6'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -5, 4, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(SHAPE.hookJ);
    if (!hook.fish) {
      ctx.save(); ctx.translate(13, 27); ctx.rotate(Math.sin(T * 6) * 0.18); ctx.translate(-13, -27);
      ctx.strokeStyle = hook.magic ? `hsl(${(T * 240) % 360},80%,70%)` : '#D9779A'; ctx.lineWidth = 4;
      ctx.stroke(SHAPE.worm);
      ctx.restore();
    }
    ctx.restore();
    if (level.dark) {
      // lampka nad haczykiem w ciemnych głębinach
      ctx.save(); ctx.translate(hook.x, hook.y - 36);
      ctx.fillStyle = `rgba(255,214,130,${0.35 + Math.sin(T * 5) * 0.08})`; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFD27A'; ctx.fill(SHAPE.lamp);
      ctx.fillStyle = '#3E4F58'; ctx.fillRect(-5, -9, 10, 3);
      ctx.restore();
    }
  }

  function drawMagnet() {
    if (state !== 'play' || !hookOut() || hook.fish || hook.y < waveY(hook.x) + 15) return;
    const x = hook.x + 9, y = hook.y + 14;
    const big = hook.magic ? 1.6 : 1;
    const pulse = 1 + Math.sin(T * 4) * 0.06;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 90 * big);
    g.addColorStop(0, `rgba(255,242,216,${hook.magic ? 0.45 : 0.32})`); g.addColorStop(1, 'rgba(255,242,216,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 90 * big, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,242,216,0.7)'; ctx.beginPath(); ctx.arc(x, y, 42 * big * pulse, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,242,216,0.35)'; ctx.beginPath(); ctx.arc(x, y, 70 * big * pulse, 0, TAU); ctx.stroke();
  }

  function drawGlint(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = C.light; c.fill(SHAPE.glint);
    c.restore();
  }

  // ---------- rysowanie: scena ----------
  // par: jak mocno warstwa podąża za kamerą (0 – niebo stoi, 1 – woda i wszystko w niej)
  const toWorld = (par = 1) => ctx.setTransform(DPR * S, 0, 0, DPR * S, -camX * par * DPR * S, 0);
  const visible = (x, pad) => x > camX - pad && x < camX + VW + pad;
  const toUI = () => ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const gradient = (y0, y1, stops) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [o, col] of stops) g.addColorStop(o, col);
    return g;
  };

  function drawSky() {
    const th = theme;
    ctx.fillStyle = gradient(0, WATER, th.sky); ctx.fillRect(0, 0, VW, WATER + 20);
    for (const s of stars) {
      ctx.globalAlpha = 0.45 + 0.55 * Math.sin(T * 2 + s.ph);
      ctx.fillStyle = C.light; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (th.rainbow) {
      const cols = ['#E8775A', '#E3B04B', '#9FC27E', '#4FB3A9', '#79B8DD', '#8A7FD1'];
      const cx = VW * 0.5, rx = Math.min(VW * 0.33, 420), ry = WATER * 0.82;
      ctx.globalAlpha = 0.55; ctx.lineWidth = 15;
      cols.forEach((c, i) => {
        ctx.strokeStyle = c; ctx.beginPath(); ctx.ellipse(cx, WATER, rx - i * 15, ry - i * 15, 0, Math.PI, TAU); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    if (th.body) {
      const x = th.bodyX * VW, y = th.bodyY * WATER, r = th.bodyR;
      const g = ctx.createRadialGradient(x, y, 0, x, y, th.halo);
      g.addColorStop(0, `rgba(255,242,216,${th.body === 'moon' ? 0.4 : 0.75})`); g.addColorStop(1, 'rgba(255,242,216,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, th.halo, 0, TAU); ctx.fill();
      ctx.fillStyle = th.bodyColor;
      if (th.body === 'moon') {
        ctx.save(); ctx.translate(x, y); ctx.scale(r / 26, r / 26); ctx.fill(SHAPE.moon); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    }
    if (th.clouds > 0) {
      ctx.fillStyle = `rgba(255,255,255,${th.clouds})`;
      for (const c of clouds) {
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w, 7, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.5, c.y + 14, c.w * 0.62, 5, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.strokeStyle = '#3B4F5E'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of birds) {
      const f = 3 + Math.sin(T * 7 + b.ph) * 3;
      ctx.beginPath(); ctx.moveTo(b.x - 8, b.y - f); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + 8, b.y - f); ctx.stroke();
    }
  }

  function drawHills() {
    const th = theme;
    for (const h of hillLayers) {
      ctx.fillStyle = h.color;
      ctx.beginPath(); ctx.moveTo(-20, WATER + 2);
      if (h.kind === 'jagged') for (const [x, y] of h.pts) ctx.lineTo(x, y);
      else {
        ctx.lineTo(h.pts[0][0], h.pts[0][1]);
        for (let i = 1; i < h.pts.length - 1; i++) {
          const [x, y] = h.pts[i], [nx, ny] = h.pts[i + 1];
          ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
        }
      }
      ctx.lineTo(hillW + 20, WATER + 2); ctx.closePath(); ctx.fill();
    }
    if (forest.length) {
      ctx.fillStyle = th.forest; ctx.beginPath();
      for (const t of forest) { ctx.moveTo(t.x, WATER + 2); ctx.lineTo(t.x + t.w / 2, WATER - t.h); ctx.lineTo(t.x + t.w, WATER + 2); }
      ctx.fill();
    }
    if (th.house) {
      const night = th.house === 'night';
      ctx.save(); ctx.translate(VW * 0.125, WATER - 13); ctx.scale(1.3, 1.3);
      ctx.fillStyle = night ? '#2B3A4E' : '#E9DCC6'; ctx.fillRect(-12, -4, 24, 16);
      ctx.fillStyle = night ? '#101B2A' : '#7A3E22'; ctx.fill(SHAPE.houseRoof);
      if (night) {
        ctx.fillStyle = `rgba(255,210,122,${0.15 + Math.sin(T * 2) * 0.05})`; ctx.beginPath(); ctx.arc(-2.5, 3, 14, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFD27A'; ctx.fillRect(-6, 0, 7, 6);
      } else { ctx.fillStyle = '#3A2A20'; ctx.fillRect(-3, 2, 6, 10); }
      ctx.restore();
    }
    if (th.lighthouse) {
      ctx.save(); ctx.translate(VW * 0.14, WATER + 3); ctx.scale(1.25, 1.25);
      ctx.fillStyle = 'rgba(255,242,216,0.25)'; ctx.fill(SHAPE.lhBeam);
      ctx.fillStyle = '#3E4F58'; ctx.fill(SHAPE.lhRock);
      ctx.fillStyle = C.cream; ctx.fill(SHAPE.lhTower);
      ctx.fillStyle = C.coral; ctx.fill(SHAPE.lhStripes);
      ctx.fillStyle = C.light; ctx.fillRect(-9, -96, 18, 12);
      ctx.fillStyle = '#3E4F58'; ctx.fill(SHAPE.lhRoof);
      ctx.restore();
    }
  }

  // próbki fal w stałej siatce świata, żeby linia nie drgała przy przewijaniu; zwraca ostatnie x
  function wavePath(yOff = 0) {
    const x0 = Math.floor((camX - 12) / 12) * 12, x1 = camX + VW + 24;
    ctx.beginPath();
    ctx.moveTo(x0, waveY(x0) + yOff);
    let x = x0;
    while (x < x1) { x += 12; ctx.lineTo(x, waveY(x) + yOff); }
    return x;
  }
  function drawWater() {
    const th = theme;
    const xe = wavePath(); ctx.lineTo(xe, VH + 5); ctx.lineTo(camX - 24, VH + 5); ctx.closePath();
    ctx.fillStyle = gradient(WATER, VH, th.water); ctx.fill();
    // smugi światła (przypięte do ekranu, jak słońce)
    ctx.fillStyle = `rgba(255,255,255,${th.shafts})`;
    for (const [fx, w] of [[0.2, 90], [0.5, 70], [0.72, 95]]) {
      const x = camX + fx * VW + Math.sin(T * 0.3 + fx * 10) * 20;
      ctx.beginPath(); ctx.moveTo(x, WATER); ctx.lineTo(x + w, WATER); ctx.lineTo(x + w - 120, VH); ctx.lineTo(x - 140, VH); ctx.closePath(); ctx.fill();
    }
    // odbicie słońca
    if (th.reflect && th.body) {
      const x = camX + th.bodyX * VW;
      ctx.fillStyle = th.bodyColor; ctx.globalAlpha = 0.55;
      [[80, 10, 3], [56, 22, 3], [36, 36, 3], [20, 51, 2.5]].forEach(([w, dy, h], i) => {
        const wob = Math.sin(T * 1.5 + i) * 4;
        roundRect(ctx, x - w / 2 + wob, WATER + dy, w, h, h / 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const r of ripples) { ctx.beginPath(); ctx.moveTo(camX + r.x, WATER + r.y); ctx.lineTo(camX + r.x + r.w, WATER + r.y); ctx.stroke(); }
  }
  function drawSurfaceLine() {
    wavePath(); ctx.strokeStyle = 'rgba(255,242,216,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawBedBack() {
    const x0 = Math.floor((camX - 16) / 16) * 16, x1 = camX + VW + 32;
    ctx.fillStyle = theme.bed[0];
    ctx.beginPath(); ctx.moveTo(x0, VH + 5);
    let x = x0;
    for (; x <= x1; x += 16) ctx.lineTo(x, sandY(x) - 42 - Math.sin(x * 0.004 + sandPh) * 14 - Math.sin(x * 0.011) * 6);
    ctx.lineTo(x - 16, VH + 5); ctx.closePath(); ctx.fill();
  }
  function drawBedFront() {
    const th = theme, dark = th.deco === 'dark';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // korale stoją na piasku, za jego przednią krawędzią
    for (const k of bedDeco.corals) {
      if (!visible(k.x, 90)) continue;
      ctx.save(); ctx.translate(k.x, sandY(k.x) + 8); ctx.scale(k.s, Math.abs(k.s));
      ctx.strokeStyle = k.col; ctx.lineWidth = 7; ctx.stroke(SHAPE.coral);
      ctx.restore();
    }
    const x0 = Math.floor((camX - 10) / 10) * 10, x1 = camX + VW + 20;
    ctx.fillStyle = th.bed[1];
    ctx.beginPath(); ctx.moveTo(x0, VH + 5);
    let x = x0;
    for (; x <= x1; x += 10) ctx.lineTo(x, sandY(x));
    ctx.lineTo(x - 10, VH + 5); ctx.closePath(); ctx.fill();
    for (const m of bedDeco.mounds) {
      if (!visible(m.x, 80)) continue;
      ctx.fillStyle = th.deco === 'sand' ? '#CDB283' : th.bed[1];
      ctx.beginPath(); ctx.ellipse(m.x, sandY(m.x) - 2, m.rx, m.ry, 0, Math.PI, TAU); ctx.fill();
    }
    for (const d of bedDeco.small) {
      if (!visible(d.x, 30)) continue;
      const y = sandY(d.x) + d.dy;
      if (d.star) {
        ctx.save(); ctx.translate(d.x, y); ctx.rotate(d.rot); ctx.scale(1.2, 1.2);
        ctx.fillStyle = dark ? '#6E4A5E' : '#C9705E'; ctx.fill(SHAPE.star5);
        ctx.restore();
      } else {
        ctx.save(); ctx.translate(d.x, y);
        ctx.fillStyle = dark ? '#5E5A72' : '#D9B9A0'; ctx.fill(SHAPE.shell);
        ctx.strokeStyle = dark ? '#47445A' : '#A88A72'; ctx.lineWidth = 2; ctx.stroke(SHAPE.shellRidges);
        ctx.restore();
      }
    }
    if (bedDeco.chest !== null && visible(bedDeco.chest, 60)) drawChest(ctx, bedDeco.chest, sandY(bedDeco.chest) + 14);
  }
  function drawRocks() {
    if (!rocks.length) return;
    const [light, face, shade] = rockPalette(theme);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const r of rocks) {
      if (!visible(r.x, r.w)) continue;
      const p = r.pts;
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (let j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]);
      ctx.closePath();
      const g = ctx.createLinearGradient(r.x - r.w / 2, r.top, r.x + r.w / 2, r.ground);
      g.addColorStop(0, light); g.addColorStop(0.45, face); g.addColorStop(1, shade);
      ctx.fillStyle = g; ctx.fill();
      // jasna krawędź grzbietu
      ctx.strokeStyle = 'rgba(255,242,216,0.22)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p[1][0], p[1][1]);
      for (let j = 2; j < p.length - 1; j++) ctx.lineTo(p[j][0], p[j][1]);
      ctx.stroke();
      ctx.strokeStyle = shade; ctx.lineWidth = 2.5;
      for (const c of r.cracks) {
        ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]);
        for (let j = 1; j < c.length; j++) ctx.lineTo(c[j][0], c[j][1]);
        ctx.stroke();
      }
      // glony na szczycie
      ctx.strokeStyle = theme.reeds[0]; ctx.lineWidth = 4;
      for (const m of r.moss) {
        const [mx, my] = p[m.j], sw = Math.sin(T * 1.6 + m.ph) * 5;
        ctx.beginPath(); ctx.moveTo(mx, my + 2); ctx.quadraticCurveTo(mx + sw, my - m.len * 0.5, mx + sw * 1.6, my - m.len); ctx.stroke();
      }
    }
  }
  function drawSnags() {
    for (const s of snags) {
      ctx.globalAlpha = clamp((8 - s.t) / 1.5, 0, 1);
      ctx.save(); ctx.translate(s.x, s.y - 10);
      ctx.strokeStyle = 'rgba(244,235,221,0.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(-8 + Math.sin(T * 2) * 3, -20, -4 + Math.sin(T * 2) * 5, -34); ctx.stroke();
      ctx.strokeStyle = '#DCE3E6'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(SHAPE.hookJ);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function floaterPath(r) {
    const p = r.pts, n = p.length;
    ctx.beginPath();
    ctx.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
    for (let j = 0; j < n; j++) {
      const q = p[(j + 1) % n];
      ctx.quadraticCurveTo(p[j][0], p[j][1], (p[j][0] + q[0]) / 2, (p[j][1] + q[1]) / 2);
    }
    ctx.closePath();
  }
  function drawFloaters() {
    if (!floaters.length) return;
    const [light, face, shade] = rockPalette(theme);
    for (const r of floaters) {
      if (!visible(r.x, r.w)) continue;
      const wl = waveY(r.x), y = wl - r.w * 0.1 + Math.sin(T * 1.3 + r.ph) * 2;
      const ang = Math.atan((waveY(r.x + 30) - waveY(r.x - 30)) / 60) * 0.7;
      const sh = r.shake > 0 ? Math.sin(T * 70) * 4 * (r.shake / 0.3) : 0;
      ctx.save(); ctx.translate(r.x + sh, y); ctx.rotate(ang);
      floaterPath(r);
      const g = ctx.createLinearGradient(-r.w / 2, -r.w * 0.36, r.w / 2, r.w * 0.36);
      g.addColorStop(0, light); g.addColorStop(0.45, face); g.addColorStop(1, shade);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,242,216,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(-r.w * 0.06, -r.w * 0.12, r.w * 0.3, r.w * 0.16, 0, Math.PI * 1.1, Math.PI * 1.65); ctx.stroke();
      // pęknięcia przybywają z każdym uderzeniem
      const shown = Math.round((1 - r.hp / r.max) * r.cracks.length);
      ctx.strokeStyle = shade; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < shown; i++) {
        const c = r.cracks[i];
        ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]);
        for (let j = 1; j < c.length; j++) ctx.lineTo(c[j][0], c[j][1]);
        ctx.stroke();
      }
      // zanurzona część skały
      ctx.save();
      ctx.beginPath(); ctx.rect(-r.w, wl - y, r.w * 2, r.w); ctx.clip();
      ctx.globalAlpha = 0.45; ctx.fillStyle = theme.water[1][1]; floaterPath(r); ctx.fill();
      ctx.restore();
      ctx.restore();
      // piana wokół skały
      ctx.strokeStyle = 'rgba(255,242,216,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x + sh, wl + 2, r.w * 0.52 + Math.sin(T * 3 + r.ph) * 3, 4, 0, 0, TAU); ctx.stroke();
    }
  }
  // lód z przeręblami (zima); zaczęte przeręble mają pęknięcia
  function drawIce() {
    if (!level.ice) return;
    const x0 = camX - 20, x1 = camX + VW + 20, top = WATER - ICE_TOP, bot = WATER + 16;
    const seg = (a, b) => {
      if (b - a < 2) return;
      ctx.fillStyle = '#E3EFF5'; roundRect(ctx, a, top, b - a, bot - top, 6); ctx.fill();
      ctx.fillStyle = '#BCD5E1'; ctx.fillRect(a + 3, bot - 7, b - a - 6, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(a + 5, top + 2, b - a - 10, 2);
    };
    let start = x0;
    const hs = holes.filter((h) => h.x + h.w / 2 > x0 && h.x - h.w / 2 < x1).sort((a, b) => a.x - b.x);
    for (const h of hs) { seg(start, h.x - h.w / 2); start = Math.max(start, h.x + h.w / 2); }
    seg(start, x1);
    ctx.strokeStyle = '#8FB3C4'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const c of chops) {
      if (!visible(c.x, 40)) continue;
      for (let k = 0; k < c.hits * 2; k++) {
        const a = (k / (c.hits * 2)) * Math.PI + 0.2;
        ctx.beginPath(); ctx.moveTo(c.x, top + 4); ctx.lineTo(c.x + Math.cos(a) * 26, top + 4 + Math.sin(a) * 10); ctx.stroke();
      }
    }
  }
  function drawBalls() {
    for (const b of balls) {
      ctx.fillStyle = '#2A363D'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 2.5, 0, TAU); ctx.fill();
    }
  }
  function drawLeaves() {
    for (const l of leaves) {
      ctx.save(); ctx.translate(l.x, waveY(l.x) - 1); ctx.rotate(Math.sin(l.rot) * 0.5);
      ctx.fillStyle = l.c; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  // mgła i ciemność głębin: zasłona z wyciętymi światłami (łódka, haczyk, świecące stworzenia)
  function drawVeil() {
    if (!level.fog && !level.dark) return;
    if (!veil || veil.width !== canvas.width || veil.height !== canvas.height) {
      veil = document.createElement('canvas'); veil.width = canvas.width; veil.height = canvas.height;
    }
    const v = veil.getContext('2d');
    v.setTransform(1, 0, 0, 1, 0, 0); v.globalCompositeOperation = 'source-over'; v.clearRect(0, 0, veil.width, veil.height);
    v.setTransform(DPR * S, 0, 0, DPR * S, -camX * DPR * S, 0);
    const lights = [];
    if (level.fog) {
      v.fillStyle = 'rgba(214,224,229,0.93)'; v.fillRect(camX - 10, -10, VW + 20, VH + 20);
      lights.push([boat.x, boat.y - 30, 380], [hook.x, hook.y, 150]);
    } else {
      v.fillStyle = 'rgba(2,8,20,0.94)'; v.fillRect(camX - 10, WATER + 6, VW + 20, VH);
      lights.push([boat.x, WATER, 230], [hook.x, hook.y - 30, 190]);
      for (const f of fishes) if (FISH[f.type].glow && visible(f.x, 100)) lights.push([f.x, f.y, 80]);
      for (const j of jellies) if (visible(j.x, 80)) lights.push([j.x, j.base + Math.sin(T * 0.9 + j.ph) * 25, 70]);
      if (trap) lights.push([trap.x, trap.y - 30, 110]);
    }
    v.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of lights) {
      const g = v.createRadialGradient(x, y, r * 0.35, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      v.fillStyle = g; v.beginPath(); v.arc(x, y, r, 0, TAU); v.fill();
    }
    v.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(veil, 0, 0);
  }
  // deszcz, śnieg i błysk pioruna – na wierzchu, w układzie ekranu
  function drawWeatherFront() {
    if (!rain.length && !snow.length && flash <= 0) return;
    toWorld(0);
    ctx.strokeStyle = 'rgba(220,232,240,0.45)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const d of rain) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 6, d.y + 22); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const s of snow) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, flash * 1.8)})`; ctx.fillRect(0, 0, VW, VH); }
  }
  function drawReeds() {
    ctx.lineCap = 'round';
    for (const r of reeds) {
      if (!visible(r.x, 60)) continue;
      ctx.save(); ctx.translate(r.x, sandY(r.x) + 14); ctx.rotate(Math.sin(T * 1.2 + r.ph) * 0.06); ctx.scale(r.s, r.s);
      ctx.strokeStyle = r.c;
      ctx.lineWidth = 6; ctx.stroke(SHAPE.reed1);
      ctx.lineWidth = 5; ctx.stroke(SHAPE.reed2); ctx.stroke(SHAPE.reed3);
      ctx.restore();
    }
  }
  function drawSharks() {
    for (const sh of sharks) {
      if (!visible(sh.x, 160)) continue;
      const chase = sh.state === 'chase';
      ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(Math.sin(sh.t * 0.8) * 0.04); ctx.scale(sh.dir * sh.s, sh.s);
      const wag = Math.sin(sh.t * (chase ? 9 : 4)) * 0.18;
      ctx.fillStyle = '#56768D';
      ctx.save(); ctx.translate(-86, -2); ctx.rotate(wag); ctx.translate(86, 2); ctx.fill(SHAPE.sharkTail); ctx.restore();
      ctx.fill(SHAPE.sharkDorsal);
      ctx.fillStyle = '#6E8FA6'; ctx.fill(SHAPE.sharkBody);
      ctx.fillStyle = '#DCE6EA'; ctx.fill(SHAPE.sharkBelly);
      ctx.fillStyle = '#56768D';
      ctx.save(); ctx.translate(8, 14); ctx.rotate(Math.sin(sh.t * 3) * 0.12); ctx.translate(-8, -14); ctx.fill(SHAPE.sharkFin); ctx.restore();
      ctx.strokeStyle = '#56768D'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke(SHAPE.sharkGills);
      ctx.fillStyle = C.eye; ctx.beginPath(); ctx.arc(66, -8, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(67.5, -9.5, 1.5, 0, TAU); ctx.fill();
      if (chase) {
        // w pogoni rekin kłapie paszczą
        ctx.save(); ctx.translate(97, 4); ctx.scale(1, 0.6 + Math.abs(Math.sin(sh.t * 8)) * 0.6); ctx.translate(-97, -4);
        ctx.fillStyle = '#2A1E2A'; ctx.fill(SHAPE.sharkMouth);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke(SHAPE.sharkTeeth);
        ctx.restore();
      } else {
        ctx.strokeStyle = C.eye; ctx.lineWidth = 2.2; ctx.stroke(SHAPE.sharkSmile);
      }
      ctx.restore();
    }
  }
  function drawJellies() {
    for (const j of jellies) {
      if (!visible(j.x, 60)) continue;
      const y = j.base + Math.sin(T * 0.9 + j.ph) * 25, pulse = 1 + Math.sin(T * 3 + j.ph) * 0.06;
      ctx.save(); ctx.translate(j.x, y); ctx.scale(j.s * pulse, j.s / pulse);
      const g = ctx.createRadialGradient(0, -4, 0, 0, -4, 46);
      g.addColorStop(0, 'rgba(201,182,242,0.55)'); g.addColorStop(1, 'rgba(201,182,242,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -4, 46, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.75; ctx.strokeStyle = '#C9B6F2'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      [[-16, 30], [-5, 36], [6, 32], [17, 26]].forEach(([bx, len], i) => {
        ctx.beginPath(); ctx.moveTo(bx, 2);
        for (let k = 1; k <= 4; k++) ctx.lineTo(bx + Math.sin(T * 3 + k + i) * 4, 2 + (len * k) / 4);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#C9B6F2'; ctx.fill(SHAPE.jellyBell);
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(SHAPE.jellyShine);
      ctx.restore();
    }
  }
  function drawBubbles() {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.8;
    for (const b of bubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
  }
  function drawTrap() {
    if (!trap) return;
    const tr = trap;
    const top = tr.y - 88 * CAGE_S;
    ctx.strokeStyle = '#C9B79C'; ctx.lineWidth = 2;
    if (tr.state !== 'lift') {
      const by = waveY(tr.x) - (tr.state === 'caught' ? Math.abs(Math.sin(T * 10)) * 7 : 0);
      ctx.beginPath(); ctx.moveTo(tr.x, by + 8); ctx.lineTo(tr.x, top); ctx.stroke();
      drawBobber(ctx, tr.x, by, 1.4);
    } else {
      ctx.beginPath(); ctx.moveTo(tr.x, waveY(tr.x)); ctx.lineTo(tr.x, top); ctx.stroke();
    }
    if (tr.state === 'wait' && !tr.crab) {
      const g = ctx.createRadialGradient(tr.x, tr.y - 30, 0, tr.x, tr.y - 30, 90);
      g.addColorStop(0, 'rgba(255,242,216,0.25)'); g.addColorStop(1, 'rgba(255,242,216,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tr.x, tr.y - 30, 90, 0, TAU); ctx.fill();
    }
    const shake = tr.state === 'caught' ? Math.sin(T * 40) * 2 : 0;
    drawCage(ctx, tr.x + shake, tr.y, CAGE_S, tr.crab);
  }
  function drawGifts() {
    for (const g of gifts) {
      const tilt = g.state === 'float' ? Math.sin(T * 2 + g.x) * 0.12 : Math.sin(g.t * 1.3) * 0.15;
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(tilt);
      if (g.state === 'fall') {
        ctx.strokeStyle = 'rgba(244,235,221,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-32, -48); ctx.moveTo(12, -10); ctx.lineTo(32, -48); ctx.moveTo(0, -12); ctx.lineTo(0, -82); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? C.cream : C.coral;
          ctx.beginPath(); ctx.moveTo(0, -48); ctx.arc(0, -48, 34, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4); ctx.closePath(); ctx.fill();
        }
      }
      ctx.fillStyle = g.color; roundRect(ctx, -15, -12, 30, 24, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-15, -12, 30, 6);
      ctx.fillStyle = C.light; ctx.fillRect(-3, -12, 6, 24); ctx.fillRect(-15, -3, 30, 6);
      ctx.beginPath(); ctx.ellipse(-6, -15, 6, 4, -0.5, 0, TAU); ctx.ellipse(6, -15, 6, 4, 0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function drawBait() {
    if (baitThrow) {
      ctx.fillStyle = '#B8643C'; ctx.beginPath(); ctx.arc(baitThrow.x, baitThrow.y, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#E3B04B'; ctx.beginPath(); ctx.arc(baitThrow.x - 2, baitThrow.y - 3, 3, 0, TAU); ctx.fill();
    }
    const c = baitCloud;
    if (!c) return;
    const a = clamp(c.life / 2, 0, 1);
    const g = ctx.createRadialGradient(c.x, c.y, 5, c.x, c.y, 95);
    g.addColorStop(0, `rgba(227,176,75,${0.55 * a})`); g.addColorStop(1, 'rgba(227,176,75,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, 95, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(142,74,42,${0.8 * a})`;
    for (let i = 0; i < 20; i++) {
      const ang = i * 2.39 + T * 0.5, rr = 10 + ((i * 37) % 65);
      ctx.beginPath(); ctx.arc(c.x + Math.cos(ang) * rr, c.y + Math.sin(ang) * rr * 0.6, 2.2, 0, TAU); ctx.fill();
    }
  }

  function drawParticles(list) {
    for (const p of list) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'drop') {
        ctx.fillStyle = 'rgba(255,242,216,0.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      } else if (p.kind === 'puff' || p.kind === 'crumb') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      } else if (p.kind === 'spark') {
        drawGlint(ctx, p.x, p.y, p.r * (0.5 + a * 0.5));
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = 'rgba(255,242,216,0.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, waveY(p.x) + 2, p.r * 1.8, p.r * 0.45, 0, 0, TAU); ctx.stroke();
      } else if (p.kind === 'text') {
        ctx.font = font(p.big ? 30 : 22, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(19,37,47,0.35)'; ctx.fillText(p.text, p.x, p.y + 2);
        ctx.fillStyle = p.big ? C.ochre : C.light; ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === 'chunk') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(-p.r, -p.r * 0.5); ctx.lineTo(p.r * 0.3, -p.r * 0.8); ctx.lineTo(p.r, p.r * 0.4); ctx.lineTo(-p.r * 0.4, p.r * 0.7); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 1.7), 1);
        ctx.fillStyle = p.color; roundRect(ctx, -2, -8, 4, 16, 2); ctx.fill(); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- interfejs (szkło na tle sceny) ----------
  const uiScale = () => clamp(Math.min(CW, CH) / 720, 0.8, 1.3);
  function layout() {
    const u = uiScale(), portrait = CH > CW * 1.05;
    const m = 24 * u, mt = 22 * u;
    const arrow = 88 * u, castD = 112 * u, cageD = 88 * u, itemD = 60 * u, top = 64 * u;
    const L = { u, portrait, m, top: { y: mt, h: top } };
    L.left = { x: m + arrow / 2, y: CH - m - arrow / 2, w: arrow, r: arrow / 2 };
    L.right = { x: m + arrow * 1.5 + 14 * u, y: L.left.y, w: arrow, r: arrow / 2 };
    L.cast = { x: CW - 28 * u - castD / 2, y: CH - m - castD / 2, r: castD / 2 };
    L.cage = portrait
      ? { x: L.cast.x, y: L.cast.y - castD / 2 - 12 * u - cageD / 2, r: cageD / 2 }
      : { x: L.cast.x - castD / 2 - 18 * u - cageD / 2, y: CH - m - cageD / 2, r: cageD / 2 };
    // bonusy: w pionie kolumna nad klatką, w poziomie rząd na dole obok klatki
    L.items = {};
    if (portrait) {
      let y = L.cage.y - L.cage.r - 14 * u - itemD / 2;
      for (const k of ITEM_KEYS) { L.items[k] = { x: L.cage.x, y, r: itemD / 2 }; y -= itemD + 12 * u; }
    } else {
      let x = L.cage.x - L.cage.r - 16 * u - itemD / 2;
      for (const k of ITEM_KEYS) { L.items[k] = { x, y: CH - m - itemD / 2, r: itemD / 2 }; x -= itemD + 12 * u; }
    }
    L.sound = { x: CW - m - top / 2, y: mt + top / 2, w: top, r: top / 2 };
    L.home = { x: L.sound.x - top - 10 * u, y: L.sound.y, w: top, r: top / 2 };
    // armatka (tryb normalny): w poziomie obok strzałek, w pionie nad nimi
    const cannonD = 76 * u;
    L.cannon = portrait
      ? { x: L.right.x, y: L.left.y - arrow / 2 - 14 * u - cannonD / 2, r: cannonD / 2 }
      : { x: L.right.x + arrow / 2 + 18 * u + cannonD / 2, y: CH - m - cannonD / 2, r: cannonD / 2 };
    return L;
  }
  const hit = (btn, x, y) => Math.hypot(x - btn.x, y - btn.y) <= btn.r * 1.15;

  function glassBox(x, y, w, h, r, u, alpha = 0.38, line = 'rgba(255,255,255,0.35)') {
    ctx.fillStyle = `rgba(12,34,46,${alpha})`; roundRect(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 1.5 * u; ctx.stroke();
  }
  function icon(paths, cx, cy, size, color, lw) {
    const s = size / 24;
    ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = lw;
    for (const p of paths) ctx.stroke(p);
    ctx.restore();
  }
  function iconFill(path, cx, cy, size, color) {
    const s = size / 24;
    ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(s, s);
    ctx.fillStyle = color; ctx.fill(path);
    ctx.restore();
  }
  function solidCircle(b, color, pressed, u) {
    const r = b.r * (pressed ? 0.94 : 1);
    ctx.save();
    ctx.shadowColor = 'rgba(10,30,42,0.35)'; ctx.shadowBlur = (pressed ? 8 : 26) * u * DPR; ctx.shadowOffsetY = (pressed ? 3 : 10) * u * DPR;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,242,216,0.6)'; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.stroke();
    return r;
  }
  function hintRings(b, u) {
    const ph = (T * 0.9) % 1;
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = `rgba(255,242,216,${0.6 * (1 - ph)})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + (6 + ph * 22) * u, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,242,216,0.3)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 14 * u, 0, TAU); ctx.stroke();
  }
  function textShadowed(str, x, y, px, color, weight = 600, shadow = 'rgba(12,34,46,0.25)') {
    ctx.font = font(px, weight); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = shadow; ctx.fillText(str, x, y + px * 0.045);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }

  // w trybie normalnym odznaka pokazuje też punkty (perła i liczba)
  const scoreSegW = (u) => { ctx.font = font(24 * u, 600); return (16 + 18 + 8) * u + ctx.measureText(String(score)).width; };
  function badgeWidth(u) {
    ctx.font = font(30 * u, 500);
    return (12 + 34 + 10 + 18) * u + ctx.measureText(String(levelIndex + 1)).width + (level.width && state !== 'title' ? scoreSegW(u) : 0);
  }
  function counterLayout() {
    const Ly = layout(), u = Ly.u;
    const fw = 64 * u, fh = 38 * u, cw = 56 * u, ch = 40 * u, gap = 10 * u, padX = 20 * u, padY = 10 * u, div = 1.5 * u;
    const nF = level.goal, nC = level.crabGoal;
    const w = padX * 2 + nF * fw + (nF - 1) * gap + gap * 2 + div + nC * cw + (nC - 1) * gap;
    const h = padY * 2 + Math.max(fh, ch);
    const side = Ly.m + Math.max(badgeWidth(u), Ly.sound.w * 2 + 10 * u) + 16 * u;
    let y = Ly.top.y + (Ly.top.h - h) / 2, sc = 1;
    if (w > CW - 2 * side) {
      y = Ly.top.y + Ly.top.h + 12 * u;
      sc = Math.min(1, (CW - 2 * Ly.m) / w);
    }
    return { x: CW / 2 - (w * sc) / 2, y, w: w * sc, h: h * sc, sc, u, fw: fw * sc, cw: cw * sc, gap: gap * sc, padX: padX * sc, div: div * sc };
  }
  function slotCenter(i) {
    const L = counterLayout();
    return { x: L.x + L.padX + i * (L.fw + L.gap) + L.fw / 2, y: L.y + L.h / 2, w: L.fw };
  }
  function dividerX(L) { return L.x + L.padX + level.goal * (L.fw + L.gap) - L.gap + L.gap; }
  function crabSlotCenter(i) {
    const L = counterLayout();
    const x0 = dividerX(L) + L.div + L.gap;
    return { x: x0 + i * (L.cw + L.gap) + L.cw / 2, y: L.y + L.h / 2, w: L.cw };
  }

  function drawHUD() {
    const Ly = layout(), u = Ly.u;
    // numer poziomu
    const bw = badgeWidth(u);
    // w trybie normalnym odznaka poziomu ma koralową ramkę
    glassBox(Ly.m, Ly.top.y, bw, Ly.top.h, 20 * u, u, 0.38, mode === 'normal' ? 'rgba(232,119,90,0.95)' : 'rgba(255,255,255,0.35)');
    const cy = Ly.top.y + Ly.top.h / 2, ix = Ly.m + (12 + 17) * u;
    icon([SHAPE.iLevelWaves], ix, cy, 34 * u, '#fff', 1.8);
    iconFill(SHAPE.iLevelPeak, ix, cy, 34 * u, '#fff');
    ctx.font = font(30 * u, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(String(levelIndex + 1), Ly.m + (12 + 34 + 10) * u, cy + 1 * u);
    if (level.width) {
      const sx = Ly.m + bw - scoreSegW(u);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(sx, cy - 16 * u, 1.5 * u, 32 * u);
      const px = sx + (16 + 9) * u;
      ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(px, cy, 9 * u, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - 3 * u, cy - 3 * u, 3 * u, 0, TAU); ctx.fill();
      ctx.font = font(24 * u, 600); ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText(String(score), px + 17 * u, cy + 1 * u);
    }
    // licznik ryb i krabów
    const L = counterLayout();
    const allDone = caught >= level.goal && crabsCaught >= level.crabGoal;
    if (allDone) { ctx.save(); ctx.shadowColor = 'rgba(255,242,216,0.45)'; ctx.shadowBlur = 24 * DPR; }
    glassBox(L.x, L.y, L.w, L.h, 22 * u * L.sc, u, allDone ? 0.4 : 0.32, allDone ? 'rgba(255,242,216,0.8)' : 'rgba(255,255,255,0.3)');
    if (allDone) ctx.restore();
    for (let i = 0; i < level.goal; i++) {
      const c = slotCenter(i);
      if (caughtTypes[i]) drawFishIcon(ctx, caughtTypes[i], c.x, c.y, c.w * (1 + Math.sin((slotPop[i] || 0) * Math.PI) * 0.5));
      else drawFishSil(ctx, c.x, c.y, c.w, 1.8 * u);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(dividerX(L), L.y + L.h / 2 - 16 * u * L.sc, L.div, 32 * u * L.sc);
    for (let i = 0; i < level.crabGoal; i++) {
      const c = crabSlotCenter(i);
      if (crabTypes[i]) drawCrabIcon(ctx, crabTypes[i], c.x, c.y, c.w * (1 + Math.sin((crabPop[i] || 0) * Math.PI) * 0.5), T);
      else drawCrabSil(ctx, c.x, c.y, c.w, 1.8 * u);
    }
    drawMinimap(L);
    drawSoundBtn();
    drawHomeBtn();
  }
  // pasek pod licznikiem: cały świat, widoczny fragment, łódka, ryby, kraby, skały i prezenty
  function drawMinimap(L) {
    if (WW <= VW + 1) return;
    const u = L.u, Ly = layout();
    const w = Math.min(420 * u, CW - 2 * Ly.m), h = 18 * u;
    const x = CW / 2 - w / 2, y = L.y + L.h + 10 * u;
    glassBox(x, y, w, h, h / 2, u, 0.3);
    const px = (wx) => x + h / 2 + clamp(wx / WW, 0, 1) * (w - h);
    ctx.fillStyle = 'rgba(255,242,216,0.16)';
    roundRect(ctx, px(camX), y + 2 * u, (VW / WW) * (w - h), h - 4 * u, (h - 4 * u) / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,242,216,0.6)';
    for (const f of fishes) { ctx.beginPath(); ctx.arc(px(f.x), y + h * 0.38, 1.6 * u, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#E3936F';
    for (const c of crabs) if (c.state === 'walk') { ctx.beginPath(); ctx.arc(px(c.x), y + h * 0.72, 1.6 * u, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#6E8FA6'; ctx.strokeStyle = 'rgba(255,242,216,0.7)'; ctx.lineWidth = 1 * u;
    for (const sh of sharks) {
      if (sh.x < 0 || sh.x > WW) continue;
      const sx = px(sh.x), sy = y + h * 0.55;
      ctx.beginPath(); ctx.moveTo(sx + sh.dir * 5 * u, sy); ctx.lineTo(sx - sh.dir * 5 * u, sy - 3.5 * u); ctx.lineTo(sx - sh.dir * 5 * u, sy + 3.5 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#A9B3B9';
    for (const r of floaters) { roundRect(ctx, px(r.x) - 3.5 * u, y + h / 2 - 4 * u, 7 * u, 8 * u, 2 * u); ctx.fill(); }
    ctx.fillStyle = C.ochre;
    for (const g of gifts) { ctx.beginPath(); ctx.arc(px(g.x), y + h / 2, 3 * u, 0, TAU); ctx.fill(); }
    ctx.fillStyle = C.coral; ctx.strokeStyle = C.light; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.arc(px(boat.x), y + h / 2, 5 * u, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function drawHomeBtn() {
    const Ly = layout(), u = Ly.u, B = Ly.home;
    glassBox(B.x - B.w / 2, B.y - B.w / 2, B.w, B.w, 20 * u, u);
    icon([SHAPE.iHome], B.x, B.y, 30 * u, '#fff', 1.8);
  }
  function drawSoundBtn() {
    const Ly = layout(), u = Ly.u, B = Ly.sound;
    glassBox(B.x - B.w / 2, B.y - B.w / 2, B.w, B.w, 20 * u, u);
    if (Sound.on) icon([SHAPE.iSpeaker, SHAPE.iWaves], B.x, B.y, 30 * u, '#fff', 1.8);
    else {
      ctx.globalAlpha = 0.6; icon([SHAPE.iSpeaker], B.x, B.y, 30 * u, '#fff', 1.8); ctx.globalAlpha = 1;
      icon([SHAPE.iMute], B.x, B.y, 30 * u, '#fff', 1.8);
    }
  }

  function itemActive(k) {
    if (k === 'bait') return baitCloud ? baitCloud.life / baitCloud.max : baitThrow ? 1 : 0;
    if (k === 'worm') return (wormCasts + (hook.magic ? 1 : 0)) / WORM_CASTS;
    return Math.max(0, turboT) / TURBO_TIME;
  }
  function drawItemIcon(k, x, y, size) {
    if (k === 'bait') icon([SHAPE.iBucket, SHAPE.iMound], x, y, size, '#fff', 1.8);
    else if (k === 'worm') { icon([SHAPE.iWorm], x, y, size, '#F2B8CB', 2.2); icon([SHAPE.iSpark], x, y, size, C.light, 1.6); }
    else icon([SHAPE.iBolt], x, y, size, '#fff', 1.8);
  }
  function drawControls() {
    const Ly = layout(), u = Ly.u;
    const held = new Set(pointers.values());
    if (usedPointer) {
      for (const side of ['left', 'right']) {
        const b = Ly[side], p = held.has(side) || keys[side];
        glassBox(b.x - b.w / 2, b.y - b.w / 2, b.w, b.w, 26 * u, u, p ? 0.55 : 0.38);
        icon([side === 'left' ? SHAPE.iLeft : SHAPE.iRight], b.x, b.y, 40 * u, '#fff', 2.4);
      }
    }
    // bonusy
    for (const k of ITEM_KEYS) {
      const b = Ly.items[k], n = inv[k], act = itemActive(k);
      const r = b.r * (1 + Math.sin(itemPop[k] * Math.PI) * 0.3);
      ctx.globalAlpha = n > 0 || act > 0 ? 1 : 0.45;
      glassBox(b.x - r, b.y - r, r * 2, r * 2, r, u);
      drawItemIcon(k, b.x, b.y, r * 1.05);
      ctx.globalAlpha = 1;
      if (act > 0) {
        ctx.strokeStyle = C.light; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(b.x, b.y, r + 5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * act); ctx.stroke();
      }
      if (n > 0) {
        const bx = b.x - r * 0.72, by = b.y - r * 0.72, br = 11 * u;
        ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,242,216,0.8)'; ctx.lineWidth = 1.5 * u; ctx.stroke();
        ctx.font = font(14 * u, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
        ctx.fillText(String(n), bx, by + 0.5 * u);
      }
    }
    // klatka na kraby
    const fishAllDone = fishDone();
    if (!trap && !crabsDone() && fishAllDone) hintRings(Ly.cage, u);
    ctx.globalAlpha = trap || crabsDone() ? 0.55 : 1;
    const rc = solidCircle(Ly.cage, press.cage > 0 ? C.ochreDown : C.ochre, press.cage > 0, u);
    icon([SHAPE.iCageRoof], Ly.cage.x, Ly.cage.y, rc, C.ink, 1.8);
    icon([SHAPE.iCageBox], Ly.cage.x, Ly.cage.y, rc, C.ink, 2);
    icon([SHAPE.iCageBars], Ly.cage.x, Ly.cage.y, rc, C.ink, 1.4);
    ctx.globalAlpha = 1;
    if (trap) {
      const frac = trap.state === 'wait' ? 1 - trap.t / CAGE_WAIT : 1;
      ctx.strokeStyle = C.light; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(Ly.cage.x, Ly.cage.y, Ly.cage.r + 5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1)); ctx.stroke();
    }
    // wędka
    // armatka (tryb normalny)
    if (hasCannon()) {
      const B = Ly.cannon, ready = cannonCd <= 0;
      ctx.globalAlpha = ready ? 1 : 0.55;
      glassBox(B.x - B.r, B.y - B.r, B.r * 2, B.r * 2, B.r, u, press.cannon > 0 ? 0.55 : 0.38);
      icon([SHAPE.iCannon], B.x, B.y, B.r * 1.1, '#fff', 2);
      ctx.globalAlpha = 1;
      if (!ready) {
        ctx.strokeStyle = C.light; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(B.x, B.y, B.r + 5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(1 - cannonCd / CANNON_CD, 0, 1)); ctx.stroke();
      }
    }
    const fighting = hook.state === 'fight';
    const castable = (hook.state === 'idle' && !fishAllDone) || fighting;
    if ((castable && idleTime > 8) || fighting) hintRings(Ly.cast, u);
    ctx.globalAlpha = castable ? 1 : 0.55;
    const r = solidCircle(Ly.cast, press.cast > 0 ? C.coralDown : C.coral, press.cast > 0, u);
    icon([SHAPE.iHook, SHAPE.iHookEye], Ly.cast.x, Ly.cast.y, r * 0.86, '#fff', 2.2);
    ctx.globalAlpha = 1;
    // po zerwaniu haczyka pierścień pokazuje, ile jeszcze rybak go wiąże
    if (hook.state === 'tie') {
      ctx.strokeStyle = C.light; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(Ly.cast.x, Ly.cast.y, Ly.cast.r + 5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(1 - hook.tieT / hook.tieMax, 0, 1)); ctx.stroke();
    }
    // holowanie: zewnętrzny pierścień to napięcie żyłki (zielony → czerwony), wewnętrzny to postęp
    if (fighting) {
      const fg = hook.fight, R = Ly.cast.r;
      const col = fg.ten < 0.5 ? C.green : fg.ten < 0.8 ? C.ochre : C.coralDown;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(12,34,46,0.45)'; ctx.lineWidth = 9 * u;
      ctx.beginPath(); ctx.arc(Ly.cast.x, Ly.cast.y, R + 14 * u, 0, TAU); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = (fg.ten > 0.8 ? 9 + Math.sin(T * 30) * 2 : 9) * u;
      ctx.beginPath(); ctx.arc(Ly.cast.x, Ly.cast.y, R + 14 * u, -Math.PI / 2, -Math.PI / 2 + TAU * fg.ten); ctx.stroke();
      ctx.strokeStyle = C.light; ctx.lineWidth = 4 * u;
      ctx.beginPath(); ctx.arc(Ly.cast.x, Ly.cast.y, R - 8 * u, -Math.PI / 2, -Math.PI / 2 + TAU * fg.p); ctx.stroke();
      textShadowed(fg.surge > 0.3 ? 'Popuść!' : 'Trzymaj!', Ly.cast.x, Ly.cast.y - R - 36 * u, 22 * u, fg.surge > 0.3 ? '#FFD2C4' : C.light, 700);
    }
  }
  function drawToast() {
    if (!toast) return;
    const u = uiScale(), a = clamp(Math.min(toast.t, 5.5 - toast.t) * 3, 0, 1);
    const L = counterLayout();
    ctx.font = font(18 * u, 500);
    const w = Math.min(ctx.measureText(toast.text).width + 36 * u, CW - 32), h = 40 * u;
    const y = L.y + L.h + (WW > VW + 1 ? 40 : 14) * u;
    ctx.globalAlpha = a;
    glassBox(CW / 2 - w / 2, y, w, h, h / 2, u, 0.5, 'rgba(255,242,216,0.6)');
    ctx.fillStyle = C.light; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(toast.text, CW / 2, y + h / 2 + 1 * u, w - 20 * u);
    ctx.globalAlpha = 1;
  }

  function drawFlyers() {
    for (const fl of flyers) {
      const t = clamp(fl.t, 0, 1), e = t * t * (3 - 2 * t);
      const c = fl.kind === 'fish' ? slotCenter(fl.slot) : crabSlotCenter(fl.slot);
      const x = lerp(fl.sx, c.x, e), y = lerp(fl.sy, c.y, e) - Math.sin(Math.PI * t) * 90;
      const bump = 1 + Math.sin(Math.PI * t) * 0.5;
      if (fl.kind === 'fish') drawFish(ctx, fl.type, x, y, lerp(fl.s0, (48 * c.w) / 132, e) * bump, 1, T * 2, Math.sin(t * TAU * 2) * 0.3 - (1 - e) * 0.6);
      else drawCrab(ctx, fl.type, x, y, lerp(fl.s0, c.w / 132, e) * bump, T, true);
    }
    const Ly = layout();
    for (const f of itemFlyers) {
      if (f.t < 0) continue;
      const t = clamp(f.t, 0, 1), e = t * t * (3 - 2 * t), b = Ly.items[f.item];
      const x = lerp(f.sx, b.x, e), y = lerp(f.sy, b.y, e) - Math.sin(Math.PI * t) * 80;
      const r = b.r * (1 + Math.sin(Math.PI * t) * 0.7);
      glassBox(x - r, y - r, r * 2, r * 2, r, Ly.u, 0.5, 'rgba(255,242,216,0.8)');
      drawItemIcon(f.item, x, y, r * 1.05);
    }
  }

  function drawBanner() {
    if (bannerT <= 0 || state !== 'play') return;
    const a = clamp(Math.min(bannerT, 2.6 - bannerT) * 3, 0, 1);
    const u = uiScale();
    ctx.font = font(26 * u, 500);
    const w = (24 + 44 + 14 + 24) * u + ctx.measureText(level.name).width, h = 68 * u;
    const x = CW / 2 - w / 2, y = CH * 0.4 - h / 2 + (1 - a) * 12 * u;
    ctx.globalAlpha = a;
    glassBox(x, y, w, h, 22 * u, u, 0.42, 'rgba(255,242,216,0.6)');
    const cx = x + (24 + 22) * u, cy = y + h / 2;
    ctx.fillStyle = C.light; ctx.beginPath(); ctx.arc(cx, cy, 22 * u, 0, TAU); ctx.fill();
    ctx.font = font(24 * u, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.ink;
    ctx.fillText(String(levelIndex + 1), cx, cy + 1 * u);
    ctx.font = font(26 * u, 500); ctx.textAlign = 'left'; ctx.fillStyle = C.light;
    ctx.fillText(level.name, cx + (22 + 14) * u, cy + 1 * u);
    ctx.globalAlpha = 1;
  }

  function greenButton(x, y, r, u, ring = true) {
    if (ring) { ctx.fillStyle = 'rgba(255,242,216,0.16)'; ctx.beginPath(); ctx.arc(x, y, r + 13 * u, 0, TAU); ctx.fill(); }
    solidCircle({ x, y, r }, C.green, false, u);
  }

  function drawTitle() {
    const u = uiScale();
    const px = clamp(Math.min(CW * 0.2, CH * 0.21), 64, 170);
    ctx.font = font(px, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const letters = [...'Rybki'], rot = [-4, 3, -2, 4, -3], dy = [0, -18, 6, -12, 2];
    const widths = letters.map((ch) => ctx.measureText(ch).width);
    const gap = px * 0.04, total = widths.reduce((a, b) => a + b, 0) + gap * 4;
    let x = CW / 2 - total / 2;
    const base = Math.max(px * 0.6 + 20 * u, CH * 0.2);
    letters.forEach((ch, i) => {
      const y = base + (dy[i] * px) / 150 + Math.sin(T * 2.2 + i * 0.8) * px * 0.025;
      ctx.save(); ctx.translate(x + widths[i] / 2, y); ctx.rotate(deg(rot[i]));
      ctx.fillStyle = 'rgba(19,37,47,0.18)'; ctx.fillText(ch, 0, px * 0.04);
      ctx.fillStyle = C.light; ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += widths[i] + gap;
    });
    // dwa przyciski: łatwy (zielony, jedna gwiazdka) i normalny (koralowy, dwie gwiazdki)
    const G = titleButtons();
    for (const m of ['easy', 'normal']) {
      const b = G[m], r = b.r * (m === titleSel ? 1 + Math.sin(T * 3) * 0.03 : 1);
      if (m === titleSel) { ctx.fillStyle = 'rgba(255,242,216,0.16)'; ctx.beginPath(); ctx.arc(b.x, b.y, r + 13 * u, 0, TAU); ctx.fill(); }
      solidCircle({ x: b.x, y: b.y, r }, m === 'easy' ? C.green : C.coral, false, u);
      iconFill(SHAPE.iPlay, b.x, b.y, r * 0.85, '#fff');
      const nStars = m === 'easy' ? 1 : 2, ss = G.lab / 26;
      for (let i = 0; i < nStars; i++) {
        ctx.save(); ctx.translate(b.x + (i - (nStars - 1) / 2) * 30 * ss, b.y - r - 24 * ss); ctx.scale(ss, ss);
        ctx.fillStyle = C.ochre; ctx.fill(SHAPE.star5);
        ctx.restore();
      }
      textShadowed(m === 'easy' ? 'Łatwy' : 'Normalny', b.x, b.y + r + G.lab * 0.95, G.lab, C.light, 600);
      ctx.font = font(G.lab * 0.62, 500); ctx.fillStyle = 'rgba(255,242,216,0.85)';
      const sub = `poziom ${savedLevel(m) + 1} z ${MODES[m].length}` + (m === 'normal' ? ` · ★ ${totalStars()}/${MODES[m].length * 3}` : '');
      ctx.fillText(sub, b.x, b.y + r + G.lab * 1.95);
    }
    const hp = G.hp;
    const hint = isTouch ? (TAP_TO_MOVE ? 'Dotknij wody, żeby łowić ryby, a dna, żeby opuścić klatkę na kraby' : 'Strzałki – płyń, koralowy przycisk – wędka, żółty – klatka na kraby')
      : '← →  płyń     ↓ lub spacja  zarzuć wędkę     C  klatka na kraby     1 2 3  bonusy';
    ctx.font = font(hp, 500);
    const hw = Math.min(ctx.measureText(hint).width + hp * 2.4, CW - 20);
    const hy = G.by + G.r + G.lab * 2.6;
    glassBox(CW / 2 - hw / 2, hy, hw, hp * 2.4, hp * 1.2, u, 0.38);
    ctx.fillStyle = C.light; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(hint, CW / 2, hy + hp * 1.2, hw - hp);
    drawSoundBtn();
  }
  function titleButtons() {
    const u = uiScale();
    const r = clamp(Math.min(CW * 0.12, CH * 0.1), 44, 74);
    const hp = clamp(Math.min(CW, CH) * 0.03, 14, 20);
    const lab = clamp(r * 0.42, 18, 30);
    const by = Math.min(CH * 0.62, CH - r - lab * 2.6 - hp * 3.2);
    const dx = clamp(CW * 0.17, r * 1.75, r * 2.6 + 30 * u);
    return { r, hp, lab, by, easy: { x: CW / 2 - dx, y: by, r }, normal: { x: CW / 2 + dx, y: by, r } };
  }

  function nextBtnGeom() {
    const u = uiScale();
    if (levelIndex === LEVELS.length - 1) {
      const v = Math.min(u, (CH - 20) / 680, CW / 760);
      return { v, x: CW / 2, y: CH - 24 * v - 64 * v, r: 64 * v };
    }
    // w trybie normalnym pod złowionymi zwierzakami jest jeszcze wiersz z punktami, czasem i haczykami
    const extra = level.width ? 40 : 0;
    const v = Math.min(u, (CH - 30) / (500 + extra), CW / 760);
    const top = Math.max(16 * v, (CH - (488 + extra) * v) / 2 - 30 * v);
    return { v, top, extra, x: CW / 2, y: top + (92 + 18 + 112 + 18 + 76 + extra + 32 + 68) * v, r: 68 * v };
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function drawLevelDone() {
    const a = clamp(doneT * 3, 0, 1);
    const G = nextBtnGeom(), v = G.v;
    if (levelIndex === LEVELS.length - 1) { drawMaster(a, G); return; }
    const g = ctx.createRadialGradient(CW / 2, CH * 0.45, 0, CW / 2, CH * 0.45, Math.max(CW, CH) * 0.6);
    g.addColorStop(0, `rgba(12,34,46,${0.55 * a})`); g.addColorStop(1, `rgba(12,34,46,${0.2 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    const sc = easeOutBack(clamp(doneT * 2.5, 0, 1));
    ctx.save(); ctx.translate(CW / 2, CH / 2); ctx.scale(sc, sc); ctx.translate(-CW / 2, -CH / 2);
    let y = G.top;
    textShadowed('Brawo!', CW / 2, y + 46 * v + Math.sin(T * 4) * 2 * v, 92 * v, C.light);
    y += (92 + 18) * v;
    // gwiazdki
    const sy = y + 62 * v;
    const halo = ctx.createRadialGradient(CW / 2, sy - 6 * v, 0, CW / 2, sy - 6 * v, 70 * v);
    halo.addColorStop(0, 'rgba(255,242,216,0.45)'); halo.addColorStop(1, 'rgba(255,242,216,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CW / 2, sy - 6 * v, 70 * v, 0, TAU); ctx.fill();
    [[-112, 12, -12, 0.8, '#E3B04B'], [0, -6, 0, 1.1, '#F2C14E'], [112, 12, 12, 0.8, '#E3B04B']].forEach(([dx, dy, rot, s, col], i) => {
      const st = clamp((doneT - 0.35 - i * 0.25) * 4, 0, 1);
      if (st <= 0) return;
      const k = s * v * easeOutBack(st), earned = i < earnedStars;
      ctx.save(); ctx.translate(CW / 2 + dx * v, sy + dy * v); ctx.rotate(deg(rot)); ctx.scale(k, k);
      ctx.fillStyle = earned ? col : 'rgba(255,242,216,0.14)'; ctx.strokeStyle = earned ? col : 'rgba(255,242,216,0.5)';
      ctx.lineWidth = earned ? 8 : 4; ctx.lineJoin = 'round';
      ctx.fill(SHAPE.bigStar); ctx.stroke(SHAPE.bigStar);
      ctx.restore();
    });
    drawGlint(ctx, CW / 2 - 60 * v, sy - 44 * v, 0.9 * v);
    drawGlint(ctx, CW / 2 + 70 * v, sy - 40 * v, 0.7 * v);
    y += (112 + 18) * v;
    // złowione ryby i kraby
    const nF = caughtTypes.length, nC = crabTypes.length;
    // przy wielu zwierzakach panel zmniejsza się, żeby zmieścić się na ekranie
    const full = 52 + nF * 80 + (nF - 1) * 14 + (nC ? 28 + 1.5 + nC * 70 + (nC - 1) * 14 : 0);
    const pk = Math.min(1, (CW - 32) / (full * v));
    const fw = 80 * v * pk, cw = 70 * v * pk, gap = 14 * v * pk;
    const pw = 26 * v * pk * 2 + nF * fw + (nF - 1) * gap + (nC ? gap * 2 + 1.5 * v + nC * cw + (nC - 1) * gap : 0);
    const ph = 76 * v;
    ctx.save(); ctx.shadowColor = 'rgba(255,242,216,0.35)'; ctx.shadowBlur = 36 * v * DPR;
    glassBox(CW / 2 - pw / 2, y, pw, ph, 26 * v, v, 0.4, 'rgba(255,242,216,0.8)');
    ctx.restore();
    let x = CW / 2 - pw / 2 + 26 * v * pk;
    for (let i = 0; i < nF; i++) { drawFishIcon(ctx, caughtTypes[i], x + fw / 2, y + ph / 2 + Math.sin(T * 3 + i) * 2 * v, fw); x += fw + gap; }
    if (nC) {
      ctx.fillStyle = 'rgba(255,242,216,0.5)'; ctx.fillRect(x, y + ph / 2 - 20 * v, 1.5 * v, 40 * v);
      x += 1.5 * v + gap;
      for (let i = 0; i < nC; i++) { drawCrabIcon(ctx, crabTypes[i], x + cw / 2, y + ph / 2, cw, T + i); x += cw + gap; }
    }
    if (level.width) {
      // podsumowanie: każdy warunek gwiazdki jaśniejszy, gdy spełniony
      const [, okHooks, okTime] = starChecks();
      const parts = [
        [`${score} pkt`, true],
        [`czas ${mmss(levelTime)} / ${mmss(level.par)}`, okTime],
        [`zerwane haczyki ${hooksLost} / 2`, okHooks],
      ];
      ctx.font = font(19 * v, 600);
      const sep = 26 * v, widths = parts.map(([t]) => ctx.measureText(t).width);
      const tw = widths.reduce((s, w) => s + w, 0) + sep * (parts.length - 1);
      const kk = Math.min(1, (CW - 32) / tw);
      ctx.font = font(19 * v * kk, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      let tx = CW / 2 - (tw * kk) / 2;
      const ty = y + ph + 26 * v;
      parts.forEach(([t, ok], i) => {
        ctx.fillStyle = ok ? C.light : 'rgba(255,242,216,0.5)';
        ctx.fillText(t, tx, ty);
        tx += widths[i] * kk + sep * kk;
      });
    }
    ctx.restore();
    if (doneT > 1) {
      const r = G.r * (1 + Math.sin(T * 5) * 0.04);
      greenButton(G.x, G.y, r, v);
      iconFill(SHAPE.iPlay, G.x, G.y, r * 0.82, '#fff');
    }
  }
  function drawMaster(a, G) {
    const v = G.v;
    ctx.globalAlpha = a;
    const title = 'Mistrz wędkarstwa!';
    let px = 72 * v;
    ctx.font = font(px, 600);
    px *= Math.min(1, (CW - 30) / ctx.measureText(title).width);
    ctx.font = font(px, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.ink;
    ctx.fillText(title, CW / 2, 40 * v + px / 2);
    // puchar
    const ty = Math.min(CH * 0.46, G.y - G.r - 190 * v);
    const s = 1.5 * v * easeOutBack(clamp(doneT * 2, 0, 1));
    ctx.save(); ctx.translate(CW / 2, ty); ctx.scale(s, s);
    const g = ctx.createRadialGradient(0, -20, 0, 0, -20, 120);
    g.addColorStop(0, 'rgba(255,242,216,0.8)'); g.addColorStop(1, 'rgba(255,242,216,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -20, 120, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#C58F1E'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke(SHAPE.trophyHandles);
    ctx.fillStyle = '#E3B04B'; ctx.fill(SHAPE.trophyCup);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill(SHAPE.trophyShine);
    ctx.fillStyle = '#F2C14E'; roundRect(ctx, -46, -70, 92, 8, 4); ctx.fill();
    ctx.fillStyle = '#C58F1E'; ctx.fillRect(-7, 8, 14, 24);
    ctx.fillStyle = '#7A3E22'; roundRect(ctx, -36, 30, 72, 18, 4); ctx.fill();
    ctx.fillStyle = '#E3B04B'; roundRect(ctx, -22, 35, 44, 7, 2); ctx.fill();
    ctx.save(); ctx.translate(0, -34); ctx.scale(0.32, 0.32);
    ctx.fillStyle = '#F2C14E'; ctx.fill(SHAPE.fishTail); ctx.fill(SHAPE.fishFin);
    ctx.fillStyle = C.light; ctx.fill(SHAPE.fishBody);
    ctx.fillStyle = C.eye; ctx.beginPath(); ctx.arc(31, -6, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    // medale za 5 poziomów
    const my = G.y - G.r - 64 * v;
    for (let i = 0; i < 5; i++) {
      const st = clamp((doneT - 0.4 - i * 0.15) * 4, 0, 1);
      if (st <= 0) continue;
      const k = v * easeOutBack(st);
      ctx.save(); ctx.translate(CW / 2 + (i - 2) * 70 * v, my); ctx.scale(k, k);
      ctx.fillStyle = 'rgba(12,34,46,0.38)'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,242,216,0.8)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = C.light; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(SHAPE.medalCheck);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (doneT > 1) {
      greenButton(G.x, G.y, G.r, v, false);
      icon([SHAPE.iReplayArc, SHAPE.iReplayHead], G.x, G.y, G.r * 0.84, '#fff', 2.4);
    }
  }

  function render() {
    toWorld(0);
    drawSky();
    toWorld(HILL_PAR);
    drawHills();
    toWorld();
    drawWater();
    drawBedBack();
    drawReeds();
    drawRocks();
    drawBedFront();
    drawSnags();
    drawJellies(); drawBait(); drawBubbles();
    for (const f of fishes) if (f !== hook.fish && visible(f.x, 100)) drawFish(ctx, f.type, f.x, f.y, f.size, f.dir, f.t, 0, f.puff);
    for (const c of crabs) if (c.state === 'walk' && visible(c.x, 60)) drawCrab(ctx, c.kind, c.x, c.y, crabScale(c), c.t, c.walking);
    drawSharks();
    drawTrap();
    drawMagnet();
    drawLineAndHook();
    if (hook.fish && hook.state === 'fight') {
      // holowana ryba-szef szarpie się w poziomie, pyskiem przy haczyku
      const f = hook.fish, k = f.size / 48, dir = Math.sin(T * 1.3) > 0 ? 1 : -1, surge = hook.fight.surge;
      drawFish(ctx, f.type, hook.x + 9 - dir * 50 * k, hook.y + 26, f.size, dir, T * (3 + surge * 4), Math.sin(T * 6) * 0.15 * (1 + surge * 2));
    } else if (hook.fish) {
      const f = hook.fish, k = f.size / 48;
      drawFish(ctx, f.type, hook.x + 9 + Math.sin(T * 18) * 2, hook.y + 22 + 52 * k, f.size, 1, T * 2, -Math.PI / 2 + Math.sin(T * 14) * 0.25, f.puff);
    }
    drawFloaters();
    drawSurfaceLine();
    drawLeaves();
    drawIce();
    drawGifts();
    drawBoat();
    drawBalls();
    drawParticles(particles);
    if (tapMarker) {
      const k = 1 - tapMarker.t / 0.6;
      ctx.strokeStyle = `rgba(255,242,216,${1 - k})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tapMarker.x, tapMarker.y, 10 + k * 30, 0, TAU); ctx.stroke();
    }
    drawVeil();
    drawWeatherFront();
    toUI();
    if (state === 'title') drawTitle();
    else if (state === 'play') { drawHUD(); drawControls(); drawFlyers(); drawBanner(); drawToast(); }
    else if (state === 'levelDone') { drawLevelDone(); drawSoundBtn(); drawHomeBtn(); }
    drawParticles(uiParticles);
  }

  // ---------- sterowanie ----------
  const keys = { left: false, right: false, reel: false };
  const pointers = new Map();

  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(k)) e.preventDefault();
    Sound.init(); Sound.resume();
    if (k === 'm' || k === 'M') { Sound.toggle(); return; }
    if (state === 'title') {
      if (e.repeat) return;
      if (k === '1' || k === 'e' || k === 'E') startGame('easy');
      else if (k === '2' || k === 'n' || k === 'N') startGame('normal');
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') titleSel = 'easy';
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') titleSel = 'normal';
      else if (k === ' ' || k === 'Enter' || k === 'ArrowDown') startGame(titleSel);
      return;
    }
    if (k === 'Escape') { if (!e.repeat) goTitle(); return; }
    if (state === 'levelDone') { if (!e.repeat && doneT > 1) nextLevel(); return; }
    if (!e.repeat) {
      for (const it of ITEM_KEYS) if (ITEM_HOTKEYS[it].includes(k)) useItem(it);
      if (CAGE_KEYS.includes(k)) dropCage();
      if (CANNON_KEYS.includes(k)) fireCannon();
    }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
    // te same klawisze trzymane podczas holowania ryby-szefa zwijają żyłkę
    if (REEL_KEYS.includes(k)) keys.reel = true;
    if (!e.repeat && (k === 'ArrowDown' || k === ' ' || k === 'Enter' || k === 's' || k === 'S')) cast();
    if (k === 'ArrowUp' || k === 'w' || k === 'W') reel();
  });
  const REEL_KEYS = ['ArrowDown', 'ArrowUp', ' ', 'Enter', 's', 'S', 'w', 'W'];
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    if (REEL_KEYS.includes(k)) keys.reel = false;
  });
  window.addEventListener('blur', () => { keys.left = keys.right = keys.reel = false; pointers.clear(); });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Sound.init(); Sound.resume();
    usedPointer = true;
    const x = e.clientX, y = e.clientY, Ly = layout();
    if (hit(Ly.sound, x, y)) { Sound.toggle(); Sound.click(); return; }
    if (state === 'title') {
      const G = titleButtons();
      for (const m of ['easy', 'normal']) if (hit(G[m], x, y)) { startGame(m); return; }
      return;
    }
    if (hit(Ly.home, x, y)) { goTitle(); return; }
    if (state === 'levelDone') { if (doneT > 1) nextLevel(); return; }
    for (const side of ['left', 'right']) {
      if (hit(Ly[side], x, y)) {
        pointers.set(e.pointerId, side);
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignoruj */ }
        return;
      }
    }
    for (const it of ITEM_KEYS) if (hit(Ly.items[it], x, y)) { useItem(it); return; }
    if (hit(Ly.cage, x, y)) { dropCage(); return; }
    if (hasCannon() && hit(Ly.cannon, x, y)) { fireCannon(); return; }
    if (hit(Ly.cast, x, y)) {
      // przycisk wędki trzymany palcem holuje rybę-szefa
      pointers.set(e.pointerId, 'reel');
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignoruj */ }
      cast();
      return;
    }
    if (!TAP_TO_MOVE) return;
    const wx = x / S + camX, wy = y / S;
    tapMarker = { x: wx, y: wy, t: 0.6 };
    if (wy > sandY(wx) - 70) {
      boat.target = clamp(wx, 100, WW - 100); boat.onArrive = 'cage';
    } else if (wy > WATER + 20) {
      boat.target = planBoatFor(wx); boat.onArrive = 'cast';
    } else {
      boat.target = clamp(wx, 100, WW - 100); boat.onArrive = null;
    }
    if (Math.abs(boat.target - boat.x) < 12) {
      boat.target = null;
      const act = boat.onArrive; boat.onArrive = null;
      if (act === 'cast') cast();
      if (act === 'cage') dropCage();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || pointers.get(e.pointerId) === 'reel') return;
    const Ly = layout();
    if (hit(Ly.left, e.clientX, e.clientY)) pointers.set(e.pointerId, 'left');
    else if (hit(Ly.right, e.clientX, e.clientY)) pointers.set(e.pointerId, 'right');
  });
  const release = (e) => pointers.delete(e.pointerId);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => {
    if (!Sound.ac) return;
    if (document.hidden) Sound.ac.suspend(); else Sound.ac.resume();
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  // ---------- start ----------
  resize();
  loadLevel(levelIndex);
  // na ekranie startowym łódka stoi z boku, żeby nie zasłaniać napisu
  boat.x = clamp(VW * 0.16, 100, WW - 100); hook.x = boat.x; hook.y = WATER - 80;
  if (document.fonts && document.fonts.load) document.fonts.load(font(40, 600)).catch(() => {});
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // uchwyt do testów w konsoli
  window.__rybki = {
    get state() { return state; }, get caught() { return caught; }, get crabsCaught() { return crabsCaught; }, get level() { return levelIndex; },
    hook, boat, inv, get crabs() { return crabs; }, get trap() { return trap; }, get itemFlyers() { return itemFlyers; }, get gifts() { return gifts; },
    get mode() { return mode; }, get camX() { return camX; }, get WW() { return WW; }, get rocks() { return rocks; }, get floaters() { return floaters; },
    get fishes() { return fishes; }, get sharks() { return sharks; }, get holes() { return holes; }, get balls() { return balls; },
    get score() { return score; }, get earnedStars() { return earnedStars; }, get hooksLost() { return hooksLost; }, fireCannon, LEVELS_EASY, LEVELS_NORMAL, rockTopAt,
    cast, dropCage, loadLevel, useItem, spawnGift, finishLevel, startGame, goTitle, snapHook,
    keys, step(sec) { for (let t = 0; t < sec; t += 1 / 60) update(1 / 60); render(); },
  };
})();
