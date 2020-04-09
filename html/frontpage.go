package html

import (
	"github.com/MikkelKettunen/Draw/canvas"
	"github.com/gorilla/mux"
	"net/http"
)

func HandleNewCanvas(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/first", 303)
}

func HandleJoinCanvas(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		RedirectToFrontPage(w, r)
		return
	}
	vars := mux.Vars(r)
	name := vars["id"]

	start := &canvas.StartCanvasStructure{
		Name: name,
		Done: make(chan bool),
	}
	canvasManager.StartCanvas <- start
	<-start.Done // blocking until we're sure it's created

	RenderTemplate(w, r, "frontpage", nil)
}
