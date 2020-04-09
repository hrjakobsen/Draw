package canvas

import (
	"errors"
	"fmt"
	"github.com/MikkelKettunen/Draw/canvas/Packet"
	"github.com/MikkelKettunen/Draw/canvas/util"
	"github.com/gorilla/websocket"
	"strconv"
)

type Canvas struct {
	newConnections       chan *websocket.Conn
	packetReceiveChannel chan *UserPacket
	userIDGenerator      uint8
	connected            []*User
	crashed              chan *User
	name                 string
}

func CreateCanvas(name string) *Canvas {
	root := &Canvas{
		newConnections:       make(chan *websocket.Conn),
		packetReceiveChannel: make(chan *UserPacket),
		userIDGenerator:      0,
		connected:            make([]*User, 0),
		crashed:              make(chan *User),
		name:                 name,
	}

	go func() {
		root.run()
	}()

	return root
}

func (c *Canvas) run() {
	fmt.Println("started run canvas", c.name)

	for {
		select {
		case newCon := <-c.newConnections:
			fmt.Println("new connection")
			newConnection := CreateUser(newCon, c.createUserID(), c.packetReceiveChannel, c)
			c.connected = append(c.connected, newConnection)
			c.onConnected(newConnection)
		case pck := <-c.packetReceiveChannel:
			c.handlePacket(pck)
		case u := <-c.crashed:
			fmt.Println(u.id, " crashed")
			c.handleCrash(u)
		}
	}
}

func (c *Canvas) onConnected(newUser *User) {
	fmt.Println("user", newUser.id, " joined the canvas")
	pck := &Packet.ServerAddUserPacket{UserID: newUser.id}
	for _, user := range c.connected {
		if user.id == newUser.id {
			continue
		}

		oldUserPck := &Packet.ServerAddUserPacket{UserID: user.id}
		newUser.sendPacket(oldUserPck)
		user.sendPacket(pck)
		user.sendLinesTo(newUser)
	}
	fmt.Println("user", newUser.id, " got data the canvas data")
}

func (c *Canvas) createUserID() uint8 {
	id := c.userIDGenerator
	c.userIDGenerator += 1
	return id
}

func (c *Canvas) handlePacket(data *UserPacket) {
	pck := data.pck
	switch pck.GetPacketType() {
	case Packet.ClientBeginPath:
		data.user.beginPath(pck.(*Packet.ClientBeginPathPacket))
	case Packet.ClientEndPath:
		data.user.endPath(pck.(*Packet.ClientEndPathPacket))
	case Packet.ClientAddPointsPath:
		data.user.addPointsPath(pck.(*Packet.ClientAddPointsPathPacket))
	case Packet.ClientDeleteLines:
		c.deleteLines(pck.(*Packet.ClientDeleteLinesPacket), data.user)
	case Packet.ClientMoveLines:
		c.moveLines(pck.(*Packet.ClientMoveLinesPacket), data.user)
	case Packet.ClientSetStrokeSize:
		c.setStrokeSize(pck.(*Packet.ClientSetStrokeSizePacket), data.user)
	case Packet.ClientSetStrokeColor:
		c.setStrokeColor(pck.(*Packet.ClientSetStrokeColorPacket), data.user)
	default:
		fmt.Println("unknown packet received " + strconv.Itoa(int(pck.GetPacketType())))
	}
}

func (c *Canvas) sendPacketToAllExcept(pck Packet.ServerPacket, id uint8) {
	for _, user := range c.connected {
		if user.id == id {
			continue
		}
		user.sendPacket(pck)
	}
}

func (c *Canvas) handleCrash(u *User) {
	u.close()
}

func (c *Canvas) deleteLines(packet *Packet.ClientDeleteLinesPacket, user *User) {
	success := make([]util.Line, 0)
	for _, l := range packet.Lines {
		u, err := c.findUserByUserID(l.UserID)
		if err != nil {
			fmt.Println("deleted lines failed", err)
			continue
		}
		if u.deleteLine(l.LineID) {
			success = append(success, l)
		}
	}

	pck := &Packet.ServerDeleteLinesPacket{
		Lines: make([]util.Line, len(success)),
	}
	for i, l := range success {
		pck.Lines[i].UserID = l.UserID
		pck.Lines[i].LineID = l.LineID
	}
	c.sendPacketToAllExcept(pck, user.id)
}

func (c *Canvas) findUserByUserID(userID uint8) (*User, error) {
	for _, u := range c.connected {
		if u.getID() == userID {
			return u, nil
		}
	}
	return nil, errors.New(fmt.Sprintf("unable to find user with id %d", userID))
}

func (c *Canvas) moveLines(packet *Packet.ClientMoveLinesPacket, user *User) {
	success := make([]util.Line, 0)
	for _, l := range packet.Lines {
		u, err := c.findUserByUserID(l.UserID)
		if err != nil {
			fmt.Println("move lines failed", err)
			continue
		}
		if u.moveLine(l.LineID, packet.Delta) {
			success = append(success, l)
		}
	}
	pck := &Packet.ServerMoveLinesPacket{
		Delta: packet.Delta,
		Lines: make([]util.Line, len(success)),
	}
	for i, l := range success {
		pck.Lines[i].UserID = l.UserID
		pck.Lines[i].LineID = l.LineID
	}
	c.sendPacketToAllExcept(pck, user.id)
}

func (c *Canvas) setStrokeSize(packet *Packet.ClientSetStrokeSizePacket, user *User) {
	u, err := c.findUserByUserID(packet.UserID)
	if err != nil {
		fmt.Println("setStrokeSize ", err)
		return
	}
	u.setStrokeSize(packet.LineID, packet.Size)
	res := &Packet.ServerSetStrokeSizePacket{
		UserID: packet.UserID,
		LineID: packet.LineID,
		Size:   packet.Size,
	}

	u.root.sendPacketToAllExcept(res, user.id)

}

func (c *Canvas) setStrokeColor(packet *Packet.ClientSetStrokeColorPacket, user *User) {
	u, err := c.findUserByUserID(packet.UserID)
	if err != nil {
		fmt.Println("setStrokeColor", err)
		return
	}

	u.setStrokeColor(packet.LineID, packet.Color)

	res := &Packet.ServerSetStrokeColorPacket{
		UserID: packet.UserID,
		LineID: packet.LineID,
		Color:  packet.Color,
	}

	u.root.sendPacketToAllExcept(res, user.id)
}
