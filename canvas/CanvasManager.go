package canvas

import (
	"fmt"
	"github.com/MikkelKettunen/Draw/Database"
	"github.com/gorilla/websocket"
)

type StartCanvasStructure struct {
	Name string
	Done chan bool
	ID   int
}

type JoinCanvasStructure struct {
	Name   string
	Socket *websocket.Conn
}

type Manager struct {
	runningCanvases map[string]*Canvas

	StartCanvas chan *StartCanvasStructure
	Join        chan *JoinCanvasStructure

	onCanvasClose chan string
	ForceSave     chan bool
}

func CreateManager() *Manager {
	m := &Manager{
		runningCanvases: make(map[string]*Canvas),
		StartCanvas:     make(chan *StartCanvasStructure),
		Join:            make(chan *JoinCanvasStructure),
		onCanvasClose:   make(chan string),
		ForceSave:       make(chan bool),
	}

	go m.run()
	return m
}

func (m *Manager) run() {
	for {
		select {
		case newCanvas := <-m.StartCanvas:
			m.handleStartCanvas(newCanvas)
			break
		case con := <-m.Join:
			m.handleJoin(con)
			break
		case name := <-m.onCanvasClose:
			delete(m.runningCanvases, name)
			fmt.Println("closing canvas", name)
			break
		case <-m.ForceSave:
			fmt.Println("saving all")
			for _, c := range m.runningCanvases {
				c.forceSave <- true
			}
		}
	}
}

func (m *Manager) handleStartCanvas(newCanvas *StartCanvasStructure) {
	fmt.Println("create canvas", newCanvas.Name)
	if _, ok := m.runningCanvases[newCanvas.Name]; !ok {
		m.runningCanvases[newCanvas.Name] = CreateCanvas(newCanvas.Name, newCanvas.ID, m.onCanvasClose)
	} else {
		fmt.Println("canvas already running")
	}
	newCanvas.Done <- true
}

func (m *Manager) handleJoin(con *JoinCanvasStructure) {
	fmt.Println("join canvas", con.Name)
	if canvas, ok := m.runningCanvases[con.Name]; ok {
		canvas.newConnections <- con.Socket
	} else {
		exists, id := Database.CanvasGetID(con.Name)
		if exists {
			canvas := CreateCanvas(con.Name, id, m.onCanvasClose)
			m.runningCanvases[con.Name] = canvas
			canvas.newConnections <- con.Socket
			fmt.Println("restarting canvas", con.Name)
		} else {
			fmt.Println("canvas join not running", con.Name)
			_ = con.Socket.Close()
		}
	}
}
