import Color = paper.Color;
import ScrollEvent = JQuery.ScrollEvent;

enum Mode {
    SELECT = 0,
    DRAW = 1,
    PAN = 2,
    MOVE_SELECTED = 3,
}

class Root {
    private ws: WebSocketHandler = new WebSocketHandler();
    private users: Users = new Users(this.ws);

    private pathIDGenerator = new PathIDGenerator(0);
    private mode: Mode = Mode.DRAW;
    private tempMode: Mode | null = null;

    /* selecting */
    private readonly selection: SelectionManager;

    /* my paths */
    private pathID: number = 0;
    private path: paper.Path | null = null;
    private rawPath: paper.Point[] = [];

    // UI
    private ui: UIManager;

    /* extra */
    private readonly background: Background;
    private mouseDown: boolean = false;
    private mouseDragged: boolean = false;

    private camera: Camera;

    /* mouse position */
    private lastMousePosition = new paper.Point(0, 0)

    constructor() {
        let canvas = <HTMLCanvasElement>document.getElementById("draw-canvas");
        paper.setup(canvas);

        paper.view.onMouseDown = event => this.onMouseDown(event);
        paper.view.onMouseUp = event => this.onMouseUp(event);
        paper.view.onMouseMove = event => this.onMouseMove(event);
        paper.view.onResize = event => this.onResize(event);
        paper.view.onMouseDrag = event => this.onMouseDragged(event);
        paper.view.onDoubleClick = event => this.onDoubleClick(event);

        $(document).on("contextmenu", () => {
            return false
        })

        const tool = new paper.Tool();
        tool.onKeyDown = event => this.onKeyDown(event);

        setInterval(() => this.onUpdate(), 100); // every 100 ms we should maximum send

        $(canvas).on("wheel", (e) =>
            this.onMouseScroll(e)
        );

        this.background = new Background();
        this.background.setup();

        this.ui = new UIManager(this);
        this.selection = new SelectionManager(this.users, this.ws, this.ui.getBrushMenu());

        this.camera = new Camera(this.background);
    }

    public run() {
        this.ws.connect();
        this.ws.onPacketReceived = pck => this.onPacketReceived(pck)
    }

