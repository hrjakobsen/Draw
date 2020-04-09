package canvas

import (
	"fmt"
	"github.com/MikkelKettunen/Draw/canvas/Packet"
	"github.com/MikkelKettunen/Draw/canvas/util"
	"github.com/gorilla/websocket"
	"time"
)

type Line struct {
	points      []util.Point
	ownerID     uint8
	lineID      int32
	strokeWidth uint8
	strokeColor util.Color
}

type User struct {
	connection            *websocket.Conn
	packetReceivedChannel chan *UserPacket
	readingSocket         bool
	readingSocketCrashed  bool
	rawWritePacketChannel chan Packet.ServerPacket
	writingSocket         bool
	writeSocketCrashed    bool
	isClosed              bool
	packetQueue           []Packet.ServerPacket

	root *Canvas

	id uint8

	lines []*Line
}

type UserPacket struct {
	user *User
	pck  Packet.ClientPacket
}

func CreateUser(con *websocket.Conn, userID uint8, packetReceivedChannel chan *UserPacket, root *Canvas) *User {
	u := &User{
		connection:            con,
		packetReceivedChannel: packetReceivedChannel,
		readingSocket:         true,
		readingSocketCrashed:  false,

		rawWritePacketChannel: make(chan Packet.ServerPacket, 100),
		writingSocket:         true,
		writeSocketCrashed:    false,
		isClosed:              false,
		packetQueue:           make([]Packet.ServerPacket, 0),

		root: root,

		id: userID,

		lines: make([]*Line, 0),
	}

	go u.readSocket()
	go u.writeSocket()

	// last things to do
	pck := &Packet.ServerSetUserIDPacket{
		UserID: userID,
	}

	u.sendPacket(pck)
	return u
}

func (u *User) sendPacket(packet Packet.ServerPacket) {
	if !u.isClosed && !u.writeSocketCrashed {
		u.rawWritePacketChannel <- packet
	}
}

func (u *User) writeSocket() {
	con := u.connection

	for u.writingSocket {
		message, more := <-u.rawWritePacketChannel

		if !more {
			break
		}

		err := con.WriteMessage(websocket.BinaryMessage, message.ToArray())

		if err != nil {
			u.writeSocketCrashed = true
			u.root.crashed <- u
			break
		}
	}
}

func (u *User) readSocket() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("readSocket panic!", r)
			if !u.readingSocketCrashed {
				u.root.crashed <- u
			}
			u.readingSocketCrashed = true
		}
	}()
	for u.readingSocket {
		_, rawMsg, err := u.connection.ReadMessage()

		if err != nil {
			u.readingSocketCrashed = true
			fmt.Println("reading socket failed", err.Error())
			u.root.crashed <- u
			break
		}

		c := 0
		for c < 10 {
			pck, rawMsg, err := Packet.Parse(rawMsg)
			if err != nil {
				fmt.Println("Packet parse failed", err.Error())
				u.readingSocketCrashed = true
				u.root.crashed <- u
				break
			}

			userPck := &UserPacket{
				user: u,
				pck:  pck,
			}

			u.packetReceivedChannel <- userPck
			if len(rawMsg) == 0 {
				break
			}
			c++
		}

		if c == 10 {
			fmt.Println("possible error too much reading is done from socket")
		}

	}
}

func (u *User) beginPath(packet *Packet.ClientBeginPathPacket) {
	line := u.findLine(packet.Id)
	if line != nil {
		fmt.Println("beginPath on a line already defined")
		return
	}

	line = &Line{
		points:      make([]util.Point, 1),
		ownerID:     u.id,
		lineID:      packet.Id,
		strokeWidth: packet.StrokeWidth,
		strokeColor: packet.StrokeColor,
	}

	line.points[0] = packet.Pos

	u.lines = append(u.lines, line)

	response := &Packet.ServerBeginPathPacket{
		UserID:      u.id,
		LineID:      line.lineID,
		Pos:         packet.Pos,
		StrokeWidth: packet.StrokeWidth,
		StrokeColor: packet.StrokeColor,
	}

	u.root.sendPacketToAllExcept(response, u.id)

	fmt.Println("user: ", u.id, "  began line:", line.lineID)
}

