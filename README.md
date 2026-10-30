# How far is the metro? STM walking access in Montréal
 https://shrabonidey419.github.io/
 500m-walking-accessibility-near-STM-metro-station-Montreal/site/

An interactive web map of the 68 STM metro stations in Montréal. It is the first step toward showing which areas of the city are within a 5-minute walk of a metro station.

Made for GEOG 464 (Programming for Geospatial Technologies) at Concordia University, A2 MVP.

> **Author:** Shraboni Dey
> **Date:** October 2026

## The project in five sentences

1. **Problem:** A metro station can look close on a map, but the real walk can be long or blocked by barriers like highways.
2. **Audience:** Students and residents in Montréal who want to know how easy it is to walk to the metro, for example when choosing where to live.
3. **Core action:** They can click a metro station to see its line and whether it is wheelchair accessible.
4. **Data:** STM open data on metro stations (GTFS stops), processed in a Python notebook into GeoJSON.
5. **Why it matters:** Walking access to the metro shapes who can easily use public transit, and this map is a first step toward showing which neighbourhoods are left out.

## Research question

_Which parts of Montréal are within a 5-minute walk (about 500 m) of a metro station, and which neighbourhoods are left out?_
(This MVP shows the stations; walking distances come in the next version.)

## How to run

1. Open the project folder in VS Code.
2. Run `notebooks/[your notebook name].ipynb` from top to bottom (Restart → Run All). It writes `data/metro_stations.geojson`.
3. Right-click `site/index.html` → **Open with Live Server**.

## Data

| File | Description |
|------|-------------|
| `data/MetroStops.geojson` | Input: 68 metro stations from the STM GTFS stops, filtered to metro stations (location type 1) in QGIS |
| `data/MetroStops.shp` (+ `.dbf`, `.shx`, `.prj`, `.cpg`) | The same layer as a shapefile, exported from QGIS |
| `data/metro_stations.geojson` | Output: written by the notebook and loaded by the map |

## Sources

- **STM bus and metro lines and stops (GTFS)**, Société de transport de Montréal. [STM open data](https://www.stm.info/en/about/developers) / [Données Québec](https://www.donneesquebec.ca/recherche/fr/dataset/a0073997-3a02-4c34-8acf-758a2ee950f4). Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with credit to the STM. Accessed [date].
- Basemap: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## Method

1. Downloaded the STM GTFS data and filtered it to metro stations in QGIS (68 stations).
2. In the notebook, read the GeoJSON into a table and cleaned it: kept only metro stations, dropped rows with no coordinates (0 dropped), renamed columns to plain words (`station`, `line`, `wheelchair_access`), turned wheelchair codes 1/2 into Yes/No, and worked out the metro line from the stop ID (M1 = Green, M2 = Orange, M4 = Yellow, M5 = Blue).
3. The notebook writes `data/metro_stations.geojson`, and a check cell tests the count (68), that every point is inside Montréal, and that every station has its properties.
4. The Leaflet page in `site/` loads that file and shows a popup for each station.

## Testing

- **Check cell:** my first run wrote 0 features and overwrote my input file, because the loop was still the empty lab template and the output path pointed to the input file. The feature count showed the problem. I fixed the loop and now write to a separate output file, `metro_stations.geojson`. The check cell now passes with 68 stations.
- **Stranger test:** [optional: what someone did when they used it, and what you changed]

## Not in this iteration

- **5-minute walking areas and real walk times:** need a walking network (Google API), which I have not finished yet.
- **Nearby places (grocery stores, restaurants, hospitals) and barriers:** need a second dataset; planned for later.
- **One borough focus:** I kept the whole metro network to keep the pipeline simple. Next, I will focus on Côte-des-Neiges–NDG, where many students live and the Décarie expressway creates walking barriers (for example near Namur station).
- **Transfer stations:** stations like Berri-UQAM and Lionel-Groulx appear under one line only, because that is how the STM file stores them.

## Next step

Add 5-minute walking areas around each station so the popup can show which stations have better walking access.

## Project structure


## Layer 2: Grocery stores within 500 m of each metro station

**How it was computed:** In my notebook, I drew a 500 m buffer around each STM metro station and counted the grocery stores from the City of Montréal's food establishments data (receipt below) that fall inside it. Before counting, I filtered the data in QGIS to keep only grocery stores. The count is stored as `within_500m` in `MetroGrocery500m.geojson`.

**Grocery data receipt**
- **Title and publisher:** *Établissements alimentaires* (Food establishments), Ville de Montréal
- **Link:** https://donnees.montreal.ca/en/dataset/etablissements-alimentaires
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Date accessed:** October 23, 2026
- **What I changed:** The download has 54,783 food establishments of all kinds (restaurants, daycares, vending machines, etc.). In QGIS, I filtered the `type` field to keep only grocery stores ([TYPES YOU KEPT, e.g., Épicerie, Supermarché]) and saved the result as a new layer.

**Total check:** The layer has [N] stations, the same as `MetroStops.geojson` ([N]), so no station was dropped. A store near two stations is counted for both, so the counts are not meant to add up to the [TOTAL] grocery stores in the source data.

## Reading the map

Darker circles are metro stations with more grocery stores within 500 m of the station, measured in a straight line.