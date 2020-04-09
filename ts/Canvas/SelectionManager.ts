class SelectionManager {
    private readonly selectionRect: paper.Shape;
    private readonly selectedBoundingBox: paper.Shape;
    private selectionStart: paper.Point = new paper.Point(0, 0);
    private selectedLines: DrawLine[] = [];
    private mouseOverSelected: DrawLine | null = null;
    private users: Users;
    private ws: WebSocketHandler;
    private brushMenu: BrushMenu;

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
                this.selectedLines.forEach(l => l.path.selected = false);
                mouseOver.path.selected = true;
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
                this.selectedLines.forEach(l => l.path.selected = false);
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
            const path = line.path;
            if (path.isInside(rect) || path.intersects(this.selectionRect)) {
                path.selected = true;
                this.selectedLines.push(line);
            } else {
                path.selected = false;
            }
        });

    }

    onMouseMove(point: paper.Point, isMouseDown: boolean) {
        if (isMouseDown)
            return;

        const mouseOver = this.mouseOverSelected;
        if (mouseOver) {
            if (!this.contains(this.selectedLines, mouseOver)) {
                mouseOver.path.selected = false;
            }
        }
        this.mouseOverSelected = null;
        const line = this.getUnderMouse(point);
        if (line != null) {
            this.mouseOverSelected = line;
            line.path.selected = true;
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

    delete(ws: WebSocketHandler) {
        let pck = new ClientDeleteLines(this.selectedLines);
        ws.sendPacket(pck);
        this.selectedLines.forEach(l => this.users.deleteLine(l.userID, l.lineID));
        this.selectedLines = [];
        this.updateBrushMenu();
        this.updateBoundingBox();
    }

    clear() {
        this.selectedLines.forEach(l =>
            l.path.selected = false
        );
        this.selectedLines = [];
        this.updateBrushMenu();
        this.updateBoundingBox();
    }

    move(delta: paper.Point) {
        this.selectedLines.forEach(l => {
            l.path.position = l.path.position.add(delta);
        });
        const pck = new ClientMoveLines(this.selectedLines, delta);
        console.log(delta);
        this.ws.sendPacket(pck);
        this.updateBoundingBox();
    }

    private updateBrushMenu() {
        if (this.selectedLines.length == 0)
            return;

        let width = this.selectedLines.map(l => l.path.strokeWidth);
        let firstWidth = width[0];
        if (width.every(value => value == firstWidth)) {
            this.brushMenu.setStrokeWidth(firstWidth)
        }

        let color = this.selectedLines.map(l => l.path.strokeColor);
        let firstColor = color[0];
        if (color.every(value => value == firstColor)) {
            this.brushMenu.setStrokeColor(<paper.Color>firstColor)
        }

    }

    private insertIfExistsElseRemove(l: DrawLine) {
        console.log("here 2", this.selectedLines);
        if (!this.contains(this.selectedLines, l)) {
            console.log("insert here");
            l.path.selected = true;
            this.selectedLines.push(l);
        } else {
            // should we remove this?
            console.log("remove here", this.selectedLines.length);
            l.path.selected = false;
            this.selectedLines = this.selectedLines.filter(line => line.lineID != l.lineID);
            console.log("remove here - ", this.selectedLines.length);
        }

    }

    private updateBoundingBox() {
        if (this.selectedLines.length == 0) {
            this.selectedBoundingBox.visible = false;
            return;
        }

        let min = this.selectedLines[0].path.strokeBounds.center;
        let max = min;
        this.selectedLines.forEach(l => {
            const boundingBox = l.path.strokeBounds;
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
        this.selectedLines.forEach( l => {
                l.path.strokeWidth = size;
                const pck = new ClientChangeStrokeSize(l, size);
                this.ws.sendPacket(pck);
            }
        );
    }

    onPacketStrokeSizeChange() {
        this.updateBrushMenu();
    }

    onUIEventStrokeColorChange(color: paper.Color) {
        this.selectedLines.forEach( l => {
            l.path.strokeColor = color;
            const pck = new ClientSetStrokeColor(l, color);
            this.ws.sendPacket(pck);
        });
        this.updateBrushMenu();
    }

    onPacketStrokeColorChange() {
        this.updateBrushMenu();
    }

    selectAll() {
        this.selectedLines = this.users.findAllLines();
        this.selectedLines.forEach( l => {
            l.path.selected = true;
        });
        this.updateBrushMenu();
        this.updateBoundingBox();
    }
}