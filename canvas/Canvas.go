package canvas

import (
	"errors"
	"fmt"
	"github.com/MikkelKettunen/Draw/Database"
	"github.com/MikkelKettunen/Draw/canvas/Packet"
	"github.com/MikkelKettunen/Draw/canvas/util"
	"github.com/gorilla/websocket"
	"strconv"
	"time"
)

type Canvas struct {
	newConnections       chan *websocket.Conn
	packetReceiveChannel chan *UserPacket
	connected            []*User
	crashed              chan *User

	nullUser *NullUser

	// url name
	name string

	// database userID
	id int

	// countdown to when we should remove a canvas
	haveUsers       bool
	closeCanvasChan chan string
	isRunning       bool

	// query
	forceSave       chan bool
}

func CreateCanvas(name string, id int, closeCanvasChan chan string) *Canvas {
	loadedLines := Database.LoadCanvasLines(id)
	lines := make([]*UserLine, len(loadedLines))
	for i, l := range loadedLines {
		lines[i] = &UserLine{
			points:             l.Points,
			ownerID:            0,
			lineID:             int32(i),
			strokeWidth:        l.StrokeWidth,
			strokeColor:        l.StrokeColor,
			databaseID:         l.DatabaseID,
			haveDatabaseUpdate: false,
			deleted:            false,
		}
	}

	root := &Canvas{
		newConnections:       make(chan *websocket.Conn),
		packetReceiveChannel: make(chan *UserPacket),
		connected:            make([]*User, 0),
		crashed:              make(chan *User),
		name:                 name,
		id:                   id,
		haveUsers:            true,
		closeCanvasChan:      closeCanvasChan,
		isRunning:            true,
		nullUser: &NullUser{
			userID:          0,
			lines:           lines,
			lineIDGenerator: int32(len(lines) + 1),
		},
		forceSave: make(chan bool),
	}

	go func() {
		root.run()
	}()

	return root
}

func (c *Canvas) run() {
	fmt.Println("started run canvas", c.name)

	saveTimer := time.NewTicker(time.Minute * 10)

	for c.isRunning {
		select {
		case newCon := <-c.newConnections:
			fmt.Println("new connection")
			id, err := c.createUserID()
			if err != nil {
				fmt.Println("server is full")
				return
			}
			newConnection := CreateUser(newCon, id, c.packetReceiveChannel, c)
			c.connected = append(c.connected, newConnection)
			c.onConnected(newConnection)
		case pck := <-c.packetReceiveChannel:
			c.handlePacket(pck)
		case u := <-c.crashed:
			fmt.Println(u.userID, " crashed")
			c.handleCrash(u)
		case <-saveTimer.C:
			c.save()
		case <-c.forceSave:
			fmt.Println("force saving: ", c.name, " with users: ", len(c.connected))
			c.save()
		}
	}
}

func (c *Canvas) onConnected(newUser *User) {
	fmt.Println("user", newUser.userID, " joined the canvas")
	pck := &Packet.ServerAddUserPacket{UserID: newUser.userID}

	oldUserPck := &Packet.ServerAddUserPacket{UserID: c.nullUser.id()}
	c.nullUser.sendLinesTo(newUser)
	newUser.sendPacket(oldUserPck)

	for _, user := range c.connected {
		if user.id() == newUser.id() {
			continue
		}

		oldUserPck := &Packet.ServerAddUserPacket{UserID: user.id()}
		newUser.sendPacket(oldUserPck)
		user.sendPacket(pck)
		user.sendInformationTo(newUser)
	}
	fmt.Println("user", newUser.userID, " got data the canvas data")
}

func (c *Canvas) createUserID() (uint8, error) {
	for i := 0; i < 255; i++ {
		u, _ := c.findUserByUserID(uint8(i))
		if u == nil {
			return uint8(i), nil
		}
	}
	return 1, nil
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
	case Packet.ClientStartSharingCursor:
		c.startSharingCursor(pck.(*Packet.ClientStartSharingCursorPacket), data.user)
	case Packet.ClientUpdateCursorPosition:
		c.updateCursorPosition(pck.(*Packet.ClientUpdateCursorPositionPacket), data.user)
	case Packet.ClientStopSharingCursor:
		c.stopSharingCursor(pck.(*Packet.ClientStopSharingCursorPacket), data.user)
	default:
		fmt.Println("unknown packet received " + strconv.Itoa(int(pck.GetPacketType())))
	}
}

