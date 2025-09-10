import * as Constants from "../constants.js";

const StaticMode = {};

StaticMode.onSetup = function () {
  this.setActionableState();
  return {};
};

StaticMode.onTouchStart = StaticMode.onMouseDown = function (state, e) {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
};

StaticMode.onTouchEnd = StaticMode.onMouseUp = function (state) {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
};

StaticMode.onMouseMove = function (state, e) {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
};

StaticMode.toDisplayFeatures = function (state, geojson, display) {
  display(geojson);
};

export default StaticMode;
