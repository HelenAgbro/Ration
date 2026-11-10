/* ==========================================================================
   Ration — interaction layer
   GSAP + ScrollTrigger. Everything degrades gracefully without them.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = reduceQuery.matches;
  if (prefersReduced) root.classList.add('reduce-motion');

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var hasMotion = !!(gsap && ScrollTrigger);
  if (hasMotion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.ScrollToPlugin) gsap.registerPlugin(window.ScrollToPlugin);
  }

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  /* -----------------------------------------------------------------------
     Navigation
     -------------------------------------------------------------------- */
  var nav = $('.nav');
  var menu = $('#mobile-menu');
  var burger = $('.nav-burger');
  var lastY = window.scrollY;
  var ticking = false;

  function updateNav() {
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 12);
    if (menu && !menu.classList.contains('is-open')) {
      nav.classList.toggle('is-hidden', y > 560 && y > lastY + 4);
    }
    lastY = y;
    ticking = false;
    updateActiveLink(y);
  }

  function requestNavUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateNav);
  }
  window.addEventListener('scroll', requestNavUpdate, { passive: true });
  window.addEventListener('resize', requestNavUpdate);

  var navLinks = $$('.nav-link');
  var spyIds = ['home', 'features', 'pricing', 'contact'];
  function updateActiveLink(y) {
    var active = 'home';
    spyIds.forEach(function (id) {
      var el = doc.getElementById(id);
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      if (y + window.innerHeight * 0.34 >= top) active = id;
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      link.classList.toggle('is-active', href === '#' + active);
    });
  }
  updateActiveLink(window.scrollY);
  updateNav();

  /* Mobile menu ----------------------------------------------------------- */
  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    doc.body.style.overflow = open ? 'hidden' : '';
    var use = burger.querySelector('use');
    if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      setMenu(!menu.classList.contains('is-open'));
    });
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* -----------------------------------------------------------------------
     Utilities
     -------------------------------------------------------------------- */
  function splitWords(el) {
    if (!el || el.dataset.splitDone === 'true') return [];
    var children = Array.prototype.slice.call(el.childNodes);
    var inners = [];
    el.textContent = '';
    children.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk) return;
          if (!chunk.trim()) {
            el.appendChild(doc.createTextNode(' '));
            return;
          }
          var mask = doc.createElement('span');
          mask.className = 'word-mask';
          var inner = doc.createElement('span');
          inner.className = 'word';
          inner.textContent = chunk;
          mask.appendChild(inner);
          el.appendChild(mask);
          inners.push(inner);
        });
      } else {
        el.appendChild(node.cloneNode(true));
      }
    });
    el.dataset.splitDone = 'true';
    return inners;
  }

  /* -----------------------------------------------------------------------
     Hero entrance
     -------------------------------------------------------------------- */
  var heroTitle = $('[data-hero="title"]');
  if (heroTitle) {
    var heroWords = splitWords(heroTitle);
    if (hasMotion && !prefersReduced) {
      var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('[data-hero="eyebrow"]', { y: 14, autoAlpha: 0, duration: .6 }, 0)
        .from(heroWords, { yPercent: 118, duration: 1, stagger: .05 }, .06)
        .from('[data-hero="sub"]', { y: 16, autoAlpha: 0, duration: .8 }, .34)
        .from('[data-hero="showcase"]', { y: 46, autoAlpha: 0, scale: .985, duration: 1.1 }, .42);
    }
  }

  /* -----------------------------------------------------------------------
     Hero slider
     -------------------------------------------------------------------- */
  var slides = $$('.hero-slide');
  var tabs = $$('.hero-tab');
  var showcase = $('[data-hero="showcase"]');
  var viewport = $('[data-hero-slider]');
  var captionModule = $('[data-caption-module]');
  var captionText = $('[data-caption-text]');
  var countEl = $('[data-hero-count]');
  var progressEl = $('[data-hero-progress]');
  var prevBtn = $('[data-hero-prev]');
  var nextBtn = $('[data-hero-next]');

  var slideMeta = [
    { module: 'Ration Message', text: 'Email on your own domain — threaded, standards-based and built for business.' },
    { module: 'Ration Chat', text: 'Direct messages, group conversations and rails that keep their context.' },
    { module: 'Ration Calendar', text: 'Shared availability and invitations that stay in sync across teams.' },
    { module: 'Ration Forms', text: 'Structured requests that route straight to the team that acts on them.' }
  ];

  var current = 0;
  var isAnimating = false;
  var isHovering = false;
  var isInView = true;
  var progressTween = null;
  var slideDuration = 6.2;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function updateMeta(index) {
    var meta = slideMeta[index] || slideMeta[0];
    if (captionModule) captionModule.textContent = meta.module;
    if (captionText) captionText.textContent = meta.text;
    if (countEl) countEl.textContent = pad(index + 1) + ' / ' + pad(slides.length);
    tabs.forEach(function (tab, i) {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-pressed', String(i === index));
    });
  }

  function restartProgress() {
    if (!hasMotion || prefersReduced || !progressEl) return;
    if (progressTween) { progressTween.kill(); progressTween = null; }
    gsap.set(progressEl, { width: '0%' });
    if (!isInView || isHovering || doc.hidden) return;
    progressTween = gsap.to(progressEl, {
      width: '100%',
      duration: slideDuration,
      ease: 'none',
      onComplete: function () { goTo(current + 1); }
    });
  }

  function resumeProgress() {
    if (!hasMotion || prefersReduced) return;
    if (!progressTween || !progressTween.isActive()) { restartProgress(); return; }
    progressTween.resume();
  }

  function relativeOffset(i, active, count) {
    var diff = i - active;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  }

  function layoutSlides(active, animate, onComplete) {
    var stacked = window.matchMedia('(max-width: 720px)').matches;
    var tl = null;
    if (animate && hasMotion && !prefersReduced) {
      tl = gsap.timeline({ onComplete: onComplete });
    }

    slides.forEach(function (slide, i) {
      var diff = relativeOffset(i, active, slides.length);
      var abs = Math.abs(diff);
      var zIndex = abs === 0 ? 100 : (abs === 1 ? 90 : 80);
      var props;

      if (stacked) {
        props = { xPercent: 0, z: 0, rotateY: 0, autoAlpha: abs === 0 ? 1 : 0 };
      } else {
        props = {
          xPercent: diff * (abs > 1 ? 92 : 46),
          z: abs === 0 ? 0 : (abs === 1 ? -320 : -640),
          rotateY: abs === 0 ? 0 : (diff > 0 ? -34 : 34) * abs,
          autoAlpha: abs === 0 ? 1 : (abs === 1 ? .9 : 0)
        };
      }

      gsap.set(slide, { zIndex: zIndex });
      slide.setAttribute('aria-hidden', abs === 0 ? 'false' : 'true');

      if (tl) {
        tl.to(slide, Object.assign({ duration: .9, ease: 'power3.inOut', overwrite: true }, props), 0);
      } else {
        gsap.set(slide, props);
      }
    });

    if (!tl && onComplete) onComplete();
    return tl;
  }

  function goTo(next) {
    if (!slides.length) return;
    next = ((next % slides.length) + slides.length) % slides.length;
    if (next === current || isAnimating) return;

    var outgoing = slides[current];
    var focusWasOnTab = doc.activeElement && doc.activeElement.classList.contains('hero-tab');
    isAnimating = true;

    slides[next].classList.add('is-active');
    updateMeta(next);
    current = next;

    var finish = function () {
      outgoing.classList.remove('is-active');
      isAnimating = false;
      restartProgress();
    };

    if (!hasMotion || prefersReduced) {
      layoutSlides(next, false, finish);
    } else {
      layoutSlides(next, true, finish);
      gsap.fromTo([captionModule, captionText],
        { autoAlpha: 0, y: 5 },
        { autoAlpha: 1, y: 0, duration: .4, stagger: .04, ease: 'power2.out', overwrite: true }
      );
    }

    if (focusWasOnTab && tabs[next]) tabs[next].focus();
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layoutSlides(current, false); }, 150);
  });

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      goTo(Number(tab.dataset.index));
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

  if (showcase) {
    showcase.addEventListener('mouseenter', function () {
      isHovering = true;
      if (progressTween) progressTween.pause();
    });
    showcase.addEventListener('mouseleave', function () {
      isHovering = false;
      if (!doc.hidden) resumeProgress();
    });
    showcase.addEventListener('focusin', function () {
      isHovering = true;
      if (progressTween) progressTween.pause();
    });
    showcase.addEventListener('focusout', function (event) {
      if (!showcase.contains(event.relatedTarget)) {
        isHovering = false;
        if (!doc.hidden) resumeProgress();
      }
    });
    showcase.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1); }
    });
  }

  if (viewport) {
    var startX = null;
    viewport.addEventListener('pointerdown', function (event) {
      startX = event.clientX;
    });
    viewport.addEventListener('pointercancel', function () { startX = null; });
    viewport.addEventListener('pointerup', function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 45) goTo(current + (dx < 0 ? 1 : -1));
    });
  }

  if ('IntersectionObserver' in window && showcase) {
    new IntersectionObserver(function (entries) {
      isInView = entries[0].isIntersecting;
      if (!isInView) {
        if (progressTween) progressTween.pause();
      } else if (!isHovering && !doc.hidden) {
        resumeProgress();
      }
    }, { threshold: 0.08 }).observe(showcase);
  }

  doc.addEventListener('visibilitychange', function () {
    if (!progressTween) return;
    if (doc.hidden) progressTween.pause();
    else if (isInView && !isHovering) resumeProgress();
  });

  updateMeta(0);
  layoutSlides(0, false);
  restartProgress();

  /* -----------------------------------------------------------------------
     Scroll reveals
     -------------------------------------------------------------------- */
  function initReveals() {
    if (!hasMotion || prefersReduced) return;

    $$('[data-split]').forEach(function (heading) {
      var words = splitWords(heading);
      if (!words.length) return;
      gsap.from(words, {
        yPercent: 112,
        duration: .8,
        stagger: .022,
        ease: 'power3.out',
        scrollTrigger: { trigger: heading, start: 'top 95%', once: true },
        onComplete: function () { gsap.set(words, { clearProps: 'transform' }); }
      });
    });

    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, {
        y: 22,
        autoAlpha: 0,
        duration: .75,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 96%' }
      });
    });

    $$('[data-reveal-group]').forEach(function (group) {
      gsap.from(group.children, {
        y: 26,
        autoAlpha: 0,
        duration: .72,
        stagger: .075,
        ease: 'power2.out',
        scrollTrigger: { trigger: group, start: 'top 94%' }
      });
    });

    gsap.from('.app-rings circle', {
      scale: .92,
      autoAlpha: 0,
      transformOrigin: '50% 50%',
      duration: 1.2,
      stagger: .07,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.apps-intro', start: 'top 92%' }
    });

    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.dataset.count);
      if (isNaN(end)) return;
      var state = { value: 0 };
      gsap.to(state, {
        value: end,
        duration: 1.4,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 96%', once: true },
        onUpdate: function () { el.textContent = String(Math.round(state.value)); }
      });
    });
  }

  /* -----------------------------------------------------------------------
     Module marquee
     -------------------------------------------------------------------- */
  var marquee = $('[data-marquee]');
  if (marquee && hasMotion && !prefersReduced) {
    gsap.to(marquee, { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
  }

  /* -----------------------------------------------------------------------
     Eight apps — horizontal scroll on desktop, stacked reveals on mobile
     -------------------------------------------------------------------- */
  var stage = $('.apps-stage');
  var track = $('[data-apps-track]');
  var panels = $$('[data-app-panel]');
  var hudName = $('[data-hud-name]');
  var hudIndex = $('[data-hud-index]');
  var hudBar = $('[data-hud-bar]');
  var activePanel = -1;

  function panelItems(panel) {
    return panel ? panel.querySelectorAll('.anim-item') : [];
  }

  function animatePanel(panel) {
    var items = panelItems(panel);
    if (!items.length) return;
    gsap.killTweensOf(items);
    gsap.fromTo(items,
      { y: 16, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: .65, stagger: .045, ease: 'power2.out', overwrite: true }
    );
  }

  function setActivePanel(index, animate) {
    if (!panels.length) return;
    index = clamp(index, 0, panels.length - 1);
    if (index === activePanel) return;

    if (activePanel > -1 && animate) {
      gsap.set(panelItems(panels[activePanel]), { autoAlpha: 0, y: 14 });
    }
    activePanel = index;

    panels.forEach(function (item, i) {
      if (i === index) {
        item.removeAttribute('inert');
        item.removeAttribute('aria-hidden');
      } else {
        item.setAttribute('inert', '');
        item.setAttribute('aria-hidden', 'true');
      }
    });

    var panel = panels[index];
    var label = panel.querySelector('.app-label');
    var accent = window.getComputedStyle(panel).getPropertyValue('--accent').trim();
    if (hudName && label) hudName.textContent = label.textContent;
    if (hudIndex) hudIndex.textContent = pad(index + 1);
    if (hudBar && accent) hudBar.style.background = accent;
    if (animate) animatePanel(panel);
  }

  if (stage && track && panels.length && hasMotion && !prefersReduced) {
    var desktop = gsap.matchMedia();

    desktop.add('(min-width: 1025px)', function () {
      setActivePanel(0, false);
      gsap.set(panelItems(panels[0]), { autoAlpha: 1, y: 0 });

      var getAmount = function () { return (panels.length - 1) * window.innerWidth; };
      var slideTween = gsap.to(track, {
        x: function () { return -getAmount(); },
        ease: 'none'
      });

      var trigger = ScrollTrigger.create({
        trigger: stage,
        start: 'top top',
        end: function () { return '+=' + getAmount(); },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: slideTween,
        onUpdate: function (self) {
          var index = Math.round(self.progress * (panels.length - 1));
          setActivePanel(index, true);
          if (hudBar) gsap.set(hudBar, { width: (self.progress * 100) + '%' });
        }
      });

      return function () {
        trigger.kill();
        slideTween.kill();
        gsap.set(track, { clearProps: 'transform' });
        panels.forEach(function (panel) { panel.removeAttribute('inert'); panel.removeAttribute('aria-hidden'); gsap.set(panelItems(panel), { clearProps: 'opacity,visibility,transform' }); });
      };
    });

    desktop.add('(max-width: 1024px)', function () {
      panels.forEach(function (panel) {
        panel.removeAttribute('inert');
        panel.removeAttribute('aria-hidden');
        gsap.set(panelItems(panel), { clearProps: 'opacity,visibility,transform' });
        gsap.from(panelItems(panel), {
          y: 22,
          autoAlpha: 0,
          duration: .65,
          stagger: .045,
          ease: 'power2.out',
          scrollTrigger: { trigger: panel, start: 'top 80%' }
        });
      });
    });
  }

  /* -----------------------------------------------------------------------
     Hero / section parallax
     -------------------------------------------------------------------- */
  if (hasMotion && !prefersReduced) {
    var parallax = gsap.matchMedia();
    parallax.add('(min-width: 1025px)', function () {
      gsap.to('.hero-showcase-wrap', {
        yPercent: -3,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
      gsap.to('.app-rings', {
        y: 46,
        ease: 'none',
        scrollTrigger: { trigger: '.apps-intro', start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.to('.cta-rings span', {
        rotate: 22,
        ease: 'none',
        scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* -----------------------------------------------------------------------
     Sovereign cloud — region list ↔ map pins
     -------------------------------------------------------------------- */
  var regionRows = $$('.region-row');
  var mapPins = $$('.map-pin');

  function highlightRegion(name, on) {
    mapPins.forEach(function (pin) {
      pin.classList.toggle('is-active', on && pin.dataset.pin === name);
    });
    regionRows.forEach(function (row) {
      row.classList.toggle('is-active', on && row.dataset.region === name);
    });
  }

  regionRows.forEach(function (row) {
    row.addEventListener('mouseenter', function () { highlightRegion(row.dataset.region, true); });
    row.addEventListener('mouseleave', function () { highlightRegion(row.dataset.region, false); });
  });
  mapPins.forEach(function (pin) {
    pin.addEventListener('mouseenter', function () { highlightRegion(pin.dataset.pin, true); });
    pin.addEventListener('mouseleave', function () { highlightRegion(pin.dataset.pin, false); });
  });

  if (hasMotion && !prefersReduced && mapPins.length) {
    gsap.from(mapPins, {
      scale: 0,
      autoAlpha: 0,
      transformOrigin: '50% 50%',
      duration: .5,
      stagger: .09,
      ease: 'back.out(2)',
      scrollTrigger: { trigger: '.cloud-map', start: 'top 78%', once: true }
    });
  }

  /* -----------------------------------------------------------------------
     Pricing — monthly / annual
     -------------------------------------------------------------------- */
  var billingButtons = $$('.billing-btn');
  var priceAmounts = $$('.price-amount');
  var pricePeriods = $$('.price-period');

  function setBilling(mode) {
    billingButtons.forEach(function (btn) {
      var isActive = btn.dataset.billing === mode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    priceAmounts.forEach(function (el) {
      var value = el.getAttribute('data-' + mode);
      if (!value) return;
      if (hasMotion && !prefersReduced) {
        gsap.fromTo(el,
          { yPercent: 32, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: .38, ease: 'power2.out', onStart: function () { el.textContent = value; } }
        );
      } else {
        el.textContent = value;
      }
    });

    pricePeriods.forEach(function (el) {
      var value = el.getAttribute('data-' + mode);
      if (value) el.textContent = value;
    });
  }

  billingButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { setBilling(btn.dataset.billing); });
  });

  /* -----------------------------------------------------------------------
     FAQ accordion
     -------------------------------------------------------------------- */
  var faqItems = $$('.faq-item');

  function closeFaq(item) {
    var button = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    if (!button || !panel) return;
    item.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    if (!hasMotion || prefersReduced) { panel.style.height = '0px'; return; }
    gsap.to(panel, { height: 0, duration: .34, ease: 'power2.inOut', overwrite: true });
  }

  function openFaq(item) {
    var button = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    if (!button || !panel) return;
    item.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    if (!hasMotion || prefersReduced) { panel.style.height = 'auto'; return; }
    gsap.to(panel, { height: 'auto', duration: .42, ease: 'power2.inOut', overwrite: true });
  }

  faqItems.forEach(function (item) {
    var button = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    if (!button || !panel) return;
    if (item.classList.contains('is-open')) { panel.style.height = 'auto'; panel.setAttribute('aria-hidden', 'false'); }
    else { panel.setAttribute('aria-hidden', 'true'); }
    button.addEventListener('click', function () {
      if (item.classList.contains('is-open')) {
        closeFaq(item);
        return;
      }
      faqItems.forEach(function (other) {
        if (other !== item && other.classList.contains('is-open')) closeFaq(other);
      });
      openFaq(item);
    });
  });

  /* -----------------------------------------------------------------------
     Smooth anchor navigation
     -------------------------------------------------------------------- */
  if (hasMotion && window.ScrollToPlugin && !prefersReduced) {
    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var hash = link.getAttribute('href');
        if (!hash || hash.length < 2) return;
        var target = doc.querySelector(hash);
        if (!target) return;
        event.preventDefault();
        setMenu(false);
        var offset = hash === '#apps-stage' ? 0 : 84;
        gsap.to(window, {
          duration: .9,
          ease: 'power2.inOut',
          scrollTo: { y: target, offsetY: offset },
          onComplete: function () {
            if (history.pushState) history.pushState(null, '', hash);
          }
        });
      });
    });
  }

  /* -----------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------- */
  initReveals();

  window.addEventListener('load', function () {
    if (hasMotion) ScrollTrigger.refresh();
  });
})();
