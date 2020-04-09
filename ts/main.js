"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var paper_1 = __importDefault(require("paper"));
function onloaded() {
    //let canvas = new CanvasManager();
    //new Path()
    var canvas = document.getElementById('draw-canvas');
    paper_1.default.setup(canvas);
    var path = new paper_1.default.Path();
    path.strokeColor = paper_1.default.Color.random();
    var start = new paper_1.default.Point(100, 100);
    path.moveTo(start);
    path.lineTo(paper_1.default.Point.random());
    paper_1.default.view.update();
}
document.body.onload = function (ev) { return onloaded(); };
