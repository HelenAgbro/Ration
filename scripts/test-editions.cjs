const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const source = readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');

// Run the complete interaction layer without GSAP. Layout measurements are
// fixtures: these tests verify scroll math and controls, not browser layout.
function page({ width = 1440, height = 900, contentHeight = 760, reduced = false, observer = false } = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const d = w.document;
  const track = d.querySelector('.deploy > .container');
  const shell = d.querySelector('.deploy-shell');
  const errors = [];
  const frames = new Map();
  const changes = [];
  let y = 0, serial = 0, intersect;
  if (observer) w.IntersectionObserver = class {
    constructor(callback) { intersect = callback; }
    observe() {}
  };
  const start = 10000;
  Object.defineProperties(w, {
    innerWidth: { value: width, configurable: true },
    innerHeight: { value: height, configurable: true },
    scrollY: { get: () => y }
  });
  Object.defineProperty(track, 'offsetHeight', { get: () => height * 3.2 });
  Object.defineProperties(shell, {
    offsetHeight: { get: () => height },
    scrollHeight: { get: () => Math.max(height, contentHeight) }
  });
  track.getBoundingClientRect = () => ({ top: start - y });
  w.matchMedia = query => ({
    matches: query.includes('reduced-motion') && reduced,
    addEventListener(type, callback) { if (query.includes('reduced-motion')) changes.push(callback); },
    removeEventListener() {}, addListener() {}, removeListener() {}
  });
  w.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.addEventListener('error', e => { errors.push(e.error); e.preventDefault(); });
  function flush() {
    for (let n = 0; frames.size && n < 10; n++) {
      const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(0));
    }
    assert.deepEqual(errors, []);
  }
  function scroll(top) { y = top; w.dispatchEvent(new w.Event('scroll')); flush(); }
  w.scrollTo = options => scroll(options.top);
  w.eval(source);
  flush();
  const slides = [...d.querySelectorAll('[data-deploy-slide]')];
  function check(index) {
    assert.equal(d.querySelector('[data-deploy-index]').textContent, '0' + (index + 1));
    slides.forEach((s, i) => {
      assert.equal(s.classList.contains('is-active'), i === index);
      assert.equal(s.getAttribute('aria-hidden'), String(i !== index));
      assert.equal(s.inert, i !== index);
    });
    [...d.querySelectorAll('[data-deploy-tab]')].forEach((tab, i) => {
      assert.equal(tab.getAttribute('aria-pressed'), String(i === index));
    });
    assert.deepEqual(errors, []);
  }
  return { w, d, slides, check, scroll, flush, intersect: visible => intersect([{isIntersecting: visible}]), start, distance: height * 2.2, close: () => dom.window.close() };
}

for (const [width, height, contentHeight] of [[1440,900,760], [1024,768,720], [390,844,800]]) {
  test(`native editions scroll at ${width}×${height} without animation libraries`, () => {
    const p = page({ width, height, contentHeight });
    try {
      assert.ok(p.d.querySelector('.deploy').classList.contains('is-scroll-driven'));
      for (const i of [0,1,2,1,0]) {
        p.scroll(p.start + p.distance * (.25 + i * 1.5) / 3.5);
        p.check(i);
        assert.equal(p.slides[i].style.transform, 'translate3d(0,0.000%,0)');
      }
      // Mid-transition positions are continuous in either direction.
      p.scroll(p.start + p.distance / 3.5);
      assert.equal(p.slides[0].style.transform, 'translate3d(0,-50.000%,0)');
      assert.equal(p.slides[1].style.transform, 'translate3d(0,50.000%,0)');
      for (const i of [0,1,2]) {
        p.d.querySelector(`[data-deploy-tab="${i}"]`).click();
        p.check(i);
        assert.equal(p.slides[i].style.transform, 'translate3d(0,0.000%,0)');
      }
      p.d.querySelector('[data-deploy-prev]').click(); p.check(1);
      p.d.querySelector('[data-deploy-next]').click(); p.check(2);
      p.d.querySelector('[data-deploy-slider]').dispatchEvent(new p.w.KeyboardEvent('keydown', {key:'Home'})); p.check(0);
      p.scroll(p.start - height); p.check(0);
      p.scroll(p.start + p.distance + height); p.check(2);
    } finally { p.close(); }
  });
}
for (const options of [{reduced:true}, {height:500,contentHeight:760}]) {
  test(`manual controls when ${options.reduced ? 'motion is reduced' : 'the frame does not fit'}`, () => {
    const p = page(options);
    try {
      assert.equal(p.d.querySelector('.deploy').classList.contains('is-scroll-driven'), false);
      p.check(0);
      p.d.querySelector('[data-deploy-next]').click(); p.check(1);
      p.d.querySelector('[data-deploy-tab="2"]').click(); p.check(2);
      p.d.querySelector('[data-deploy-next]').click(); p.check(0);
      p.d.querySelector('[data-deploy-slider]').dispatchEvent(new p.w.KeyboardEvent('keydown', {key:'End'})); p.check(2);
    } finally { p.close(); }
  });
}

