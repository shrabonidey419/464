// Lab 3: metro stations and grocery access (Parts 6 to 8).

// On a computer the search panel is open when the page loads; on a phone the map starts on its own.
// Set before the map is made, so the map is sized for the panel from the start.
const PHONE = window.matchMedia('(max-width: 800px)');
if (!PHONE.matches) { document.body.dataset.panel = 'search'; }

// preferCanvas draws every circle on one canvas instead of one page element
// per marker, which keeps the map fast with many points.
// zoomControl: false removes the default zoom buttons from the top, so they can go at the bottom (below).
const map = L.map('map', { preferCanvas: true, zoomControl: false }).setView([45.50067037889345, -73.57793888179032], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Drawing order, bottom to top: basemap, walk areas, the station box's chosen walk area,
// then (on the default canvas) routes, stations, the station box's stores and the search result.
// The two area panes ignore the mouse, so clicks reach the stations above them.
map.createPane('walkAreas');
map.getPane('walkAreas').style.zIndex = 350;
map.getPane('walkAreas').style.opacity = 0.4;         // the whole pane is see-through, so overlapping areas do not get darker
map.getPane('walkAreas').style.pointerEvents = 'none';
map.createPane('pickedArea');
map.getPane('pickedArea').style.zIndex = 360;
map.getPane('pickedArea').style.pointerEvents = 'none';

// PART 8: one colour per metro line.
const colours = { Green: '#16e164', Yellow: 'rgb(225, 235, 28)', Orange: 'rgb(255, 128, 0)', Blue: '#0072ce' };
const AREA_COLOUR = '#1F2D5A';   // the walk areas, in the page's navy what is the function of this ? is it for metro legend color?



// Graduated colour for grocery counts, light to dark.
function colourFor(value) {
  if (value >= 15) return '#630a3f';
  if (value >= 10) return '#a51f68';
  if (value >= 5)  return '#d94f8e';
  if (value >= 1)  return '#f295bd';
  if (value == 0)  return '#d9d9d9';   // grey: no stores, not just a low count
  return '#d8cdbc';
}
const COUNT_CLASSES = [[15, '15 or more'], [10, '10 to 14'], [5, '5 to 9'], [1, '1 to 4'], [0, 'none']];

// ---- Walking distances ----
// Every distance below is a real walk on the OpenStreetMap street network, worked out in
// notebooks/walkNetwork.ipynb. Walks longer than WALK_LIMIT_M were not worked out: for those
// the files leave walk_m empty (null) and keep the straight-line distance.
const RADIUS_M = 500;          // the walk areas and the grocery counts
const WALK_LIMIT_M = 1600;     // about a 20-minute walk
const WALK_M_PER_MIN = 80;     // about 4.8 km/h, an average walking pace
const DETOUR_COLOUR = '#d7191c';   // a walk more than 1.5 times the straight line

function minutes(m) {
  return Math.max(1, Math.round(m / WALK_M_PER_MIN));
}

// "420 m walk, about 5 min (300 m in a straight line)", plus the detour when there is one.
function walkText(p) {
  if (p.walk_m === null) {
    return 'more than a ' + WALK_LIMIT_M + ' m walk (' + p.straight_m + ' m in a straight line)';
  }
  let text = p.walk_m + ' m walk, about ' + minutes(p.walk_m) + ' min (' + p.straight_m + ' m in a straight line)';
  if (p.detour_flag) { text += ', a detour: ' + p.detour + ' times the straight line'; }
  return text;
}

// The same, as popup HTML, with the detour in red.
function walkHtml(p) {
  if (p.walk_m === null) {
    return 'More than a ' + WALK_LIMIT_M + ' m walk, so the straight line is shown: ' + p.straight_m + ' m';
  }
  let html = p.walk_m + ' m walk, about ' + minutes(p.walk_m) + ' min<br>' + p.straight_m + ' m in a straight line';
  if (p.detour_flag) {
    html += '<br><b style="color:' + DETOUR_COLOUR + '">Detour: the walk is ' + p.detour + ' times the straight line</b>';
  }
  return html;
}

// Draw the walk (red when it is a detour), or a dashed straight line when there is no walk.
// lonLats is the route as [[lon, lat], ...], or null.
function drawRoute(layer, lonLats, p, from, to, colour) {
  if (!lonLats) {
    return L.polyline([from, to], { color: colour, weight: 3, dashArray: '6 6', interactive: false }).addTo(layer);
  }
  const latLngs = lonLats.map(function (c) { return L.latLng(c[1], c[0]); });
  L.polyline(latLngs, { color: '#000', weight: 6, opacity: 0.5, interactive: false }).addTo(layer);   // dark edge, so a yellow line shows
  return L.polyline(latLngs, { color: p.detour_flag ? DETOUR_COLOUR : colour, weight: 3, interactive: false }).addTo(layer);
}

// ---- The two map layers: metro stations and 5-minute walk areas ----
const layerControl = L.control.layers(null, {}, { collapsed: false }).addTo(map);
const wheelchair = {};   // station name -> 'Yes' or 'No', from metro_stations.geojson

// PART 7: one symbol per station. Fill = open grocery stores within a 500 m walk,
// ring = metro line. Wheelchair access is in the popup and the "accessible only" checkbox.
function stationSymbol(feature, latlng) {
  const p = feature.properties;
  return L.featureGroup([
    L.circleMarker(latlng, { radius: 10, stroke: false, fillColor: '#222', fillOpacity: 1 }),   // thin dark edge, so a yellow ring shows on a light map
    L.circleMarker(latlng, { radius: 7.5, color: colours[p.line] || '#5639ce', weight: 3, opacity: 1, fillColor: colourFor(p.walk_count), fillOpacity: 1 })
  ]);
}

const stationLayer = L.geoJSON(null, {
  pointToLayer: stationSymbol,
  // PART 8: a popup built from the properties the notebooks wrote.
  onEachFeature: function (feature, layer) {
    const p = feature.properties;
    layer.bindPopup(function () {
      const div = document.createElement('div');
      div.innerHTML = '<b>' + p.station + '</b><br>Line: ' + p.line + '<br>Wheelchair access: ' + (wheelchair[p.station] || 'unknown') +
        '<br>Open grocery stores within a ' + RADIUS_M + ' m walk: ' + p.walk_count +
        '<br>Within ' + RADIUS_M + ' m in a straight line: ' + p.straight_count + '<br>';
      // The button shows this station's stores in the station box, the same as typing its name there.
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'popup-button';
      button.textContent = 'Show grocery stores within ' + RADIUS_M + ' m';
      button.addEventListener('click', function () { showStationStores(p.station); });
      div.appendChild(button);
      return div;
    });
  }
}).addTo(map);
layerControl.addOverlay(stationLayer, 'Metro stations');

// Every station's walk area together: the blank space between them is more than a 5-minute walk
// from the metro. Off when the page opens.
const walkAreaLayer = L.geoJSON(null, {
  pane: 'walkAreas',
  renderer: L.svg({ pane: 'walkAreas' }),
  interactive: false,
  style: { stroke: false, fillColor: AREA_COLOUR, fillOpacity: 1 }
});
layerControl.addOverlay(walkAreaLayer, '5-minute walk areas (500 m)');

// ---- Wheelchair checkbox: show only the stations you can use with a wheelchair ----
// It filters the stations and, when that layer is on, their walk areas.
const accessibleBox = document.getElementById('accessibleOnly');
const filtered = [{ layer: stationLayer, features: [] }, { layer: walkAreaLayer, features: [] }];

function accessibleOnly(features) {
  if (!accessibleBox.checked) { return features; }
  return features.filter(function (f) { return wheelchair[f.properties.station] === 'Yes'; });
}

function applyAccessFilter() {
  filtered.forEach(function (s) {
    s.layer.clearLayers();
    s.layer.addData(accessibleOnly(s.features));
  });
  restack();
  updateLegend();
  const access = Object.values(wheelchair);
  if (access.length === 0) { return; }   // the stations are not in yet
  const yes = access.filter(function (a) { return a === 'Yes'; }).length;
  document.getElementById('status').textContent = accessibleBox.checked
    ? yes + ' of ' + access.length + ' metro stations shown: only the wheelchair-accessible ones'
    : access.length + ' of ' + access.length + ' metro stations shown';
}

accessibleBox.addEventListener('change', applyAccessFilter);

// Keep the canvas in order after anything is drawn: stations above routes,
// the station box's stores above the stations, the search result above everything.
function restack() {
  stationLayer.bringToFront();
  if (picked) { picked.markers.bringToFront(); }
  searchLayer.bringToFront();
}

// ---- One legend that follows the layer switcher ----
// It folds up behind a "Legend" button, closed on a phone so it does not cover the small map.
let legendDiv = null;
let legendBody = null;
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  legendDiv = L.DomUtil.create('div', 'legend');
  const details = L.DomUtil.create('details', '', legendDiv);
  details.open = !window.matchMedia('(max-width: 800px)').matches;
  L.DomUtil.create('summary', '', details).textContent = 'Legend';
  legendBody = L.DomUtil.create('div', 'legend-body', details);
  // Tapping or scrolling the legend should not drag or zoom the map underneath.
  L.DomEvent.disableClickPropagation(legendDiv);
  L.DomEvent.disableScrollPropagation(legendDiv);
  updateLegend();
  return legendDiv;
};

