// ═══ CONSTANTS ═══
const h = 6.626e-34, me = 9.109e-31, e_c = 1.602e-19, c = 3e8;
let voltage = 50, spacing = 2.0, angle = 15, order = 1, intensity = 75, crystal = 'fcc';
let running = false, paused = false, animId = null, time = 0;

// ═══ DOM REFS ═══
const dc = document.getElementById('diffractionCanvas');
const ctx = dc.getContext('2d');
const bg = document.getElementById('bgCanvas');
const bgCtx = bg.getContext('2d');
const overlay = document.getElementById('canvasOverlay');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// ═══ PHYSICS CALCULATIONS ═══
// FIX: renamed e → e_c to avoid collision with loop variable 'e'
function calcLambda(V) { const Vj = V * 1e3; return h / Math.sqrt(2 * me * e_c * Vj) * 1e10; }
function calcMomentum(V) { return Math.sqrt(2 * me * e_c * V * 1e3); }
function calcVelocity(V) { return Math.sqrt(2 * e_c * V * 1e3 / me) / c * 100; }
function calcBragg(d, th) { return 2 * d * Math.sin(th * Math.PI / 180); }
function braggSatisfied() {
  const lam = calcLambda(voltage);
  const br = calcBragg(spacing, angle);
  // Tolerance: 10% of nλ — more physically meaningful than a fixed absolute value
  return Math.abs(order * lam - br) < Math.max(0.05, order * lam * 0.12);
}

// ═══ UPDATE PARAMETERS ═══
function updateParams() {
  voltage = +document.getElementById('voltageSlider').value;
  spacing = +document.getElementById('spacingSlider').value;
  angle = +document.getElementById('angleSlider').value;
  order = +document.getElementById('orderSlider').value;
  intensity = +document.getElementById('intensitySlider').value;
  document.getElementById('voltageVal').textContent = voltage + ' kV';
  document.getElementById('spacingVal').textContent = spacing.toFixed(1) + ' Å';
  document.getElementById('angleVal').textContent = angle + '°';
  document.getElementById('orderVal').textContent = order;
  document.getElementById('intensityVal').textContent = intensity + '%';
  // Update slider fill percentage via CSS custom property
  document.querySelectorAll('.slider').forEach(s => {
    const pct = ((s.value - s.min) / (s.max - s.min)) * 100;
    s.style.setProperty('--pct', pct + '%');
  });
  updateMetrics();
  updateAnalysisParams();
  if (running) drawGraphs();
}

function updateMetrics() {
  const lam = calcLambda(voltage), p = calcMomentum(voltage);
  const vel = calcVelocity(voltage), br = calcBragg(spacing, angle);
  const ke = voltage; // kV = keV
  document.getElementById('mLambda').textContent = lam.toFixed(4);
  document.getElementById('mP').textContent = (p * 1e23).toFixed(3);
  document.getElementById('mBragg').textContent = br.toFixed(4);
  document.getElementById('mKE').textContent = ke.toFixed(1);
  document.getElementById('mVel').textContent = vel.toFixed(2);
  const sat = braggSatisfied();
  const el = document.getElementById('mBraggStatus');
  const card = document.getElementById('braggCard');
  el.textContent = sat ? 'SATISFIED' : 'NOT MET';
  card.className = 'metric-card glass-card ' + (sat ? 'satisfied' : 'not-satisfied');
}

function updateAnalysisParams() {
  const lam = calcLambda(voltage);
  const s = id => document.getElementById(id);
  if (s('pV')) s('pV').textContent = voltage + ' kV';
  if (s('pLambda')) s('pLambda').textContent = lam.toFixed(4) + ' Å';
  if (s('pP')) s('pP').textContent = (calcMomentum(voltage) * 1e23).toFixed(3) + 'e-23';
  if (s('pTheta')) s('pTheta').textContent = angle + '°';
  if (s('pD')) s('pD').textContent = spacing.toFixed(1) + ' Å';
  if (s('pN')) s('pN').textContent = order;
  if (s('p2d')) s('p2d').textContent = calcBragg(spacing, angle).toFixed(4) + ' Å';
  if (s('pVc')) s('pVc').textContent = calcVelocity(voltage).toFixed(2) + '%';
  if (s('pKE2')) s('pKE2').textContent = voltage + ' keV';
  if (s('pCrystal')) s('pCrystal').textContent = crystal.toUpperCase();
}

