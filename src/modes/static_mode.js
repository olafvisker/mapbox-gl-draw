import * as Constants from "../constants.js";

const StaticMode = {};

StaticMode.onSetup = function () {
  this.setActionableState();
  return {};
};

StaticMode.onTouchStart = StaticMode.onMouseDown = function () {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
};

StaticMode.onTouchEnd = StaticMode.onMouseUp = function () {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
};

StaticMode.onMouseMove = function () {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
};

StaticMode.toDisplayFeatures = function (state, geojson, display) {
  display(geojson);
};

export default StaticMode;
