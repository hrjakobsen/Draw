package html

import (
	"fmt"
	"github.com/MikkelKettunen/Draw/canvas"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"net/http"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

//var canvasQueue chan *websocket.Conn

var canvasManager *canvas.Manager

func SetupCanvas() {
	//canvasQueue = canvas.CreateCanvas()
	canvasManager = canvas.CreateManager()
}

func HandleCanvasConnection(w http.ResponseWriter, r *http.Request) {
	fmt.Println("canvas request")
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("upgrade failed:", err)
		return
	}

	id := mux.Vars(r)["id"]
	join := canvas.JoinCanvasStructure{
		Name:   id,
		Socket: c,
	}
	canvasManager.Join <- &join

//	canvasQueue <- c
}
