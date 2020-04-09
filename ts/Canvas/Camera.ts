enum ZoomDirection {
    IN,
    OUT
}

class Camera {
    private background: Background;

    private lastMousePoint: paper.Point = new paper.Point(0, 0);
    private zoomLevel = 100;

    constructor(background: Background) {
        this.background = background;

    }

    zoom(direction: ZoomDirection, shiftKey: boolean) {
        switch (direction) {
            case ZoomDirection.IN:
                if (shiftKey) {
                    this.zoomLevel -= 1;
                } else {
                    if (this.zoomLevel < 10) {
                        this.zoomLevel -= 1;
                    } else {
                        this.zoomLevel -= 10;
                        this.zoomLevel = Math.max(9, this.zoomLevel);
                    }
                }
                break;
            case ZoomDirection.OUT:
                if (shiftKey) {
                    this.zoomLevel += 1;
                } else {
                    if (this.zoomLevel <= 10) {
                        this.zoomLevel += 1
                    } else {
                        this.zoomLevel += 10;
                    }
                }
                break;
        }

        this.zoomLevel = Math.min(Math.max(this.zoomLevel, 1), 300) | 0;
        paper.view.zoom = this.zoomLevel / 100;
        this.background.onMove();
    }

    move(delta: paper.Point) {
        paper.view.center = paper.view.center.add(
            delta
        );
        this.background.onMove();
    }

    beginPan(mousePoint: paper.Point) {
        this.lastMousePoint = mousePoint;
    }

    moveByPan(mousePoint: paper.Point) {
        const lastViewCenter = paper.view.center;
        paper.view.center = paper.view.center.add(
            this.lastMousePoint.subtract(mousePoint)
        );
        this.lastMousePoint = mousePoint.add(paper.view.center.subtract(lastViewCenter));
        this.background.onMove();
    }
}