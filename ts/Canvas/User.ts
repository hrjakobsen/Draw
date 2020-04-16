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
            l.addPoint(point)
        }
    }

    endPath(lineID: number) {
        this.findLineById(lineID)?.simplify();
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
        this.findLineById(lineID)?.remove();
        this.lines = this.lines.filter(myLine =>
            myLine.lineID != lineID
        )
    }

    moveLine(lineID: number, delta: paper.Point) {
        console.log("move line", this.userID)
        const line = this.findLineById(lineID);
        line?.moveDelta(delta)
    }

    findLine(path: paper.Item): DrawLine | null {
        for (let line of this.lines) {
            if (line.isEqual(path)) {
                return line;
            }
        }
        return null;
    }

    setStrokeSize(lineID: number, size: number) {
        const l = this.findLineById(lineID);
        if (l) {
            l.updateStrokeWidth(size)
        }
    }

    setStrokeColor(lineID: number, color: paper.Color) {
        const l = this.findLineById(lineID);
        if (l) {
            l.updateStrokeColor(color)
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

    setOwner(lines: DrawLine[]) {
        for (let i = 0; i < lines.length; i++) {
            this.lines.push(lines[i].UpdateUserID(this.userID))
        }
    }
}