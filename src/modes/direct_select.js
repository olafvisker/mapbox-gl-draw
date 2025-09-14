import {
  noTarget,
  isOfMetaType,
  isActiveFeature,
  isInactiveFeature,
  isShiftDown,
} from "../lib/common_selectors.js";
import createSupplementaryPoints from "../lib/create_supplementary_points.js";
import constrainFeatureMovement from "../lib/constrain_feature_movement.js";
import doubleClickZoom from "../lib/double_click_zoom.js";
import * as Constants from "../constants.js";
import moveFeatures from "../lib/move_features.js";
import { centerOfMass } from "@turf/center-of-mass";
import { transformScale } from "@turf/transform-scale";
import { distance } from "@turf/distance";
import { point } from "@turf/helpers";

const isVertex = isOfMetaType(Constants.meta.VERTEX);
const isMidpoint = isOfMetaType(Constants.meta.MIDPOINT);

const DirectSelect = {};

// INTERNAL FUCNTIONS

DirectSelect.fireUpdate = function () {
  this.fire(Constants.events.UPDATE, {
    action: Constants.updateActions.CHANGE_COORDINATES,
    features: this.getSelected().map((f) => f.toGeoJSON()),
  });
};

DirectSelect.fireLiveUpdate = function () {
  this.fire(Constants.events.LIVE_UPDATE, {
    action: Constants.updateActions.CHANGE_COORDINATES,
    features: this.getSelected().map((f) => f.toGeoJSON()),
  });
};

DirectSelect.fireActionable = function (state) {
  this.setActionableState({
    combineFeatures: false,
    uncombineFeatures: false,
    trash: state.selectedCoordPaths.length > 0,
  });
};

DirectSelect.startDragging = function (state, e) {
  if (state.initialDragPanState == null) {
    state.initialDragPanState = this.map.dragPan.isEnabled();
  }

  this.map.dragPan.disable();
  state.canDragMove = true;
  state.dragMoveLocation = e.lngLat;
};

function findFarthestPoint(selectedCoord, feature) {
  const coords =
    feature.type === Constants.geojsonTypes.POLYGON
      ? feature.coordinates[0]
      : feature.coordinates;

  return coords.reduce(
    (farthest, coord) =>
      distance(coord, selectedCoord, { units: "degrees" }) >
      distance(farthest, selectedCoord, { units: "degrees" })
        ? coord
        : farthest,
    selectedCoord
  );
}

DirectSelect.stopDragging = function (state) {
  if (state.canDragMove && state.initialDragPanState === true) {
    this.map.dragPan.enable();
  }

  state.initialDragPanState = null;
  state.dragMoving = false;
  state.canDragMove = false;
  state.dragMoveLocation = null;

  delete state.feature.properties._center;
  delete state.feature.properties._anchor;
};

DirectSelect.onVertex = function (state, e) {
  this.startDragging(state, e);

  const about = e.featureTarget.properties;
  const selectedIndex = state.selectedCoordPaths.indexOf(about.coord_path);
  if (!isShiftDown(e) && selectedIndex === -1) {
    state.selectedCoordPaths = [about.coord_path];
  } else if (isShiftDown(e) && selectedIndex === -1) {
    state.selectedCoordPaths.push(about.coord_path);
  }

  const selectedCoordinates = this.pathsToCoordinates(
    state.featureId,
    state.selectedCoordPaths
  );
  this.setSelectedCoordinates(selectedCoordinates);

  const modify = state.feature.properties.modify;
  if (modify === Constants.modificationMode.CENTER) {
    const result = centerOfMass(state.feature);
    const center = result.geometry.coordinates;
    state.feature.properties._center = center;
  } else if (modify === Constants.modificationMode.ANCHOR) {
    const selectedCoord = state.feature.getCoordinate(
      state.selectedCoordPaths[0]
    );
    state.feature.properties._anchor = findFarthestPoint(
      selectedCoord,
      state.feature
    );
  }
};

