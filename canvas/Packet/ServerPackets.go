package Packet

import (
	"github.com/MikkelKettunen/Draw/canvas/util"
)

const (
	ServerSetUserID      = 0
	ServerAddUser        = 1
	ServerBeginPath      = 2
	ServerEndPath        = 3
	ServerAddPointsPath  = 4
	ServerDeleteLines    = 5
	ServerMoveLines      = 6
	ServerSetStrokeSize  = 7
	ServerSetStrokeColor = 8
	ServerRemovedUser    = 9
)

type ServerPacket interface {
	ToArray() []byte
}

type ServerSetUserIDPacket struct {
	UserID uint8
}

func (p *ServerSetUserIDPacket) ToArray() []byte {
	pck := make([]byte, 2)
	pck[0] = ServerSetUserID
	pck[1] = p.UserID
	return pck
}

type ServerAddUserPacket struct {
	UserID uint8
}

func (p *ServerAddUserPacket) ToArray() []byte {
	pck := make([]byte, 2)
	pck[0] = ServerAddUser
	pck[1] = p.UserID
	return pck
}

type ServerBeginPathPacket struct {
	UserID      uint8
	LineID      int32
	Pos         util.Point
	StrokeWidth uint8
	StrokeColor util.Color
}

func (p *ServerBeginPathPacket) ToArray() []byte {
	pck := make([]byte, 1+1+4+8+1+3)
	pck[0] = ServerBeginPath
	pck[1] = p.UserID
	writeInt32(p.LineID, pck, 2)
	writePoint(p.Pos, pck, 2+4)
	pck[1+1+4+8] = p.StrokeWidth
	pck[1+1+4+8+1] = p.StrokeColor.R
	pck[1+1+4+8+2] = p.StrokeColor.G
	pck[1+1+4+8+3] = p.StrokeColor.B
	return pck
}

type ServerEndPathPacket struct {
	UserID   uint8
	LineIDID int32
}

func (p *ServerEndPathPacket) ToArray() []byte {
	pck := make([]byte, 1+1+4)
	pck[0] = ServerEndPath
	pck[1] = p.UserID
	writeInt32(p.LineIDID, pck, 2)
	return pck
}

type ServerAddPointsPathPacket struct {
	UserID uint8
	LineID int32
	Path   []util.Point
}

func (p *ServerAddPointsPathPacket) ToArray() []byte {
	size := len(p.Path)
	pck := make([]byte, 1+1+4+4+size*8)
	pck[0] = ServerAddPointsPath
	pck[1] = p.UserID
	writeInt32(p.LineID, pck, 2)
	writeInt32(int32(size), pck, 2+4)
	for i := 0; i < size; i++ {
		writePoint(p.Path[i], pck, 2+4+4+i*8)
	}
	return pck
}

type ServerDeleteLinesPacket struct {
	Lines []util.PacketLine
}

func (p *ServerDeleteLinesPacket) ToArray() []byte {
	count := int32(len(p.Lines))
	pck := make([]byte, 1+4+count*(1+4))
	pck[0] = ServerDeleteLines
	writeInt32(count, pck, 1)
	offset := 5
	for _, l := range p.Lines {
		pck[offset] = l.UserID
		offset += 1
		writeInt32(l.LineID, pck, offset)
		offset += 4
	}
	return pck
}

type ServerMoveLinesPacket struct {
	Delta util.Point
	Lines []util.PacketLine
}

func (p *ServerMoveLinesPacket) ToArray() []byte {
	count := int32(len(p.Lines))
	pck := make([]byte, 1+8+4+count*(1+4))
	pck[0] = ServerMoveLines
	writePoint(p.Delta, pck, 1)
	writeInt32(count, pck, 1+8)
	offset := 1 + 8 + 4
	for _, l := range p.Lines {
		pck[offset] = l.UserID
		offset += 1
		writeInt32(l.LineID, pck, offset)
		offset += 4
	}
	return pck
}

type ServerSetStrokeSizePacket struct {
	UserID uint8
	LineID int32
	Size   uint8
}

func (p *ServerSetStrokeSizePacket) ToArray() []byte {
	pck := make([]byte, 1+1+4+1)
	pck[0] = ServerSetStrokeSize
	pck[1] = p.UserID
	writeInt32(p.LineID, pck, 2)
	pck[6] = p.Size
	return pck
}

type ServerSetStrokeColorPacket struct {
	UserID uint8
	LineID int32
	Color  util.Color
}

func (p *ServerSetStrokeColorPacket) ToArray() []byte {
	pck := make([]byte, 1+1+4+3)
	pck[0] = ServerSetStrokeColor
	pck[1] = p.UserID
	writeInt32(p.LineID, pck, 2)
	pck[6+0] = p.Color.R
	pck[6+1] = p.Color.G
	pck[6+2] = p.Color.B
	return pck
}

type ServerUpdateLineID struct {
	OldLineID int32
	NewLineID int32
}
type ServerRemovedUserPacket struct {
	UserID uint8
	Lines  []ServerUpdateLineID
}

func (p *ServerRemovedUserPacket) ToArray() []byte {
	pck := make([]byte, 1+1+4+len(p.Lines)*8)
	pck[0] = ServerRemovedUser
	pck[1] = p.UserID
	writeInt32(int32(len(p.Lines)), pck, 2)
	offset := 6
	for _, l := range p.Lines {
		writeInt32(l.OldLineID, pck, offset)
		offset += 4
		writeInt32(l.NewLineID, pck, offset)
		offset += 4
	}
	return pck
}
