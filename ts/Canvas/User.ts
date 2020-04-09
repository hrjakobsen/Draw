class User {
    readonly userID: number;
    private lines: DrawLine[];

    constructor(userID: number) {
        this.userID = userID;
        this.lines = [];
    }

    beginPath(lineID: number, pos: paper.Point, strokeWidth: number, strokeColor: paper.Color) {
        console.log("begin Color ", strokeColor);
        this.lines.push(new UserLine(lineID, this.userID, pos, strokeWidth, strokeColor));
    }

    addPointsPath(lineID: number, points: paper.Point[]) {
        const l = this.findLineById(lineID);
        if (l == null) {
            console.log("addPointsToPath failed to find line");
            return;
        }

        for (let point of points) {
            l.path.add(point)
        }
    }

    endPath(lineID: number) {
        this.findLineById(lineID)?.path.simplify(10);
    }

    findLineById(lineID: number): DrawLine | null {
        for (let l of this.lines) {
            if (l.lineID == lineID) {
                return l
            }
        }
        return null
    }

    getLines(): DrawLine[] {
        return this.lines
    }

    deleteLine(lineID: number) {
        this.findLineById(lineID)?.path.remove();
        this.lines = this.lines.filter(myLine =>
            myLine.lineID != lineID
        )
    }

    moveLine(lineID: number, delta: paper.Point) {
        const path = this.findLineById(lineID)?.path;
        if (path) {
            path.position = path.position.add(delta)
        }
    }

    findLine(path: paper.Item): DrawLine | null {
        for (let line of this.lines) {
            if (line.path == path) {
                return line;
            }
        }
        return null;
    }

    setStrokeSize(lineID: number, size: number) {
        const l = this.findLineById(lineID);
        if (l) {
            l.path.strokeWidth = size
        }
    }

    setStrokeColor(lineID: number, color: paper.Color) {
        const l = this.findLineById(lineID);
        if (l) {
            l.path.strokeColor = color
        }
    }

    addLine(drawLine: DrawLine) {
        this.lines.push(drawLine)
    }

    getLastLine(): DrawLine | null {
        if (this.lines.length == 0) {
            return null;
        }

        return this.lines[this.lines.length - 1];
    }

}