DirectSelect.onMidpoint = function (state, e) {
  this.startDragging(state, e);
  const about = e.featureTarget.properties;
  state.feature.addCoordinate(about.coord_path, about.lng, about.lat);
  this.fireUpdate();
  state.selectedCoordPaths = [about.coord_path];

  const modify = state.feature.properties.modify;
  if (modify === Constants.modificationMode.CENTER) {
    const result = centerOfMass(state.feature);
    const center = result.geometry.coordinates;
    state.feature.properties._center = center;
  } else if (modify === Constants.modificationMode.ANCHOR) {
    const selectedCoord = state.feature.getCoordinate(
      state.selectedCoordPaths[0]
    );
    state.feature.properties._anchor = findFarthestPoint(
      selectedCoord,
      state.feature
    );
  }
};

DirectSelect.pathsToCoordinates = function (featureId, paths) {
  return paths.map((coord_path) => ({ feature_id: featureId, coord_path }));
};

DirectSelect.onFeature = function (state, e) {
  // if (state.selectedCoordPaths.length === 0) this.startDragging(state, e);
  // else this.stopDragging(state);
  if (state.selectedCoordPaths.length > 0) {
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
  }
  this.startDragging(state, e);
};

DirectSelect.dragFeature = function (state, e, delta) {
  moveFeatures(this.getSelected(), delta);
  state.dragMoveLocation = e.lngLat;
  this.fireLiveUpdate();
};

DirectSelect.dragVertex = function (state, e, delta) {
  state.vertexDragMoveLocation = e.lngLat;
  const modify = state.feature.properties.modify;

  const selectedCoords = state.selectedCoordPaths.map((coord_path) =>
    state.feature.getCoordinate(coord_path)
  );

  if (modify === Constants.modificationMode.CENTER) {
    const center = state.feature.properties._center;
    const mousePoint = [e.lngLat.lng, e.lngLat.lat];

    const originalVertex = state.feature.getCoordinate(
      state.selectedCoordPaths[0]
    );

    const originalDist = distance(center, originalVertex, { units: "degrees" });
    const mouseDist = distance(center, mousePoint, { units: "degrees" });
    const scaleFactor = mouseDist / originalDist;

    const scaled = transformScale(state.feature.toGeoJSON(), scaleFactor, {
      origin: center,
      mutate: true,
    });

    const coords = scaled.geometry.coordinates;
    const isPolygon = state.feature.type === Constants.geojsonTypes.POLYGON;
    state.feature.setCoordinates(isPolygon ? [coords[0].slice(0, -1)] : coords);

    this.fireLiveUpdate();
    return;
  }

  if (modify === Constants.modificationMode.ANCHOR) {
    const [anchorX, anchorY] = state.feature.properties._anchor;
    const [selectedX, selectedY] = selectedCoords[0];

    let origDistX = selectedX - anchorX;
    let origDistY = selectedY - anchorY;

    if (origDistX === 0) origDistX = 1;
    if (origDistY === 0) origDistY = 1;

    const mouseX = e.lngLat.lng;
    const mouseY = e.lngLat.lat;

    let scaleX = (mouseX - anchorX) / origDistX;
    let scaleY = (mouseY - anchorY) / origDistY;

    const minScale = 0.01;
    if (scaleX >= 0) scaleX = Math.max(scaleX, minScale);
    else scaleX = Math.min(scaleX, -minScale);

    if (scaleY >= 0) scaleY = Math.max(scaleY, minScale);
    else scaleY = Math.min(scaleY, -minScale);

    const coords = state.feature.coordinates;
    const isPolygon = state.feature.type === Constants.geojsonTypes.POLYGON;
    const points = isPolygon ? coords[0] : coords;

    const scaledCoords = points.map(([x, y]) => [
      anchorX + (x - anchorX) * scaleX,
      anchorY + (y - anchorY) * scaleY,
    ]);

    state.feature.setCoordinates(isPolygon ? [scaledCoords] : scaledCoords);
    this.fireLiveUpdate();
    return;
  }

  const selectedCoordPoints = selectedCoords.map((coords) => ({
    type: Constants.geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: Constants.geojsonTypes.POINT,
      coordinates: coords,
    },
  }));

  const constrainedDelta = constrainFeatureMovement(selectedCoordPoints, delta);
  for (let i = 0; i < selectedCoords.length; i++) {
    const coord = selectedCoords[i];
    state.feature.updateCoordinate(
      state.selectedCoordPaths[i],
      coord[0] + constrainedDelta.lng,
      coord[1] + constrainedDelta.lat
    );
  }

  this.fireLiveUpdate();
};

