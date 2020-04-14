package canvas

import (
	"fmt"
	"github.com/MikkelKettunen/Draw/Database"
	"github.com/MikkelKettunen/Draw/canvas/Packet"
	"github.com/MikkelKettunen/Draw/canvas/util"
	"time"
)

type NullUser struct {
	lineIDGenerator int32

	userID uint8

	lines []*UserLine
}

func (u *NullUser) moveLine(lineID int32, delta util.Point) bool {
	line := u.findLine(lineID)
	if line != nil {
		points := line.points
		for i, p := range points {
			points[i] = p.Add(delta)
		}
	}
	return line != nil
}

func (u *NullUser) setStrokeSize(lineID int32, size uint8) {
	l := u.findLine(lineID)
	if l == nil {
		fmt.Println("setStrokeSize failed", lineID)
		return
	}
	l.strokeWidth = size
	l.haveDatabaseUpdate = true

}

func (u *NullUser) setStrokeColor(lineID int32, color util.Color) {
	l := u.findLine(lineID)
	if l == nil {
		fmt.Println("setStrokeColor failed", lineID)
		return
	}
	l.strokeColor = color
	l.haveDatabaseUpdate = true
}

func (u *NullUser) deleteLine(lineID int32) bool {
	found := false
	for _, l := range u.lines {
		if l.lineID == lineID {
			l.deleted = true
			l.haveDatabaseUpdate = true
			found = true
			break
		}
	}
	if !found {
		fmt.Println("failed to delete line ", lineID, " for user ", u.userID)
	}
	return found
}

func (u *NullUser) id() uint8 {
	return u.userID
}

func (u *NullUser) save(canvasID int) {
	if len(u.lines) > 0 {
		for _, l := range u.lines {
			if l.databaseID != nil && !l.haveDatabaseUpdate {
				continue
			}

			lineUpdate := Database.UpdateLine{
				StrokeColor: l.strokeColor,
				StrokeWidth: l.strokeWidth,
				DatabaseID:  l.databaseID,
				Points:      l.points,
				Deleted:     l.deleted,
			}

			Database.SaveLine(canvasID, &lineUpdate)

			if l.databaseID == nil {
				l.databaseID = lineUpdate.DatabaseID
			}
			l.haveDatabaseUpdate = false

		}

		newLines := make([]*UserLine, 0)
		for _, l := range u.lines {
			if !l.deleted {
				newLines = append(newLines, l)
			}
		}
		u.lines = newLines
	}
}

func (u *NullUser) findLine(lineID int32) *UserLine {
	for _, l := range u.lines {
		if l.lineID == lineID {
			return l
		}
	}
	return nil
}

func (u *NullUser) sendLinesTo(user *User) {
	queue := make([]Packet.ServerPacket, 0)
	fmt.Println("null user sending", len(u.lines))
	for _, l := range u.lines {
		create := &Packet.ServerBeginPathPacket{
			UserID:      u.userID,
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
				UserID: u.userID,
				LineID: l.lineID,
				Path:   p[:255],
			}
			p = p[255:]
			queue = append(queue, update)
		}

		if len(p) > 0 {
			update := &Packet.ServerAddPointsPathPacket{
				UserID: u.userID,
				LineID: l.lineID,
				Path:   p,
			}
			queue = append(queue, update)
		}

		end := &Packet.ServerEndPathPacket{
			UserID:   u.userID,
			LineIDID: l.lineID,
		}

		queue = append(queue, end)
	}

	// now we're not blocking the main thread
	go func() {
		time.Sleep(time.Millisecond * 10)
		for _, pck := range queue {
			user.sendPacket(pck)
			time.Sleep(time.Millisecond)
		}
	}()
}

func (u *NullUser) getNewLineID() int32 {
	u.lineIDGenerator++
	return u.lineIDGenerator
}