    private onMouseDown(ev: paper.MouseEvent) {
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
                this.rawPath = [ev.point]
                this.pathID = this.pathIDGenerator.getNext();
                this.ws.sendPacket(
                    new ClientBeginPath(
                        this.pathID,
                        ev.point,
                        this.ui.getStrokeWidth(),
                        this.ui.getColor()
                    )
                )
            } else if (this.mode == Mode.PAN) {
                this.camera.beginPan(ev.point)
            } else if (this.mode == Mode.SELECT) {
                this.selection.startSelection(ev.point)
            }
        } else if (ev.event.button == 1) { // the scroll wheel clicked
            this.tempMode = Mode.PAN;
            this.camera.beginPan(ev.point)
        } else if (ev.event.button == 2) { // the right button
            this.tempMode = Mode.SELECT;
            this.selection.startSelection(ev.point)
        }

        console.log("mouseDown")
    }


    private onMouseUp(ev: paper.MouseEvent) {
        if (this.mouseDown) {
            if (this.tempMode == Mode.SELECT) {
                this.selection.onMouseUp(ev, this.mouseDragged);
                this.ui.setModeMove()
                ev.event.preventDefault()
            } else if (this.tempMode == Mode.PAN) {
                // do nothing
                // this.camera.endPan()
                ev.event.preventDefault()
            } else if (this.mode == Mode.DRAW) {
                this.ws.sendPacket(
                    new ClientEndPath(
                        this.pathID
                    )
                );
                if (this.path != null) {
                    const drawLine = new DrawLine(this.path, this.pathID, this.users.getMyUserID(), this.rawPath);
                    if (this.mouseDragged) {
                        //this.path.simplify();
                        drawLine.simplify()
                        this.users.getMyUser()?.addLine(drawLine);
                        //this.selection.setSelected(drawLine);
                    } else {
                        // we didn't draw anything so delete this line
                        this.ws.sendPacket(new ClientDeleteLines([drawLine]));
                    }
                }
                this.path = null;
            } else if (this.mode == Mode.SELECT) {
                this.selection.onMouseUp(ev, this.mouseDragged);
                this.mouseDown = false;
                this.ui.setModeMove()
            } else if (this.mode == Mode.PAN) {
                // do nothing
                // this.camera.endPan()
            }
            console.log("mouseUp")
        }
        this.tempMode = null
        this.mouseDown = false;
    }

    private onMouseDragged(ev: paper.MouseEvent) {
        this.mouseDragged = true;
        if (this.tempMode == Mode.PAN) {
            this.camera.moveByPan(ev.point)
        } else if (this.tempMode == Mode.SELECT) {
            this.selection.onMouseDragged(ev.point)
        } else if (this.mode == Mode.DRAW) {
            if (this.path != null) {
                this.ws.sendPacket(
                    new ClientAddPointsPath(
                        this.pathID,
                        [ev.point]
                    )
                );
                this.path.add(ev.point);
                this.rawPath.push(ev.point);
            }
        } else if (this.mode == Mode.PAN) {
            this.camera.moveByPan(ev.point)
        } else if (this.mode == Mode.SELECT) {
            this.selection.onMouseDragged(ev.point)
            console.log("SEL dragged")
        } else if (this.mode == Mode.MOVE_SELECTED) {
            this.selection.move(ev.delta)
        }
    }

    private onMouseMove(ev: paper.MouseEvent) {
        this.lastMousePosition = ev.point
        if (this.mode == Mode.SELECT || this.tempMode == Mode.SELECT) {
            this.selection.onMouseMove(ev.point, this.mouseDown)
        }
    }

    private onResize(event: paper.Event) {
        this.background.onMove();
    }

    private onKeyDown(event: paper.KeyEvent) {
        console.log(event.key)
        if (event.key == "delete" || event.key == "backspace") {
            this.deleteSelection()
        } else if (event.key == "escape") {
            this.selection.clear()
        } else if (event.key == "z") {
            if (event.modifiers.control) {
                this.undo()
            }
        } else if (event.key == "a") {
            if (event.modifiers.control) {
                this.selection.selectAll();

                // @ts-ignore
                event.preventDefault();
            }
        } else if (event.key == "c") {
            if (event.modifiers.control) {
                this.selection.copy()
            }
        } else if (event.key == "v") {
            if (event.modifiers.control) {
                this.selection.paste(this.pathIDGenerator)
            }
        } else if (event.key == "1") {
            this.ui.setModePan()
        } else if (event.key == "2" || event.key == "p" || event.key == "d") {
            this.ui.setModeDraw()
        } else if (event.key == "3" || event.key == "s") {
            this.ui.setModeSelect()
        } else if (event.key == "4" || event.key == "m") {
            this.ui.setModeMove()
        } else if (event.key == "5") {
            this.deleteSelection()
        } else if (event.key == "6") {
            this.undo()
        }
    }

    onMouseScroll(e: JQuery.TriggeredEvent<HTMLCanvasElement, undefined, HTMLCanvasElement, HTMLCanvasElement>) {
        const event = <WheelEvent>e.originalEvent;
        if (event.ctrlKey) {
            let direction = event.deltaY < 0 ? ZoomDirection.OUT : ZoomDirection.IN;
            this.camera.zoom(direction, event.shiftKey);
            event.preventDefault()
        } else {
            this.camera.move(new paper.Point(event.deltaX, event.deltaY));
        }
    }

    private onDoubleClick(event: paper.MouseEvent) {

    }

    private onUpdate() {
        // check that we should send new update
        if (this.path != null) {

        }
    }

    private onPacketReceived(pck: ServerPacket) {
        console.log("got packet" + pck.getPacketType());
        switch (pck.getPacketType()) {
            case ServerPacketIDs.SetUserID:
                this.handleSetUserID(<ServerSetUserID>pck);
                break;
            case ServerPacketIDs.AddUser:
                this.handleAddUser(<ServerAddUserPacket>pck);
                break;
            case ServerPacketIDs.BeginPath:
                this.handleBeginPath(<ServerBeginPathPacket>pck);
                break;
            case ServerPacketIDs.AddPointsPath:
                this.handleAddPointsPath(<ServerAddPointsPathPacket>pck);
                break;
            case ServerPacketIDs.EndPath:
                this.handleEndPath(<ServerEndPathPacket>pck);
                break;
            case ServerPacketIDs.DeleteLines:
                this.handleDeleteLines(<ServerDeleteLinesPacket>pck);
                break;
            case ServerPacketIDs.MoveLines:
                this.handleMoveLines(<ServerMoveLinesPacket>pck);
                break;
            case ServerPacketIDs.SetStrokeSize:
                this.handleSetStrokeSize(<ServerSetStrokeSizePacket>pck);
                break;
            case ServerPacketIDs.SetStrokeColor:
                this.handleSetStrokeColor(<ServerSetStrokeColorPacket>pck);
                break;
            case ServerPacketIDs.RemovedUser:
                this.handleRemovedUser(<ServerRemovedUserPacket>pck);
                break;
        }

    }

    private handleSetUserID(pck: ServerSetUserID) {
        this.users.setMyUserID(pck.userID)
    }

    private handleAddUser(pck: ServerAddUserPacket) {
        this.users.add(pck.userID);
    }

    private handleBeginPath(pck: ServerBeginPathPacket) {
        this.users.findUserByID(pck.userID)?.beginPath(pck.lineID, pck.pos, pck.strokeWidth, pck.strokeColor);
    }

    private handleAddPointsPath(pck: ServerAddPointsPathPacket) {
        this.users.findUserByID(pck.userID)?.addPointsPath(pck.lineID, pck.points);
    }

    private handleEndPath(pck: ServerEndPathPacket) {
        this.users.findUserByID(pck.userID)?.endPath(pck.lineID);
    }


    deleteLine(userID: number, lineID: number) {
        this.users.findUserByID(userID)?.deleteLine(lineID);
        this.selection.onDeleteLine(userID, lineID);
    }

    private handleDeleteLines(pck: ServerDeleteLinesPacket) {
        pck.lines.forEach(l => {
            this.deleteLine(l.userID, l.lineID);
        })
    }

    private handleMoveLines(pck: ServerMoveLinesPacket) {
        console.log("handleMove" + pck.delta);
        pck.lines.forEach(l => {
            this.users.findUserByID(l.userID)?.moveLine(l.lineID, pck.delta)
        });
        //this.selection.
        this.selection.onPacketMoveLines()
    }

    setMode(mode: Mode): boolean {
        if (!this.mouseDown) {
            this.mode = mode;
        }
        return !this.mouseDown
    }

    private handleSetStrokeSize(pck: ServerSetStrokeSizePacket) {
        this.users.findUserByID(pck.userID)?.setStrokeSize(pck.lineID, pck.size);
        this.selection.onPacketStrokeSizeChange();
    }

    private handleSetStrokeColor(pck: ServerSetStrokeColorPacket) {
        this.users.findUserByID(pck.userID)?.setStrokeColor(pck.lineID, pck.color);
        this.selection.onPacketStrokeColorChange();
    }

    onUIEventStrokeSizeChange(size: number) {
        this.selection.onUIEventStrokeSizeChange(size);
    }

    onUIEventStrokeColorChange(color: paper.Color) {
        this.selection.onUIEventStrokeColorChange(color);
    }

    private handleRemovedUser(pck: ServerRemovedUserPacket) {
        this.users.handleRemovedUser(pck.userID, pck.lines)
    }

    deleteSelection() {
        this.selection.delete()
    }

    undo() {
        const line = this.users.getMyUser()?.getLastLine();
        if (line) {
            this.deleteLine(line.userID, line.lineID);
            const pck = new ClientDeleteLines([line]);
            this.ws.sendPacket(pck);
        }
    }
}