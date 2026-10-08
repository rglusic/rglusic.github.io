const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const nav = document.querySelector('[data-nav]');
const menu = document.querySelector('[data-menu]');
const closeMenu = () => {
  if (!nav || !menu) return;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  nav.classList.remove('is-open');
};
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  nav.classList.toggle('is-open', open);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

const copyButton = document.querySelector('[data-copy-email]');
copyButton?.addEventListener('click', async () => {
  const status = document.querySelector('[data-copy-status]');
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
    status.textContent = 'Email copied';
  } catch {
    status.textContent = 'Select the email address above to copy it';
  }
});

// Decorative mathematical study. This is not a representation of research results.
const canvas = document.querySelector('[data-field]');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const pause = document.querySelector('[data-pause]');
  const field = canvas.closest('.field-study');
  let width = 0, height = 0, phase = 0.38, frame = null, lastTime = 0;
  let manualPause = false, visible = true, pointerX = 0, pointerY = 0;
  const motionAllowed = () => !manualPause && !reduceMotion.matches && visible && !document.hidden;
  const project = (u, v, t) => {
    const major = 1.2, minor = 0.46;
    let x = (major + minor * Math.cos(v)) * Math.cos(u);
    let y = (major + minor * Math.cos(v)) * Math.sin(u);
    let z = minor * Math.sin(v);
    const tilt = 0.86 + pointerY * 0.13, rotation = t + pointerX * 0.14;
    const x1 = x * Math.cos(rotation) - y * Math.sin(rotation);
    const y1 = x * Math.sin(rotation) + y * Math.cos(rotation);
    x = x1;
    y = y1 * Math.cos(tilt) - z * Math.sin(tilt);
    z = y1 * Math.sin(tilt) + z * Math.cos(tilt);
    // Rotate the entire torus so it stands diagonally, rather than like a flat ring.
    const angle = -0.56;
    const px = x * Math.cos(angle) - y * Math.sin(angle);
    const py = x * Math.sin(angle) + y * Math.cos(angle);
    const perspective = 4.5 / (4.5 - z);
    const scale = Math.min(width, height) * 0.247;
    return { x: width / 2 + px * scale * perspective, y: height / 2 + py * scale * perspective, z };
  };
  const draw = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const segments = [];
    for (let a = 0; a < 64; a++) {
      for (let b = 0; b < 24; b++) {
        const u = a / 64 * Math.PI * 2, v = b / 24 * Math.PI * 2;
        const p = project(u, v, phase);
        for (const q of [project(u + Math.PI * 2 / 64, v, phase), project(u, v + Math.PI * 2 / 24, phase)]) {
          segments.push({ p, q, z: (p.z + q.z) / 2 });
        }
      }
    }
    segments.sort((a, b) => a.z - b.z);
    ctx.lineWidth = 0.7;
    for (const { p, q, z } of segments) {
      const alpha = 0.11 + (z + 1.5) / 3 * 0.68;
      ctx.strokeStyle = `rgba(215,255,99,${alpha})`;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
  };
  const tick = time => {
    frame = null;
    if (!motionAllowed()) { lastTime = 0; return; }
    if (lastTime) phase += Math.min(time - lastTime, 50) * 0.00011;
    lastTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    const paused = manualPause || reduceMotion.matches;
    pause.textContent = reduceMotion.matches ? 'Motion off' : paused ? 'Play motion' : 'Pause motion';
    pause.disabled = reduceMotion.matches;
    pause.setAttribute('aria-pressed', String(paused));
    if (frame) cancelAnimationFrame(frame);
    frame = null; lastTime = 0;
    draw();
    if (motionAllowed()) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  };
  if (ctx) {
    document.documentElement.classList.add('has-canvas');
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(canvas);
    field.addEventListener('pointermove', event => {
      if (reduceMotion.matches || manualPause || event.pointerType === 'touch') return;
      const bounds = field.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
    });
    field.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
    pause.addEventListener('click', () => {
      // Respect OS reduced motion; playing is an explicit visitor choice.
      if (reduceMotion.matches) {
        pause.textContent = 'Reduced motion enabled';
        pause.setAttribute('aria-pressed', 'true');
        return;
      }
      manualPause = !manualPause; sync();
    });
    reduceMotion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    resize(); sync();
  } else {
    pause.hidden = true;
  }
}