function updateLegend() {
  if (!legendDiv) { return; }
  const parts = [];
  if (map.hasLayer(stationLayer)) {
    parts.push('<strong>Metro stations</strong><br>Fill: open grocery stores within a ' + RADIUS_M + ' m walk<br>' +
      COUNT_CLASSES.map(function (r) {
        return '<span style="background:' + colourFor(r[0]) + '"></span>' + r[1];
      }).join('<br>') +
      '<br>Ring: metro line<br>' +
      Object.keys(colours).map(function (k) {
        return '<span class="ring" style="border-color:' + colours[k] + '"></span>' + k;
      }).join('<br>'));
  }
  if (map.hasLayer(walkAreaLayer)) {
    parts.push('<span class="area" style="background:' + AREA_COLOUR + '"></span>Within a ' + RADIUS_M + ' m walk of ' +
      (accessibleBox.checked ? 'a wheelchair-accessible station' : 'a station'));
  }
  legendBody.innerHTML = parts.join('<br><br>');
  legendDiv.style.display = parts.length ? '' : 'none';
}

legend.addTo(map);
map.on('overlayadd overlayremove', updateLegend);

// ---- Load the stations ----
// metro_stations.geojson (written by notebooks/MetroStops.ipynb): wheelchair access. MetroNearestGroceryWalk.geojson: each station, its grocery
// counts and its closest store by walking (also used by the station box).
let stationResults = [];
const stationLatLngs = {};   // station name -> position, for a store's straight line to its station