DirectSelect.clickNoTarget = function () {
  doubleClickZoom.enable(this);
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

DirectSelect.clickInactive = function (state, e) {
  doubleClickZoom.enable(this);
  const featureId = e.featureTarget.properties.id;
  this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [featureId] });
};

DirectSelect.clickActiveFeature = function (state) {
  state.selectedCoordPaths = [];
  this.clearSelectedCoordinates();
  state.feature.changed();
};

// EXTERNAL FUNCTIONS
DirectSelect.onSetup = function (opts) {
  const featureId = opts.featureId;
  const feature = this.getFeature(featureId);

  if (!feature) {
    throw new Error("You must provide a featureId to enter direct_select mode");
  }

  if (feature.type === Constants.geojsonTypes.POINT) {
    throw new TypeError("direct_select mode doesn't handle point features");
  }

  const state = {
    featureId,
    feature,
    dragMoveLocation: opts.startPos || null,
    dragMoving: false,
    canDragMove: false,
    selectedCoordPaths: opts.coordPath ? [opts.coordPath] : [],
    vertexDragMoveLocation: null,
  };

  this.setSelected(featureId);
  this.setSelectedCoordinates(
    this.pathsToCoordinates(featureId, state.selectedCoordPaths)
  );
  doubleClickZoom.disable(this);

  this.setActionableState({
    trash: true,
  });

  return state;
};

DirectSelect.onStop = function () {
  doubleClickZoom.enable(this);
  this.clearSelectedCoordinates();
};

DirectSelect.toDisplayFeatures = function (state, geojson, push) {
  const { midpoints: midpointsOption, vertices: verticesOption } =
    state.feature.properties;
  const isActive = state.featureId === geojson.properties.id;

  geojson.properties.active = isActive
    ? Constants.activeStates.ACTIVE
    : Constants.activeStates.INACTIVE;

  push(geojson); // always push main feature first

  if (!isActive) {
    this.fireActionable(state);
    return;
  }

  const drawMidpoints =
    midpointsOption === undefined ||
    midpointsOption === true ||
    midpointsOption > 0;
  const drawVertices =
    verticesOption === undefined ||
    verticesOption === true ||
    verticesOption > 0;
  if (!drawMidpoints && !drawVertices) return;

  const supplementaryPoints = createSupplementaryPoints(geojson, {
    map: this.map,
    midpoints: drawMidpoints,
    selectedPaths: state.selectedCoordPaths,
  });

  const midpoints = drawMidpoints
    ? supplementaryPoints.filter(
        (p) => p.properties.meta === Constants.meta.MIDPOINT
      )
    : [];

  let vertices = drawVertices
    ? supplementaryPoints.filter(
        (p) => p.properties.meta !== Constants.meta.MIDPOINT
      )
    : [];

  if (typeof verticesOption === "number") {
    const step = vertices.length / verticesOption;
    vertices = Array.from(
      { length: verticesOption },
      (_, i) => vertices[Math.floor(i * step) % vertices.length]
    );
  }

  [...midpoints, ...vertices].forEach(push);

  this.fireActionable(state);
};

