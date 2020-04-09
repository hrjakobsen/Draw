package util

type Point struct {
	X int32
	Y int32
}

func (p Point) Add(val Point) Point {
	return Point{
		X: p.X + val.X,
		Y: p.Y + val.Y,
	}
}