class SelectionManager {
    private readonly selectionRect: paper.Shape;
    private readonly selectedBoundingBox: paper.Shape;
    private selectionStart: paper.Point = new paper.Point(0, 0);
    private selectedLines: DrawLine[] = [];
    private mouseOverSelected: DrawLine | null = null;
    private users: Users;
    private ws: WebSocketHandler;
    private brushMenu: BrushMenu;

    private linesCopied: CopyLine[] = []

    constructor(users: Users, ws: WebSocketHandler, brushMenu: BrushMenu) {
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

    startSelection(point: paper.Point) {
        this.selectionStart = point;
        this.selectionRect.visible = true;
        this.selectionRect.size = new paper.Size(0, 0);
        this.selectionRect.position = point;
    }

    private contains = (lines: DrawLine[], line: DrawLine) =>
        lines.indexOf(line) > -1;

    onMouseUp(ev: paper.MouseEvent, mouseDragged: boolean) {
        this.selectionRect.visible = false;
        const mouseOver = this.mouseOverSelected;
        if (mouseOver) {
            if (ev.modifiers.shift || ev.modifiers.control) {
                this.insertIfExistsElseRemove(mouseOver)
            } else {
                this.selectedLines.forEach(l => l.selected(false));
                mouseOver.selected(true);
                this.selectedLines = [mouseOver];
            }
            this.mouseOverSelected = null;
        } else if (!mouseDragged) {
            // we selected nothing and didn't move
            if (ev.modifiers.shift || ev.modifiers.control) {
                const l = this.getUnderMouse(ev.point);
                console.log("here", l);
                if (l) {
                    this.insertIfExistsElseRemove(l);
                }
            } else {
                this.selectedLines.forEach(l => l.selected(false));
                this.selectedLines = [];
            }
        }
        this.updateBrushMenu();
        this.updateBoundingBox();
    }

    onMouseDragged(point: paper.Point) {
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
            } else {
                line.selected(false);
                //path.selected = false;
            }
        });

    }

    onMouseMove(point: paper.Point, isMouseDown: boolean) {
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

    private getUnderMouse(point: paper.Point) {
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
        return this.users.findLineByPath(path)
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
        this.selectedLines.forEach(l =>
            l.selected(false)
        );
        this.selectedLines = [];
        this.updateBrushMenu();
        this.updateBoundingBox();
    }

    move(delta: paper.Point) {
        this.selectedLines.forEach(l => {
            l.moveDelta(delta)
            //l.path.position = l.path.position.add(delta);
        });
        const pck = new ClientMoveLines(this.selectedLines, delta);
        console.log(delta);
        this.ws.sendPacket(pck);
        this.updateBoundingBox();
    }

    private updateBrushMenu() {
        if (this.selectedLines.length == 0)
            return;

        let width = this.selectedLines.map(l => l.strokeWidth());
        let firstWidth = width[0];
        if (width.every(value => value == firstWidth)) {
            this.brushMenu.setStrokeWidth(firstWidth)
        }

        let color = this.selectedLines.map(l => l.strokeColor());
        let firstColor = color[0];
        if (color.every(value => value == firstColor)) {
            this.brushMenu.setStrokeColor(<paper.Color>firstColor)
        }

    }

    private insertIfExistsElseRemove(l: DrawLine) {
        console.log("here 2", this.selectedLines);
        if (!this.contains(this.selectedLines, l)) {
            console.log("insert here");
            l.selected(true);
            this.selectedLines.push(l);
        } else {
            // should we remove this?
            console.log("remove here", this.selectedLines.length);
            l.selected(false);
            this.selectedLines = this.selectedLines.filter(line => line.lineID != l.lineID);
            console.log("remove here - ", this.selectedLines.length);
        }

    }

    private updateBoundingBox() {
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

    onDeleteLine(userID: number, lineID: number) {
        this.selectedLines = this.selectedLines.filter(l =>
            l.userID != userID || l.lineID != lineID
        );
        this.updateBoundingBox();
    }

    onUIEventStrokeSizeChange(size: number) {
        this.selectedLines.forEach(l => {
                l.updateStrokeWidth(size);
                const pck = new ClientChangeStrokeSize(l, size);
                this.ws.sendPacket(pck);
            }
        );
    }

    onPacketStrokeSizeChange() {
        this.updateBrushMenu();
    }

    onUIEventStrokeColorChange(color: paper.Color) {
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
        this.updateBoundingBox()
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
        this.linesCopied = this.selectedLines.map(l => l.copy())
    }

    paste(pathIDGenerator: PathIDGenerator) {
        const u = this.users.getMyUser()
        if (!u) {
            return
        }
        const uid = u.userID;

        const offset = new paper.Point(20, 20);

        this.clear();

        this.linesCopied.forEach(l => {
                const pathID = pathIDGenerator.getNext();
                const rawPath = l.rawPath;
                const width = l.strokeWidth;
                const color = l.strokeColor;

                const start = rawPath[0].add(offset)
                const restPath: paper.Point[] = [];
                rawPath.forEach((value, index) => {
                    if (index != 0) {
                        restPath.push(value.add(offset))
                    }
                });

                const path = new paper.Path({
                    segments: [start].concat(restPath),
                    // Select the path, so we can see its segment points:
                    fullySelected: false,
                    strokeWidth: width,
                    strokeColor: color,
                });

                const newLine = new DrawLine(path, pathID, uid, [start].concat(restPath))
                u.addLine(newLine)
                newLine.simplify()

                const beginPath = new ClientBeginPath(pathID, start, width, color)
                const updatePath = new ClientAddPointsPath(pathID, restPath)
                const endPath = new ClientEndPath(pathID)

                this.ws.sendPacket(beginPath)
                this.ws.sendPacket(updatePath)
                this.ws.sendPacket(endPath)

                this.selectedLines.push(newLine)
                newLine.selected(true)
            }
        );

        this.updateBoundingBox();
        this.updateBrushMenu();
    }
}