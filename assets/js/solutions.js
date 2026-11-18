(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('.sol-anchor-link'));
  if (!links.length) return;

  var sections = links.map(function (link) {
    return document.getElementById(link.getAttribute('href').slice(1));
  }).filter(Boolean);

  function setActive(id) {
    links.forEach(function (link) {
      var on = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  if (!('IntersectionObserver' in window)) return;

  var ratios = {};
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
    });
    var best = null;
    var score = 0;
    Object.keys(ratios).forEach(function (id) {
      if (ratios[id] > score) { score = ratios[id]; best = id; }
    });
    if (best) setActive(best);
  }, { rootMargin: '-130px 0px -55% 0px', threshold: [0, .1, .25, .5] });

  sections.forEach(function (section) { observer.observe(section); });
})();
