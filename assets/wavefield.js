// Decorative sine-wave artwork. It does not consume or represent system data.
export function waveY(x, lane, phase, height, secondary = false) {
  const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * x)), 0.8);
  const spread = (lane - 0.5) * height * (secondary ? 0.35 : 0.46);
  const sweep = Math.sin(x * 9.4 - phase + lane * 2.4) * height * 0.17;
  const ripple = Math.sin(x * 16.2 + phase * 0.55 + lane * 1.6) * height * 0.057;
  const drift = Math.sin(x * 5.7 + lane * 4.2 + phase * 0.3) * height * 0.055;
  return height * 0.51 + spread + envelope * ((secondary ? -0.65 : 1) * sweep + ripple + drift);
}

export function staticWavefieldSvg() {
  const width = 1000, height = 200, phase = 0.8;
  let paths = '';
  for (let row = 0; row < 32; row++) {
    const lane = row / 31;
    let d = '';
    for (let step = 0; step <= 56; step++) {
      const x = step / 56;
      d += `${step ? 'L' : 'M'}${Math.round(x * width)},${Math.round(waveY(x, lane, phase, height))}`;
    }
    const opacity = (0.14 + Math.sin(Math.PI * lane) * 0.48).toFixed(2);
    paths += `<path d="${d}" opacity="${opacity}"/>`;
  }
  let pulses = '';
  for (const [x, lane] of [[0.19, 0.18], [0.45, 0.45], [0.71, 0.72], [0.86, 0.9]]) {
    pulses += `<circle cx="${Math.round(x * width)}" cy="${Math.round(waveY(x, lane, phase, height))}" r="2" fill="#e6ffac" stroke="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" stroke="#d7ff63" stroke-width="0.8" preserveAspectRatio="none">${paths}${pulses}</svg>`;
}

export function mountWavefield(root, { window: win = window, document: doc = document } = {}) {
  const canvas = root.querySelector('[data-wave-canvas]');
  const button = root.querySelector('[data-wave-pause]');
  const context = canvas?.getContext('2d');
  if (!context || !button) return { destroy() {} };
  const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, phase = 0.8, frame = null, lastDraw = 0;
  let visible = false, userPaused = false, destroyed = false;
  const state = () => reducedMotion.matches ? 'reduced' : userPaused ? 'paused' : doc.hidden ? 'hidden' : !visible ? 'offscreen' : 'running';
  const draw = () => {
    if (!width || !height || destroyed) return;
    context.clearRect(0, 0, width, height);
    const samples = Math.max(70, Math.min(150, Math.round(width / 7)));
    for (let layer = 0; layer < 2; layer++) {
      const secondary = layer === 0;
      const count = secondary ? 12 : 32;
      for (let row = 0; row < count; row++) {
        const lane = row / (count - 1);
        const alpha = secondary ? 0.13 : 0.12 + Math.sin(Math.PI * lane) * 0.48;
        context.strokeStyle = secondary ? `rgba(143,188,166,${alpha})` : `rgba(215,255,99,${alpha})`;
        context.lineWidth = secondary ? 0.7 : row % 7 === 0 ? 1.05 : 0.7;
        context.beginPath();
        for (let step = 0; step <= samples; step++) {
          const x = step / samples;
          const y = waveY(x, lane, phase, height, secondary);
          if (step === 0) context.moveTo(x * width, y);
          else context.lineTo(x * width, y);
        }
        context.stroke();
      }
    }
    for (let pulse = 0; pulse < 6; pulse++) {
      const lane = (3 + pulse * 5) / 31;
      const x = (phase * 0.075 + pulse * 0.173) % 1;
      const px = x * width, py = waveY(x, lane, phase, height);
      const fade = Math.min(1, x * 12, (1 - x) * 12);
      const halo = context.createRadialGradient(px, py, 0, px, py, 9);
      halo.addColorStop(0, `rgba(215,255,125,${0.4 * fade})`);
      halo.addColorStop(1, 'rgba(215,255,125,0)');
      context.fillStyle = halo;
      context.beginPath(); context.arc(px, py, 9, 0, Math.PI * 2); context.fill();
      context.fillStyle = `rgba(237,255,202,${fade})`;
      context.beginPath(); context.arc(px, py, 1.7, 0, Math.PI * 2); context.fill();
    }
  };
  const tick = time => {
    frame = null;
    if (destroyed || state() !== 'running') { lastDraw = 0; return; }
    if (!lastDraw || time - lastDraw >= 1000 / 30) {
      if (lastDraw) phase += Math.min(time - lastDraw, 100) * 0.0006;
      lastDraw = time;
      draw();
    }
    frame = win.requestAnimationFrame(tick);
  };
  const sync = () => {
    if (destroyed) return;
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null; lastDraw = 0;
    const current = state();
    root.dataset.waveState = current;
    button.disabled = reducedMotion.matches;
    button.textContent = reducedMotion.matches ? 'Motion off' : userPaused ? 'Play motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(userPaused || reducedMotion.matches));
    button.setAttribute('aria-label', reducedMotion.matches ? 'Animation disabled by reduced motion preference' : userPaused ? 'Play information-flow animation' : 'Pause information-flow animation');
    draw();
    if (current === 'running') frame = win.requestAnimationFrame(tick);
  };
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const ratio = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  };
  const toggle = () => { if (!reducedMotion.matches) { userPaused = !userPaused; sync(); } };
  const sizeObserver = new win.ResizeObserver(resize);
  const visibilityObserver = new win.IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.05 });
  root.classList.add('wave-ready');
  button.addEventListener('click', toggle);
  reducedMotion.addEventListener('change', sync);
  doc.addEventListener('visibilitychange', sync);
  sizeObserver.observe(canvas);
  visibilityObserver.observe(canvas);
  resize(); sync();
  return {
    destroy() {
      destroyed = true;
      if (frame !== null) win.cancelAnimationFrame(frame);
      sizeObserver.disconnect(); visibilityObserver.disconnect();
      button.removeEventListener('click', toggle);
      reducedMotion.removeEventListener('change', sync);
      doc.removeEventListener('visibilitychange', sync);
      root.classList.remove('wave-ready');
      delete root.dataset.waveState;
    },
  };
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-wavefield]').forEach(root => mountWavefield(root));
}
