const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const solutionsHtml = readFileSync(path.join(root, 'solutions.html'), 'utf8');
const contactHtml = readFileSync(path.join(root, 'contact.html'), 'utf8');
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
  function flush(steps = 10, time = 0) {
    for (let n = 0; frames.size && n < steps; n++) {
      const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time));
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
  return { w, d, slides, check, scroll, flush, advance: time => { for (let t = 0; t <= time; t += 32) flush(1, t); }, intersect: visible => intersect([{isIntersecting: visible}]), start, distance: height * 2.2, close: () => dom.window.close() };
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

test('solutions page header, sections and assets resolve', () => {
  const dom = new JSDOM(solutionsHtml);
  const d = dom.window.document;
  try {
    assert.equal(d.querySelector('.sol-hero h1').textContent.trim().replace(/\s+/g, ' '), 'Start from what your organisation needs to do.');
    assert.deepEqual([...d.querySelectorAll('.nav-links .nav-link')].map(a => a.textContent.trim()), ['Product', 'Solutions', 'Pricing', 'Resources', 'Support', 'Contact']);
    assert.deepEqual([...d.querySelectorAll('.nav-actions .btn')].map(a => a.textContent.trim()), ['Log in', 'Get started']);
    for (const id of ['overview', 'capabilities', 'situations', 'organisations', 'editions', 'pricing', 'resources', 'sol-contact']) assert.ok(d.getElementById(id), id);
    const ids = [...d.querySelectorAll('[id]')].map(e => e.id);
    assert.equal(ids.length, new Set(ids).size);
    for (const el of d.querySelectorAll('[href^="#"]')) assert.ok(d.getElementById(el.getAttribute('href').slice(1)), el.getAttribute('href'));
    for (const el of d.querySelectorAll('[src]')) {
      const src = el.getAttribute('src');
      if (/^https?:/.test(src)) continue;
      assert.ok(existsSync(path.join(root, src)), src);
    }
    assert.ok(existsSync(path.join(root, 'assets/css/solutions.css')));
  } finally { dom.window.close(); }
});

test('contact page header, details, map and assets resolve', () => {
  const dom = new JSDOM(contactHtml);
  const d = dom.window.document;
  try {
    assert.equal(d.querySelector('title').textContent, 'Contact Ration | Talk to Sales');
    assert.deepEqual([...d.querySelectorAll('.nav-links .nav-link')].map(a => a.textContent.trim()), ['Product', 'Solutions', 'Pricing', 'Resources', 'Support', 'Contact']);
    assert.equal(d.querySelector('.nav-link.is-active').textContent.trim(), 'Contact');
    assert.deepEqual([...d.querySelectorAll('.nav-actions .btn')].map(a => a.textContent.trim()), ['Log in', 'Get started']);
    for (const id of ['contact-hero', 'channels', 'location', 'try-ration']) assert.ok(d.getElementById(id), id);
    assert.ok(d.querySelector('.contact-card').textContent.includes('support@ration.works'));
    assert.ok(d.querySelector('.contact-card').textContent.includes('+234 201 889 1810'));
    const officeMap = d.querySelector('#office-map');
    assert.ok(officeMap);
    assert.equal(officeMap.dataset.lat, '6.428286');
    assert.equal(officeMap.dataset.lng, '3.456032');
    assert.equal(officeMap.dataset.zoom, '17');
    assert.ok(d.querySelector('script[src="assets/js/contact.js"]'));
    assert.ok(existsSync(path.join(root, 'assets/vendor/leaflet.js')));
    assert.ok(existsSync(path.join(root, 'assets/vendor/leaflet.css')));
    assert.equal(d.querySelector('.contact-card .link-arrow').getAttribute('href'), '#location');
    assert.equal(d.querySelectorAll('a[href*="google.com/maps"]').length, 0);
    const ids = [...d.querySelectorAll('[id]')].map(e => e.id);
    assert.equal(ids.length, new Set(ids).size);
    for (const el of d.querySelectorAll('[href^="#"]')) assert.ok(d.getElementById(el.getAttribute('href').slice(1)), el.getAttribute('href'));
    for (const el of d.querySelectorAll('[src]')) {
      const src = el.getAttribute('src');
      if (/^https?:/.test(src)) continue;
      assert.ok(existsSync(path.join(root, src)), src);
    }
    assert.ok(existsSync(path.join(root, 'assets/css/contact.css')));
  } finally { dom.window.close(); }
});

test('editorial backgrounds, assets and fragment targets resolve', () => {
  const dom = new JSDOM(html);
  const d = dom.window.document;
  try {
    assert.equal(d.querySelectorAll('#stories .assurance-topic').length, 3);
    assert.equal(d.querySelectorAll('#stories .story').length, 0);
    assert.equal(d.querySelector('.assurance-globe'), null);
    assert.ok(!d.querySelector('#stories').textContent.includes('[CERTIFICATION'));
    assert.deepEqual([...d.querySelectorAll('.assurance-answer .link-arrow')].map(a => a.getAttribute('href')), ['#cloud', '#apps-stage', '#deploy']);
    assert.equal(d.querySelector('#pricing').previousElementSibling.classList.contains('workspace-roles'), true);
    assert.equal(d.querySelector('#stories').previousElementSibling.id, 'ration-docs-desktop');
    assert.equal(d.querySelector('#stories').nextElementSibling.id, 'faq');
    const ids = [...d.querySelectorAll('[id]')].map(e => e.id);
    assert.equal(ids.length, new Set(ids).size);
    for (const el of d.querySelectorAll('[href^="#"]')) assert.ok(d.getElementById(el.getAttribute('href').slice(1)));
    for (const el of d.querySelectorAll('[src]')) assert.ok(existsSync(path.join(root, el.getAttribute('src'))));
    const css = readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
    for (const match of css.matchAll(/url\(['"]?(\.\.?\/[^'"\)]+)['"]?\)/g)) {
      assert.ok(existsSync(path.resolve(root,'assets/css',match[1])), match[1]);
    }
    const solCss = readFileSync(path.join(root,'assets/css/solutions.css'),'utf8');
    for (const match of solCss.matchAll(/url\(['"]?(\.\.?\/[^'"\)]+)['"]?\)/g)) {
      assert.ok(existsSync(path.resolve(root,'assets/css',match[1])), match[1]);
    }
  } finally { dom.window.close(); }
});
