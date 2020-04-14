package util

import (
	"database/sql/driver"
	"encoding/hex"
	"fmt"
)

type Color struct {
	R uint8
	G uint8
	B uint8
}

func (c Color) Value() (driver.Value, error){
	src := []byte{c.R, c.G, c.B}

	dst := make([]byte, hex.EncodedLen(len(src)))
	hex.Encode(dst, src)

	return fmt.Sprintf("%s\n", dst), nil
}

