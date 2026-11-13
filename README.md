# How far is the metro? STM walking access in Montréal
Repository link: https://github.com/shrabonidey419/464
GitHub Pages link: https://shrabonidey419.github.io/464/site/

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
2. Run `notebooks/MetroStops.ipynb` from top to bottom (Restart → Run All). It writes `data/metro_stations.geojson`.
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

**How it was computed:** In my notebook, I drew a 500 m buffer around each STM metro station and counted the grocery stores from the City of Montréal's food establishments data (receipt below) that fall inside it. Before counting, I filtered the data in QGIS to keep only grocery stores, and the notebook keeps only the open ones (`statut` = `Ouvert`), so closed stores are not counted. The count is stored as `within_500m` in `MetroGrocery500m.geojson`.

**Grocery data receipt**
- **Title and publisher:** *Établissements alimentaires* (Food establishments), Ville de Montréal
- **Link:** https://donnees.montreal.ca/en/dataset/etablissements-alimentaires
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Date accessed:** October 23, 2026
- **What I changed:** The download has 54,783 food establishments of all kinds (restaurants, daycares, vending machines, etc.). In QGIS, I filtered the `type` field to keep only grocery stores ([TYPES YOU KEPT, e.g., Épicerie, Supermarché]) and saved the result as a new layer. Of the 4,569 stores in that layer, 1,285 are open, and 58 of those have no coordinates, which leaves 1,227 on the map.

**Total check:** The layer has 68 stations, the same as `MetroStops.geojson` (68), so no station was dropped. A store near two stations is counted for both, so the counts are not meant to add up to the 1,227 open grocery stores with a location.

## Reading the map

Darker circles are metro stations with more open grocery stores within 500 m of the station, measured in a straight line.



## A3 feature: Barrier Check

For A3 I will add a click-a-station tool that shows walking routes to the 3 nearest grocery stores, so that my reader can see where barriers like highways make nearby stores far on foot.

It has depth because it brings in grocery store data and computes a detour ratio (walking distance ÷ straight-line distance), flagging routes above 1.5 in red.

I will know it works when Namur station shows the Walmart route flagged red.

My edge case is a station with no grocery store within a 500m walk; the popup will say "No grocery store within 500m."


Test 1. I type "Namur" in the search box and select Namur metro station.
  Expected: The map zooms to Namur and draws a 500 m buffer around it. Up to
  6 of the nearest grocery stores inside the buffer appear as points. When I
  click a grocery store, the popup shows its name and its distance (in m)
  from Namur station.

Test 2. I selected another metro station Mont-Royal.
  Expected: Namur's buffer, grocery points and distance line are removed.
  A new 500 m buffer, grocery points and distances appear for Mont-Royal.

Test 3. I click xxx, which has no grocery store within 500 m.
  Expected: No grocery points appear. The popup says "No grocery store
  within 500 m." The browser console shows no errors.


## Pre-flight report (Lab 7)
| Check | Result | What I did |
| --- | --- | --- |
| 1. Cold start | Pass. The page loaded with no console errors. | Opened the page in a fresh private window with the console open. No fix needed. |
| 2. Read every label | Fault. The grocery store and metro station lists showed distances as "(250 m)", which reads like a walking distance. The app measures straight-line distance. | Fixed. The lists now say "m in a straight line." |
| 3. Ask twice | [Pass/Fault]. [What happened] | [Steps you took] |
| 4. The edge | Pass. The page shows "No open grocery store matches 'hhh'" and "No metro station matches 'xxx'." | Typed "hhh" and "xxx" in the search boxes. No fix needed. |
| 5. The data does not come | [Pass/Fault]. [What happened] | [Steps you took] |
| 6. On a phone | Pass. What checked search box and popups fit the screen and work by touch. | Tested in the browser's phone-size view and on my own phone.  "No fix needed." |
| 7. Mouse in my pocket | [Pass]. [What happened : it change the differnt position] | 
 | 8. Accessibility audit | Fault. Lighthouse score 97. Two issues: headings skipped a level (an h3 with no h2 before it), and the page had no main landmark. | Ran Lighthouse (Accessibility only) in DevTools. Fixed: changed the h3 to an h2 and wrapped the search panel and map in a <main> element. Re-ran in an incognito window: 100 . |[there had an issue in  css because there had not main  and h2 .I  fixed it by using claude ] |

## AI disclosure

I used Claude (Claude Code, an AI assistant) for these parts of the project:

- **Walking distance instead of straight lines.** In Lab 7 every distance was a straight line, which I felt was not useful for my users (residents and students), because nobody walks in a straight line. I asked Claude how to measure real walks. It wrote the notebook `notebooks/walkNetwork.ipynb`, which downloads Montréal's walking network from OpenStreetMap with OSMnx and uses networkx to find the streets within a 500 m walk of each station. That gives each station a 500 m walking area (not a circle), the open grocery stores inside it, and the walking route to each one.
- **Walking routes on the page.** When I type a metro station's name, the map shows its 500 m walking area and every grocery store inside it, and when I click a store (in the list or on the map) it shows the walking route. A station with no store that close shows the walk to its closest store instead. The grocery store search box finds a store's closest station by walking and draws the route. Routes more than 1.5 times the straight line are shown in red as detours (this was my A3 plan). Walks longer than 1,600 m were not worked out, so those keep the straight-line distance and say so.
- **Wheelchair checkbox.** My checkbox was on the page but did nothing, because no code was connected to it. Claude connected it, so it now shows only the wheelchair-accessible stations.
- **One station layer.** My metro station circles and my grocery-count circles sat on top of each other. Claude merged them into one symbol: the fill is the number of grocery stores within a 500 m walk, the ring is the metro line, and a white dot means wheelchair access. The popup shows all three, which I really like. It also added a layer for the 5-minute walk areas, so the layer switcher now has two layers, and one legend that follows them. By using claude , I make it chickable my legend because it not fit on my phone screen.
- **Accessibility audit fix.** Claude helped me fix the heading levels and add a `<main>` element (check 8 above).

I chose what to build and which options to use. Claude wrote most of the code and ran checks on the results; for example, the notebook checks that no walk is shorter than its straight line.


## Part 3: what I found, and one fix

Evidence: In Round 1, on the phone, the tester overlooked one of the search boxes and didn’t notice it was there. In Round 3, the group suggested adding symbols and hiding the description so the map is bigger and easier to see.

Severity: 2. Missing a search box slowed the tester down, but it didn’t stop them from finishing the task.

My change: I will put the search boxes in their own panel with a search (🔍) icon, and replace the description with an icon that opens it, so the search is easy to spot and the map has more room. And when I checked the wheelchair checkbox it select the metro staion  not with  symbole  dot . 

Recheck: I’ll give the same task to someone new on a phone, with no help. Fixed means: they find the search box and start typing without hesitating or asking where to search.

After the recheck: I added a "Show grocery stores within 500 m" button to each metro station's popup. Clicking it opens the search panel and shows the open grocery stores within a 500 m walk of that station. When I select one of those stores, the map draws the walking route to it.