const accessLoaded = fetch('../Data/metro_stations.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading metro_stations.geojson'); }
    return response.json();
  })
  .then(function (data) {
    data.features.forEach(function (f) { wheelchair[f.properties.station] = f.properties.wheelchair_access; });
  })
  .catch(function (err) {
    document.getElementById('status').textContent =
      'Could not load the wheelchair access (metro_stations.geojson). Open the console (F12) for details.';
    console.error(err);
  });

const stationsLoaded = fetch('../Data/MetroNearestGroceryWalk.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading MetroNearestGroceryWalk.geojson'); }
    return response.json();
  })
  .then(function (data) {
    stationResults = data.features;
    stationResults.forEach(function (f) {
      stationLatLngs[f.properties.station] = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
    });
    filtered[0].features = stationResults;
  })
  .catch(function (err) {
    document.getElementById('status').textContent = 'Could not load the metro stations. Open the console (F12) for details.';
    document.getElementById('searchResults').innerHTML = '<li>Could not load the metro stations for search.</li>';
    console.error(err);
  });

// Draw the stations once both files are in, so every symbol knows its wheelchair access.
Promise.all([accessLoaded, stationsLoaded]).then(applyAccessFilter);

// ---- Search: a grocery store's closest metro station, or a station's closest grocery store ----
// Closest by walking; GroceryNearestMetroWalk.geojson holds each open store and its closest station.
const MAX_RESULTS = 10;
const searchLayer = L.featureGroup().addTo(map);   // the chosen result and its route
let stores = [];

