// Lab 3: metro stations and grocery access (Parts 6 to 8).

// preferCanvas draws every circle on one canvas instead of one page element
// per marker, which keeps the map fast with many points.
const map = L.map('map', { preferCanvas: true }).setView([45.50067037889345, -73.57793888179032], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const LIMIT = Infinity;   // PART 6: all of them

// PART 8: one colour per metro line.
const colours = { Green: '#16e164', Yellow: 'rgb(225, 235, 28)', Orange: 'rgb(255, 128, 0)', Blue: '#0072ce' };

// Graduated colour for grocery counts, light to dark.
function colourFor(value) {
  if (value >= 20) return '#630a3f';
  if (value >= 10) return '#a51f68';
  if (value >= 5)  return '#d94f8e';
  if (value >= 1)  return '#f295bd';
  if (value == 0)  return '#d9d9d9';   // grey: no stores, not just a low count
  return '#d8cdbc';
}

// Layer control, shared by every overlay below.
const layerControl = L.control.layers(null, {}, { collapsed: false }).addTo(map);

// ---- Metro stations ----
fetch('../Data/MetroStops.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading MetroStops.geojson'); }
    return response.json();
  })
  .then(function (data) {
    const shown = { type: 'FeatureCollection', features: data.features.slice(0, LIMIT) };

    const metro = L.geoJSON(shown, {
      // PART 7: a small circle instead of the default pin.
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 5,
          weight: 0,
          fillOpacity: 0.7,
          fillColor: colours[feature.properties.line] || '#5639ce'
        });
      },
      // PART 8: a popup built from the properties the notebook wrote.
      onEachFeature: function (feature, layer) {
        const p = feature.properties;
        layer.bindPopup('<b>' + p.station + '</b><br>Line: ' + p.line + '<br>Wheelchair access: ' + p.wheelchair_access);
      }
    }).addTo(map);

    layerControl.addOverlay(metro, 'Metro stations');

    document.getElementById('status').textContent =
      shown.features.length + ' of ' + data.features.length + ' metro stations shown';

    // Metro line legend.
    const lineLegend = L.control({ position: 'bottomright' });
    lineLegend.onAdd = function () {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = '<strong>Metro line</strong><br>' + Object.keys(colours).map(function (k) {
        return '<span style="background:' + colours[k] + '"></span>' + k;
      }).join('<br>');
      return div;
    };
    lineLegend.addTo(map);
  })
  .catch(function (err) {
    document.getElementById('status').textContent =
      'Could not load MetroStops.geojson. Open the console (F12) for details.';
    console.error(err);
  });

// ---- Grocery access: stations sized and coloured by groceries within 500 m ----
fetch('../Data/MetroGrocery500m.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading MetroGrocery500m.geojson'); }
    return response.json();
  })
  .then(function (data) {
    const groceryLayer = L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        const n = feature.properties.within_500m;
        return L.circleMarker(latlng, {
          //radius: 4 + n,              // bigger circle = more groceries
          color: '#3d3333',
          fillColor: colourFor(n),    // darker = more groceries
          fillOpacity: 0.8,
          weight: 2
        });
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup('Open grocery stores within 500 m: ' + feature.properties.within_500m);
      }
    }).addTo(map);

    layerControl.addOverlay(groceryLayer, 'Open groceries within 500 m');
  })
  .catch(function (err) {
    console.error(err);
  });

// ---- Search: a grocery store's closest metro station, or a station's closest grocery store ----
// GroceryNearestMetro.geojson and MetroNearestGrocery.geojson come from the
// notebook (open stores only, straight-line distance).
const MAX_RESULTS = 10;
const searchLayer = L.layerGroup().addTo(map);   // the chosen result and its line
let stores = [];
let stationResults = [];

