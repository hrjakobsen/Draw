package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
)

func main() {

	fmt.Println("test")
	connStr := "user=postgres dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		fmt.Println("open error", err)
		return
	}
	rows, err := db.Query("SELECT * FROM canvas")
	fmt.Println(rows, err)
}

/*import (
	"fmt"
	"github.com/MikkelKettunen/Draw/html"
	"github.com/gorilla/mux"
	"net/http"
)

func main() {
	fmt.Println("hello world")

	html.SetupCanvas()

	r := mux.NewRouter()
	r.HandleFunc("/css/frontpage.css", html.HandleCSS)
	r.HandleFunc("/js/frontpage.js", html.HandleJS)
	r.HandleFunc("/ws/{id}", html.HandleCanvasConnection)
	r.HandleFunc("/favicon.ico", html.HandleFavicon)
	r.HandleFunc("/", html.HandleNewCanvas)
	r.HandleFunc("/{id}", html.HandleJoinCanvas)
	//r.HandleFunc("/{id}/{key}", html.HandleJoinCanvasKey)
	//http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("/static/"))))
	http.ListenAndServe(":5011", r)
}*/

