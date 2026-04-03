// ── Config ──
const COLOR_SETS = [
  [[255,255,255],[0,0,0]],
  [[209,144,102],[209,214,176]],
  [[99,132,82],[200,121,91]],
  [[118,150,100],[233,146,35]],
  [[173,82,118],[129,120,101]],
  [[225,104,106],[90,81,70]],
];
const MIN_R = 2, MAX_R = 4, ITERATIONS = 200000;
const GRADIENT_RANGE = 0.3, MODIFY_RANGE = 1.5;

// ── DOM ──
const drop      = document.getElementById('drop');
const fileIn    = document.getElementById('fileIn');
const fname     = document.getElementById('fname');
const prevWrap  = document.getElementById('prevWrap');
const prev      = document.getElementById('prev');
const folderEl  = document.getElementById('folderPath');
const btnFolder = document.getElementById('btnFolder');
const folderNote= document.getElementById('folderNote');
const btnGen    = document.getElementById('btnGen');
const statusEl  = document.getElementById('status');
const pbar      = document.getElementById('pbar');
const pfill     = document.getElementById('pfill');
const resultsEl = document.getElementById('results');
const gallery   = document.getElementById('gallery');

let selectedFile = null;
let dirHandle    = null;
let hasFSAccess  = typeof window.showDirectoryPicker === 'function';

if (!hasFSAccess) {
  folderNote.textContent = 'Folder saving not supported in this browser. Images will be available for download below.';
  btnFolder.style.display = 'none';
  folderEl.textContent = 'Download only (use Chrome/Edge for folder save)';
}

// ── File drop / pick ──
drop.addEventListener('click', () => fileIn.click());
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]); });
fileIn.addEventListener('change', () => { if (fileIn.files.length) pickFile(fileIn.files[0]); });

function pickFile(f) {
  selectedFile = f;
  fname.textContent = f.name;
  drop.classList.add('ok');
  const url = URL.createObjectURL(f);
  prev.src = url;
  prevWrap.style.display = 'block';
  updateBtn();
}

// ── Folder pick ──
btnFolder.addEventListener('click', async () => {
  if (!hasFSAccess) return;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    folderEl.textContent = dirHandle.name;
    folderEl.classList.add('set');
    updateBtn();
  } catch {}
});

function updateBtn() {
  btnGen.disabled = !selectedFile || (!dirHandle && hasFSAccess);
}

// ── Color functions (matching Python) ──
function lightschwift(color, modifier) {
  if (modifier < 1) modifier = 1 / modifier;
  const m = Math.random() * (modifier - 1/modifier) + 1/modifier;
  return [
    Math.min(255, Math.floor(color[0] * m)),
    Math.min(255, Math.floor(color[1] * m)),
    Math.min(255, Math.floor(color[2] * m)),
  ];
}

function gradientshift(first, second, range) {
  const g = Math.random() * range;
  return [
    Math.floor(first[0] - (first[0] - second[0]) * g),
    Math.floor(first[1] - (first[1] - second[1]) * g),
    Math.floor(first[2] - (first[2] - second[2]) * g),
  ];
}

// ── Load image pixels ──
function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      res({ width: c.width, height: c.height, pixels: data.data });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

// ── Yield to event loop ──
function yieldUI() { return new Promise(r => setTimeout(r, 0)); }

