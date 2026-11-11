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
  function pad(n) { return n < 10 ? '0' + n : String(n); }

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
  if (heroTitle && hasMotion && !prefersReduced) {
    var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from(heroTitle, { y: 26, autoAlpha: 0, duration: .9 }, 0)
      .from('[data-hero="sub"]', { y: 16, autoAlpha: 0, duration: .8 }, .22)
      .from('[data-hero="actions"] > *', { y: 14, autoAlpha: 0, duration: .7, stagger: .08 }, .34)
      .from('[data-hero="showcase"]', { y: 44, autoAlpha: 0, scale: .99, duration: 1, ease: 'power3.out' }, .46);
  }

  /* -----------------------------------------------------------------------
     Rotating headline word — continuous vertical track
     -------------------------------------------------------------------- */
  var rotator = $('[data-hero-rotate]');
  var rotateTrack = $('[data-hero-rotate-track]');
  var rotWords = rotateTrack ? $$('.hero-rotate-word', rotateTrack) : [];
  var rotStep = 0;

  if (rotateTrack && rotWords.length > 1) {
    var cloneWord = rotateTrack.querySelector('.hero-rotate-clone');

    rotWords.forEach(function (word, i) {
      word.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
    if (cloneWord) cloneWord.setAttribute('aria-hidden', 'true');

    if (hasMotion && !prefersReduced) {
      var rotateStep = function () {
        var nextStep = rotStep + 1;
        var isCloneStep = nextStep === rotWords.length - 1;
        var outgoing = rotWords[rotStep];
        var incoming = rotWords[nextStep];

        gsap.set(outgoing, { opacity: 1 });
        gsap.set(incoming, { opacity: .35 });

        rotWords.forEach(function (w, i) {
          w.classList.toggle('is-active', i === nextStep);
          var spokenIndex = isCloneStep ? 0 : nextStep;
          w.setAttribute('aria-hidden', i === spokenIndex ? 'false' : 'true');
        });
        if (cloneWord) cloneWord.setAttribute('aria-hidden', 'true');

        gsap.timeline({
          onComplete: function () {
            if (isCloneStep) {
              gsap.set(rotateTrack, { yPercent: 0 });
              rotStep = 0;
              rotWords.forEach(function (w, i) {
                w.classList.toggle('is-active', i === 0);
                w.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
              });
              if (cloneWord) cloneWord.setAttribute('aria-hidden', 'true');
              gsap.set(rotWords, { clearProps: 'opacity' });
            } else {
              rotStep = nextStep;
            }
            gsap.delayedCall(2.6, rotateStep);
          }
        })
          .to(rotateTrack, {
            yPercent: -(nextStep * 100 / rotWords.length),
            duration: .9,
            ease: 'power3.inOut'
          }, 0)
          .to(outgoing, { opacity: .35, duration: .55, ease: 'power2.inOut' }, 0)
          .to(incoming, { opacity: 1, duration: .7, ease: 'power2.out' }, .08);
      };

      gsap.delayedCall(3.2, rotateStep);
    }
  }

  /* -----------------------------------------------------------------------
     Hero coverflow
     -------------------------------------------------------------------- */
  var slides = $$('.hero-slide');
  var dots = $$('.hero-dot');
  var showcase = $('[data-hero="showcase"]');
  var viewport = $('[data-hero-slider]');
  var current = 0;
  var isAnimating = false;
  var isInView = true;
  var autoTimer = null;
  var SLIDE_HOLD = 5;
  var SLIDE_MOVE = .55;

  function updateDots(index) {
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-pressed', String(i === index));
    });
  }

  function relativeOffset(i, active, count) {
    var diff = i - active;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  }

  function layoutSlides(active, animate, onComplete) {
    if (!hasMotion) return;
    var stacked = window.matchMedia('(max-width: 720px)').matches;
    var tl = null;
    if (animate && !prefersReduced) {
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
        tl.to(slide, Object.assign({ duration: SLIDE_MOVE, ease: 'power3.inOut', overwrite: true }, props), 0);
      } else {
        gsap.set(slide, props);
      }
    });

    if (!tl && onComplete) onComplete();
    return tl;
  }

  function scheduleNext() {
    if (autoTimer) { autoTimer.kill(); autoTimer = null; }
    if (!hasMotion || prefersReduced || !isInView || doc.hidden) return;
    autoTimer = gsap.delayedCall(SLIDE_HOLD, function () { goTo(current + 1); });
  }

  function goTo(next, userInitiated) {
    if (!slides.length) return;
    next = ((next % slides.length) + slides.length) % slides.length;
    if (next === current || isAnimating) return;
    if (autoTimer) { autoTimer.kill(); autoTimer = null; }

    var outgoing = slides[current];
    var focusWasOnDot = doc.activeElement && doc.activeElement.classList.contains('hero-dot');
    isAnimating = true;

    slides[next].classList.add('is-active');
    updateDots(next);
    current = next;

    var finish = function () {
      outgoing.classList.remove('is-active');
      isAnimating = false;
      scheduleNext();
    };

    if (!hasMotion) {
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === next); });
      finish();
    } else if (prefersReduced) {
      layoutSlides(next, false, finish);
    } else {
      layoutSlides(next, true, finish);
    }

    if (userInitiated && focusWasOnDot && dots[next]) dots[next].focus();
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () { goTo(Number(dot.dataset.index), true); });
  });

  if (showcase) {
    showcase.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1, true); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1, true); }
    });
  }

  if (viewport) {
    var startX = null;
    viewport.addEventListener('pointerdown', function (event) { startX = event.clientX; });
    viewport.addEventListener('pointercancel', function () { startX = null; });
    viewport.addEventListener('pointerup', function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 45) goTo(current + (dx < 0 ? 1 : -1), true);
    });
  }

  if ('IntersectionObserver' in window && showcase) {
    new IntersectionObserver(function (entries) {
      isInView = entries[0].isIntersecting;
      scheduleNext();
    }, { threshold: .08 }).observe(showcase);
  }

  doc.addEventListener('visibilitychange', scheduleNext);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layoutSlides(current, false); }, 150);
  });

  updateDots(0);
  layoutSlides(0, false);
  scheduleNext();

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
     Extra motion — scroll progress + cloud headline reveal
     -------------------------------------------------------------------- */
  var progressBar = $('[data-scroll-progress]');

  function paintProgress() {
    if (!progressBar) return;
    var max = doc.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0) + ')';
  }

  function initCloudReveal() {
    var reveal = $('[data-cloud-reveal]');
    var fill = $('[data-cloud-fill]');
    var scan = $('[data-cloud-scan]');
    var count = $('[data-cloud-count]');
    var map = $('.cloud-map .map-frame');
    if (!reveal || !fill || !hasMotion) return;

    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      reveal.classList.add('is-enhanced');
      // Keep the original single wipe, with a softer catch-up to scroll input.
      var timeline = gsap.timeline({
        scrollTrigger: {
          id: 'cloud-reveal',
          trigger: reveal,
          start: 'top 92%',
          end: 'top 42%',
          scrub: .9,
          invalidateOnRefresh: true
        }
      });
      timeline.fromTo(fill, { clipPath: 'inset(0 100% 0 0)' }, {
        clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'none'
      }, 0);
      if (scan) {
        timeline.fromTo(scan, { xPercent: 0 }, {
          xPercent: 100, duration: 1, ease: 'none'
        }, 0)
          .fromTo(scan, { autoAlpha: 0 }, { autoAlpha: .85, duration: .1, ease: 'power1.out' }, 0)
          .to(scan, { autoAlpha: 0, duration: .1, ease: 'power1.in' }, .9);
      }
      if (count) {
        var state = { value: 0 };
        gsap.to(state, {
          value: 1, duration: 1.1, ease: 'power2.out',
          scrollTrigger: { trigger: count, start: 'top 94%', once: true },
          onUpdate: function () { count.textContent = pad(Math.round(state.value)); }
        });
      }
      if (map) {
        gsap.fromTo(map, { clipPath: 'inset(100% 0 0 0)' }, {
          clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'power2.out',
          scrollTrigger: { trigger: '.cloud-map', start: 'top 84%', once: true }
        });
      }
      return function () {
        reveal.classList.remove('is-enhanced');
        if (count) count.textContent = '01';
      };
    });
  }

  window.addEventListener('scroll', function () {
    if (progressBar) window.requestAnimationFrame(paintProgress);
  }, { passive: true });
  window.addEventListener('resize', paintProgress);
  paintProgress();


  /* -----------------------------------------------------------------------
     Whimsy — magnetic buttons, card tilt, hero tilt, cursors
     -------------------------------------------------------------------- */
  function initWhimsy() {
    if (!hasMotion || prefersReduced) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    $$('.hero-actions .btn, .cta-actions .btn, .price-btn, .deploy-btn').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: .35, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: .35, ease: 'power3.out' });
      btn.addEventListener('pointermove', function (event) {
        var r = btn.getBoundingClientRect();
        xTo((event.clientX - r.left - r.width / 2) * .1);
        yTo((event.clientY - r.top - r.height / 2) * .14);
      });
      btn.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });

    $$('.audience-card, .deploy-card, .price-card, .ui-card').forEach(function (card) {
      gsap.set(card, { transformPerspective: 900 });
      var rX = gsap.quickTo(card, 'rotationX', { duration: .45, ease: 'power3.out' });
      var rY = gsap.quickTo(card, 'rotationY', { duration: .45, ease: 'power3.out' });
      card.addEventListener('pointermove', function (event) {
        var r = card.getBoundingClientRect();
        rY(((event.clientX - r.left) / r.width - .5) * 3);
        rX(-((event.clientY - r.top) / r.height - .5) * 3);
      });
      card.addEventListener('pointerleave', function () {
        gsap.to(card, { rotationX: 0, rotationY: 0, duration: .65, ease: 'power2.out' });
      });
    });

    var heroStage = $('.hero-stage');
    var heroShowcase = $('.hero-showcase');
    if (heroStage && heroShowcase) {
      var hx = gsap.quickTo(heroStage, 'rotationX', { duration: .7, ease: 'power3.out' });
      var hy = gsap.quickTo(heroStage, 'rotationY', { duration: .7, ease: 'power3.out' });
      heroShowcase.addEventListener('pointermove', function (event) {
        var r = heroShowcase.getBoundingClientRect();
        hy(((event.clientX - r.left) / r.width - .5) * 2);
        hx(-((event.clientY - r.top) / r.height - .5) * 1.5);
      });
      heroShowcase.addEventListener('pointerleave', function () {
        gsap.to(heroStage, { rotationX: 0, rotationY: 0, duration: .9, ease: 'power3.out' });
      });
    }

    var cloudStage = $('[data-cloud-stage]');
    if (cloudStage) {
      var doodleFx = $$('.doodle', cloudStage).map(function (d) {
        return {
          el: d,
          x: gsap.quickTo(d, 'x', { duration: .55, ease: 'power3.out' }),
          y: gsap.quickTo(d, 'y', { duration: .55, ease: 'power3.out' }),
          r: gsap.quickTo(d, 'rotation', { duration: .55, ease: 'power3.out' })
        };
      });
      gsap.from(doodleFx.map(function (fx) { return fx.el; }), {
        autoAlpha: 0,
        scale: .42,
        y: 18,
        transformOrigin: '50% 60%',
        duration: .55,
        stagger: .09,
        ease: 'back.out(1.8)',
        scrollTrigger: { trigger: cloudStage, start: 'top 74%', once: true }
      });

      cloudStage.addEventListener('pointermove', function (event) {
        var sr = cloudStage.getBoundingClientRect();
        doodleFx.forEach(function (fx) {
          var baseX = sr.left + fx.el.offsetLeft + fx.el.offsetWidth / 2;
          var baseY = sr.top + fx.el.offsetTop + fx.el.offsetHeight / 2;
          var dx = baseX - event.clientX;
          var dy = baseY - event.clientY;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            var force = 1 - dist / 180;
            fx.x(dx / dist * force * 16);
            fx.y(dy / dist * force * 16);
            fx.r((dx > 0 ? 1 : -1) * force * 4);
          } else {
            fx.x(0); fx.y(0); fx.r(0);
          }
        });
      });
      cloudStage.addEventListener('pointerleave', function () {
        doodleFx.forEach(function (fx) { fx.x(0); fx.y(0); fx.r(0); });
      });
    }

    var cursorRing = $('[data-cursor-ring]');
    if (cursorRing) {
      var cx = gsap.quickTo(cursorRing, 'x', { duration: .35, ease: 'power3.out' });
      var cy = gsap.quickTo(cursorRing, 'y', { duration: .35, ease: 'power3.out' });
      gsap.set(cursorRing, { x: -100, y: -100 });
      document.addEventListener('pointermove', function (event) {
        cx(event.clientX);
        cy(event.clientY);
        gsap.to(cursorRing, { opacity: .35, duration: .3, overwrite: 'auto' });
      });
      document.documentElement.addEventListener('pointerleave', function () {
        gsap.to(cursorRing, { opacity: 0, duration: .3, overwrite: 'auto' });
      });
      $$('a, button').forEach(function (el) {
        el.addEventListener('pointerenter', function () {
          gsap.to(cursorRing, { scale: 1.3, opacity: .55, duration: .3, overwrite: 'auto' });
        });
        el.addEventListener('pointerleave', function () {
          gsap.to(cursorRing, { scale: 1, opacity: .35, duration: .3, overwrite: 'auto' });
        });
      });
    }

    $$('[data-spotlight]').forEach(function (spot) {
      var area = spot.parentElement;
      if (!area) return;
      var sX = gsap.quickTo(spot, 'x', { duration: .8, ease: 'power3.out' });
      var sY = gsap.quickTo(spot, 'y', { duration: .8, ease: 'power3.out' });
      area.addEventListener('pointermove', function (event) {
        var r = area.getBoundingClientRect();
        sX(event.clientX - r.left);
        sY(event.clientY - r.top);
        gsap.to(spot, { opacity: .5, duration: .5, overwrite: 'auto' });
      });
      area.addEventListener('pointerleave', function () {
        gsap.to(spot, { opacity: 0, duration: .5, overwrite: 'auto' });
      });
    });
  }

  /* -----------------------------------------------------------------------
     Deployment edition slider
     -------------------------------------------------------------------- */
  function initDeploySlider() {
    var section = $('.deploy');
    var slider = $('[data-deploy-slider]');
    if (!section || !slider) return;

    section.classList.add('is-enhanced');

    var slides = $$('[data-deploy-slide]', slider);
    var tabs = $$('[data-deploy-tab]');
    var prev = $('[data-deploy-prev]');
    var next = $('[data-deploy-next]');
    var indexEl = $('[data-deploy-index]');
    var progress = $('[data-deploy-progress]');
    var current = 0;
    var animating = false;
    var pendingTarget = null;
    var deployTrigger = null;
    var transition = null;

    function setMeta(index) {
      if (indexEl) indexEl.textContent = pad(index + 1);
      if (progress) progress.style.width = (deployTrigger ? deployTrigger.progress * 100 : (index + 1) / slides.length * 100) + '%';
      tabs.forEach(function (tab, i) {
        tab.classList.toggle('is-active', i === index);
        tab.setAttribute('aria-pressed', String(i === index));
      });
    }

    function showEdition(target, animate) {
      target = ((target % slides.length) + slides.length) % slides.length;
      if (animating) { pendingTarget = target; return; }
      if (target === current) return;

      var outgoing = slides[current];
      var incoming = slides[target];
      animating = true;

      var direction = target > current ? 1 : -1;
      var incomingClip = direction > 0 ? 'inset(12% 0 0 0)' : 'inset(0 0 12% 0)';
      var outgoingClip = direction > 0 ? 'inset(0 0 12% 0)' : 'inset(12% 0 0 0)';
      incoming.classList.add('is-active');
      incoming.removeAttribute('inert');
      incoming.setAttribute('aria-hidden', 'false');
      outgoing.setAttribute('inert', '');
      outgoing.setAttribute('aria-hidden', 'true');
      setMeta(target);
      current = target;

      var finish = function () {
        outgoing.classList.remove('is-active');
        animating = false;
        transition = null;
        if (pendingTarget !== null) {
          var pending = pendingTarget;
          pendingTarget = null;
          showEdition(pending, true);
        }
      };

      if (!animate || !hasMotion || reduceQuery.matches) {
        finish();
      } else {
        gsap.killTweensOf([outgoing, incoming]);
        gsap.set(incoming, {
          autoAlpha: 0,
          y: 72 * direction,
          scale: .985,
          clipPath: incomingClip
        });
        transition = gsap.timeline({ onComplete: finish })
          .to(outgoing, {
            autoAlpha: 0,
            y: -56 * direction,
            scale: .99,
            clipPath: outgoingClip,
            duration: .52,
            ease: 'power2.in'
          }, 0)
          .to(incoming, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: .9,
            ease: 'power3.out'
          }, .06)
          .to(incoming, {
            clipPath: 'inset(0% 0 0% 0)',
            duration: .9,
            ease: 'power3.out'
          }, .06);
      }
    }

    function resetFirst() {
      if (transition) { transition.kill(); transition = null; }
      if (hasMotion) {
        gsap.killTweensOf(slides);
        gsap.set(slides, { clearProps: 'opacity,visibility,transform,clipPath' });
      }
      current = 0;
      animating = false;
      pendingTarget = null;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === 0);
        slide.inert = i !== 0;
        slide.setAttribute('aria-hidden', String(i !== 0));
      });
      setMeta(0);
    }

    function requestEdition(target) {
      target = ((target % slides.length) + slides.length) % slides.length;
      if (deployTrigger) {
        var p = (target + .02) / slides.length;
        var y = deployTrigger.start + (deployTrigger.end - deployTrigger.start) * p;
        window.scrollTo({ top: y, behavior: reduceQuery.matches ? 'auto' : 'smooth' });
      } else {
        showEdition(target, true);
      }
    }

    slides.forEach(function (slide, i) {
      if (i !== 0) {
        slide.setAttribute('inert', '');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { requestEdition(Number(tab.dataset.deployTab)); });
    });
    if (prev) prev.addEventListener('click', function () { requestEdition(current - 1); });
    if (next) next.addEventListener('click', function () { requestEdition(current + 1); });

    slider.addEventListener('keydown', function (event) {
      if (event.target !== slider || !/^Arrow(Left|Right)$/.test(event.key)) return;
      event.preventDefault();
      requestEdition(current + (event.key === 'ArrowRight' ? 1 : -1));
    });

    var startX = null;
    slider.addEventListener('pointerdown', function (event) { startX = event.clientX; });
    slider.addEventListener('pointercancel', function () { startX = null; });
    slider.addEventListener('pointerup', function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 45) requestEdition(current + (dx < 0 ? 1 : -1));
    });

    setMeta(0);

    if (!hasMotion) return;

    var mm = gsap.matchMedia();
    mm.add({
      all: 'all',
      desktop: '(min-width: 1025px) and (min-height: 650px)',
      reduced: '(prefers-reduced-motion: reduce)'
    }, function (context) {
      resetFirst();
      if (context.conditions.desktop && !context.conditions.reduced) {
        section.classList.add('is-scroll-driven');
        deployTrigger = ScrollTrigger.create({
          id: 'deploy-editions',
          trigger: section,
          start: 'top top',
          end: '+=200%',
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            var index = Math.min(slides.length - 1, Math.floor(self.progress * slides.length + .0001));
            showEdition(index, true);
            if (progress) progress.style.width = (self.progress * 100).toFixed(2) + '%';
          }
        });
      }
      return function () {
        if (deployTrigger) { deployTrigger.kill(); deployTrigger = null; }
        section.classList.remove('is-scroll-driven');
        resetFirst();
      };
    });
  }

  initWhimsy();
  initCloudReveal();
  initDeploySlider();


  /* -----------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------- */
  initReveals();

  window.addEventListener('load', function () {
    if (hasMotion) ScrollTrigger.refresh();
  });
})();