test('editorial backgrounds, assets and fragment targets resolve', () => {
  const dom = new JSDOM(html);
  const d = dom.window.document;
  try {
    assert.equal(d.querySelectorAll('#stories .assurance-panel').length, 2);
    assert.equal(d.querySelectorAll('#stories .story').length, 0);
    assert.equal(d.querySelector('#stories').previousElementSibling.id, 'pricing');
    assert.equal(d.querySelector('#stories').nextElementSibling.id, 'faq');
    const ids = [...d.querySelectorAll('[id]')].map(e => e.id);
    assert.equal(ids.length, new Set(ids).size);
    for (const el of d.querySelectorAll('[href^="#"]')) assert.ok(d.getElementById(el.getAttribute('href').slice(1)));
    for (const el of d.querySelectorAll('[src]')) assert.ok(existsSync(path.join(root, el.getAttribute('src'))));
    const css = readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
    for (const match of css.matchAll(/url\(['"]?(\.\.?\/[^'"\)]+)['"]?\)/g)) {
      assert.ok(existsSync(path.resolve(root,'assets/css',match[1])), match[1]);
    }
  } finally { dom.window.close(); }
});


test('security illustration reveals once, pauses offscreen and bounds pointer drift', () => {
  const p = page({observer: true});
  try {
    const section = p.d.querySelector('.assurance');
    const panel = p.d.querySelector('.assurance-sovereignty');
    assert.equal(section.classList.contains('has-entered'), false);
    p.intersect(true);
    assert.equal(section.classList.contains('has-entered'), true);
    assert.equal(section.classList.contains('is-art-active'), true);
    p.intersect(false);
    assert.equal(section.classList.contains('has-entered'), true);
    assert.equal(section.classList.contains('is-art-active'), false);
    panel.getBoundingClientRect = () => ({left: 0, top: 0, width: 400, height: 400});
    panel.dispatchEvent(new p.w.MouseEvent('pointermove', {clientX: 9999, clientY: 9999}));
    assert.equal(panel.style.getPropertyValue('--art-x'), '5.00px');
    assert.equal(panel.style.getPropertyValue('--art-y'), '4.00px');
    panel.dispatchEvent(new p.w.Event('pointerleave'));
    assert.equal(panel.style.getPropertyValue('--art-x'), '');
    assert.equal(panel.style.getPropertyValue('--art-y'), '');
  } finally { p.close(); }
});

test('reduced motion prevents pointer drift', () => {
  const p = page({reduced: true});
  try {
    const panel = p.d.querySelector('.assurance-sovereignty');
    panel.getBoundingClientRect = () => ({left: 0, top: 0, width: 400, height: 400});
    panel.dispatchEvent(new p.w.MouseEvent('pointermove', {clientX: 400, clientY: 400}));
    assert.equal(panel.style.getPropertyValue('--art-x'), '');
    assert.equal(panel.style.getPropertyValue('--art-y'), '');
  } finally { p.close(); }
});
