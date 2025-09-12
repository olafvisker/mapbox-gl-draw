import * as Constants from "../constants.js";
import doubleClickZoom from "../lib/double_click_zoom.js";
import createVertex from "../lib/create_vertex.js";
import { circle } from "@turf/circle";
import { distance } from "@turf/distance";

const DrawCircle = {};

DrawCircle.fireCreate = function (state) {
  this.fire(Constants.events.CREATE, {
    features: [state.circle.toGeoJSON()],
  });
};

DrawCircle.fireLiveUpdate = function (state) {
  this.fire(Constants.events.LIVE_UPDATE, {
    action: Constants.updateActions.CHANGE_COORDINATES,
    features: [state.circle.toGeoJSON()],
  });
};

DrawCircle.onSetup = function () {
  const circle = this.newFeature({
    type: Constants.geojsonTypes.FEATURE,
    properties: { isCircle: true, center: [] },
    geometry: {
      type: Constants.geojsonTypes.POLYGON,
      coordinates: [
        [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ],
    },
  });

  this.addFeature(circle);
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);

  this.updateUIClasses({ mouse: Constants.cursors.ADD });
  this.activateUIButton(Constants.types.POLYGON);
  this.setActionableState({ trash: true });

  return {
    circle,
    center: null,
    centerMarker: null,
    radiusMeters: 0,
  };
};

DrawCircle.clickAnywhere = function (state, e) {
  if (!state.center) {
    // First click sets center
    state.center = [e.lngLat.lng, e.lngLat.lat];
    state.circle.properties.center = state.center;

    const marker = this.newFeature({
      type: Constants.geojsonTypes.FEATURE,
      properties: { isCenter: true },
      geometry: {
        type: Constants.geojsonTypes.POINT,
        coordinates: state.center,
      },
    });
    this.addFeature(marker);
    state.centerMarker = marker;
    return;
  }

  // Second click finalizes circle
  state.radiusMeters = distance(state.center, [e.lngLat.lng, e.lngLat.lat], {
    units: "meters",
  });
  const circleFeature = circle(state.center, state.radiusMeters, {
    steps: 64,
    units: "meters",
    properties: { isCircle: true, center: state.center },
  });

  state.circle.setCoordinates(circleFeature.geometry.coordinates);

  this.changeMode(Constants.modes.SIMPLE_SELECT, {
    featureIds: [state.circle.id],
  });
};

DrawCircle.onTap = DrawCircle.onClick = function (state, e) {
  this.clickAnywhere(state, e);
};

DrawCircle.onMouseMove = function (state, e) {
  if (!state.center) return;

  state.radiusMeters = distance(state.center, [e.lngLat.lng, e.lngLat.lat], {
    units: "meters",
  });
  const circleFeature = circle(state.center, state.radiusMeters, {
    steps: 64,
    units: "meters",
    properties: { isCircle: true, center: state.center },
  });

  state.circle.setCoordinates(circleFeature.geometry.coordinates);
  this.fireLiveUpdate(state);
};

DrawCircle.onStop = function (state) {
  doubleClickZoom.enable(this);
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
  this.activateUIButton();

  if (state.centerMarker) {
    this.deleteFeature([state.centerMarker.id], { silent: true });
  }

  const feature = this.getFeature(state.circle.id);
  if (!feature) return;

  if (state.circle.isValid()) {
    this.fireCreate(state);
  } else {
    this.deleteFeature([state.circle.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true });
  }
};

DrawCircle.onKeyUp = function (state, e) {
  if (e.key === "Escape") {
    if (state.centerMarker)
      this.deleteFeature([state.centerMarker.id], { silent: true });
    this.deleteFeature([state.circle.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT);
  }
};

DrawCircle.toDisplayFeatures = function (state, geojson, display) {
  const isActive = geojson.properties.id === state.circle.id;
  geojson.properties.active = isActive
    ? Constants.activeStates.ACTIVE
    : Constants.activeStates.INACTIVE;

  if (isActive && state.center) {
    display(createVertex(state.circle.id, state.center, "center", false));
  }

  display(geojson);
};

DrawCircle.onTrash = function (state) {
  if (state.centerMarker)
    this.deleteFeature([state.centerMarker.id], { silent: true });
  this.deleteFeature([state.circle.id], { silent: true });
  this.changeMode(Constants.modes.SIMPLE_SELECT);
};

export default DrawCircle;