// Lower case, no accents or hyphens, so "cote des neiges" finds "Côte-Des-Neiges".
function plain(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[-'’]/g, ' ').toLowerCase().trim();
}

function showStore(feature) {
  const p = feature.properties;
  const storeLatLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  const station = stationLatLngs[p.station];

  searchLayer.clearLayers();
  const marker = L.circleMarker(storeLatLng, { radius: 8, color: '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 })
    .bindPopup('<b>' + p.name + '</b><br>' + p.address + '<br>Closest metro: <b>' + p.station + '</b> (' + p.line + ' line)<br>' + p.dist_m + ' m in a straight line')
    .addTo(searchLayer);

  if (station) {
    L.polyline([storeLatLng, station], { color: colours[p.line] || '#000', weight: 3, dashArray: '6 6' }).addTo(searchLayer);
    map.fitBounds(L.latLngBounds([storeLatLng, station]), { padding: [60, 60], maxZoom: 16 });
  } else {
    map.setView(storeLatLng, 16);
  }
  marker.openPopup();
}

function showStation(feature) {
  const p = feature.properties;
  const stationLatLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  const storeLatLng = L.latLng(p.store_lat, p.store_lon);
  const note = p.off_island ? '<br><em>The grocery data stops at the Island of Montréal, so a closer store may exist near this station.</em>' : '';

  searchLayer.clearLayers();
  L.polyline([stationLatLng, storeLatLng], { color: colours[p.line] || '#000', weight: 3, dashArray: '6 6' }).addTo(searchLayer);
  L.circleMarker(storeLatLng, { radius: 8, color: '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 })
    .bindPopup('<b>' + p.store + '</b><br>' + p.address)
    .addTo(searchLayer);
  const marker = L.circleMarker(stationLatLng, { radius: 8, color: '#000', weight: 2, fillColor: colours[p.line] || '#fff', fillOpacity: 1 })
    .bindPopup('<b>' + p.station + '</b> (' + p.line + ' line)<br>Closest grocery store: <b>' + p.store + '</b><br>' + p.address + '<br>' + p.dist_m + ' m in a straight line' + note)
    .addTo(searchLayer);

  map.fitBounds(L.latLngBounds([stationLatLng, storeLatLng]), { padding: [60, 60], maxZoom: 16 });
  marker.openPopup();
}

// Shared by both search boxes: list the matches and show the first on the map.
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

// Station name -> position, for drawing the line from the store to its station.
const stationLatLngs = {};
fetch('../Data/MetroStops.geojson')
  .then(function (response) { return response.json(); })
  .then(function (data) {
    data.features.forEach(function (f) {
      stationLatLngs[f.properties.station] = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
    });
  });

const storesLoaded = fetch('../Data/GroceryNearestMetro.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading GroceryNearestMetro.geojson'); }
    return response.json();
  })
  .then(function (data) {
    data.features.forEach(function (f) {
      f.properties.address = f.properties.address.replace(/\s+/g, ' ');   // the source pads addresses with extra spaces
    });
    stores = data.features;
  })
  .catch(function (err) {
    document.getElementById('searchResults').innerHTML = '<li>Could not load the grocery stores for search.</li>';
    console.error(err);
  });

const stationsLoaded = fetch('../Data/MetroNearestGrocery.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading MetroNearestGrocery.geojson'); }
    return response.json();
  })
  .then(function (data) {
    stationResults = data.features;
    // Fill the station box's suggestions, in alphabetical order.
    const names = document.getElementById('stationNames');
    stationResults.map(function (f) { return f.properties.station; }).sort().forEach(function (name) {
      const option = document.createElement('option');
      option.value = name;
      names.appendChild(option);
    });
  })
  .catch(function (err) {
    document.getElementById('searchResults').innerHTML = '<li>Could not load the metro stations for search.</li>';
    console.error(err);
  });

document.getElementById('storeSearch').addEventListener('submit', function (e) {
  e.preventDefault();
  search(document.getElementById('storeName').value, stores, 'name', function (p) {
    return p.name + ', ' + p.address + ' → ' + p.station + ' (' + p.dist_m + ' m)';
  }, showStore, 'No open grocery store matches');
});

