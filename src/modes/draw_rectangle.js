import * as Constants from "../constants.js";
import doubleClickZoom from "../lib/double_click_zoom.js";
import createVertex from "../lib/create_vertex.js";

const DrawRectangle = {};

DrawRectangle.fireCreate = function (state) {
  this.fire(Constants.events.CREATE, {
    features: [state.rectangle.toGeoJSON()],
  });
};

DrawRectangle.fireLiveUpdate = function (state) {
  this.fire(Constants.events.LIVE_UPDATE, {
    action: Constants.updateActions.CHANGE_COORDINATES,
    features: [state.rectangle.toGeoJSON()],
  });
};

DrawRectangle.onSetup = function () {
  const rectangle = this.newFeature({
    type: Constants.geojsonTypes.FEATURE,
    properties: {
      modify: Constants.modificationMode.ANCHOR,
      midpoints: false,
      vertexDelete: Constants.vertexDeletionStrategy.TO_DEFAULT,
    },
    geometry: {
      type: Constants.geojsonTypes.POLYGON,
      coordinates: [],
    },
  });

  this.addFeature(rectangle);
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);

  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  this.activateUIButton(Constants.types.POLYGON);
  this.setActionableState({ trash: true });

  return {
    rectangle,
    currentVertexPosition: 0,
    startPoint: null,
    startPointMarker: null,
  };
};

DrawRectangle.clickAnywhere = function (state, e) {
  if (!state.startPoint) {
    // First click sets start point
    state.startPoint = [e.lngLat.lng, e.lngLat.lat];

    // Create start point marker
    const marker = this.newFeature({
      type: Constants.geojsonTypes.FEATURE,
      properties: {},
      geometry: {
        type: Constants.geojsonTypes.POINT,
        coordinates: [e.lngLat.lng, e.lngLat.lat],
      },
    });
    this.addFeature(marker);
    state.startPointMarker = marker;
    return;
  }

  // Second click finishes rectangle
  const startX = state.startPoint[0];
  const startY = state.startPoint[1];
  const endX = e.lngLat.lng;
  const endY = e.lngLat.lat;

  state.rectangle.updateCoordinate("0.0", startX, startY);
  state.rectangle.updateCoordinate("0.1", endX, startY);
  state.rectangle.updateCoordinate("0.2", endX, endY);
  state.rectangle.updateCoordinate("0.3", startX, endY);
  state.rectangle.updateCoordinate("0.4", startX, startY);

  this.changeMode(Constants.modes.SIMPLE_SELECT, {
    featureIds: [state.rectangle.id],
  });
};

DrawRectangle.onTap = DrawRectangle.onClick = function (state, e) {
  this.clickAnywhere(state, e);
};

DrawRectangle.onMouseMove = function (state, e) {
  if (!state.startPoint) return;
  const startX = state.startPoint[0];
  const startY = state.startPoint[1];

  state.rectangle.updateCoordinate("0.0", startX, startY);
  state.rectangle.updateCoordinate("0.1", e.lngLat.lng, startY);
  state.rectangle.updateCoordinate("0.2", e.lngLat.lng, e.lngLat.lat);
  state.rectangle.updateCoordinate("0.3", startX, e.lngLat.lat);
  state.rectangle.updateCoordinate("0.4", startX, startY);

  // Move the start point marker with the first vertex
  if (state.startPointMarker) {
    state.startPointMarker.updateCoordinate("0", startX, startY);
  }

  this.fireLiveUpdate(state);
};

DrawRectangle.onKeyUp = function (state, e) {
  if (e.key === "Escape") {
    if (state.startPointMarker) {
      this.deleteFeature([state.startPointMarker.id], { silent: true });
    }
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT);
  }
};

DrawRectangle.onStop = function (state) {
  doubleClickZoom.enable(this);
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
  this.activateUIButton();

  // Remove start point marker
  if (state.startPointMarker) {
    this.deleteFeature([state.startPointMarker.id], { silent: true });
  }

  const feature = this.getFeature(state.rectangle.id);
  if (!feature) return;

  state.rectangle.removeCoordinate("0.4");

  if (state.rectangle.isValid()) {
    this.fireCreate(state);
  } else {
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true });
  }
};

DrawRectangle.toDisplayFeatures = function (state, geojson, display) {
  const isActive = geojson.properties.id === state.rectangle.id;
  geojson.properties.active = isActive
    ? Constants.activeStates.ACTIVE
    : Constants.activeStates.INACTIVE;
  if (!isActive) return display(geojson);
  if (geojson.geometry.coordinates.length === 0) return;

  // Display vertices
  for (let i = 0; i < geojson.geometry.coordinates[0].length - 1; i++) {
    display(
      createVertex(
        state.rectangle.id,
        geojson.geometry.coordinates[0][i],
        `0.${i}`,
        false
      )
    );
  }

  display(geojson);
};

DrawRectangle.onTrash = function (state) {
  if (state.startPointMarker) {
    this.deleteFeature([state.startPointMarker.id], { silent: true });
  }
  this.deleteFeature([state.rectangle.id], { silent: true });
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

export default DrawRectangle;
