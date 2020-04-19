package Packet

import (
	"errors"
	"github.com/MikkelKettunen/Draw/canvas/util"
)

func Parse(message []byte) (ClientPacket, []byte, error) {
	//fmt.Println("start parse packet")
	if len(message) < 1 {
		return nil, nil, errors.New("Packet.Parse message too short")
	}

	return parsePacketByType(message)
}

func parsePacketByType(message []byte) (pck ClientPacket, newMessage []byte, err error) {
	switch message[0] {
	case ClientBeginPath:
		return CreateBeginPathPacket(message)
	case ClientAddPointsPath:
		return CreateAddPointsPathPacket(message)
	case ClientEndPath:
		return CreateEndPathPacket(message)
	case ClientDeleteLines:
		return CreateClientDeleteLinesPacket(message)
	case ClientMoveLines:
		return CreateClientMoveLinesPacket(message)
	case ClientSetStrokeSize:
		return CreateClientSetStrokeSizePacket(message)
	case ClientSetStrokeColor:
		return CreateClientSetStrokeColorPacket(message)
	case ClientStartSharingCursor:
		return CreateClientStartSharingCursorPacket(message)
	case ClientUpdateCursorPosition:
		return CreateClientUpdateCursorPositionPacket(message)
	case ClientStopSharingCursor:
		return CreateClientStopSharingCursorPacket(message)
	default:
		err = errors.New("parsePacketByType no packet found")
	}
	return
}

func writeInt32(val int32, array []byte, offset int) {
	b1 := val & 0xFF
	b2 := val >> 8 & 0xFF
	b3 := val >> 16 & 0xFF
	b4 := val >> 24 & 0xFF
	array[offset + 0] = byte(b1)
	array[offset + 1] = byte(b2)
	array[offset + 2] = byte(b3)
	array[offset + 3] = byte(b4)

}

func writePoint(val util.Point, array []byte, offset int) {
	writeInt32(val.X, array, offset + 0)
	writeInt32(val.Y, array, offset + 4)
}

func readInt32(array []byte, offset int) int32{
	b1 := uint32(array[offset + 0])
	b2 := uint32(array[offset + 1])
	b3 := uint32(array[offset + 2])
	b4 := uint32(array[offset + 3])

	total := b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)
	result := int32(total)
	return result
}

func readPoint(array []byte, offset int) util.Point{
	x := readInt32(array, offset)
	y := readInt32(array, offset + 4)
	return util.Point{
		X: x,
		Y: y,
	}
}