// Lower case, no accents or hyphens, so "cote des neiges" finds "Côte-Des-Neiges".
function plain(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[-'’]/g, ' ').toLowerCase().trim();
}

function showStore(feature) {
  const p = feature.properties;
  const storeLatLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  const station = stationLatLngs[p.station];

  searchLayer.clearLayers();
  if (station) {
    const line = drawRoute(searchLayer, p.route, p, station, storeLatLng, colours[p.line] || '#000');
    map.fitBounds(line.getBounds(), { padding: [60, 60], maxZoom: 16 });
  } else {
    map.setView(storeLatLng, 16);
  }
  const marker = L.circleMarker(storeLatLng, { radius: 8, color: '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 })
    .bindPopup('<b>' + p.name + '</b><br>' + p.address + '<br>Closest metro: <b>' + p.station + '</b> (' + p.line + ' line)<br>' + walkHtml(p))
    .addTo(searchLayer);
  restack();
  marker.openPopup();
}

// The grocery store search: list the matches and show the first on the map.
function search(query, features, field, labelFor, show, noMatch) {
  const list = document.getElementById('searchResults');
  list.innerHTML = '';
  const q = plain(query);
  if (!q) return;

  const matches = features.filter(function (f) { return plain(f.properties[field]).includes(q); });
  // A full name comes first, so "Sherbrooke" shows Sherbrooke before Longueuil- U. De Sherbrooke.
  matches.sort(function (a, b) { return (plain(b.properties[field]) === q) - (plain(a.properties[field]) === q); });

  if (matches.length === 0) {
    const none = document.createElement('li');
    none.textContent = noMatch + ' "' + query + '".';
    list.appendChild(none);
    searchLayer.clearLayers();
    return;
  }

  matches.slice(0, MAX_RESULTS).forEach(function (f) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = labelFor(f.properties);
    button.addEventListener('click', function () { show(f); });
    li.appendChild(button);
    list.appendChild(li);
  });
  if (matches.length > MAX_RESULTS) {
    const more = document.createElement('li');
    more.textContent = (matches.length - MAX_RESULTS) + ' more: type more of the name to narrow it down.';
    list.appendChild(more);
  }
  show(matches[0]);
}

fetch('../Data/GroceryNearestMetroWalk.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading GroceryNearestMetroWalk.geojson'); }
    return response.json();
  })
  .then(function (data) {
    stores = data.features;
  })
  .catch(function (err) {
    document.getElementById('searchResults').innerHTML = '<li>Could not load the grocery stores for search.</li>';
    console.error(err);
  });

document.getElementById('storeSearch').addEventListener('submit', function (e) {
  e.preventDefault();
  clearPicked();   // one result on the map at a time
  search(document.getElementById('storeName').value, stores, 'name', function (p) {
    return p.name + ', ' + p.address + ' → ' + p.station + ': ' + walkText(p);
  }, showStore, 'No open grocery store matches');
});

// ---- Station box: every open grocery store within a 500 m walk of the station you type ----
// MetroWalk500m.geojson holds each station's walk area, MetroWalkRoutes.geojson one route per station and store.
let picked = null;           // the chosen station's map layers and results
const walkAreas = {};        // station name -> walk area feature
const walkRoutes = {};       // station name -> its routes, shortest first
const pickedRenderer = L.svg({ pane: 'pickedArea' });

