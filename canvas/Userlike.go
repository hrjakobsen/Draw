package canvas

import "github.com/MikkelKettunen/Draw/canvas/util"

type Userlike interface {
	save(id int)
	moveLine(id int32, delta util.Point) bool
	setStrokeSize(id int32, size uint8)
	setStrokeColor(id int32, color util.Color)
	deleteLine(id int32) bool
	id() uint8
}
