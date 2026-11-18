(function () {
  'use strict';

  var el = document.getElementById('office-map');
  if (!el || !window.L) return;

  var lat = parseFloat(el.dataset.lat);
  var lng = parseFloat(el.dataset.lng);
  var zoom = parseInt(el.dataset.zoom, 10) || 18;

  var map = L.map(el, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    minZoom: 14,
    maxZoom: 19
  }).setView([lat, lng], zoom);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  var pin = L.divIcon({
    className: 'office-pin-wrap',
    html: '<span class="office-pin"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });

  L.marker([lat, lng], {
    icon: pin,
    keyboard: false,
    title: 'Stackchase Limited, 3a Olaletan Street'
  }).addTo(map);

  window.requestAnimationFrame(function () { map.invalidateSize(); });
})();