function showPicked(feature) {
  const p = feature.properties;
  const lineColour = colours[p.line] || '#000';
  const stationLatLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  const near = walkRoutes[p.station] || [];

  // Clear the grocery store search, so only this station's stores are on the map.
  searchLayer.clearLayers();
  document.getElementById('searchResults').innerHTML = '';

  const layer = L.layerGroup().addTo(map);
  // The chosen walk area, outlined in the line colour, above the faint walk-area layer.
  const area = L.geoJSON(walkAreas[p.station], {
    pane: 'pickedArea', renderer: pickedRenderer, interactive: false,
    style: { color: lineColour, weight: 2, fillOpacity: 0.15 }
  }).addTo(layer);
  // The 500 m straight-line circle, faint and dashed, so the reader can compare it with the real walk.
  L.circle(stationLatLng, {
    pane: 'pickedArea', renderer: pickedRenderer, interactive: false,
    radius: RADIUS_M, color: '#555', weight: 1, dashArray: '4 6', fill: false
  }).addTo(layer);
  const routeLayer = L.layerGroup().addTo(layer);    // the route to the store the reader picked
  const markers = L.featureGroup().addTo(layer);     // the stores, kept above the stations
  // The map view: both the walk area and the 500 m circle.
  const view = stationLatLng.toBounds(2 * RADIUS_M).extend(area.getBounds());

  // Draw the walking route from the station to one store and open its popup.
  function showRoute(r) {
    routeLayer.clearLayers();
    drawRoute(routeLayer, r.feature.geometry.coordinates, r.feature.properties, null, null, lineColour);
    restack();
    r.marker.openPopup();
  }

  near.forEach(function (r) {
    const q = r.feature.properties;
    const coords = r.feature.geometry.coordinates;
    const end = coords[coords.length - 1];   // the route ends at the store
    r.marker = L.circleMarker(L.latLng(end[1], end[0]), {
      radius: 6, color: q.detour_flag ? DETOUR_COLOUR : '#000', weight: 2, fillColor: '#fff', fillOpacity: 1
    })
      .bindPopup('<b>' + q.store + '</b><br>' + q.address + '<br>From ' + p.station + ': ' + walkHtml(q))
      .on('click', function () { showRoute(r); })
      .addTo(markers);
  });

  const results = document.createElement('div');
  const heading = document.createElement('h3');
  heading.textContent = p.station + ': ' + near.length + ' open grocery ' + (near.length === 1 ? 'store' : 'stores') +
    ' within a ' + RADIUS_M + ' m walk (' + p.straight_count + ' within ' + RADIUS_M + ' m in a straight line)';
  results.appendChild(heading);
  if (near.length === 0 && p.off_island) {
    const note = document.createElement('p');
    note.textContent = 'The grocery data stops at the Island of Montréal, so stores near this station may be missing.';
    results.appendChild(note);
  } else if (near.length === 0) {
    const note = document.createElement('p');
    note.textContent = 'No open grocery store within a ' + RADIUS_M + ' m walk. The closest one, shown on the map: ' + p.store + ', ' + walkText(p) + '.';
    results.appendChild(note);
    // Draw the walk to the closest store instead, so the reader still sees how far it is.
    const storeLatLng = L.latLng(p.store_lat, p.store_lon);
    const line = drawRoute(routeLayer, p.route, p, stationLatLng, storeLatLng, lineColour);
    L.circleMarker(storeLatLng, { radius: 6, color: p.detour_flag ? DETOUR_COLOUR : '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 })
      .bindPopup('<b>' + p.store + '</b><br>' + p.address + '<br>Closest store to ' + p.station + ': ' + walkHtml(p))
      .addTo(markers);
    view.extend(line.getBounds());   // zoom out far enough to show the store
  } else {
    const tip = document.createElement('p');
    tip.textContent = 'Choose a store to see its walking route. Red routes are detours: the walk is more than 1.5 times the straight line.';
    results.appendChild(tip);
  }
  const list = document.createElement('ul');
  near.forEach(function (r) {
    const q = r.feature.properties;
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = q.store + ', ' + q.address + ': ' + walkText(q);
    button.addEventListener('click', function () { showRoute(r); });
    li.appendChild(button);
    list.appendChild(li);
  });
  results.appendChild(list);
  document.getElementById('pickerResults').appendChild(results);

  picked = { station: p.station, layer: layer, markers: markers };
  restack();
  map.fitBounds(view, { padding: [30, 30] });
}

function clearPicked() {
  document.getElementById('pickerResults').innerHTML = '';
  if (!picked) { return; }
  map.removeLayer(picked.layer);
  picked = null;
}

const walkLoaded = Promise.all([
  fetch('../Data/MetroWalk500m.geojson').then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading MetroWalk500m.geojson'); }
    return response.json();
  }),
  fetch('../Data/MetroWalkRoutes.geojson').then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading MetroWalkRoutes.geojson'); }
    return response.json();
  })
]).then(function (files) {
  files[0].features.forEach(function (f) { walkAreas[f.properties.station] = f; });
  filtered[1].features = files[0].features;   // the walk-area layer
  files[1].features.forEach(function (f) {
    (walkRoutes[f.properties.station] = walkRoutes[f.properties.station] || []).push({ feature: f });
  });
  Object.values(walkRoutes).forEach(function (list) {
    list.sort(function (a, b) { return a.feature.properties.walk_m - b.feature.properties.walk_m; });
  });
}).catch(function (err) {
  console.error(err);
});

// The walk-area layer also needs the wheelchair access before it can be filtered.
Promise.all([accessLoaded, walkLoaded]).then(applyAccessFilter);

// The station popup's button: open the search panel and show that station's stores.
// pickStation is set by buildStationSearch once the walk areas and routes are in.
let pickStation = null;
function showStationStores(station) {
  map.closePopup();
  setPanel('search');   // before showing the stores, so the map is zoomed to the right size
  document.getElementById('stationName').value = station;
  if (pickStation) { pickStation(station); }
}