document.getElementById('stationSearch').addEventListener('submit', function (e) {
  e.preventDefault();
  search(document.getElementById('stationName').value, stationResults, 'station', function (p) {
    return p.station + ' → ' + p.store + ', ' + p.address + ' (' + p.dist_m + ' m)';
  }, showStation, 'No metro station matches');
});

// ---- Station dropdown: every open grocery store within 500 m of the chosen station ----
// Straight-line distance, worked out here from the same open stores the search uses.
const RADIUS_M = 500;
let picked = null;   // the chosen station's map layers and results

function showPicked(feature) {
  const p = feature.properties;
  const stationLatLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);

  const near = stores.map(function (f) {
    const latLng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
    return { name: f.properties.name, address: f.properties.address, latLng: latLng, dist: map.distance(stationLatLng, latLng) };
  }).filter(function (s) {
    return s.dist <= RADIUS_M;
  }).sort(function (a, b) {
    return a.dist - b.dist;
  });

  const layer = L.layerGroup().addTo(map);
  const circle = L.circle(stationLatLng, { radius: RADIUS_M, color: colours[p.line] || '#000', weight: 2, fillOpacity: 0.1, interactive: false }).addTo(layer);
  near.forEach(function (s) {
    L.circleMarker(s.latLng, { radius: 6, color: '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 })
      .bindPopup('<b>' + s.name + '</b><br>' + s.address + '<br>' + Math.round(s.dist) + ' m from ' + p.station + ' in a straight line')
      .addTo(layer);
  });

  const results = document.createElement('div');
  const heading = document.createElement('h4');
  heading.textContent = p.station + ': ' + near.length + ' open grocery ' + (near.length === 1 ? 'store' : 'stores') + ' within ' + RADIUS_M + ' m';
  results.appendChild(heading);
  if (near.length === 0 && p.off_island) {
    const note = document.createElement('p');
    note.textContent = 'The grocery data stops at the Island of Montréal, so stores near this station may be missing.';
    results.appendChild(note);
  }
  const list = document.createElement('ul');
  near.forEach(function (s) {
    const li = document.createElement('li');
    li.textContent = s.name + ', ' + s.address + ' (' + Math.round(s.dist) + ' m)';
    list.appendChild(li);
  });
  results.appendChild(list);
  document.getElementById('pickerResults').appendChild(results);

  picked = { layer: layer, results: results };
  map.fitBounds(circle.getBounds(), { padding: [30, 30] });
}

function clearPicked() {
  if (!picked) { return; }
  map.removeLayer(picked.layer);
  picked.results.remove();
  picked = null;
}

// Runs once both files are in, so a choice always has the stores to work with.
function buildStationSelect() {
  const select = document.getElementById('stationSelect');
  if (stores.length === 0 || stationResults.length === 0) {
    select.options[0].textContent = 'Could not load the stations or grocery stores.';
    return;
  }
  const sorted = stationResults.slice().sort(function (a, b) {
    return a.properties.station.localeCompare(b.properties.station, 'fr');
  });
  select.options[0].textContent = 'Choose a station...';
  sorted.forEach(function (f, i) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = f.properties.station + ' (' + f.properties.line + ')';
    select.appendChild(option);
  });
  select.addEventListener('change', function () {
    clearPicked();
    if (select.value !== '') { showPicked(sorted[select.value]); }
  });
  select.disabled = false;
}

Promise.all([storesLoaded, stationsLoaded]).then(buildStationSelect);

// Grocery count legend (declared once, added once).
const groceryLegend = L.control({ position: 'bottomright' });
groceryLegend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  const rows = [[20, '20 or more'], [10, '10 to 19'], [5, '5 to 9'], [1, '1 to 4'], [0, 'none']];
  div.innerHTML = '<strong>Open grocery stores within 500 m (count)</strong><br>' +
    rows.map(function (r) {
      return '<span style="background:' + colourFor(r[0]) + '"></span>' + r[1];
    }).join('<br>');
  return div;
};
groceryLegend.addTo(map);
  