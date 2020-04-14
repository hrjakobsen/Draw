package main

import (
	"fmt"
	"github.com/MikkelKettunen/Draw/Database"
	"github.com/MikkelKettunen/Draw/html"
	"github.com/gorilla/mux"
	"net/http"
)

func main() {
	fmt.Println("hello world")

	html.SetupCanvas()
	if err := Database.Setup(); err != nil {
		fmt.Println("database error", err)
		return
	}

	r := mux.NewRouter()
	r.HandleFunc("/css/frontpage.css", html.HandleCSS)
	r.HandleFunc("/js/frontpage.js", html.HandleJS)
	r.HandleFunc("/ws/{id}", html.HandleCanvasConnection)
	r.HandleFunc("/favicon.ico", html.HandleFavicon)
	r.HandleFunc("/", html.HandleNewCanvas)
	r.HandleFunc("/c/{id}", html.HandleJoinCanvas)
	r.HandleFunc("/s/", html.HandleSaveCanvas)
	//r.HandleFunc("/{id}/{key}", html.HandleJoinCanvasKey)
	//http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("/static/"))))
	http.ListenAndServe(":5011", r)
}
