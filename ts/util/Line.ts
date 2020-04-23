const SIMPLIFY_CONST = 5

class CopyLine {
    readonly rawPath: paper.Point[];
    readonly strokeColor: paper.Color;
    readonly strokeWidth: number;


    constructor(rawPath: paper.Point[], strokeColor: paper.Color, strokeWidth: number) {
        this.rawPath = rawPath;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }
}

class DrawLine {
    private readonly path: paper.Path;
    readonly lineID: number;
    readonly userID: number;
    private readonly rawPath: paper.Point[];
    private moved = new paper.Point(0,0)

    constructor(path: paper.Path, lineID: number, userID: number, rawPath: paper.Point[]) {
        this.path = path;
        this.lineID = lineID;
        this.userID = userID;
        this.rawPath = rawPath;
    }

    UpdateUserID(userID: number): DrawLine {
        return new DrawLine(this.path, this.lineID, userID, this.calculateRawPath())
    }

    updateLineID(lineID: number): DrawLine {
        return new DrawLine(this.path, lineID, this.userID, this.calculateRawPath())
    }

    addPoint(point: paper.Point) {
        this.path.add(point)
        this.rawPath.push(point)
    }

    private calculateRawPath(): paper.Point[] {
        const newRawPath: paper.Point[] = []
        this.rawPath.forEach( p => newRawPath.push(p.add(this.moved)))
        return newRawPath
    }

    copy(): CopyLine {
        return new CopyLine(this.calculateRawPath(), <Color>this.path.strokeColor, this.path.strokeWidth)
    }

    isInside(rect: paper.Rectangle): boolean {
        return this.path.isInside(rect)
    }

    intersects(shape: paper.Shape): boolean {
        return this.path.intersects(shape)
    }

    selected(value: boolean) {
        this.path.selected = value;
    }

    moveDelta(delta: paper.Point) {
        this.moved = this.moved.add(delta)
        this.path.position = this.path.position.add(delta)
    }

    strokeWidth(): number {
        return this.path.strokeWidth;
    }

    strokeColor(): paper.Color {
        return <Color>this.path.strokeColor;
    }

    strokeBounds(): paper.Rectangle {
        return this.path.strokeBounds
    }

    updateStrokeWidth(size: number) {
        this.path.strokeWidth = size
    }

    updateStrokeColor(color: paper.Color) {
        this.path.strokeColor = color;
    }

    isEqual(path: paper.Item): boolean{
        return this.path == path;
    }

    remove() {
        this.path.remove()
    }

    simplify() {
        this.path.simplify(SIMPLIFY_CONST)
    }
}

class UserLine extends DrawLine {
    constructor(lineID: number, userID: number, pos: paper.Point, strokeWidth: number, strokeColor: paper.Color) {
        const path = new paper.Path({
            segments: [pos],
            // Select the path, so we can see its segment points:
            fullySelected: false,
            strokeWidth: strokeWidth,
            strokeColor: strokeColor,
        });
        //path.selectedColor = new paper.Color(255, 255, 255, 0);
        super(
            path,
            lineID,
            userID,
            [pos]
        )
    }
}

