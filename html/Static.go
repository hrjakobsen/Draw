package html

import (
	"fmt"
	"net/http"
)

func HandleJS(w http.ResponseWriter, r *http.Request) {
	fmt.Println("js")
	w.Header().Set("Content-Type", "application/javascript")
	http.ServeFile(w, r, "./js/frontpage.js")
}

func HandleCSS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/css")
	http.ServeFile(w, r, "./css/frontpage.css")
}

func HandleFavicon(w http.ResponseWriter, r *http.Request) {

}