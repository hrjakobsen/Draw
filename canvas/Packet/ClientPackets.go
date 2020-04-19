package Packet

import (
	"errors"
	"github.com/MikkelKettunen/Draw/canvas/util"
	"strconv"
)

const (
	ClientBeginPath            = 0
	ClientEndPath              = 1
	ClientAddPointsPath        = 2
	ClientDeleteLines          = 3
	ClientMoveLines            = 4
	ClientSetStrokeSize        = 5
	ClientSetStrokeColor       = 6
	ClientStartSharingCursor   = 7
	ClientUpdateCursorPosition = 8
	ClientStopSharingCursor    = 9
)

type ClientPacket interface {
	GetPacketType() uint8
}

type ClientBeginPathPacket struct {
	Id          int32
	Pos         util.Point
	StrokeWidth uint8
	StrokeColor util.Color
}

func (c *ClientBeginPathPacket) GetPacketType() uint8 {
	return ClientBeginPath
}

func CreateBeginPathPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 4 + 8 + 1 + 3
	if len(message) < size {
		return nil, nil, errors.New("CreateBeginPathPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	id := readInt32(message, 1)
	pos := readPoint(message, 1+4)
	strokeWidth := message[1+4+8]
	r := message[1+4+8+1]
	g := message[1+4+8+2]
	b := message[1+4+8+3]
	color := util.Color{
		R: r,
		G: g,
		B: b,
	}

	res := &ClientBeginPathPacket{
		Id:          id,
		Pos:         pos,
		StrokeWidth: strokeWidth,
		StrokeColor: color,
	}

	return res, message[size:], nil
}

type ClientAddPointsPathPacket struct {
	Id     int32
	Points []util.Point
}

func (c *ClientAddPointsPathPacket) GetPacketType() uint8 {
	return ClientAddPointsPath
}

func CreateAddPointsPathPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 4 + 4
	if len(message) < size {
		return nil, nil, errors.New("CreateBeginPathPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}
	id := readInt32(message, 1)
	count := readInt32(message, 1+4)
	size = size + int(count)*8
	if len(message) < size {
		return nil, nil, errors.New("CreateBeginPathPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	points := make([]util.Point, count)
	for index := 0; index < int(count); index++ {
		points[index] = readPoint(message, 1+4+4+index*8)
	}

	res := &ClientAddPointsPathPacket{
		Id:     id,
		Points: points,
	}

	return res, message[size:], nil
}

type ClientEndPathPacket struct {
	Id int32
}

func (c *ClientEndPathPacket) GetPacketType() uint8 {
	return ClientEndPath
}

func CreateEndPathPacket(message []byte) (ClientPacket, []byte, error) {
	size := 5
	if len(message) < size {
		return nil, nil, errors.New("CreateEndPathPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	id := readInt32(message, 1)
	res := &ClientEndPathPacket{
		Id: id,
	}
	return res, message[size:], nil
}

type ClientDeleteLinesPacket struct {
	Lines []util.PacketLine
}

func (c *ClientDeleteLinesPacket) GetPacketType() uint8 {
	return ClientDeleteLines
}

func CreateClientDeleteLinesPacket(message []byte) (ClientPacket, []byte, error) {
	size := 5
	if len(message) < size {
		return nil, nil, errors.New("CreateClientDeleteLinesPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	count := int(readInt32(message, 1))

	size += count * (1 + 4)
	if len(message) < size {
		return nil, nil, errors.New("CreateClientDeleteLinesPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	res := &ClientDeleteLinesPacket{
		Lines: make([]util.PacketLine, count),
	}

	offset := 5
	for i := 0; i < count; i++ {
		res.Lines[i].UserID = message[offset]
		offset += 1
		res.Lines[i].LineID = readInt32(message, offset)
		offset += 4
	}
	return res, message[size:], nil
}

type ClientMoveLinesPacket struct {
	Delta util.Point
	Lines []util.PacketLine
}

func (c *ClientMoveLinesPacket) GetPacketType() uint8 {
	return ClientMoveLines
}

func CreateClientMoveLinesPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 8 + 4
	if len(message) < size {
		return nil, nil, errors.New("CreateClientMoveLinesPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	delta := readPoint(message, 1)
	count := int(readInt32(message, 1+8))
	size += count * (1 + 4)
	if len(message) < size {
		return nil, nil, errors.New("CreateClientMoveLinesPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	res := &ClientMoveLinesPacket{
		Delta: delta,
		Lines: make([]util.PacketLine, count),
	}

	offset := 1 + 8 + 4
	for i := 0; i < count; i++ {
		res.Lines[i].UserID = message[offset]
		offset += 1
		res.Lines[i].LineID = readInt32(message, offset)
		offset += 4
	}
	return res, message[size:], nil
}

type ClientSetStrokeSizePacket struct {
	UserID uint8
	LineID int32
	Size   uint8
}

func (c *ClientSetStrokeSizePacket) GetPacketType() uint8 {
	return ClientSetStrokeSize
}

func CreateClientSetStrokeSizePacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 1 + 4 + 1
	if len(message) < size {
		return nil, nil, errors.New("CreateClientSetStrokeSizePacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}
	userID := message[1]
	lineID := readInt32(message, 2)
	strokeSize := message[6]
	res := &ClientSetStrokeSizePacket{
		UserID: userID,
		LineID: lineID,
		Size:   strokeSize,
	}
	return res, message[size:], nil
}

type ClientSetStrokeColorPacket struct {
	UserID uint8
	LineID int32
	Color  util.Color
}

func (c *ClientSetStrokeColorPacket) GetPacketType() uint8 {
	return ClientSetStrokeColor
}

func CreateClientSetStrokeColorPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 1 + 4 + 3
	if len(message) < size {
		return nil, nil, errors.New("CreateClientSetStrokeColorPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}
	userID := message[1]
	lineID := readInt32(message, 2)
	r := message[6+0]
	g := message[6+1]
	b := message[6+2]
	res := &ClientSetStrokeColorPacket{
		UserID: userID,
		LineID: lineID,
		Color: util.Color{
			R: r,
			G: g,
			B: b,
		},
	}
	return res, message[size:], nil
}

type ClientStartSharingCursorPacket struct {
	Point util.Point
}

func (c *ClientStartSharingCursorPacket) GetPacketType() uint8 {
	return ClientStartSharingCursor
}

func CreateClientStartSharingCursorPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 8
	if len(message) < size {
		return nil, nil, errors.New("CreateClientSharingCursorPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	point := readPoint(message, 1)
	res := &ClientStartSharingCursorPacket{
		Point: point,
	}

	return res, message[size:], nil
}

type ClientUpdateCursorPositionPacket struct {
	Point util.Point
}

func (c *ClientUpdateCursorPositionPacket) GetPacketType() uint8 {
	return ClientUpdateCursorPosition
}

func CreateClientUpdateCursorPositionPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1 + 8
	if len(message) < size {
		return nil, nil, errors.New("CreateClientUpdateCursorPositionPacket not length " + strconv.Itoa(size) + " got " + strconv.Itoa(len(message)))
	}

	point := readPoint(message, 1)
	res := &ClientUpdateCursorPositionPacket{
		Point: point,
	}

	return res, message[size:], nil
}

type ClientStopSharingCursorPacket struct {
}

func (c *ClientStopSharingCursorPacket) GetPacketType() uint8 {
	return ClientStopSharingCursor
}

func CreateClientStopSharingCursorPacket(message []byte) (ClientPacket, []byte, error) {
	size := 1
	res := &ClientStopSharingCursorPacket{}
	return res, message[size:], nil
}
