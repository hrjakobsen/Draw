package html

import (
	"fmt"
	"github.com/MikkelKettunen/Draw/Database"
	"github.com/MikkelKettunen/Draw/canvas"
	"github.com/gorilla/mux"
	"net/http"
)

func HandleSaveCanvas(w http.ResponseWriter, r *http.Request) {
	_, _ = w.Write([]byte("saving"))

	canvasManager.ForceSave <- true
}

func HandleNewCanvas(w http.ResponseWriter, r *http.Request) {
	url, err := Database.CreateCanvasURL()
	if err != nil {
		fmt.Println("error creating the canvas", err)
		// we should show an error page or something
		return
	}

	fmt.Println("created new url" + url)
	http.Redirect(w, r, "/c/"+url, 303)
}

func HandleJoinCanvas(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		RedirectToFrontPage(w, r)
		return
	}

	vars := mux.Vars(r)
	name := vars["id"]

	// check that the name exists
	// start it up if it exists and is not running
	exists, id := Database.CanvasGetID(name)
	if exists {
		start := &canvas.StartCanvasStructure{
			Name: name,
			Done: make(chan bool),
			ID: id,
		}
		canvasManager.StartCanvas <- start
		<-start.Done // blocking until we're sure it's created
		RenderTemplate(w, r, "frontpage", nil)
	} else {
		fmt.Println("tried to open invalid url")
		_, _ = w.Write([]byte("Unable to find canvas"))
	}



}