DirectSelect.onTrash = function (state) {
  const deleteStrategy = state.feature.properties.vertexDelete;

  if (deleteStrategy === Constants.vertexDeletionStrategy.DELETE_FEATURE) {
    this.deleteFeature([state.featureId]);
    this.changeMode(Constants.modes.SIMPLE_SELECT, {});
    return;
  }

  if (deleteStrategy === Constants.vertexDeletionStrategy.TO_DEFAULT) {
    delete state.feature.properties.vertices;
    delete state.feature.properties.midpoints;
    delete state.feature.properties.vertexDelete;
    delete state.feature.properties.modify;
  }

  if (state.selectedCoordPaths.length === 0) {
    this.deleteFeature([state.featureId]);
    this.changeMode(Constants.modes.SIMPLE_SELECT, {});
  } else {
    // Uses number-aware sorting to make sure '9' < '10'. Comparison is reversed because we want them
    // in reverse order so that we can remove by index safely.
    state.selectedCoordPaths
      .sort((a, b) => b.localeCompare(a, "en", { numeric: true }))
      .forEach((id) => state.feature.removeCoordinate(id));
    this.fireUpdate();
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
    this.fireActionable(state);
    if (state.feature.isValid() === false) {
      this.deleteFeature([state.featureId]);
      this.changeMode(Constants.modes.SIMPLE_SELECT, {});
    }
  }
};

DirectSelect.onMouseMove = function (state, e) {
  // On mousemove that is not a drag, stop vertex movement.
  const isFeature = isActiveFeature(e);
  const onVertex = isVertex(e);
  const isMidPoint = isMidpoint(e);
  const noCoords = state.selectedCoordPaths.length === 0;

  if (isActiveFeature(e) && noCoords)
    this.updateUIClasses({ mouse: Constants.cursors.MOVE });
  else if (onVertex && !noCoords)
    this.updateUIClasses({ mouse: Constants.cursors.MOVE });
  else if (isInactiveFeature(e))
    this.updateUIClasses({ mouse: Constants.cursors.POINTER });
  else this.updateUIClasses({ mouse: Constants.cursors.NONE });

  const isDraggableItem = onVertex || isFeature || isMidPoint;
  if (isDraggableItem && state.dragMoving) this.fireUpdate();

  this.stopDragging(state);

  // Skip render
  return true;
};

DirectSelect.onMouseOut = function (state) {
  // As soon as you mouse leaves the canvas, update the feature
  if (state.dragMoving) this.fireUpdate();

  // Skip render
  return true;
};

DirectSelect.onTouchStart = DirectSelect.onMouseDown = function (state, e) {
  if (e.points == null || e.points.length === 1) {
    if (isVertex(e)) return this.onVertex(state, e);
    if (isActiveFeature(e)) return this.onFeature(state, e);
    if (isMidpoint(e)) return this.onMidpoint(state, e);
  }
};

DirectSelect.onDrag = function (state, e) {
  if (state.canDragMove !== true) return;
  state.dragMoving = true;
  e.originalEvent.stopPropagation();

  const delta = {
    lng: e.lngLat.lng - state.dragMoveLocation.lng,
    lat: e.lngLat.lat - state.dragMoveLocation.lat,
  };
  if (state.selectedCoordPaths.length > 0) this.dragVertex(state, e, delta);
  else this.dragFeature(state, e, delta);

  this.fireLiveUpdate();

  state.dragMoveLocation = e.lngLat;
};

DirectSelect.onClick = function (state, e) {
  if (noTarget(e)) return this.clickNoTarget(state, e);
  if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
  if (isInactiveFeature(e)) return this.clickInactive(state, e);

  this.stopDragging(state);
};

DirectSelect.onTap = function (state, e) {
  if (noTarget(e)) return this.clickNoTarget(state, e);
  if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
  if (isInactiveFeature(e)) return this.clickInactive(state, e);
};

DirectSelect.onTouchEnd = DirectSelect.onMouseUp = function (state) {
  if (state.dragMoving) {
    this.fireUpdate();
  }
  this.stopDragging(state);
};

export default DirectSelect;
