"use strict";
function run() {
    paper.install(window);
    const root = new Root();
    root.run();
}
onload = ev => run();
console.log("test");
class BrushManager {
    constructor() {
    }
}
var ZoomDirection;
(function (ZoomDirection) {
    ZoomDirection[ZoomDirection["IN"] = 0] = "IN";
    ZoomDirection[ZoomDirection["OUT"] = 1] = "OUT";
})(ZoomDirection || (ZoomDirection = {}));
class Camera {
    constructor(background) {
        this.lastMousePoint = new paper.Point(0, 0);
        this.zoomLevel = 100;
        this.background = background;
    }
    zoom(direction, shiftKey) {
        switch (direction) {
            case ZoomDirection.IN:
                if (shiftKey) {
                    this.zoomLevel -= 1;
                }
                else {
                    if (this.zoomLevel < 10) {
                        this.zoomLevel -= 1;
                    }
                    else {
                        this.zoomLevel -= 10;
                        this.zoomLevel = Math.max(9, this.zoomLevel);
                    }
                }
                break;
            case ZoomDirection.OUT:
                if (shiftKey) {
                    this.zoomLevel += 1;
                }
                else {
                    if (this.zoomLevel <= 10) {
                        this.zoomLevel += 1;
                    }
                    else {
                        this.zoomLevel += 10;
                    }
                }
                break;
        }
        this.zoomLevel = Math.min(Math.max(this.zoomLevel, 1), 300) | 0;
        paper.view.zoom = this.zoomLevel / 100;
        this.background.onMove();
    }
    move(delta) {
        paper.view.center = paper.view.center.add(delta);
        this.background.onMove();
    }
    beginPan(mousePoint) {
        this.lastMousePoint = mousePoint;
    }
    moveByPan(mousePoint) {
        const lastViewCenter = paper.view.center;
        paper.view.center = paper.view.center.add(this.lastMousePoint.subtract(mousePoint));
        this.lastMousePoint = mousePoint.add(paper.view.center.subtract(lastViewCenter));
        this.background.onMove();
    }
}
var Color = paper.Color;
var Mode;
(function (Mode) {
    Mode[Mode["SELECT"] = 0] = "SELECT";
    Mode[Mode["DRAW"] = 1] = "DRAW";
    Mode[Mode["PAN"] = 2] = "PAN";
    Mode[Mode["MOVE_SELECTED"] = 3] = "MOVE_SELECTED";
})(Mode || (Mode = {}));
class Root {
    constructor() {
        this.ws = new WebSocketHandler();
        this.users = new Users(this.ws);
        this.pathIDGenerator = new PathIDGenerator(0);
        this.mode = Mode.DRAW;
        this.tempMode = null;
        /* my paths */
        this.pathID = 0;
        this.path = null;
        this.rawPath = [];
        this.mouseDown = false;
        this.mouseDragged = false;
        /* mouse position */
        this.lastMousePosition = new paper.Point(0, 0);
        let canvas = document.getElementById("draw-canvas");
        paper.setup(canvas);
        paper.view.onMouseDown = event => this.onMouseDown(event);
        paper.view.onMouseUp = event => this.onMouseUp(event);
        paper.view.onMouseMove = event => this.onMouseMove(event);
        paper.view.onResize = event => this.onResize(event);
        paper.view.onMouseDrag = event => this.onMouseDragged(event);
        paper.view.onDoubleClick = event => this.onDoubleClick(event);
        $(document).on("contextmenu", () => {
            return false;
        });
        const tool = new paper.Tool();
        tool.onKeyDown = event => this.onKeyDown(event);
        setInterval(() => this.onUpdate(), 100); // every 100 ms we should maximum send
        $(canvas).on("wheel", (e) => this.onMouseScroll(e));
        this.background = new Background();
        this.background.setup();
        this.ui = new UIManager(this);
        this.selection = new SelectionManager(this.users, this.ws, this.ui.getBrushMenu());
        this.camera = new Camera(this.background);
    }
    run() {
        this.ws.connect();
        this.ws.onPacketReceived = pck => this.onPacketReceived(pck);
    }
    onMouseDown(ev) {
        this.mouseDown = true;
        this.mouseDragged = false;
        if (ev.event.button == 0) { // main mouse button clicked
            if (this.mode == Mode.DRAW) {
                this.selection.clear();
                this.path = new paper.Path({
                    segments: [ev.point],
                    // Select the path, so we can see its segment points:
                    fullySelected: false,
                    strokeWidth: this.ui.getStrokeWidth(),
                    strokeColor: this.ui.getColor(),
                });
                this.rawPath = [ev.point];
                this.pathID = this.pathIDGenerator.getNext();
                this.ws.sendPacket(new ClientBeginPath(this.pathID, ev.point, this.ui.getStrokeWidth(), this.ui.getColor()));
            }
            else if (this.mode == Mode.PAN) {
                this.camera.beginPan(ev.point);
            }
            else if (this.mode == Mode.SELECT) {
                this.selection.startSelection(ev.point);
            }
        }
        else if (ev.event.button == 1) { // the scroll wheel clicked
            this.tempMode = Mode.PAN;
            this.camera.beginPan(ev.point);
        }
        else if (ev.event.button == 2) { // the right button
            this.tempMode = Mode.SELECT;
            this.selection.startSelection(ev.point);
        }
        console.log("mouseDown");
    }
    onMouseUp(ev) {
        var _a;
        if (this.mouseDown) {
            if (this.tempMode == Mode.SELECT) {
                this.selection.onMouseUp(ev, this.mouseDragged);
                this.ui.setModeMove();
                ev.event.preventDefault();
            }
            else if (this.tempMode == Mode.PAN) {
                // do nothing
                // this.camera.endPan()
                ev.event.preventDefault();
            }
            else if (this.mode == Mode.DRAW) {
                this.ws.sendPacket(new ClientEndPath(this.pathID));
                if (this.path != null) {
                    const drawLine = new DrawLine(this.path, this.pathID, this.users.getMyUserID(), this.rawPath);
                    if (this.mouseDragged) {
                        //this.path.simplify();
                        drawLine.simplify();
                        (_a = this.users.getMyUser()) === null || _a === void 0 ? void 0 : _a.addLine(drawLine);
                        //this.selection.setSelected(drawLine);
                    }
                    else {
                        // we didn't draw anything so delete this line
                        this.ws.sendPacket(new ClientDeleteLines([drawLine]));
                    }
                }
                this.path = null;
            }
            else if (this.mode == Mode.SELECT) {
                this.selection.onMouseUp(ev, this.mouseDragged);
                this.mouseDown = false;
                this.ui.setModeMove();
            }
            else if (this.mode == Mode.PAN) {
                // do nothing
                // this.camera.endPan()
            }
            console.log("mouseUp");
        }
        this.tempMode = null;
        this.mouseDown = false;
    }
    onMouseDragged(ev) {
        this.mouseDragged = true;
        if (this.tempMode == Mode.PAN) {
            this.camera.moveByPan(ev.point);
        }
        else if (this.tempMode == Mode.SELECT) {
            this.selection.onMouseDragged(ev.point);
        }
        else if (this.mode == Mode.DRAW) {
            if (this.path != null) {
                this.ws.sendPacket(new ClientAddPointsPath(this.pathID, [ev.point]));
                this.path.add(ev.point);
                this.rawPath.push(ev.point);
            }
        }
        else if (this.mode == Mode.PAN) {
            this.camera.moveByPan(ev.point);
        }
        else if (this.mode == Mode.SELECT) {
            this.selection.onMouseDragged(ev.point);
            console.log("SEL dragged");
        }
        else if (this.mode == Mode.MOVE_SELECTED) {
            this.selection.move(ev.delta);
        }
    }
    onMouseMove(ev) {
        this.lastMousePosition = ev.point;
        if (this.mode == Mode.SELECT || this.tempMode == Mode.SELECT) {
            this.selection.onMouseMove(ev.point, this.mouseDown);
        }
    }
    onResize(event) {
        this.background.onMove();
    }
    onKeyDown(event) {
        console.log(event.key);
        if (event.key == "delete" || event.key == "backspace") {
            this.deleteSelection();
        }
        else if (event.key == "escape") {
            this.selection.clear();
        }
        else if (event.key == "z") {
            if (event.modifiers.control) {
                this.undo();
            }
        }
        else if (event.key == "a") {
            if (event.modifiers.control) {
                this.selection.selectAll();
                // @ts-ignore
                event.preventDefault();
            }
        }
        else if (event.key == "c") {
            if (event.modifiers.control) {
                this.selection.copy();
            }
        }
        else if (event.key == "v") {
            if (event.modifiers.control) {
                this.selection.paste(this.pathIDGenerator);
            }
        }
        else if (event.key == "1") {
            this.ui.setModePan();
        }
        else if (event.key == "2" || event.key == "p" || event.key == "d") {
            this.ui.setModeDraw();
        }
        else if (event.key == "3" || event.key == "s") {
            this.ui.setModeSelect();
        }
        else if (event.key == "4" || event.key == "m") {
            this.ui.setModeMove();
        }
        else if (event.key == "5") {
            this.deleteSelection();
        }
        else if (event.key == "6") {
            this.undo();
        }
    }
    onMouseScroll(e) {
        const event = e.originalEvent;
        if (event.ctrlKey) {
            let direction = event.deltaY < 0 ? ZoomDirection.OUT : ZoomDirection.IN;
            this.camera.zoom(direction, event.shiftKey);
            event.preventDefault();
        }
        else {
            this.camera.move(new paper.Point(event.deltaX, event.deltaY));
        }
    }
    onDoubleClick(event) {
    }
    onUpdate() {
        // check that we should send new update
        if (this.path != null) {
        }
    }
    onPacketReceived(pck) {
        console.log("got packet" + pck.getPacketType());
        switch (pck.getPacketType()) {
            case 0 /* SetUserID */:
                this.handleSetUserID(pck);
                break;
            case 1 /* AddUser */:
                this.handleAddUser(pck);
                break;
            case 2 /* BeginPath */:
                this.handleBeginPath(pck);
                break;
            case 4 /* AddPointsPath */:
                this.handleAddPointsPath(pck);
                break;
            case 3 /* EndPath */:
                this.handleEndPath(pck);
                break;
            case 5 /* DeleteLines */:
                this.handleDeleteLines(pck);
                break;
            case 6 /* MoveLines */:
                this.handleMoveLines(pck);
                break;
            case 7 /* SetStrokeSize */:
                this.handleSetStrokeSize(pck);
                break;
            case 8 /* SetStrokeColor */:
                this.handleSetStrokeColor(pck);
                break;
            case 9 /* RemovedUser */:
                this.handleRemovedUser(pck);
                break;
        }
    }
    handleSetUserID(pck) {
        this.users.setMyUserID(pck.userID);
    }
    handleAddUser(pck) {
        this.users.add(pck.userID);
    }
    handleBeginPath(pck) {
        var _a;
        (_a = this.users.findUserByID(pck.userID)) === null || _a === void 0 ? void 0 : _a.beginPath(pck.lineID, pck.pos, pck.strokeWidth, pck.strokeColor);
    }
    handleAddPointsPath(pck) {
        var _a;
        (_a = this.users.findUserByID(pck.userID)) === null || _a === void 0 ? void 0 : _a.addPointsPath(pck.lineID, pck.points);
    }
    handleEndPath(pck) {
        var _a;
        (_a = this.users.findUserByID(pck.userID)) === null || _a === void 0 ? void 0 : _a.endPath(pck.lineID);
    }
    deleteLine(userID, lineID) {
        var _a;
        (_a = this.users.findUserByID(userID)) === null || _a === void 0 ? void 0 : _a.deleteLine(lineID);
        this.selection.onDeleteLine(userID, lineID);
    }
    handleDeleteLines(pck) {
        pck.lines.forEach(l => {
            this.deleteLine(l.userID, l.lineID);
        });
    }
    handleMoveLines(pck) {
        console.log("handleMove" + pck.delta);
        pck.lines.forEach(l => {
            var _a;
            (_a = this.users.findUserByID(l.userID)) === null || _a === void 0 ? void 0 : _a.moveLine(l.lineID, pck.delta);
        });
        //this.selection.
        this.selection.onPacketMoveLines();
    }
    setMode(mode) {
        if (!this.mouseDown) {
            this.mode = mode;
        }
        return !this.mouseDown;
    }
    handleSetStrokeSize(pck) {
        var _a;
        (_a = this.users.findUserByID(pck.userID)) === null || _a === void 0 ? void 0 : _a.setStrokeSize(pck.lineID, pck.size);
        this.selection.onPacketStrokeSizeChange();
    }
    handleSetStrokeColor(pck) {
        var _a;
        (_a = this.users.findUserByID(pck.userID)) === null || _a === void 0 ? void 0 : _a.setStrokeColor(pck.lineID, pck.color);
        this.selection.onPacketStrokeColorChange();
    }
    onUIEventStrokeSizeChange(size) {
        this.selection.onUIEventStrokeSizeChange(size);
    }
    onUIEventStrokeColorChange(color) {
        this.selection.onUIEventStrokeColorChange(color);
    }
    handleRemovedUser(pck) {
        this.users.handleRemovedUser(pck.userID, pck.lines);
    }
    deleteSelection() {
        this.selection.delete();
    }
    undo() {
        var _a;
        const line = (_a = this.users.getMyUser()) === null || _a === void 0 ? void 0 : _a.getLastLine();
        if (line) {
            this.deleteLine(line.userID, line.lineID);
            const pck = new ClientDeleteLines([line]);
            this.ws.sendPacket(pck);
        }
    }
}
class SelectionManager {
    constructor(users, ws, brushMenu) {
        this.selectionStart = new paper.Point(0, 0);
        this.selectedLines = [];
        this.mouseOverSelected = null;
        this.linesCopied = [];
        this.contains = (lines, line) => lines.indexOf(line) > -1;
        this.users = users;
        this.ws = ws;
        this.brushMenu = brushMenu;
        this.selectionRect = paper.Shape.Rectangle(new paper.Point(0, 0), new paper.Point(0, 0));
        this.selectionRect.visible = false;
        this.selectionRect.strokeColor = "black";
        this.selectedBoundingBox = paper.Shape.Rectangle(new paper.Point(0, 0), new paper.Point(0, 0));
        this.selectedBoundingBox.visible = false;
        this.selectedBoundingBox.strokeColor = "Blue";
        this.selectedBoundingBox.dashArray = [10, 6];
        this.selectedBoundingBox.strokeWidth = 1;
        this.selectedBoundingBox.strokeCap = "round";
    }
    startSelection(point) {
        this.selectionStart = point;
        this.selectionRect.visible = true;
        this.selectionRect.size = new paper.Size(0, 0);
        this.selectionRect.position = point;
    }
    onMouseUp(ev, mouseDragged) {
        this.selectionRect.visible = false;
        const mouseOver = this.mouseOverSelected;
        if (mouseOver) {
            if (ev.modifiers.shift || ev.modifiers.control) {
                this.insertIfExistsElseRemove(mouseOver);
            }
            else {
                this.selectedLines.forEach(l => l.selected(false));
                mouseOver.selected(true);
                this.selectedLines = [mouseOver];
            }
            this.mouseOverSelected = null;
        }
        else if (!mouseDragged) {
            // we selected nothing and didn't move
            if (ev.modifiers.shift || ev.modifiers.control) {
                const l = this.getUnderMouse(ev.point);
                console.log("here", l);
                if (l) {
                    this.insertIfExistsElseRemove(l);
                }
            }
            else {
                this.selectedLines.forEach(l => l.selected(false));
                this.selectedLines = [];
            }
        }
        this.updateBrushMenu();
        this.updateBoundingBox();
    }
    onMouseDragged(point) {
        this.selectionRect.size = new paper.Size(this.selectionStart.subtract(point).abs());
        this.selectionRect.position =
            this.selectionStart.subtract(point).divide(new paper.Point(2, 2)).add(point);
        const rect = new paper.Rectangle(this.selectionStart, point);
        this.selectedLines = [];
        const allLines = this.users.findAllLines();
        allLines.forEach(line => {
            //const path = line.path;
            if (line.isInside(rect) || line.intersects(this.selectionRect)) {
                line.selected(true);
                //path.selected = true;
                this.selectedLines.push(line);
            }
            else {
                line.selected(false);
                //path.selected = false;
            }
        });
    }
    onMouseMove(point, isMouseDown) {
        if (isMouseDown)
            return;
        const mouseOver = this.mouseOverSelected;
        if (mouseOver) {
            if (!this.contains(this.selectedLines, mouseOver)) {
                mouseOver.selected(false);
                //mouseOver.path.selected = false;
            }
        }
        this.mouseOverSelected = null;
        const line = this.getUnderMouse(point);
        if (line != null) {
            this.mouseOverSelected = line;
            line.selected(true);
            //line.path.selected = true;
        }
    }
    getUnderMouse(point) {
        const hitOptions = {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 5
        };
        const hit = paper.project.hitTest(point, hitOptions);
        if (!hit) {
            return null;
        }
        const path = hit.item;
        return this.users.findLineByPath(path);
    }
    delete() {
        let pck = new ClientDeleteLines(this.selectedLines);
        this.ws.sendPacket(pck);
        this.selectedLines.forEach(l => this.users.deleteLine(l.userID, l.lineID));
        this.selectedLines = [];
        this.updateBrushMenu();
        this.updateBoundingBox();
    }
    clear() {
        this.selectedLines.forEach(l => l.selected(false));
        this.selectedLines = [];
        this.updateBrushMenu();
        this.updateBoundingBox();
    }
    move(delta) {
        this.selectedLines.forEach(l => {
            l.moveDelta(delta);
            //l.path.position = l.path.position.add(delta);
        });
        const pck = new ClientMoveLines(this.selectedLines, delta);
        console.log(delta);
        this.ws.sendPacket(pck);
        this.updateBoundingBox();
    }
    updateBrushMenu() {
        if (this.selectedLines.length == 0)
            return;
        let width = this.selectedLines.map(l => l.strokeWidth());
        let firstWidth = width[0];
        if (width.every(value => value == firstWidth)) {
            this.brushMenu.setStrokeWidth(firstWidth);
        }
        let color = this.selectedLines.map(l => l.strokeColor());
        let firstColor = color[0];
        if (color.every(value => value == firstColor)) {
            this.brushMenu.setStrokeColor(firstColor);
        }
    }
    insertIfExistsElseRemove(l) {
        console.log("here 2", this.selectedLines);
        if (!this.contains(this.selectedLines, l)) {
            console.log("insert here");
            l.selected(true);
            this.selectedLines.push(l);
        }
        else {
            // should we remove this?
            console.log("remove here", this.selectedLines.length);
            l.selected(false);
            this.selectedLines = this.selectedLines.filter(line => line.lineID != l.lineID);
            console.log("remove here - ", this.selectedLines.length);
        }
    }
    updateBoundingBox() {
        if (this.selectedLines.length == 0) {
            this.selectedBoundingBox.visible = false;
            return;
        }
        let min = this.selectedLines[0].strokeBounds().center;
        let max = min;
        this.selectedLines.forEach(l => {
            const boundingBox = l.strokeBounds();
            const p1 = boundingBox.topLeft;
            const p2 = boundingBox.bottomRight;
            min = paper.Point.min(min, p1);
            min = paper.Point.min(min, p2);
            max = paper.Point.max(max, p1);
            max = paper.Point.max(max, p2);
        });
        this.selectedBoundingBox.visible = true;
        this.selectedBoundingBox.position = max.subtract(min).divide(new paper.Point(2, 2)).add(min);
        this.selectedBoundingBox.size = new paper.Size(max.subtract(min));
    }
    onDeleteLine(userID, lineID) {
        this.selectedLines = this.selectedLines.filter(l => l.userID != userID || l.lineID != lineID);
        this.updateBoundingBox();
    }
    onUIEventStrokeSizeChange(size) {
        this.selectedLines.forEach(l => {
            l.updateStrokeWidth(size);
            const pck = new ClientChangeStrokeSize(l, size);
            this.ws.sendPacket(pck);
        });
    }
    onPacketStrokeSizeChange() {
        this.updateBrushMenu();
    }
    onUIEventStrokeColorChange(color) {
        this.selectedLines.forEach(l => {
            l.updateStrokeColor(color);
            const pck = new ClientSetStrokeColor(l, color);
            this.ws.sendPacket(pck);
        });
        this.updateBrushMenu();
    }
    onPacketStrokeColorChange() {
        this.updateBrushMenu();
    }
    onPacketMoveLines() {
        this.updateBoundingBox();
    }
    selectAll() {
        this.selectedLines = this.users.findAllLines();
        this.selectedLines.forEach(l => {
            l.selected(true);
        });
        this.updateBrushMenu();
        this.updateBoundingBox();
    }
    copy() {
        this.linesCopied = this.selectedLines.map(l => l.copy());
    }
    paste(pathIDGenerator) {
        const u = this.users.getMyUser();
        if (!u) {
            return;
        }
        const uid = u.userID;
        const offset = new paper.Point(20, 20);
        this.clear();
        this.linesCopied.forEach(l => {
            const pathID = pathIDGenerator.getNext();
            const rawPath = l.rawPath;
            const width = l.strokeWidth;
            const color = l.strokeColor;
            const start = rawPath[0].add(offset);
            const restPath = [];
            rawPath.forEach((value, index) => {
                if (index != 0) {
                    restPath.push(value.add(offset));
                }
            });
            const path = new paper.Path({
                segments: [start].concat(restPath),
                // Select the path, so we can see its segment points:
                fullySelected: false,
                strokeWidth: width,
                strokeColor: color,
            });
            const newLine = new DrawLine(path, pathID, uid, [start].concat(restPath));
            u.addLine(newLine);
            newLine.simplify();
            const beginPath = new ClientBeginPath(pathID, start, width, color);
            const updatePath = new ClientAddPointsPath(pathID, restPath);
            const endPath = new ClientEndPath(pathID);
            this.ws.sendPacket(beginPath);
            this.ws.sendPacket(updatePath);
            this.ws.sendPacket(endPath);
            this.selectedLines.push(newLine);
            newLine.selected(true);
        });
        this.updateBoundingBox();
        this.updateBrushMenu();
    }
}
class User {
    constructor(userID) {
        this.userID = userID;
        this.lines = [];
    }
    beginPath(lineID, pos, strokeWidth, strokeColor) {
        console.log("begin Color ", strokeColor);
        this.lines.push(new UserLine(lineID, this.userID, pos, strokeWidth, strokeColor));
    }
    addPointsPath(lineID, points) {
        const l = this.findLineById(lineID);
        if (l == null) {
            console.log("addPointsToPath failed to find line");
            return;
        }
        for (let point of points) {
            l.addPoint(point);
        }
    }
    endPath(lineID) {
        var _a;
        (_a = this.findLineById(lineID)) === null || _a === void 0 ? void 0 : _a.simplify();
    }
    findLineById(lineID) {
        for (let l of this.lines) {
            if (l.lineID == lineID) {
                return l;
            }
        }
        return null;
    }
    getLines() {
        return this.lines;
    }
    deleteLine(lineID) {
        var _a;
        (_a = this.findLineById(lineID)) === null || _a === void 0 ? void 0 : _a.remove();
        this.lines = this.lines.filter(myLine => myLine.lineID != lineID);
    }
    moveLine(lineID, delta) {
        console.log("move line", this.userID);
        const line = this.findLineById(lineID);
        line === null || line === void 0 ? void 0 : line.moveDelta(delta);
    }
    findLine(path) {
        for (let line of this.lines) {
            if (line.isEqual(path)) {
                return line;
            }
        }
        return null;
    }
    setStrokeSize(lineID, size) {
        const l = this.findLineById(lineID);
        if (l) {
            l.updateStrokeWidth(size);
        }
    }
    setStrokeColor(lineID, color) {
        const l = this.findLineById(lineID);
        if (l) {
            l.updateStrokeColor(color);
        }
    }
    addLine(drawLine) {
        this.lines.push(drawLine);
    }
    getLastLine() {
        if (this.lines.length == 0) {
            return null;
        }
        return this.lines[this.lines.length - 1];
    }
    setOwner(lines) {
        for (let i = 0; i < lines.length; i++) {
            this.lines.push(lines[i].UpdateUserID(this.userID));
        }
    }
}
class Users {
    constructor(ws) {
        this.userID = -1;
        this.users = new Map();
        this.ws = ws;
    }
    add(userID) {
        this.users.set(userID, new User(userID));
    }
    setMyUserID(userID) {
        this.users.set(userID, new User(userID));
        this.userID = userID;
    }
    findUserByID(userID) {
        const u = this.users.get(userID);
        return u ? u : null;
    }
    getMyUser() {
        return this.findUserByID(this.userID);
    }
    findAllLines() {
        let userLines = [];
        this.users.forEach((user) => {
            userLines = userLines.concat(user.getLines());
        });
        return userLines;
    }
    findLineByPath(path) {
        for (let [_, user] of this.users) {
            const res = user.findLine(path);
            if (res != null) {
                return res;
            }
        }
        return null;
    }
    getMyUserID() {
        return this.userID;
    }
    deleteLine(userID, lineID) {
        const u = this.findUserByID(userID);
        if (!u) {
            return;
        }
        u.deleteLine(lineID);
    }
    handleRemovedUser(userID, lineUpdates) {
        const u = this.findUserByID(userID);
        if (!u) {
            return;
        }
        this.users.delete(userID);
        const nullUser = this.findUserByID(0);
        if (!nullUser) {
            return;
        }
        let lines = u.getLines();
        for (let i = 0; i < lines.length; i++) {
            for (let lineUpdate of lineUpdates) {
                if (lines[i].lineID == lineUpdate.oldLineID) {
                    lines[i] = lines[i].updateLineID(lineUpdate.newLineID);
                    break;
                }
            }
        }
        nullUser.setOwner(lines);
    }
}
// helper function here
function packetWriteInt32(val, array, offset) {
    const b1 = val & 0xFF;
    const b2 = val >> 8 & 0xFF;
    const b3 = val >> 16 & 0xFF;
    let b4 = val >> 24 & 0xFF;
    array[offset + 0] = b1;
    array[offset + 1] = b2;
    array[offset + 2] = b3;
    array[offset + 3] = b4;
}
function packetWritePoint(point, array, offset) {
    packetWriteInt32(point.x, array, offset);
    packetWriteInt32(point.y, array, offset + 4);
}
function packetReadInt32(array, offset) {
    const b1 = array[offset + 0];
    const b2 = array[offset + 1];
    const b3 = array[offset + 2];
    const b4 = array[offset + 3];
    return b1 | (b2 << 8) | (b3 << 16) | (b4 << 24);
}
function readPoint(array, offset) {
    const x = packetReadInt32(array, offset);
    const y = packetReadInt32(array, offset + 4);
    return new paper.Point(x, y);
}
class WebSocketHandler {
    constructor() {
        //private static IP = "ws://localhost:5011/ws";
        this.socket = null;
        this.isConnectionOpen = false;
        this.onConnected = () => { };
        this.onPacketReceived = () => { };
        this.queuedPackets = [];
    }
    connect() {
        const socket = new WebSocket(WebSocketHandler.IP + window.location.pathname.replace("/c/", "/"));
        socket.binaryType = "arraybuffer";
        this.socket = socket;
        $("#errormsg").text("");
        socket.onerror = ev => this.onError(ev);
        socket.onclose = ev => this.onClose(ev);
        socket.onopen = ev => this.onOpen(ev);
        socket.onmessage = ev => this.onMessage(ev);
    }
    onMessage(ev) {
        const rawData = new Uint8Array(ev.data);
        const pck = createPacket(rawData);
        this.onPacketReceived(pck);
    }
    onError(ev) {
        console.log("web socket error" + ev);
        $("#errormsg").text("closed connection!");
    }
    onClose(ev) {
        this.isConnectionOpen = false;
        console.log("web socket closed" + ev);
        $("#errormsg").text("closed connection!");
    }
    onOpen(ev) {
        var _a;
        console.log("web socket open" + ev);
        console.log((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState);
        this.isConnectionOpen = true;
        this.onConnected();
        this.queuedPackets.forEach(pck => {
            var _a;
            (_a = this.socket) === null || _a === void 0 ? void 0 : _a.send(pck);
        });
    }
    sendPacket(pck) {
        var _a, _b;
        const rawPck = pck.getPacketAsArray();
        if (!this.isConnectionOpen) {
            this.queuedPackets.push(rawPck);
        }
        else {
            // we know it is not null
            console.log((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState);
            (_b = this.socket) === null || _b === void 0 ? void 0 : _b.send(rawPck);
        }
    }
}
WebSocketHandler.IP = "ws://whiteboard.aaq.dk:5011/ws";
class ClientAddPointsPath {
    constructor(id, points) {
        this.id = id;
        this.points = points;
    }
    getPacketAsArray() {
        const count = this.points.length;
        const pck = new Uint8Array(1 + 4 + 4 + count * 8);
        pck[0] = 2 /* addPointsPath */;
        packetWriteInt32(this.id, pck, 1);
        packetWriteInt32(count, pck, 1 + 4);
        this.points.forEach((value, index) => {
            const point = this.points[index];
            const x = point.x;
            const y = point.y;
            packetWriteInt32(x, pck, 1 + 4 + 4 + index * 8);
            packetWriteInt32(y, pck, 1 + 4 + 4 + index * 8 + 4);
        });
        return pck;
    }
}
class ClientBeginPath {
    constructor(id, p, strokeWidth, strokeColor) {
        this.id = id;
        this.point = p;
        this.strokeWidth = strokeWidth;
        this.strokeColor = strokeColor;
    }
    getPacketAsArray() {
        const pck = new Uint8Array(1 + 4 + 8 + 1 + 3);
        pck[0] = 0 /* beginPath */;
        packetWriteInt32(this.id, pck, 1);
        packetWritePoint(this.point, pck, 1 + 4);
        pck[1 + 4 + 8] = this.strokeWidth;
        pck[1 + 4 + 8 + 1] = this.strokeColor.red;
        pck[1 + 4 + 8 + 2] = this.strokeColor.green;
        pck[1 + 4 + 8 + 3] = this.strokeColor.blue;
        return pck;
    }
}
class ClientChangeStrokeSize {
    constructor(line, size) {
        this.line = line;
        this.size = size;
    }
    getPacketAsArray() {
        const pck = new Uint8Array(1 + 1 + 4 + 1);
        pck[0] = 5 /* setStrokeSize */;
        pck[1] = this.line.userID;
        packetWriteInt32(this.line.lineID, pck, 2);
        pck[6] = this.size;
        return pck;
    }
}
class ClientDeleteLines {
    constructor(lines) {
        this.lines = lines;
    }
    getPacketAsArray() {
        const pck = new Uint8Array(1 + 4 + this.lines.length * (1 + 4));
        pck[0] = 3 /* deleteLines */;
        packetWriteInt32(this.lines.length, pck, 1);
        let offset = 1 + 4;
        this.lines.forEach(l => {
            pck[offset] = l.userID;
            offset += 1;
            packetWriteInt32(l.lineID, pck, offset);
            offset += 4;
        });
        return pck;
    }
}
class ClientEndPath {
    constructor(id) {
        this.id = id;
    }
    getPacketAsArray() {
        const pck = new Uint8Array(1 + 4);
        pck[0] = 1 /* endPath */;
        packetWriteInt32(this.id, pck, 1);
        return pck;
    }
}
class ClientMoveLines {
    constructor(lines, delta) {
        this.lines = lines;
        this.delta = delta;
    }
    getPacketAsArray() {
        const pck = new Uint8Array(1 + 8 + 4 + this.lines.length * (1 + 4));
        pck[0] = 4 /* moveLines */;
        packetWritePoint(this.delta, pck, 1);
        packetWriteInt32(this.lines.length, pck, 1 + 8);
        let offset = 1 + 8 + 4;
        this.lines.forEach(l => {
            pck[offset] = l.userID;
            offset += 1;
            packetWriteInt32(l.lineID, pck, offset);
            offset += 4;
        });
        return pck;
    }
}
class ClientSetStrokeColor {
    constructor(line, color) {
        this.line = line;
        this.color = color;
    }
    getPacketAsArray() {
        const pck = new Uint8Array(1 + 1 + 4 + 3);
        pck[0] = 6 /* setStrokeColor */;
        pck[1] = this.line.userID;
        packetWriteInt32(this.line.lineID, pck, 2);
        pck[2 + 4 + 0] = this.color.red;
        pck[2 + 4 + 1] = this.color.green;
        pck[2 + 4 + 2] = this.color.blue;
        console.log("client set color", this.color);
        return pck;
    }
}
class ServerAddPointsPathPacket {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        const size = packetReadInt32(rawMsg, 2 + 4);
        this.points = [];
        for (let i = 0; i < size; i++) {
            const p = readPoint(rawMsg, 2 + 4 + 4 + i * 8);
            this.points.push(p);
        }
    }
    getPacketType() {
        return 4 /* AddPointsPath */;
    }
}
class ServerAddUserPacket {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
    }
    getPacketType() {
        return 1 /* AddUser */;
    }
}
class ServerBeginPathPacket {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        this.pos = readPoint(rawMsg, 2 + 4);
        this.strokeWidth = rawMsg[2 + 4 + 8];
        const r = rawMsg[2 + 4 + 8 + 1];
        const g = rawMsg[2 + 4 + 8 + 2];
        const b = rawMsg[2 + 4 + 8 + 3];
        this.strokeColor = new paper.Color(r, g, b);
    }
    getPacketType() {
        return 2 /* BeginPath */;
    }
}
class ServerDeleteLinesPacket {
    constructor(rawMsg) {
        this.lines = [];
        let count = packetReadInt32(rawMsg, 1);
        let offset = 5;
        for (let i = 0; i < count; i++) {
            let userID = rawMsg[offset];
            offset++;
            let lineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            this.lines.push(new UpdatedLine(userID, lineID));
        }
    }
    getPacketType() {
        return 5 /* DeleteLines */;
    }
}
class ServerEndPathPacket {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
    }
    getPacketType() {
        return 3 /* EndPath */;
    }
}
class ServerMoveLinesPacket {
    constructor(rawMsg) {
        this.lines = [];
        this.delta = readPoint(rawMsg, 1);
        let count = packetReadInt32(rawMsg, 1 + 8);
        let offset = 1 + 8 + 4;
        for (let i = 0; i < count; i++) {
            let userID = rawMsg[offset];
            offset++;
            let lineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            this.lines.push(new UpdatedLine(userID, lineID));
        }
    }
    getPacketType() {
        return 6 /* MoveLines */;
    }
}
class UpdatedLine {
    constructor(userID, lineID) {
        this.userID = userID;
        this.lineID = lineID;
    }
}
function createPacket(rawMsg) {
    const type = rawMsg[0];
    switch (type) {
        case 0 /* SetUserID */:
            return new ServerSetUserID(rawMsg);
        case 1 /* AddUser */:
            return new ServerAddUserPacket(rawMsg);
        case 2 /* BeginPath */:
            return new ServerBeginPathPacket(rawMsg);
        case 3 /* EndPath */:
            return new ServerEndPathPacket(rawMsg);
        case 4 /* AddPointsPath */:
            return new ServerAddPointsPathPacket(rawMsg);
        case 5 /* DeleteLines */:
            return new ServerDeleteLinesPacket(rawMsg);
        case 6 /* MoveLines */:
            return new ServerMoveLinesPacket(rawMsg);
        case 7 /* SetStrokeSize */:
            return new ServerSetStrokeSizePacket(rawMsg);
        case 8 /* SetStrokeColor */:
            return new ServerSetStrokeColorPacket(rawMsg);
        case 9 /* RemovedUser */:
            return new ServerRemovedUserPacket(rawMsg);
        default:
            break;
    }
    throw "unknown error";
}
class LineUpdate {
    constructor(oldLineID, newLineID) {
        this.oldLineID = oldLineID;
        this.newLineID = newLineID;
    }
}
class ServerRemovedUserPacket {
    constructor(rawMsg) {
        this.lines = [];
        this.userID = rawMsg[1];
        const len = packetReadInt32(rawMsg, 2);
        let offset = 6;
        for (let i = 0; i < len; i++) {
            const oldLineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            const newLineID = packetReadInt32(rawMsg, offset);
            offset += 4;
            this.lines.push(new LineUpdate(oldLineID, newLineID));
        }
    }
    getPacketType() {
        return 9 /* RemovedUser */;
    }
}
class ServerSetStrokeColorPacket {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        const r = rawMsg[6 + 0];
        const g = rawMsg[6 + 1];
        const b = rawMsg[6 + 2];
        this.color = new paper.Color(r, g, b);
    }
    getPacketType() {
        return 8 /* SetStrokeColor */;
    }
}
class ServerSetStrokeSizePacket {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
        this.lineID = packetReadInt32(rawMsg, 2);
        this.size = packetReadInt32(rawMsg, 6);
    }
    getPacketType() {
        return 7 /* SetStrokeSize */;
    }
}
class ServerSetUserID {
    constructor(rawMsg) {
        this.userID = rawMsg[1];
    }
    getPacketType() {
        return 0 /* SetUserID */;
    }
}
class Background {
    constructor() {
        this.paths = [];
        this.heightPx = 40;
    }
    setup() {
        this.onMove();
    }
    onMove() {
        this.paths.forEach(path => path.remove());
        this.paths = [];
        let center = paper.view.center;
        let size = paper.view.size;
        let xBegin = center.x - size.width / 2;
        let xEnd = center.x + size.width / 2;
        let yBegin = center.y - size.height / 2;
        if (yBegin % this.heightPx != 0) {
            yBegin -= yBegin % this.heightPx;
        }
        for (let height = yBegin; height < size.height / 2 + center.y; height += this.heightPx) {
            const path = new paper.Path();
            path.add(new paper.Point(xBegin, height));
            path.add(new paper.Point(xEnd, height));
            path.strokeColor = "#d2d2d2";
            path.strokeWidth = 2;
            path.sendToBack();
            this.paths.push(path);
        }
    }
}
class BrushMenu {
    constructor(uiManager) {
        /* settings */
        this.selectedColor = new paper.Color(0, 0, 0);
        this.uiManager = uiManager;
        this.strokeWidthRangeElement = $("#StrokeWidthRange");
        this.strokeWidthNumberElement = $("#StrokeWidthNumber");
        this.brushUI = $("#DrawSettings");
        this.selectBlueButton = $("#SelectBlue");
        this.selectBlackButton = $("#SelectBlack");
        this.selectGreenButton = $("#SelectGreen");
        this.selectRedButton = $("#SelectRed");
        this.selectedColorButton = this.selectBlackButton;
        this.setupColorSelection();
        this.setupStrokeChange();
    }
    setupStrokeChange() {
        this.strokeWidthRangeElement.on('input', _ => {
            this.onStrokeChange(this.strokeWidthRangeElement.val());
        });
        this.strokeWidthNumberElement.on('input', _ => {
            this.onStrokeChange(this.strokeWidthNumberElement.val());
        });
    }
    getStrokeWidth() {
        return this.strokeWidthRangeElement.val();
    }
    setStrokeWidth(size) {
        this.strokeWidthRangeElement.val(size);
        this.strokeWidthNumberElement.val(size);
    }
    onStrokeChange(val) {
        this.setStrokeWidth(val);
        this.uiManager.onUIStrokeSizeChange(val);
    }
    setupColorSelection() {
        this.selectBlueButton.on("click", () => {
            this.selectedColor = new paper.Color(0, 0, 255);
            this.onSetColor(this.selectedColor, this.selectBlueButton);
        });
        this.selectGreenButton.on("click", () => {
            this.selectedColor = new paper.Color(0, 255, 0);
            this.onSetColor(this.selectedColor, this.selectGreenButton);
        });
        this.selectRedButton.on("click", () => {
            this.selectedColor = new paper.Color(255, 0, 0);
            this.onSetColor(this.selectedColor, this.selectRedButton);
        });
        this.selectBlackButton.on("click", () => {
            this.selectedColor = new paper.Color(0, 0, 0);
            this.onSetColor(this.selectedColor, this.selectBlackButton);
        });
        this.selectRedButton.children().hide();
        this.selectGreenButton.children().hide();
        this.selectBlueButton.children().hide();
    }
    onSetColor(color, newSelectedColorButton) {
        this.updateUIColor(color, newSelectedColorButton);
        this.uiManager.onUIStrokeColorChange(color);
    }
    getStrokeColor() {
        return this.selectedColor;
    }
    setStrokeColor(color) {
        if (color.green > 0x60) {
            this.updateUIColor(color, this.selectGreenButton);
            console.log("green");
        }
        else if (color.blue > 0x80) {
            this.updateUIColor(color, this.selectBlueButton);
            console.log("blue");
        }
        else if (color.red > 0x80) {
            this.updateUIColor(color, this.selectRedButton);
            console.log("red");
        }
        else {
            this.updateUIColor(color, this.selectBlackButton);
            console.log("black");
        }
    }
    updateUIColor(selectedColor, newSelectedColorButton) {
        this.selectedColor = selectedColor;
        this.selectedColorButton.children().hide();
        this.selectedColorButton = newSelectedColorButton;
        this.selectedColorButton.children().css('display', 'flex');
    }
}
class UIManager {
    constructor(root) {
        this.panMode = $("#UIPanMode");
        this.drawMode = $("#UIDrawMode");
        this.selMode = $("#UISelectMode");
        this.moveMode = $("#UIMoveSelectedMode");
        this.active = this.drawMode;
        this.root = root;
        this.brushMenu = new BrushMenu(this);
        // setup the buttons
        this.setupButtons();
    }
    setupButtons() {
        this.panMode.on("click", () => this.setModePan());
        this.drawMode.on("click", () => this.setModeDraw());
        this.selMode.on("click", () => this.setModeSelect());
        this.moveMode.on("click", () => this.setModeMove());
        $("#UIDeleteSelectionButton").on("click", () => {
            this.root.deleteSelection();
        });
        $("#UIUndoButton").on("click", () => {
            this.root.undo();
        });
    }
    getStrokeWidth() {
        return this.brushMenu.getStrokeWidth();
    }
    getColor() {
        return this.brushMenu.getStrokeColor();
    }
    getBrushMenu() {
        return this.brushMenu;
    }
    onUIStrokeSizeChange(val) {
        this.root.onUIEventStrokeSizeChange(val);
    }
    onUIStrokeColorChange(color) {
        this.root.onUIEventStrokeColorChange(color);
    }
    setModeMove() {
        if (this.root.setMode(Mode.MOVE_SELECTED)) {
            this.active.removeClass("active");
            this.active = this.moveMode;
            this.active.addClass("active");
        }
    }
    setModeSelect() {
        if (this.root.setMode(Mode.SELECT)) {
            this.active.removeClass("active");
            this.active = this.selMode;
            this.active.addClass("active");
        }
    }
    setModeDraw() {
        if (this.root.setMode(Mode.DRAW)) {
            this.active.removeClass("active");
            this.active = this.drawMode;
            this.active.addClass("active");
        }
    }
    setModePan() {
        if (this.root.setMode(Mode.PAN)) {
            this.active.removeClass("active");
            this.active = this.panMode;
            this.active.addClass("active");
        }
    }
}
const SIMPLIFY_CONST = 5;
class CopyLine {
    constructor(rawPath, strokeColor, strokeWidth) {
        this.rawPath = rawPath;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }
}
class DrawLine {
    constructor(path, lineID, userID, rawPath) {
        this.path = path;
        this.lineID = lineID;
        this.userID = userID;
        this.rawPath = rawPath;
    }
    UpdateUserID(userID) {
        return new DrawLine(this.path, this.lineID, userID, this.rawPath);
    }
    updateLineID(lineID) {
        return new DrawLine(this.path, lineID, this.userID, this.rawPath);
    }
    addPoint(point) {
        this.path.add(point);
        this.rawPath.push(point);
    }
    copy() {
        return new CopyLine(this.rawPath, this.path.strokeColor, this.path.strokeWidth);
    }
    isInside(rect) {
        return this.path.isInside(rect);
    }
    intersects(shape) {
        return this.path.intersects(shape);
    }
    selected(value) {
        this.path.selected = value;
    }
    moveDelta(delta) {
        this.path.position = this.path.position.add(delta);
    }
    strokeWidth() {
        return this.path.strokeWidth;
    }
    strokeColor() {
        return this.path.strokeColor;
    }
    strokeBounds() {
        return this.path.strokeBounds;
    }
    updateStrokeWidth(size) {
        this.path.strokeWidth = size;
    }
    updateStrokeColor(color) {
        this.path.strokeColor = color;
    }
    isEqual(path) {
        return this.path == path;
    }
    remove() {
        this.path.remove();
    }
    simplify() {
        this.path.simplify(SIMPLIFY_CONST);
    }
}
class UserLine extends DrawLine {
    constructor(lineID, userID, pos, strokeWidth, strokeColor) {
        const path = new paper.Path({
            segments: [pos],
            // Select the path, so we can see its segment points:
            fullySelected: false,
            strokeWidth: strokeWidth,
            strokeColor: strokeColor,
        });
        //path.selectedColor = new paper.Color(255, 255, 255, 0);
        super(path, lineID, userID, [pos]);
    }
}
class PathIDGenerator {
    constructor(start) {
        this.nextPathID = start;
    }
    getNext() {
        return this.nextPathID++;
    }
}