// Runs once every file is in, so a station always has its walk area and routes to work with.
function buildStationSearch() {
  const input = document.getElementById('stationName');
  const button = document.querySelector('#stationSearch button');
  if (stationResults.length === 0 || Object.keys(walkAreas).length === 0) {
    input.placeholder = 'Could not load the stations or walking areas.';
    return;
  }
  const sorted = stationResults.slice().sort(function (a, b) {
    return a.properties.station.localeCompare(b.properties.station, 'fr');
  });

  // The box suggests station names as you type.
  const names = document.getElementById('stationNames');
  sorted.forEach(function (f) {
    const option = document.createElement('option');
    option.value = f.properties.station;
    option.label = f.properties.line + ' line';
    names.appendChild(option);
  });

  function exactStation(q) {
    return sorted.find(function (f) { return plain(f.properties.station) === q; });
  }

  // Show one station's stores. With a part of a name, show it if only one station matches,
  // otherwise list the matching stations to choose from.
  function pick(query) {
    const q = plain(query);
    clearPicked();
    if (!q) { return; }
    const matches = sorted.filter(function (f) { return plain(f.properties.station).includes(q); });
    const exact = exactStation(q);
    if (exact || matches.length === 1) {
      showPicked(exact || matches[0]);
      return;
    }
    const box = document.getElementById('pickerResults');
    const note = document.createElement('p');
    note.textContent = matches.length === 0
      ? 'No metro station matches "' + query + '".'
      : matches.length + ' stations match "' + query + '". Choose one:';
    box.appendChild(note);
    const list = document.createElement('ul');
    matches.forEach(function (f) {
      const li = document.createElement('li');
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.dataset.keepOpen = 'yes';   // choosing a station shows its store list, so the phone panel stays open
      choice.textContent = f.properties.station + ' (' + f.properties.line + ' line)';
      choice.addEventListener('click', function () {
        input.value = f.properties.station;
        pick(f.properties.station);
      });
      li.appendChild(choice);
      list.appendChild(li);
    });
    box.appendChild(list);
  }

  // Picking a suggestion, or typing a full name, shows the stores right away.
  input.addEventListener('input', function () {
    const q = plain(input.value);
    if (!q) { clearPicked(); return; }
    const exact = exactStation(q);
    if (exact && !(picked && picked.station === exact.properties.station)) { pick(input.value); }
  });
  document.getElementById('stationSearch').addEventListener('submit', function (e) {
    e.preventDefault();
    pick(input.value);
  });

  pickStation = pick;
  input.placeholder = 'e.g. Namur, Berri-UQAM';
  input.disabled = false;
  button.disabled = false;
}

Promise.all([stationsLoaded, walkLoaded]).then(buildStationSearch);

// ---- Two panels: the search (🔍) and the description (i) ----
// One open at a time, or none. Their buttons sit in the map's top-left corner,
// and the zoom in / zoom out buttons in the bottom-left corner.
const panelButtons = L.control({ position: 'topleft' });
panelButtons.onAdd = function () {
  const div = document.getElementById('panelButtons');
  L.DomEvent.disableClickPropagation(div);   // a click on a button should not also click the map
  return div;
};
panelButtons.addTo(map);
L.control.zoom({ position: 'bottomleft' }).addTo(map);

const toggles = document.querySelectorAll('.panel-toggle');
function setPanel(name) {   // 'search', 'info' or '' for none
  if (name) { document.body.dataset.panel = name; } else { delete document.body.dataset.panel; }
  toggles.forEach(function (b) { b.setAttribute('aria-expanded', b.dataset.panel === name ? 'true' : 'false'); });
  map.invalidateSize();   // on a computer the map gets wider or narrower when a panel opens or closes
}
setPanel(document.body.dataset.panel || '');   // the buttons show which panel is open when the page loads

// A button opens its panel, or closes it when it is already open.
toggles.forEach(function (b) {
  b.addEventListener('click', function () {
    setPanel(document.body.dataset.panel === b.dataset.panel ? '' : b.dataset.panel);
    // On a computer, opening the search puts the cursor in the station box, ready to type.
    // Not on a phone, where it would pop the keyboard up over the panel.
    if (document.body.dataset.panel === 'search' && !PHONE.matches) { document.getElementById('stationName').focus(); }
  });
});
document.querySelectorAll('.panel-close').forEach(function (b) {
  b.addEventListener('click', function () { setPanel(''); });
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setPanel(''); } });
// On a phone, choosing a store in a result list closes the panel, so the reader sees it on the map.
['searchResults', 'pickerResults'].forEach(function (id) {
  document.getElementById(id).addEventListener('click', function (e) {
    const button = e.target.closest('button');
    if (button && !button.dataset.keepOpen && PHONE.matches) { setPanel(''); }
  });
});
