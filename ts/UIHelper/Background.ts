class Background {
    private paths: paper.Path[] = [];

    private heightPx = 40;


    constructor() {
    }

    setup() {
        this.onMove();
    }

    onMove() {
        this.paths.forEach(path =>
            path.remove()
        );
        this.paths = [];

        let center = paper.view.center;
        let size   = paper.view.size;
        let xBegin = center.x - size.width/2;
        let xEnd   = center.x + size.width/2;

        let yBegin = center.y - size.height/2;
        if (yBegin % this.heightPx != 0) {
            yBegin -= yBegin % this.heightPx;
        }

        for (let height = yBegin; height < size.height / 2 + center.y; height += this.heightPx) {
            const path = new paper.Path();
            path.add(new paper.Point(xBegin, height));
            path.add(new paper.Point(xEnd, height));
            path.strokeColor = "#d2d2d2";
            path.strokeWidth = 2;
            path.sendToBack();
            this.paths.push(path)
        }
    }

    hide() {
        this.paths.forEach( path => path.visible = false )
    }

    show() {
        this.paths.forEach( path => path.visible = true )
    }
}