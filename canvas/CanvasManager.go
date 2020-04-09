package canvas

import (
	"fmt"
	"github.com/gorilla/websocket"
)

type StartCanvasStructure struct {
	Name string
	Done chan bool
}

type JoinCanvasStructure struct {
	Name   string
	Socket *websocket.Conn
}

type Manager struct {
	runningCanvases map[string]*Canvas

	StartCanvas chan *StartCanvasStructure
	Join        chan *JoinCanvasStructure
}

func CreateManager() *Manager {
	m := &Manager{
		runningCanvases: make(map[string]*Canvas),
		StartCanvas:     make(chan *StartCanvasStructure),
		Join:            make(chan *JoinCanvasStructure),
	}

	go m.run()
	return m
}

func (m *Manager) run() {
	for {
		select {
		case newCanvas := <-m.StartCanvas:
			m.handleStartCanvas(newCanvas)
			continue
		case con := <-m.Join:
			m.handleJoin(con)
			continue
		}
	}
}

func (m *Manager) handleStartCanvas(newCanvas *StartCanvasStructure) {
	fmt.Println("create canvas", newCanvas.Name)
	if _, ok := m.runningCanvases[newCanvas.Name]; !ok {
		m.runningCanvases[newCanvas.Name] = CreateCanvas(newCanvas.Name)
	}
	newCanvas.Done <- true
}

func (m *Manager) handleJoin(con *JoinCanvasStructure) {
	fmt.Println("join canvas", con.Name)
	if canvas, ok := m.runningCanvases[con.Name]; ok {
		canvas.newConnections <- con.Socket
	}
}
