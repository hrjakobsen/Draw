class DrawLine {
    readonly path: paper.Path;
    readonly lineID: number;
    readonly userID: number;

    constructor(path: paper.Path, lineID: number, userID: number) {
        this.path = path;
        this.lineID = lineID;
        this.userID = userID;
    }

    UpdateUserID(userID: number): DrawLine {
        return new DrawLine(this.path, this.lineID, userID)
    }

    updateLineID(lineID: number): DrawLine {
        return new DrawLine(this.path, lineID, this.userID)
    }
}

class UserLine extends DrawLine {
    constructor(lineID: number, userID: number, pos: paper.Point, strokeWidth: number, strokeColor: paper.Color){
        const path = new paper.Path({
            segments: [pos],
            // Select the path, so we can see its segment points:
            fullySelected: false,
            strokeWidth: strokeWidth,
            strokeColor: strokeColor,
        });
        path.selectedColor = new paper.Color(255, 255, 255, 0);
        super(
            path,
            lineID,
            userID
        )
    }
}

