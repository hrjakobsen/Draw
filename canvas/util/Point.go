package util

import (
	"database/sql/driver"
	"fmt"
)

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

func (p Point) Value() (driver.Value, error){
	return fmt.Sprintf("(%d,%d)", p.X, p.Y), nil
}


type ReadPoint struct {
	Point Point
}

func (p ReadPoint) Scan(src interface{}) error {
	_, err := fmt.Sscanf(string(src.([]byte)), "(%d,%d)", &p.Point.X, &p.Point.Y)
	return err
}
