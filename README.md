### Fork Changelog

Changes in this fork relative to `@mapbox/mapbox-gl-draw`:

- **DirectSelect & SimpleSelect**: Fire `draw.update.live` while dragging vertices or features.
- **DrawLineString & DrawPolygon**: Fire `draw.update.live` during vertex movement.
- **StaticMode**: Added a static mode that displays data stored in Draw but disabled all user feature interaction.
- **DirectSelect**: Dragging a feature now automatically deselects any previously selected vertex, enabling immediate movement of the entire feature without requiring manual vertex deselection.
- **New Modes**: Added draw_rectangle and draw_circle modes for drawing rectangles and geodesic circles. Deleting a vertex from the circle deletes the entire circle. Deleting a vertex from a rectangle turns it into a normal polygon.
- **DirectSelect & SimpleSelect**: Updated to account for proper circle and rectangle editing.
- Updated debug/index.html to account for new modes.

**Merged upstream pull requests that fixed the following:**

- [#901](https://github.com/mapbox/mapbox-gl-draw/pull/901) Fix selection event in direct_select w/ coordPath
- [#973](https://github.com/mapbox/mapbox-gl-draw/pull/973) Ignore touch start with multiple points in direct_select
- [#975](https://github.com/mapbox/mapbox-gl-draw/pull/975) Allow deleting the whole feature from direct_select
- [#978](https://github.com/mapbox/mapbox-gl-draw/pull/978) When clicking an inactive feature in direct_select, select it
- [#1026](https://github.com/mapbox/mapbox-gl-draw/pull/1026) Eliminate switching between hot and cold sources
- [#1321](https://github.com/mapbox/mapbox-gl-draw/pull/1321) Remove the flickering effect when clicking on features
- [#1428](https://github.com/mapbox/mapbox-gl-draw/pull/1428) Preferring vertices over midpoints
- [#1433](https://github.com/mapbox/mapbox-gl-draw/pull/1433) Fix midpoints locations

**Added dependencies**

- @turf/circle
- @turf/distance

---

# @mapbox/mapbox-gl-draw

![Build Status](https://github.com/mapbox/mapbox-gl-draw/actions/workflows/main.yml/badge.svg)

Adds support for drawing and editing features on [mapbox-gl.js](https://www.mapbox.com/mapbox-gl-js/) maps. [See a live example here](https://www.mapbox.com/mapbox-gl-js/example/mapbox-gl-draw/)

**Requires [mapbox-gl-js](https://github.com/mapbox/mapbox-gl-js).**

**If you are developing with `mapbox-gl-draw`, see [API.md](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/API.md) for documentation.**

### Installing

```
npm install @mapbox/mapbox-gl-draw
```

Draw ships with CSS, make sure you include it in your build.

### Usage in your application

#### JavaScript

**When using modules**

```js
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
```

**When using a CDN**

```html
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.js"></script>
```

#### CSS

**When using modules**

```js
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
```

**When using CDN**

```html
<link
  rel="stylesheet"
  href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css"
  type="text/css" />
```

### Typescript

Typescript definition files are available as part of the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mapbox__mapbox-gl-draw) package.

```
npm install @types/mapbox__mapbox-gl-draw
```

### Example usage

```js
mapboxgl.accessToken = "YOUR_ACCESS_TOKEN";

var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [40, -74.5],
  zoom: 9,
});

var Draw = new MapboxDraw();

// Map#addControl takes an optional second argument to set the position of the control.
// If no position is specified the control defaults to `top-right`. See the docs
// for more details: https://docs.mapbox.com/mapbox-gl-js/api/#map#addcontrol

map.addControl(Draw, "top-left");

map.on("load", function () {
  // ALL YOUR APPLICATION CODE
});
```

https://www.mapbox.com/mapbox-gl-js/example/mapbox-gl-draw/

### See [API.md](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/API.md) for complete reference.

### Enhancements and New Interactions

For additional functionality [check out our list of custom modes](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md#available-custom-modes).

Mapbox Draw accepts functionality changes after the functionality has been proven out via a [custom mode](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md#creating-modes-for-mapbox-draw). This lets users experiment and validate their mode before entering a review process, hopefully promoting innovation. When you write a custom mode, please open a PR adding it to our [list of custom modes](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md#available-custom-modes).

### Developing and testing

Install dependencies, build the source files and crank up a server via:

```
git clone git@github.com:mapbox/mapbox-gl-draw.git
npm ci
npm start & open "http://localhost:9967/debug/?access_token=<token>"
```

### Testing

```
npm run test
```

### Publishing

To GitHub and NPM:

```
npm version (major|minor|patch)
git push --tags
git push
npm publish
```

To CDN:

```
# make sure you are authenticated for AWS
git checkout v{x.y.z}
npm ci
npm run prepublish
aws s3 cp --recursive --acl public-read dist s3://mapbox-gl-js/plugins/mapbox-gl-draw/v{x.y.z}
```

Update the version number in [the GL JS example](https://github.com/mapbox/mapbox-gl-js/blob/publisher-production/docs/pages/example/mapbox-gl-draw.html).

### Naming actions

We're trying to follow standards when naming things. Here is a collection of links where we look for inspiration.

- https://turfjs.org
- https://shapely.readthedocs.io/en/latest/manual.html
