# LIM · Planning (compact) — front-end demo

A clickable front-end of the redesigned LIM **Planning** module. The Settings drawer is gone; all its controls now live in a ribbon at the top.
It's plain HTML, CSS and JavaScript: no build step, no backend. Data lives in the browser (`localStorage`).

- **Design** follows the LIM Figma file: page **New Planning** (screens + `Planning Ribbon` component), built from the source frames on *Activity details update › Updated Gantt Chart* and the Amlog DS.
- **Data and interactions** follow the live LIM app recording (project *Amazon*). **Today** is the viewer's current date; **Last updated** is 27.10.2026, as in the live app.
- Avatar (top left) → **Reset demo data** restores the original data and settings.

## Run it locally

```bash
python3 -m http.server 8091
```

Open http://localhost:8091. Designed for 1366 × 800 and wider.

## Updating the live demo

The CSS and JS links in `index.html` end with `?v=…` (version tags). After you change a CSS or JS file, raise the number on all those links (for example `20261027.3` → `20261027.4`) before pushing, so browsers fetch the new files instead of cached ones.

## What's where

| File | What it does |
| --- | --- |
| `assets/js/ribbon.js` | Ribbon. Row 1: search + filter chips, TODAY + ‹ › timeline navigation, Active Tasks, zoom, fit, refresh, info, Legends, Compact, collapse. Row 2: Time Period, Sort By, Group By, Column, Level (Expand all / Collapse all), View modes, Activity actions |
| `assets/js/gantt.js` | Table + timeline, tree, grouping, sorting, filtering, bars, dependencies, drag/resize, linking, hover card, row menu |
| `assets/js/panels.js` | Right panel: Activity Details, Edit Activity Date, Assign Zone, Add (Sub) Activity, Edit |
| `assets/js/time.js` | The five time periods and their column headers |
| `assets/js/data.js` | Demo data from the live app |

## Timeline navigation and markers

- The timeline opens in the **Monthly** view (the default until a user presses **Set as default**).
- **‹ ›** move to the previous / next period: Yearly = 1 year, Quarterly = 1 quarter, Monthly = 1 month, Weekly = 1 week. The timeline animates in the direction it moves.
- **TODAY** (text button, styled like Legends) jumps back to the period that contains today.
- Two dotted lines run down the timeline, each with a tooltip: **olive = Today**, **red = Last updated**.

## Where the drawer settings went

Ribbon spec: LIM Figma › New Planning › **Planning Ribbon** (node 13940:37242). Row 1 = 64 px, row 2 = 80 px.

| Settings drawer (live) | New place |
| --- | --- |
| Time Period, Group By, Sort By, Column, Level | Ribbon row 2, dropdowns + Level stepper |
| Set as default (Sort By, Column, Level) | Ribbon row 2, one **Set as default** tile. It saves Time Period, Group By, Sort By, Column and Level |
| Show Full Screen, Show Dependencies, Show Progress Percentage (Time / Work based) | Ribbon row 2, View modes |
| Download, Import | Ribbon row 2, two stacked icon buttons: Import on top, Download below |
| Legend | Ribbon row 1, **Legends** popover |

New, as approved: **filter chips** in the search box, the **Compact** density switch (36 px rows ⇄ 48 px), and the **ribbon collapse** chevron.

## Points to confirm

1. **Completed names.** The recording cut off some values ("Furniture Migra…"). They are completed in `data.js` and marked `// completed`.
2. **Side-nav tooltips.** The icons follow the Figma side nav; the labels (Dashboard, Sites, Planning, Analysis, Project, Team, File Upload, DMS) are matched to the live app's menu.
3. **Row colours.** The Critical Date rows use the legend colour (#F5BF5E) as a tint; Figma had no example. The lavender rows (Activity 80–84) come from the live app and have no legend entry.
4. **Import / Download.** Import (cloud-upload icon) sits on top, Download (cloud-download icon) below. Import only opens the file picker.
5. **Legend labels** use the Figma text ("Logistics Volume - Normal / Critical"); the live app says "High / Low".
6. **Zoom.** Figma shows zoom-in greyed out at 100%, so zoom runs from 50% to 100%. Fit resets it to 100%. The live app allows zooming in above 100%.
7. **Table header** labels line up with their columns (in the Figma frame they sit 24 px to the left).
8. Side panels open **below the ribbon**, so the controls stay visible.
9. Under ~1320 px width, ribbon row 2 scrolls sideways.