func (c *Canvas) sendPacketToAllExcept(pck Packet.ServerPacket, id uint8) {
	for _, user := range c.connected {
		if user.userID == id {
			continue
		}
		user.sendPacket(pck)
	}
}

func (c *Canvas) handleCrash(u *User) {
	u.close()

	pck := &Packet.ServerRemovedUserPacket{
		UserID: u.id(),
		Lines:  make([]Packet.ServerUpdateLineID, len(u.lines)),
	}

	lines := u.lines
	for i, line := range lines {
		newLineID := c.nullUser.getNewLineID()
		pck.Lines[i].OldLineID = line.lineID
		pck.Lines[i].NewLineID = newLineID
		lines[i].lineID = newLineID
		lines[i].ownerID = c.nullUser.id()
	}
	c.sendPacketToAllExcept(pck, u.id())

	// we now have more lines
	c.nullUser.lines = append(c.nullUser.lines, lines...)

	connected := make([]*User, 0)
	for _, user := range c.connected {
		if user.id() != u.id() {
			connected = append(connected, user)
		}
	}
	c.connected = connected
	fmt.Println("connected", len(connected))
}

func (c *Canvas) deleteLines(packet *Packet.ClientDeleteLinesPacket, user Userlike) {
	success := make([]util.PacketLine, 0)
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
		Lines: make([]util.PacketLine, len(success)),
	}
	for i, l := range success {
		pck.Lines[i].UserID = l.UserID
		pck.Lines[i].LineID = l.LineID
	}
	c.sendPacketToAllExcept(pck, user.id())
}

func (c *Canvas) findUserByUserID(userID uint8) (Userlike, error) {
	if userID == 0 {
		return c.nullUser, nil
	}
	for _, u := range c.connected {
		if u.getID() == userID {
			return u, nil
		}
	}
	return nil, errors.New(fmt.Sprintf("unable to find user with userID %d", userID))
}

func (c *Canvas) moveLines(packet *Packet.ClientMoveLinesPacket, user *User) {
	success := make([]util.PacketLine, 0)
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
		Lines: make([]util.PacketLine, len(success)),
	}
	for i, l := range success {
		pck.Lines[i].UserID = l.UserID
		pck.Lines[i].LineID = l.LineID
	}
	c.sendPacketToAllExcept(pck, user.userID)
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

	c.sendPacketToAllExcept(res, user.userID)
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

	c.sendPacketToAllExcept(res, user.userID)
}

func (c *Canvas) save() {
	fmt.Println("saving canvas")
	for _, u := range c.getAllUsers() {
		u.save(c.id)
	}
	if len(c.connected) > 0 {
		c.haveUsers = true
	} else if c.haveUsers {
		c.haveUsers = false
	} else {
		c.closeCanvasChan <- c.name
		c.isRunning = false
	}
}

func (c *Canvas) getAllUsers() []Userlike {
	u := []Userlike{c.nullUser}
	for _, user := range c.connected {
		u = append(u, user)
	}
	return u
}

func (c *Canvas) startSharingCursor(packet *Packet.ClientStartSharingCursorPacket, user *User) {
	user.sharingCursor(true)
	user.cursorPosition(packet.Point)
	pck := &Packet.ServerStartSharingCursorPacket{
		UserID:   user.userID,
		Position: packet.Point,
	}
	c.sendPacketToAllExcept(pck, user.userID)
}

func (c *Canvas) updateCursorPosition(packet *Packet.ClientUpdateCursorPositionPacket, user *User) {
	user.cursorPosition(packet.Point)
	pck := &Packet.ServerUpdateCursorPositionPacket{
		UserID:   user.userID,
		Position: packet.Point,
	}
	c.sendPacketToAllExcept(pck, user.userID)
}

func (c *Canvas) stopSharingCursor(packet *Packet.ClientStopSharingCursorPacket, user *User) {
	user.sharingCursor(false)
	pck := &Packet.ServerStopSharingCursorPacket{
		UserID: user.userID,
	}
	c.sendPacketToAllExcept(pck, user.userID)
}
