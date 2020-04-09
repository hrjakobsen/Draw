class BrushMenu {
    private uiManager: UIManager;

    /* settings */
    private selectedColor = new paper.Color(0, 0, 0);

    /* strokes */
    private strokeWidthRangeElement: JQuery<HTMLInputElement>;
    private strokeWidthNumberElement: JQuery<HTMLInputElement>;

    /* Color */
    private selectBlueButton: JQuery<HTMLButtonElement>;
    private selectBlackButton: JQuery<HTMLButtonElement>;
    private selectGreenButton: JQuery<HTMLButtonElement>;
    private selectRedButton: JQuery<HTMLButtonElement>;
    private brushUI: JQuery<HTMLElement>;

    private selectedColorButton: JQuery<HTMLButtonElement>;

    constructor(uiManager: UIManager) {
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

    private setupStrokeChange() {
        this.strokeWidthRangeElement.on('input', _ => {
            this.onStrokeChange(<number>this.strokeWidthRangeElement.val())
        });
        this.strokeWidthNumberElement.on('input', _ => {
            this.onStrokeChange(<number>this.strokeWidthNumberElement.val())
        })
    }

    getStrokeWidth(): number {
        return <number>this.strokeWidthRangeElement.val();
    }

    setStrokeWidth(size: number) {
        this.strokeWidthRangeElement.val(size);
        this.strokeWidthNumberElement.val(size);
    }

    private onStrokeChange(val: number) {
        this.setStrokeWidth(val);
        this.uiManager.onUIStrokeSizeChange(val)
    }

    private setupColorSelection() {
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

    private onSetColor(color: paper.Color, newSelectedColorButton: JQuery<HTMLButtonElement>){
        this.updateUIColor(color, newSelectedColorButton);
        this.uiManager.onUIStrokeColorChange(color);
    }

    getStrokeColor(): paper.Color {
        return this.selectedColor;
    }

    setStrokeColor(color: paper.Color) {
        if (color.green > 0x60) {
            this.updateUIColor(color, this.selectGreenButton);
            console.log("green");
        } else if (color.blue > 0x80) {
            this.updateUIColor(color, this.selectBlueButton);
            console.log("blue");
        } else if (color.red > 0x80) {
            this.updateUIColor(color, this.selectRedButton);
            console.log("red");
        } else {
            this.updateUIColor(color, this.selectBlackButton);
            console.log("black");
        }
    }

    private updateUIColor(selectedColor: paper.Color, newSelectedColorButton: JQuery<HTMLButtonElement>) {
        this.selectedColor = selectedColor;
        this.selectedColorButton.children().hide();
        this.selectedColorButton = newSelectedColorButton;
        this.selectedColorButton.children().css('display', 'flex');
    }
}