func (u *User) endPath(packet *Packet.ClientEndPathPacket) {
	l := u.findLine(packet.Id)
	if l == nil {
		fmt.Println("endPath failed. user ", u.id, " with line", packet.Id)
		return
	}
	response := &Packet.ServerEndPathPacket{
		UserID:   u.id,
		LineIDID: packet.Id,
	}
	u.root.sendPacketToAllExcept(response, u.id)
}

func (u *User) addPointsPath(packet *Packet.ClientAddPointsPathPacket) {
	line := u.findLine(packet.Id)
	if line == nil {
		fmt.Println("user tried to extend line which did not exists ")
		return
	}

	line.points = append(line.points, packet.Points...)

	response := &Packet.ServerAddPointsPathPacket{
		UserID: u.id,
		LineID: packet.Id,
		Path:   packet.Points,
	}

	u.root.sendPacketToAllExcept(response, u.id)
}

func (u *User) findLine(lineID int32) *Line {
	for _, l := range u.lines {
		if l.lineID == lineID {
			return l
		}
	}
	return nil
}

func (u *User) sendLinesTo(user *User) {
	queue := make([]Packet.ServerPacket, 0)
	for _, l := range u.lines {
		create := &Packet.ServerBeginPathPacket{
			UserID:      u.id,
			LineID:      l.lineID,
			Pos:         l.points[0],
			StrokeWidth: l.strokeWidth,
			StrokeColor: l.strokeColor,
		}

		// user.sendPacket(create)
		queue = append(queue, create)

		// we should split this into several packets
		p := l.points[1:]
		for len(p) > 255 {
			update := &Packet.ServerAddPointsPathPacket{
				UserID: u.id,
				LineID: l.lineID,
				Path:   p[:255],
			}
			user.sendPacket(update)
			p = p[255:]
			queue = append(queue, update)
		}

		if len(p) > 0 {
			update := &Packet.ServerAddPointsPathPacket{
				UserID: u.id,
				LineID: l.lineID,
				Path:   p,
			}
			user.sendPacket(update)
			queue = append(queue, update)
		}

		end := &Packet.ServerEndPathPacket{
			UserID:   u.id,
			LineIDID: l.lineID,
		}

		queue = append(queue, end)
	}

	// now we're not blocking the main thread
	go func() {
		for _, pck := range queue {
			user.sendPacket(pck)
			time.Sleep(time.Millisecond)
		}
	}()
}

func (u *User) close() {
	if u.isClosed {
		return
	}

	u.isClosed = true

	_ = u.connection.Close()
	u.readingSocket = false
	u.writingSocket = false

	close(u.rawWritePacketChannel)
}

func (u *User) getID() uint8 {
	return u.id
}

func (u *User) deleteLine(lineID int32) bool {
	found := false
	for i, l := range u.lines {
		if l.lineID == lineID {
			u.lines = append(u.lines[:i], u.lines[i+1:]...)
			found = true
			break
		}
	}
	if !found {
		fmt.Println("failed to delete line ", lineID, " for user ", u.id)
	}
	return found
}

func (u *User) moveLine(lineID int32, delta util.Point) bool {
	line := u.findLine(lineID)
	if line != nil {
		for i, p := range line.points {
			line.points[i] = p.Add(delta)
		}
	}
	return line != nil
}

func (u *User) setStrokeSize(lineID int32, size uint8) {
	l := u.findLine(lineID)
	if l == nil {
		fmt.Println("setStrokeSize failed", lineID)
		return
	}
	l.strokeWidth = size
}

func (u *User) setStrokeColor(lineID int32, color util.Color) {
	l := u.findLine(lineID)
	if l == nil {
		fmt.Println("setStrokeColor failed", lineID)
		return
	}
	l.strokeColor = color
}
