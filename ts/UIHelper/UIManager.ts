class UIManager {
    private root: Root;

    private readonly brushMenu: BrushMenu;

    private readonly panMode = $("#UIPanMode");
    private readonly drawMode = $("#UIDrawMode");
    private readonly selMode = $("#UISelectMode");
    private readonly moveMode = $("#UIMoveSelectedMode");
    private readonly shareCursorMode = $("#UIButtonShareCursorMode");
    private active: JQuery<HTMLElement> = this.drawMode;

    constructor(root: Root) {
        this.root = root;

        this.brushMenu = new BrushMenu(this);
        // setup the buttons
        this.setupButtons();
    }

    private setupButtons() {
        this.panMode.on("click", () => this.setModePan());
        this.drawMode.on("click", () => this.setModeDraw());
        this.selMode.on("click", () => this.setModeSelect());
        this.moveMode.on("click", () => this.setModeMove());

        this.shareCursorMode.on("click", () => this.setModeShareCursor())

        $("#UIDeleteSelectionButton").on("click", () => {
            this.root.deleteSelection()
        })

        $("#UIUndoButton").on("click", () => {
            this.root.undo()
        })

    }


    getStrokeWidth(): number {
        return this.brushMenu.getStrokeWidth();
    }

    getColor(): paper.Color {
        return this.brushMenu.getStrokeColor();
    }

    getBrushMenu(): BrushMenu {
        return this.brushMenu
    }

    onUIStrokeSizeChange(val: number) {
        this.root.onUIEventStrokeSizeChange(val);
    }

    onUIStrokeColorChange(color: paper.Color) {
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

    setModeShareCursor() {
        if (this.root.setMode(Mode.SHARE_CURSOR)) {
            this.active.removeClass("active");
            this.active = this.shareCursorMode;
            this.active.addClass("active");
        }
    }
}