// ── Generate one image ──
async function generateOne(src, displaySize, color1, color2, onProgress) {
  const w = displaySize, h = displaySize;
  const midX = w / 2, midY = h / 2;
  const outerR = displaySize / 2;
  const scaleX = src.width / w, scaleY = src.height / h;
  const cellSize = 2 * MAX_R;
  const gridW = Math.floor(w / cellSize) + 2;
  const gridH = Math.floor(h / cellSize) + 2;

  const matrix = new Array(gridW * gridH);
  for (let i = 0; i < matrix.length; i++) matrix[i] = [];

  const occupied = new Uint8Array(w * h);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  let circles = 0;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    if (iter % 20000 === 0) {
      if (onProgress) onProgress(iter / ITERATIONS);
      await yieldUI();
    }

    const srcX = Math.floor(Math.random() * src.width);
    const srcY = Math.floor(Math.random() * src.height);

    const rx = Math.floor(srcX / scaleX);
    const ry = Math.floor(srcY / scaleY);
    if (rx < 0 || rx >= w || ry < 0 || ry >= h) continue;

    if (occupied[ry * w + rx]) continue;

    const si = (srcY * src.width + srcX) * 4;
    const pr = src.pixels[si], pg = src.pixels[si+1], pb = src.pixels[si+2], pa = src.pixels[si+3];
    const isBlack = (pr === 0 && pg === 0 && pb === 0 && pa === 255);

    const dist = Math.hypot(rx - midX, ry - midY);
    let maxRadius = outerR - dist;
    if (maxRadius <= MIN_R) continue;

    const gx = Math.floor(rx / cellSize);
    const gy = Math.floor(ry / cellSize);

    let tooClose = false;
    for (let dx = -1; dx <= 1 && !tooClose; dx++) {
      for (let dy = -1; dy <= 1 && !tooClose; dy++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
        const cell = matrix[nx * gridH + ny];
        for (let ci = 0; ci < cell.length; ci++) {
          const c = cell[ci];
          const d = Math.hypot(rx - c.x, ry - c.y) - c.r;
          if (d < maxRadius) {
            maxRadius = d;
            if (maxRadius < MIN_R) { tooClose = true; break; }
          }
        }
      }
    }
    if (maxRadius < MIN_R) continue;

    const radius = Math.min(Math.floor(maxRadius), MAX_R);

    let farbe, farbe2;
    if (isBlack) { farbe = [...color1]; farbe2 = [...color2]; }
    else         { farbe = [...color2]; farbe2 = [...color1]; }

    farbe = gradientshift(farbe, farbe2, GRADIENT_RANGE);
    farbe = lightschwift(farbe, MODIFY_RANGE);

    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${farbe[0]},${farbe[1]},${farbe[2]})`;
    ctx.fill();

    for (let dy2 = -radius; dy2 <= radius; dy2++) {
      for (let dx2 = -radius; dx2 <= radius; dx2++) {
        if (dx2*dx2 + dy2*dy2 <= radius*radius) {
          const px = rx + dx2, py = ry + dy2;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            occupied[py * w + px] = 1;
          }
        }
      }
    }

    matrix[gx * gridH + gy].push({ x: rx, y: ry, r: radius });
    circles++;
  }

  return canvas;
}

// ── Save canvas to folder or return blob URL ──
async function saveCanvas(canvas, name) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  if (dirHandle) {
    const fh = await dirHandle.getFileHandle(name, { create: true });
    const wr = await fh.createWritable();
    await wr.write(blob);
    await wr.close();
  }
  return URL.createObjectURL(blob);
}

// ── Generate button ──
btnGen.addEventListener('click', async () => {
  if (!selectedFile) return;
  btnGen.disabled = true;
  resultsEl.style.display = 'none';
  gallery.innerHTML = '';
  pbar.style.display = 'block';
  pfill.style.width = '0%';
  setStatus('busy', '<span class="spinner"></span>Loading image…');

  try {
    const src = await loadImage(selectedFile);
    const displaySize = parseInt(document.getElementById('size').value);
    const total = COLOR_SETS.length;

    for (let i = 0; i < total; i++) {
      const [c1, c2] = COLOR_SETS[i];
      setStatus('busy', `<span class="spinner"></span>Image ${i+1}/${total}…`);

      const canvas = await generateOne(src, displaySize, c1, c2, frac => {
        const overall = (i + frac) / total;
        pfill.style.width = (overall * 100).toFixed(1) + '%';
      });

      const name = `output_${i+1}.png`;
      const url = await saveCanvas(canvas, name);

      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = url; img.alt = name;
      const dl = document.createElement('a');
      dl.className = 'dl'; dl.textContent = '⬇ ' + name;
      dl.href = url; dl.download = name;
      card.appendChild(img);
      card.appendChild(dl);
      gallery.appendChild(card);
      resultsEl.style.display = 'block';

      pfill.style.width = ((i+1) / total * 100) + '%';
    }

    const where = dirHandle ? ` Saved to "${dirHandle.name}".` : '';
    setStatus('ok', `Done! ${total} images generated.${where}`);
  } catch (err) {
    setStatus('err', 'Error: ' + err.message);
  }

  pbar.style.display = 'none';
  btnGen.disabled = false;
});

function setStatus(cls, html) {
  statusEl.className = 'status ' + cls;
  statusEl.innerHTML = html;
}
