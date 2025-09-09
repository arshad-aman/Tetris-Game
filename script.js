/* Tetris - Vanilla JS */
(function(){
  const playfieldCanvas = document.getElementById('playfield');
  const nextCanvas = document.getElementById('next');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const speedEl = document.getElementById('speed');
  const overlay = document.getElementById('overlay');
  const finalScoreEl = document.getElementById('finalScore');

  const pfCtx = playfieldCanvas.getContext('2d');
  const nextCtx = nextCanvas.getContext('2d');

  // Logical dimensions
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30; // canvas pixel size used for drawing (playfield canvas set to 300x600)

  // Colors per piece type
  const COLORS = {
    I: '#4cc9f0',
    O: '#f1fa8c',
    T: '#bd93f9',
    S: '#50fa7b',
    Z: '#ff5555',
    J: '#8be9fd',
    L: '#ffb86c'
  };

  // Tetromino definitions (rotation states as 4x4)
  const SHAPES = {
    I: [
      [ [0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0] ],
      [ [0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0] ],
      [ [0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0] ],
      [ [0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0] ]
    ],
    O: [
      [ [0,0,0,0], [0,1,1,0], [0,1,1,0], [0,0,0,0] ],
      [ [0,0,0,0], [0,1,1,0], [0,1,1,0], [0,0,0,0] ],
      [ [0,0,0,0], [0,1,1,0], [0,1,1,0], [0,0,0,0] ],
      [ [0,0,0,0], [0,1,1,0], [0,1,1,0], [0,0,0,0] ]
    ],
    T: [
      [ [0,0,0,0], [1,1,1,0], [0,1,0,0], [0,0,0,0] ],
      [ [0,1,0,0], [1,1,0,0], [0,1,0,0], [0,0,0,0] ],
      [ [0,1,0,0], [1,1,1,0], [0,0,0,0], [0,0,0,0] ],
      [ [0,1,0,0], [0,1,1,0], [0,1,0,0], [0,0,0,0] ]
    ],
    S: [
      [ [0,0,0,0], [0,1,1,0], [1,1,0,0], [0,0,0,0] ],
      [ [1,0,0,0], [1,1,0,0], [0,1,0,0], [0,0,0,0] ],
      [ [0,0,0,0], [0,1,1,0], [1,1,0,0], [0,0,0,0] ],
      [ [1,0,0,0], [1,1,0,0], [0,1,0,0], [0,0,0,0] ]
    ],
    Z: [
      [ [0,0,0,0], [1,1,0,0], [0,1,1,0], [0,0,0,0] ],
      [ [0,1,0,0], [1,1,0,0], [1,0,0,0], [0,0,0,0] ],
      [ [0,0,0,0], [1,1,0,0], [0,1,1,0], [0,0,0,0] ],
      [ [0,1,0,0], [1,1,0,0], [1,0,0,0], [0,0,0,0] ]
    ],
    J: [
      [ [0,0,0,0], [1,1,1,0], [0,0,1,0], [0,0,0,0] ],
      [ [0,1,0,0], [0,1,0,0], [1,1,0,0], [0,0,0,0] ],
      [ [1,0,0,0], [1,1,1,0], [0,0,0,0], [0,0,0,0] ],
      [ [0,1,1,0], [0,1,0,0], [0,1,0,0], [0,0,0,0] ]
    ],
    L: [
      [ [0,0,0,0], [1,1,1,0], [1,0,0,0], [0,0,0,0] ],
      [ [1,1,0,0], [0,1,0,0], [0,1,0,0], [0,0,0,0] ],
      [ [0,0,1,0], [1,1,1,0], [0,0,0,0], [0,0,0,0] ],
      [ [0,1,0,0], [0,1,0,0], [0,1,1,0], [0,0,0,0] ]
    ]
  };

  function createMatrix(rows, cols, fill = 0) {
    return Array.from({ length: rows }, () => Array(cols).fill(fill));
  }

  function randomBag() {
    const bag = ['I','O','T','S','Z','J','L'];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  const game = {
    arena: createMatrix(ROWS, COLS, 0),
    current: null,
    next: null,
    bag: [],
    score: 0,
    linesCleared: 0,
    level: 0,
    dropCounter: 0,
    dropIntervalMs: 1000,
    lastTime: 0,
    paused: true,
    over: false,
    muted: false,
    clearingRows: null,
    clearAnimStart: 0,
    clearAnimDurationMs: 800,
  };

  function createPiece(type) {
    return {
      type,
      rotationIndex: 0,
      matrix: SHAPES[type][0],
      position: { x: 3, y: -1 }
    };
  }

  function refillBagIfNeeded() {
    if (game.bag.length === 0) {
      game.bag = randomBag();
    }
  }

  function getNextPiece() {
    refillBagIfNeeded();
    const type = game.bag.shift();
    return createPiece(type);
  }

  function reset() {
    game.arena = createMatrix(ROWS, COLS, 0);
    game.score = 0;
    game.linesCleared = 0;
    game.level = 0;
    game.dropIntervalMs = 1000;
    game.dropCounter = 0;
    game.lastTime = 0;
    game.bag = randomBag();
    game.current = getNextPiece();
    game.next = getNextPiece();
    game.paused = false;
    game.over = false;
    overlay.classList.add('hidden');
    updateScore();
    updateHighScoreUI();
    updateSpeedUI();
    draw();
    playSound('start');
  }

  function start() {
    if (game.over) reset();
    game.paused = false;
  }

  function togglePause() {
    if (game.over) return;
    game.paused = !game.paused;
    playSound(game.paused ? 'pause' : 'resume');
  }

  function update(time = 0) {
    const delta = time - game.lastTime;
    game.lastTime = time;

    if (!game.paused && !game.over) {
      // Clear animation mode: update animation and pause gravity
      if (game.clearingRows) {
        const elapsed = performance.now() - game.clearAnimStart;
        if (elapsed >= game.clearAnimDurationMs) {
          commitClear();
        }
        draw();
        return requestAnimationFrame(update);
      }
      game.dropCounter += delta;
      if (game.dropCounter > game.dropIntervalMs) {
        softDrop();
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  function drawCell(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }

  function drawMatrix(ctx, matrix, offset, colorMap) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          const type = colorMap || matrix[y][x];
          const color = COLORS[typeof type === 'string' ? type : 'I'];
          drawCell(ctx, x + offset.x, y + offset.y, color);
        }
      }
    }
  }

  function clearCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  function merge(arena, piece) {
    const { matrix, position, type } = piece;
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          const ay = y + position.y;
          const ax = x + position.x;
          if (ay >= 0) arena[ay][ax] = type;
        }
      }
    }
  }

  function collide(arena, piece) {
    const { matrix, position } = piece;
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          const ay = y + position.y;
          const ax = x + position.x;
          if (ay < 0) continue; // allow entry from above
          if (ay >= ROWS || ax < 0 || ax >= COLS || arena[ay][ax]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function rotateMatrix(matrix) {
    const size = matrix.length;
    const result = matrix.map(row => row.slice());
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        result[x][size - 1 - y] = matrix[y][x];
      }
    }
    return result;
  }

  function tryRotate(dir = 1) {
    const original = game.current.matrix;
    const rotated = dir === 1 ? rotateMatrix(original) : rotateMatrix(rotateMatrix(rotateMatrix(original)));
    const oldX = game.current.position.x;
    game.current.matrix = rotated;

    // Simple wall kicks
    const offsets = [0, 1, -1, 2, -2];
    for (const offset of offsets) {
      game.current.position.x = oldX + offset;
      if (!collide(game.arena, game.current)) {
        playSound('rotate');
        return; // success
      }
    }
    // revert
    game.current.position.x = oldX;
    game.current.matrix = original;
  }

  function hardDrop() {
    if (game.over) return;
    while (!collide(game.arena, game.current)) {
      game.current.position.y++;
    }
    game.current.position.y--; // step back
    playSound('hardDrop');
    lockPiece();
  }

  function softDrop() {
    if (game.over) return;
    game.current.position.y++;
    if (collide(game.arena, game.current)) {
      game.current.position.y--;
      lockPiece();
    } else {
      game.dropCounter = 0;
    }
  }

  function move(dir) {
    if (game.over) return;
    game.current.position.x += dir;
    if (collide(game.arena, game.current)) {
      game.current.position.x -= dir;
    }
  }

  function lockPiece() {
    merge(game.arena, game.current);
    const rows = getFullRows();
    if (rows.length > 0) {
      startClearAnimation(rows);
    } else {
      spawnNext();
      if (collide(game.arena, game.current)) {
        game.over = true;
        game.paused = true;
        finalScoreEl.textContent = game.score;
        overlay.classList.remove('hidden');
        playSound('gameOver');
      }
    }
  }

  function getFullRows() {
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
      let full = true;
      for (let x = 0; x < COLS; x++) {
        if (!game.arena[y][x]) { full = false; break; }
      }
      if (full) rows.push(y);
    }
    return rows;
  }

  function startClearAnimation(rows) {
    game.clearingRows = rows.slice();
    game.clearAnimStart = performance.now();
    // Play sweeping sound
    playSound(rows.length >= 4 ? 'clearSweepTetris' : 'clearSweep');
  }

  function commitClear() {
    const rows = game.clearingRows ? game.clearingRows.slice() : [];
    // Remove rows from bottom to top to keep indices valid
    rows.sort((a,b)=>a-b);
    for (let i = rows.length - 1; i >= 0; i--) {
      const y = rows[i];
      const newRow = Array(COLS).fill(0);
      game.arena.splice(y, 1);
      game.arena.unshift(newRow);
    }
    const lines = rows.length;
    if (lines > 0) {
      const points = [0, 40, 100, 300, 1200][lines] || 0;
      game.score += points;
      game.linesCleared += lines;
      updateLevel();
      updateScore();
      playSound(lines >= 4 ? 'tetrisDone' : 'lineDone');
    }
    game.clearingRows = null;
    game.dropCounter = 0;
    spawnNext();
    if (collide(game.arena, game.current)) {
      game.over = true;
      game.paused = true;
      finalScoreEl.textContent = game.score;
      overlay.classList.remove('hidden');
      playSound('gameOver');
    }
  }

  function updateLevel() {
    game.level = Math.floor(game.linesCleared / 10);
    game.dropIntervalMs = Math.max(120, 1000 - game.level * 100);
    updateSpeedUI();
  }

  function spawnNext() {
    game.current = game.next;
    game.current.position = { x: 3, y: -1 };
    game.next = getNextPiece();
  }

  function updateScore() {
    scoreEl.textContent = game.score;
    maybeUpdateHighScore();
  }

  function getHighScore() {
    try {
      return parseInt(localStorage.getItem('tetrisHighScore') || '0', 10) || 0;
    } catch (_) { return 0; }
  }

  function setHighScore(val) {
    try {
      localStorage.setItem('tetrisHighScore', String(val));
    } catch (_) {}
  }

  function maybeUpdateHighScore() {
    const current = getHighScore();
    if (game.score > current) {
      setHighScore(game.score);
      updateHighScoreUI();
    }
  }

  function updateHighScoreUI() {
    if (highScoreEl) highScoreEl.textContent = String(getHighScore());
  }

  function updateSpeedUI() {
    if (!speedEl) return;
    // Represent speed as multiplier relative to base (1000ms)
    const multiplier = (1000 / game.dropIntervalMs).toFixed(1) + 'x';
    speedEl.textContent = multiplier;
  }

  function drawPlayfield() {
    clearCanvas(pfCtx, playfieldCanvas.width, playfieldCanvas.height);
    // Draw arena
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = game.arena[y][x];
        if (cell) {
          if (game.clearingRows && game.clearingRows.includes(y)) {
            const progress = Math.min(1, (performance.now() - game.clearAnimStart) / game.clearAnimDurationMs);
            drawAnimatedClearCell(pfCtx, x, y, COLORS[cell], progress);
          } else {
            drawCell(pfCtx, x, y, COLORS[cell]);
          }
        }
      }
    }
    // Draw current
    if (!game.clearingRows) {
      drawMatrix(pfCtx, game.current.matrix, game.current.position, game.current.type);
    }
  }

  function drawAnimatedClearCell(ctx, x, y, color, progress) {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    const scale = 1 - 0.5 * progress; // shrink to 50%
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 1 - 0.6 * progress; // fade out
    ctx.fillStyle = color;
    ctx.fillRect(-CELL/2, -CELL/2, CELL, CELL);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 * (1 - progress)) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(-CELL/2 + 1, -CELL/2 + 1, CELL - 2, CELL - 2);
    // sweeping overlay from edges toward center
    const sweep = Math.floor((CELL / 2) * progress);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.15 * (1 - progress)) + ')';
    ctx.fillRect(-CELL/2, -CELL/2, sweep, CELL);
    ctx.fillRect(CELL/2 - sweep, -CELL/2, sweep, CELL);
    ctx.restore();
  }

  function drawNext() {
    clearCanvas(nextCtx, nextCanvas.width, nextCanvas.height);
    const matrix = game.next.matrix;
    // center in next canvas
    const size = matrix.length;
    const px = Math.floor((nextCanvas.width / CELL - size) / 2);
    const py = Math.floor((nextCanvas.height / CELL - size) / 2);
    drawMatrix(nextCtx, matrix, { x: px, y: py }, game.next.type);
  }

  function draw() {
    if (!game.current) return;
    drawPlayfield();
    drawNext();
  }

  // Simple WebAudio synth for SFX
  let audioCtx;
  function getAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function beep({ freq = 440, duration = 80, type = 'sine', volume = 0.05, slideTo, when }) {
    if (game.muted) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) {
      osc.frequency.linearRampToValueAtTime(slideTo, t0 + duration / 1000);
    }
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration / 1000 + 0.01);
  }

  function playSound(name) {
    switch (name) {
      case 'start':
        beep({ freq: 440, duration: 60, type: 'triangle' });
        beep({ freq: 660, duration: 80, type: 'triangle', when: (getAudioCtx()?.currentTime || 0) + 0.05 });
        break;
      case 'pause':
        beep({ freq: 220, duration: 80, type: 'sine' });
        break;
      case 'resume':
        beep({ freq: 440, duration: 80, type: 'sine' });
        break;
      case 'rotate':
        beep({ freq: 700, duration: 40, type: 'square', volume: 0.04 });
        break;
      case 'hardDrop':
        beep({ freq: 200, duration: 40, type: 'sawtooth', slideTo: 120 });
        break;
      case 'clearSweep':
        beep({ freq: 900, duration: 180, type: 'sine', slideTo: 300, volume: 0.06 });
        break;
      case 'clearSweepTetris':
        beep({ freq: 1100, duration: 220, type: 'sine', slideTo: 260, volume: 0.08 });
        break;
      case 'lineDone':
        beep({ freq: 520, duration: 90, type: 'triangle' });
        break;
      case 'tetrisDone':
        beep({ freq: 520, duration: 60, type: 'triangle' });
        beep({ freq: 660, duration: 60, type: 'triangle', when: (getAudioCtx()?.currentTime || 0) + 0.07 });
        beep({ freq: 800, duration: 80, type: 'triangle', when: (getAudioCtx()?.currentTime || 0) + 0.14 });
        break;
      case 'gameOver':
        beep({ freq: 300, duration: 200, type: 'sine' });
        beep({ freq: 180, duration: 250, type: 'sine', when: (getAudioCtx()?.currentTime || 0) + 0.15 });
        break;
    }
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (game.clearingRows) {
      // Limit input during clear animation
      if (e.code === 'KeyP') togglePause();
      if (e.code === 'KeyR') reset();
      return;
    }
    if (game.paused && !['KeyR','Space'].includes(e.code)) {
      if (e.code === 'KeyP') togglePause();
      return;
    }
    switch (e.code) {
      case 'ArrowLeft': move(-1); break;
      case 'ArrowRight': move(1); break;
      case 'ArrowDown': softDrop(); break;
      case 'ArrowUp': tryRotate(1); break;
      case 'Space': hardDrop(); break;
      case 'KeyP': togglePause(); break;
      case 'KeyR': reset(); break;
    }
  });

  // Public API
  window.TETRIS = {
    start,
    togglePause,
    reset,
    toggleMute: () => {
      game.muted = !game.muted;
      const btn = document.getElementById('btnMute');
      if (btn) btn.textContent = `Mute: ${game.muted ? 'On' : 'Off'}`;
    }
  };

  // Init
  reset();
  requestAnimationFrame(update);
})();