// ═══ TABS ═══
function switchTab(id) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('btn-' + id).classList.add('active');
}

// ═══ CRYSTAL SELECTION ═══
function setCrystal(type, btn) {
  crystal = type;
  document.querySelectorAll('.crystal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateAnalysisParams();
}

// ═══ RUN / PAUSE / RESET ═══
function runExperiment() {
  if (paused) { paused = false; running = true; setStatus('running', 'RUNNING'); animate(); return; }
  running = true; paused = false; time = 0;
  overlay.classList.add('hidden');
  setStatus('running', 'RUNNING');
  document.getElementById('btnPause').disabled = false;
  updateMetrics(); drawGraphs(); animate();
}
function pauseExperiment() {
  if (!running) return; paused = true; running = false;
  cancelAnimationFrame(animId); setStatus('paused', 'PAUSED');
}
function resetExperiment() {
  running = false; paused = false; time = 0;
  cancelAnimationFrame(animId);
  overlay.classList.remove('hidden');
  ctx.clearRect(0, 0, dc.width, dc.height);
  setStatus('', 'STANDBY');
  document.getElementById('btnPause').disabled = true;
  ['mLambda', 'mP', 'mBragg', 'mKE', 'mVel', 'mBraggStatus'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('braggCard').className = 'metric-card glass-card';
}
function setStatus(cls, txt) {
  statusDot.className = 'status-dot' + (cls ? ' ' + cls : '');
  statusText.textContent = txt;
}

// ═══ ANIMATION ═══
function animate() {
  if (!running) return;
  time += 0.016;
  drawDiffraction();
  animId = requestAnimationFrame(animate);
}

// ═══ MAIN DIFFRACTION CANVAS ═══
function drawDiffraction() {
  const w = dc.width, h2 = dc.height;
  ctx.fillStyle = '#010812'; ctx.fillRect(0, 0, w, h2);
  const cy = h2 / 2, crystalX = w * 0.42;

  // Grid lines
  ctx.strokeStyle = 'rgba(0,245,255,0.04)'; ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h2); ctx.stroke(); }
  for (let i = 0; i < h2; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

  // Electron beam gradient
  const beamAlpha = intensity / 100;
  const grad = ctx.createLinearGradient(0, cy - 8, 0, cy + 8);
  grad.addColorStop(0, 'rgba(0,245,255,0)');
  grad.addColorStop(0.5, `rgba(0,245,255,${beamAlpha})`);
  grad.addColorStop(1, 'rgba(0,245,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(30, cy - 8, crystalX - 40, 16);

  // Beam particles
  for (let i = 0; i < 12; i++) {
    const px = (30 + ((time * 200 + i * 50) % (crystalX - 50)));
    const py = cy + (Math.sin(time * 8 + i) * 3);
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
    // FIX: avoid Math.random() in animation loop for stable rendering; use deterministic oscillation
    ctx.fillStyle = `rgba(0,245,255,${0.5 + Math.abs(Math.sin(time * 5 + i)) * 0.5})`; ctx.fill();
  }

  // Beam glow line
  ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(30, cy); ctx.lineTo(crystalX - 10, cy);
  ctx.strokeStyle = `rgba(0,245,255,${beamAlpha * 0.3})`; ctx.lineWidth = 3; ctx.stroke();
  ctx.shadowBlur = 0;

  // Crystal lattice
  drawCrystal(crystalX, cy);

  // Diffracted beams
  const sat = braggSatisfied();
  const thRad = angle * Math.PI / 180;
  const beamLen = w - crystalX - 30;
  for (let n = -order; n <= order; n++) {
    if (n === 0) continue;
    const a = n * thRad;
    const endX = crystalX + Math.cos(a) * beamLen;
    const endY = cy - Math.sin(a) * beamLen;
    const alpha = sat ? (0.8 * beamAlpha * (1 - Math.abs(n) / (order + 1))) : (0.15 * beamAlpha);
    const color = n > 0 ? `rgba(168,85,247,${alpha})` : `rgba(59,130,246,${alpha})`;
    ctx.beginPath(); ctx.moveTo(crystalX, cy); ctx.lineTo(endX, endY);
    ctx.strokeStyle = color; ctx.lineWidth = sat ? 2.5 : 1;
    ctx.shadowColor = n > 0 ? '#a855f7' : '#3b82f6'; ctx.shadowBlur = sat ? 12 : 0;
    ctx.stroke(); ctx.shadowBlur = 0;
    // Wave fronts on diffracted beams
    if (sat) {
      for (let wf = 0; wf < 6; wf++) {
        const t = ((time * 3 + wf * 0.15) % 1);
        const wx = crystalX + Math.cos(a) * beamLen * t;
        const wy = cy - Math.sin(a) * beamLen * t;
        ctx.beginPath(); ctx.arc(wx, wy, 3 + wf, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168,85,247,${(1 - t) * 0.5})`; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  // Forward transmitted beam
  ctx.beginPath(); ctx.moveTo(crystalX, cy); ctx.lineTo(w - 20, cy);
  ctx.strokeStyle = `rgba(0,245,255,${beamAlpha * 0.5})`; ctx.lineWidth = 1.5; ctx.stroke();

  // Diffraction screen
  drawScreen(w - 25, cy, h2, sat);

  // Labels
  ctx.font = '11px Inter'; ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText('Electron Gun', 35, cy - 20);
  ctx.fillText('Crystal', crystalX - 18, 30);
  ctx.fillText('Screen', w - 52, 30);
  if (sat) {
    ctx.fillStyle = 'rgba(34,197,94,0.9)'; ctx.font = 'bold 12px Inter';
    ctx.fillText('✓ Bragg condition satisfied', crystalX - 60, h2 - 18);
  }
}

function drawCrystal(cx, cy) {
  const rows = 7, cols = 4, sp = 14;
  const ox = cx - cols * sp / 2, oy = cy - rows * sp / 2;
  ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 6;
  for (let r = 0; r < rows; r++) {
    for (let cl = 0; cl < cols; cl++) {
      let dx = 0, dy = 0;
      if (crystal === 'fcc' && r % 2 === 1) dx = sp / 2;
      if (crystal === 'hex' && r % 2 === 1) dx = sp / 2;
      if (crystal === 'bcc' && r % 2 === 1) { dx = sp / 2; dy = sp / 4; }
      const x = ox + cl * sp + dx, y = oy + r * sp + dy;
      const pulse = Math.sin(time * 4 + r * 0.5 + cl * 0.3) * 1.5;
      ctx.beginPath(); ctx.arc(x, y, 3 + pulse * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${0.6 + Math.sin(time * 3 + r + cl) * 0.3})`; ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  // Crystal outline box
  ctx.strokeStyle = 'rgba(245,158,11,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(ox - 8, oy - 8, cols * sp + 16, rows * sp + 16);
}

function drawScreen(sx, cy, h2, sat) {
  ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(sx - 3, 20, 6, h2 - 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
  ctx.strokeRect(sx - 3, 20, 6, h2 - 40);
  if (!sat) return;
  // Bright diffraction spots on screen
  const spots = [0];
  for (let n = 1; n <= order; n++) { spots.push(n); spots.push(-n); }
  spots.forEach(n => {
    const thRad = angle * Math.PI / 180;
    const yOff = Math.tan(n * thRad) * (sx - dc.width * 0.42) * 0.5;
    const y = cy - yOff;
    // Clamp spot within screen bounds
    if (y < 20 || y > h2 - 20) return;
    const bright = n === 0 ? 1 : (0.8 / Math.abs(n));
    const grd = ctx.createRadialGradient(sx, y, 0, sx, y, 12);
    grd.addColorStop(0, `rgba(34,197,94,${bright})`);
    grd.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = grd; ctx.fillRect(sx - 12, y - 12, 24, 24);
  });
}

// ═══ GRAPHS ═══
function drawGraphs() { drawIntensityGraph(); drawWavelengthGraph(); }

function drawIntensityGraph() {
  const cv = document.getElementById('intensityGraph');
  if (!cv) return;
  const c2 = cv.getContext('2d'), w = cv.width, h2 = cv.height;
  c2.fillStyle = 'rgba(1,8,18,0.9)'; c2.fillRect(0, 0, w, h2);
  // Axes
  c2.strokeStyle = 'rgba(255,255,255,0.1)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(50, 10); c2.lineTo(50, h2 - 25); c2.lineTo(w - 10, h2 - 25); c2.stroke();
  c2.font = '10px Inter'; c2.fillStyle = 'rgba(148,163,184,0.6)';
  c2.fillText('Intensity', 5, 15); c2.fillText('Angle (°)', w / 2 - 20, h2 - 5);
  const sat = braggSatisfied();

  // FIX: Collect points first, then draw line and fill separately with proper beginPath calls
  const points = [];
  for (let i = 0; i < w - 60; i++) {
    const a = (i / (w - 60)) * 90 - 45;
    let val = 0;
    for (let n = -order; n <= order; n++) {
      const peak = n * angle;
      const sigma = sat ? 2 : 5;
      val += Math.exp(-0.5 * Math.pow((a - peak) / sigma, 2)) * (n === 0 ? 0.3 : 1 / (Math.abs(n) + 0.5));
    }
    points.push({ x: 50 + i, y: h2 - 25 - val * (h2 - 40) * 0.8 });
  }

  // Draw glow fill area
  const g2 = c2.createLinearGradient(0, 0, 0, h2);
  g2.addColorStop(0, 'rgba(0,245,255,0.15)'); g2.addColorStop(1, 'rgba(0,245,255,0)');
  c2.beginPath();
  c2.moveTo(points[0].x, h2 - 25);
  points.forEach(p => c2.lineTo(p.x, p.y));
  c2.lineTo(points[points.length - 1].x, h2 - 25);
  c2.closePath();
  c2.fillStyle = g2; c2.fill();

  // Draw the line on top
  c2.beginPath();
  points.forEach((p, i) => i === 0 ? c2.moveTo(p.x, p.y) : c2.lineTo(p.x, p.y));
  c2.strokeStyle = sat ? '#00f5ff' : 'rgba(0,245,255,0.4)'; c2.lineWidth = 2; c2.stroke();
}

function drawWavelengthGraph() {
  const cv = document.getElementById('wavelengthGraph');
  if (!cv) return;
  const c2 = cv.getContext('2d'), w = cv.width, h2 = cv.height;
  c2.fillStyle = 'rgba(1,8,18,0.9)'; c2.fillRect(0, 0, w, h2);
  c2.strokeStyle = 'rgba(255,255,255,0.1)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(50, 10); c2.lineTo(50, h2 - 25); c2.lineTo(w - 10, h2 - 25); c2.stroke();
  c2.font = '10px Inter'; c2.fillStyle = 'rgba(148,163,184,0.6)';
  c2.fillText('λ (Å)', 5, 15); c2.fillText('Voltage (kV)', w / 2 - 25, h2 - 5);
  // Plot λ vs V
  c2.beginPath();
  for (let i = 0; i < w - 60; i++) {
    const V = 10 + (i / (w - 60)) * 190;
    const lam = calcLambda(V);
    const y = h2 - 25 - lam / calcLambda(10) * (h2 - 40);
    i === 0 ? c2.moveTo(50 + i, y) : c2.lineTo(50 + i, y);
  }
  c2.strokeStyle = '#a855f7'; c2.lineWidth = 2; c2.stroke();
  // Current voltage marker dot
  const mx = 50 + ((voltage - 10) / 190) * (w - 60);
  const my = h2 - 25 - calcLambda(voltage) / calcLambda(10) * (h2 - 40);
  c2.beginPath(); c2.arc(mx, my, 5, 0, Math.PI * 2);
  c2.fillStyle = '#a855f7'; c2.fill();
  c2.beginPath(); c2.arc(mx, my, 8, 0, Math.PI * 2);
  c2.strokeStyle = 'rgba(168,85,247,0.5)'; c2.lineWidth = 2; c2.stroke();
}

// ═══ SWEEP ANALYSIS ═══
function runSweep() {
  drawSweep1(); drawSweep2(); drawSweep3();
}

function drawSweep1() {
  const cv = document.getElementById('sweepGraph1'); if (!cv) return;
  const c2 = cv.getContext('2d'), w = cv.width, h2 = cv.height;
  c2.fillStyle = 'rgba(1,8,18,0.9)'; c2.fillRect(0, 0, w, h2);
  c2.strokeStyle = 'rgba(255,255,255,0.08)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(50, 10); c2.lineTo(50, h2 - 30); c2.lineTo(w - 10, h2 - 30); c2.stroke();
  c2.font = '10px Inter'; c2.fillStyle = 'rgba(148,163,184,0.6)';
  c2.fillText('λ (Å)', 5, 20); c2.fillText('Voltage (kV)', w / 2 - 25, h2 - 8);
  // Classical wavelength curve
  c2.beginPath();
  for (let i = 0; i <= w - 60; i++) {
    const V = 10 + (i / (w - 60)) * 190; const lam = calcLambda(V);
    const y = h2 - 30 - (lam / 0.5) * (h2 - 45);
    i === 0 ? c2.moveTo(50 + i, Math.max(10, y)) : c2.lineTo(50 + i, Math.max(10, y));
  }
  c2.strokeStyle = '#00f5ff'; c2.lineWidth = 2; c2.stroke();
  // Relativistic wavelength curve
  c2.beginPath();
  for (let i = 0; i <= w - 60; i++) {
    const V = 10 + (i / (w - 60)) * 190; const Vj = V * 1e3;
    const lam = h / Math.sqrt(2 * me * e_c * Vj * (1 + e_c * Vj / (2 * me * c * c))) * 1e10;
    const y = h2 - 30 - (lam / 0.5) * (h2 - 45);
    i === 0 ? c2.moveTo(50 + i, Math.max(10, y)) : c2.lineTo(50 + i, Math.max(10, y));
  }
  c2.strokeStyle = '#a855f7'; c2.lineWidth = 2; c2.setLineDash([5, 3]); c2.stroke(); c2.setLineDash([]);
  // Legend
  c2.fillStyle = '#00f5ff'; c2.fillRect(w - 130, 15, 12, 3);
  c2.fillStyle = 'rgba(148,163,184,0.7)'; c2.fillText('Classical', w - 113, 19);
  c2.fillStyle = '#a855f7'; c2.fillRect(w - 130, 28, 12, 3);
  c2.fillStyle = 'rgba(148,163,184,0.7)'; c2.fillText('Relativistic', w - 113, 32);
}

function drawSweep2() {
  const cv = document.getElementById('sweepGraph2'); if (!cv) return;
  const c2 = cv.getContext('2d'), w = cv.width, h2 = cv.height;
  c2.fillStyle = 'rgba(1,8,18,0.9)'; c2.fillRect(0, 0, w, h2);
  c2.strokeStyle = 'rgba(255,255,255,0.08)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(50, 10); c2.lineTo(50, h2 - 30); c2.lineTo(w - 10, h2 - 30); c2.stroke();
  c2.font = '10px Inter'; c2.fillStyle = 'rgba(148,163,184,0.6)';
  c2.fillText('θ (°)', 10, 20); c2.fillText('Order (n)', w / 2 - 20, h2 - 8);
  const lam = calcLambda(voltage);
  const colors = ['#00f5ff', '#a855f7', '#3b82f6', '#f59e0b', '#22c55e'];

  // FIX: draw line paths correctly — beginPath per series, then stroke after all points
  [1.0, 1.5, 2.0, 3.0, 4.0].forEach((d, idx) => {
    const linePoints = [];
    for (let n = 1; n <= 5; n++) {
      const sinTh = n * lam / (2 * d);
      if (sinTh > 1) continue;
      const th = Math.asin(sinTh) * 180 / Math.PI;
      const x = 50 + ((n - 1) / 4) * (w - 70);
      const y = h2 - 30 - (th / 90) * (h2 - 45);
      linePoints.push({ x, y, n });
    }
    // Draw connecting line
    if (linePoints.length > 1) {
      c2.beginPath();
      linePoints.forEach((p, i) => i === 0 ? c2.moveTo(p.x, p.y) : c2.lineTo(p.x, p.y));
      c2.strokeStyle = colors[idx]; c2.lineWidth = 1.5; c2.stroke();
    }
    // Draw dots on top
    linePoints.forEach(p => {
      c2.beginPath(); c2.arc(p.x, p.y, 4, 0, Math.PI * 2);
      c2.fillStyle = colors[idx]; c2.fill();
    });
  });
}

function drawSweep3() {
  const cv = document.getElementById('sweepGraph3'); if (!cv) return;
  const c2 = cv.getContext('2d'), w = cv.width, h2 = cv.height;
  c2.fillStyle = 'rgba(1,8,18,0.9)'; c2.fillRect(0, 0, w, h2);
  c2.strokeStyle = 'rgba(255,255,255,0.08)'; c2.lineWidth = 1;
  c2.beginPath(); c2.moveTo(50, 10); c2.lineTo(50, h2 - 30); c2.lineTo(w - 10, h2 - 30); c2.stroke();
  c2.font = '10px Inter'; c2.fillStyle = 'rgba(148,163,184,0.6)';
  c2.fillText('Intensity', 5, 20); c2.fillText('2θ (degrees)', w / 2 - 25, h2 - 8);
  // Draw multi-peak intensity pattern
  const points3 = [];
  for (let i = 0; i < w - 60; i++) {
    const twoTh = (i / (w - 60)) * 90; let val = 0;
    for (let n = 1; n <= 5; n++) {
      const sinVal = n * calcLambda(voltage) / (2 * spacing);
      if (sinVal > 1) continue;
      const peak = 2 * Math.asin(sinVal) * 180 / Math.PI;
      if (!isNaN(peak)) val += Math.exp(-0.5 * Math.pow((twoTh - peak) / 1.2, 2)) * (1 / n);
    }
    points3.push({ x: 50 + i, y: h2 - 30 - val * (h2 - 45) * 0.9 });
  }
  const grd = c2.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#00f5ff'); grd.addColorStop(0.5, '#a855f7'); grd.addColorStop(1, '#3b82f6');
  c2.beginPath();
  points3.forEach((p, i) => i === 0 ? c2.moveTo(p.x, p.y) : c2.lineTo(p.x, p.y));
  c2.strokeStyle = grd; c2.lineWidth = 2; c2.stroke();
}

// ═══ BACKGROUND PARTICLES ═══
let particles = [];
function initBg() {
  bg.width = window.innerWidth; bg.height = window.innerHeight;
  particles = [];
  const count = Math.min(80, Math.floor(bg.width * bg.height / 12000));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * bg.width, y: Math.random() * bg.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5,
      color: ['rgba(0,245,255,', 'rgba(168,85,247,', 'rgba(59,130,246,'][Math.floor(Math.random() * 3)]
    });
  }
}
function animBg() {
  bgCtx.fillStyle = 'rgba(3,7,18,0.15)'; bgCtx.fillRect(0, 0, bg.width, bg.height);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = bg.width; if (p.x > bg.width) p.x = 0;
    if (p.y < 0) p.y = bg.height; if (p.y > bg.height) p.y = 0;
    bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fillStyle = p.color + '0.6)'; bgCtx.fill();
  });
  // Connection lines between nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) {
        bgCtx.beginPath(); bgCtx.moveTo(particles[i].x, particles[i].y);
        bgCtx.lineTo(particles[j].x, particles[j].y);
        bgCtx.strokeStyle = `rgba(0,245,255,${0.08 * (1 - d / 120)})`;
        bgCtx.lineWidth = 0.5; bgCtx.stroke();
      }
    }
  }
  requestAnimationFrame(animBg);
}

// ═══ SCREENSHOT ═══
function takeScreenshot() {
  const link = document.createElement('a');
  link.download = 'diffraction_' + Date.now() + '.png';
  link.href = dc.toDataURL(); link.click();
}

// ═══ INIT ═══
window.addEventListener('resize', () => {
  bg.width = window.innerWidth;
  bg.height = window.innerHeight;
  initBg();
});

document.addEventListener('DOMContentLoaded', () => {
  initBg();
  animBg();
  updateParams();
});
