package html

import (
	"fmt"
	"html/template"
	"net/http"
)

const debug = true

var templates = template.Must(template.ParseGlob("Templates/*"))

func RenderTemplate(w http.ResponseWriter, r *http.Request, tmpl string, data interface{}) {
	w.Header().Set("Content-Type", "text/html")

	if debug {
		templates = template.Must(template.ParseGlob("Templates/*"))
	}

	err := templates.ExecuteTemplate(w, tmpl, data)

	if err != nil {
		//http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Printf("local error %s\n", err.Error())
	}
}

func RedirectToFrontPage(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/", 303)
}
