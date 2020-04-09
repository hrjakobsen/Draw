class UIManager {
    private root: Root;

    private brushMenu: BrushMenu;

    constructor(root: Root) {
        this.root = root;

        this.brushMenu = new BrushMenu(this);
        // setup the buttons
        this.setupButtons();
    }

    private setupButtons() {
        const panMode = $("#UIPanMode");
        const drawMode = $("#UIDrawMode");
        const selMode = $("#UISelectMode");
        const moveMode = $("#UIMoveSelectedMode");

        let active = drawMode;

        panMode.on("click", () => {
            this.root.setMode(Mode.PAN);
            active.removeClass("active");
            active = panMode;
            active.addClass("active");
        });
        drawMode.on("click", () => {
            this.root.setMode(Mode.DRAW);
            active.removeClass("active");
            active = drawMode;
            active.addClass("active");
        });
        selMode.on("click", () => {
            this.root.setMode(Mode.SELECT);
            active.removeClass("active");
            active = selMode;
            active.addClass("active");
        });
        moveMode.on("click", () => {
            this.root.setMode(Mode.MOVE_SELECTED);
            active.removeClass("active");
            active = moveMode;
            active.addClass("active");
        });

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
}