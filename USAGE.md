# Usage Guide

## Installation

```bash
git clone https://github.com/AyanamiAkaha/strelka.git
cd strelka
yarn install
yarn dev
```

The dev server starts at `http://localhost:3000` and auto-opens in your browser.

For a production build:

```bash
yarn build        # Output in dist/
yarn preview      # Preview the production build
```

## System Requirements

- Modern browser with WebGL or WebGL2 support (Chrome, Firefox, Edge, Safari)
- Dedicated GPU recommended for datasets above 1M points
- 8GB+ RAM recommended for large datasets

### GPU Guidelines

| Point Count | GPU Recommendation |
|-------------|-------------------|
| < 500K | Integrated graphics (Intel/AMD APU) |
| 500K - 5M | Entry-level dedicated GPU |
| 5M - 30M | Mid-range or better dedicated GPU |

## Camera Controls

The camera uses quaternion-based 6DOF (six degrees of freedom) freeflight controls.

| Input | Action |
|-------|--------|
| **Mouse drag** | Look around (rotate camera) |
| **W / S** | Move forward / backward |
| **A / D** | Move left / right |
| **Q / E** | Move up / down |
| **Shift** | Move faster (hold while moving) |
| **R** | Reset camera to default position |
| **Scroll wheel** | Adjust hover detection distance |

Click on the canvas first to capture mouse input. The camera supports full 360-degree rotation without gimbal lock.

## Data Formats

The application accepts two data formats: JSON and SQLite.

### JSON Format

A JSON file containing an array of point objects. Each point must have `x`, `y`, `z`, and `cluster` fields. Optional fields: `tag` and `image`.

```json
[
  { "x": 1.0, "y": 2.5, "z": -0.3, "cluster": 0 },
  { "x": 3.2, "y": 1.1, "z": 4.7, "cluster": 1, "tag": "sample-A" },
  { "x": -1.5, "y": 0.8, "z": 2.1, "cluster": 1, "tag": "sample-B", "image": "img/photo.png" }
]
```

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | X coordinate |
| `y` | number | Y coordinate |
| `z` | number | Z coordinate |
| `cluster` | number | Cluster ID (-1 for noise, >= 0 for clusters) |

**Optional fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tag` | string | Text label displayed on hover |
| `image` | string | Image path/URL displayed on hover |

### SQLite Format

A `.db` or `.sqlite` file with a table containing columns `x`, `y`, `z`, and `cluster`. Optional columns: `tag`, `image`.

```sql
CREATE TABLE points (
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    cluster INTEGER NOT NULL,
    tag TEXT,
    image TEXT
);
```

When loading a SQLite file with multiple tables, a dropdown appears to select which table to load.

### Point Count Limit

The application enforces a maximum of **30 million points** per dataset. Files exceeding this limit are rejected with an error message.

## Loading Data

### File Picker

1. Click the **Load JSON** button in the controls overlay (top-right)
2. Select a `.json`, `.db`, or `.sqlite` file
3. For SQLite files with multiple tables, select the target table from the dropdown

### Drag and Drop

Drag a `.json`, `.db`, or `.sqlite` file directly onto the controls overlay area.

### Data Source Toggle

Use the **Generate** / **Load** buttons to switch between:
- **Generate**: Procedurally generated spiral clusters (for testing)
- **Load**: Your most recently loaded file

Switching data sources resets the camera position.

## Cluster Highlighting

The **Highlighted cluster** slider in the controls overlay filters which clusters are visible:

| Value | Behavior |
|-------|----------|
| **None** (-2) | All clusters visible, no highlighting |
| **Noise** (-1) | Highlights noise points (cluster ID -1) |
| **Cluster N** (>= 0) | Highlights specific cluster N |

Non-highlighted clusters are rendered with reduced opacity.

## Point Hover and Metadata

Move your cursor over points to see associated metadata:

- **Tag**: Displayed as a green badge near the hovered point
- **Image**: Displayed as a thumbnail near the hovered point
- Points without metadata show a point index fallback

The **Image Path Base** field in the controls overlay prepends a base path to all image URLs, useful when images are stored in a directory relative to the data.

Scroll the mouse wheel to adjust the hover detection distance threshold.

## Performance Notes

- Point data is uploaded to the GPU once and reused every frame (`gl.STATIC_DRAW`)
- A single draw call renders all points per frame
- Matrix calculations happen in the vertex shader, not CPU
- Additive blending with depth test on / depth writes off

### Optimization Tips

- Close other GPU-intensive applications when viewing large datasets
- If FPS drops below 30, try reducing the dataset size
- The **Points per cluster** sliders (Generation Settings) control generated data size:
  - **Order of magnitude**: 10^N base points (1 = 10, 4 = 10000, 7 = 10000000)
  - **Multiplier**: Multiplied by the base (1x-10x)

## Troubleshooting

**Black screen / no points visible:**
- Check browser console (F12) for WebGL errors
- Ensure your browser supports WebGL (test at [get.webgl.org](https://get.webgl.org))
- Try pressing **R** to reset the camera

**"WebGL Error" overlay appears:**
- Your browser or GPU may not support WebGL2; the app falls back to WebGL1
- Update your graphics drivers
- Try a different browser

**Data loading fails:**
- Check the error panel (top-right, red border) for specific error messages
- Verify JSON structure matches the schema above
- For SQLite, ensure the table has the required columns (`x`, `y`, `z`, `cluster`)
- Files exceeding 30M points are rejected

**Low FPS:**
- Reduce point count (use smaller datasets or adjust generation sliders)
- Close other GPU-intensive applications
- Check if hardware acceleration is enabled in your browser settings

**Images not loading in hover overlay:**
- Set the **Image Path Base** field to the directory containing your images
- For local files, ensure the Vite dev server can access the path
