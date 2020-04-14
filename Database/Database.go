package Database

import (
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/MikkelKettunen/Draw/canvas/util"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
	"github.com/speps/go-hashids"
	"math/rand"
)

var db *sql.DB = nil

type UpdateLine struct {
	StrokeColor util.Color
	StrokeWidth uint8
	DatabaseID  *int
	Points      []util.Point
	Deleted     bool
}

func Setup() error {
	connStr := "user=canvasuser password=test dbname=canvasdb sslmode=disable"
	dbCon, err := sql.Open("postgres", connStr)

	if err != nil {
		return err
	}
	db = dbCon

	return err
}

func CreateCanvasURL() (string, error) {
	if db == nil {
		return "", errors.New("CreateCanvas database not setup")
	}

	salt := rand.Uint32()%8000 + 1000 // maybe increase this

	var id int
	err := db.QueryRow(
		`INSERT INTO canvas (salt)
			   VALUES ($1) RETURNING ID`, salt).Scan(&id)

	if err != nil {
		return "", err
	}

	// combine salt and id into a string
	hd := hashids.NewData()
	hd.Salt = "Hello salt"
	hd.MinLength = 3
	h, err := hashids.NewWithData(hd)

	if err != nil {
		return "", err
	}

	url, err := h.Encode([]int{int(salt), id})

	if err != nil {
		return "", err
	}

	_, err = db.Exec(
		`UPDATE canvas
				SET url = $1
				WHERE id = $2`, url, id)

	if err != nil {
		return "", err
	}

	return url, nil
}

func CanvasGetID(name string) (bool, int) {
	if db == nil {
		return false, 0
	}

	id := 0
	err := db.QueryRow(`SELECT id
					FROM canvas
					WHERE url=$1`, name).Scan(&id)

	if err != nil {
		if err != sql.ErrNoRows {
			fmt.Println("Canvas exists error ", err)
			return false, 0
		} else {
			fmt.Println("no canvas found")
			return false, 0
		}
	}

	return true, id
}

func SaveLine(canvasID int, l *UpdateLine) {
	if l.DatabaseID == nil {
		// do not save a deleted line
		if l.Deleted {
			return
		}

		stmt := `
			INSERT INTO drawLine(canvasID, color, width, points)
			VALUES ($1, $2, $3, $4) RETURNING lineID
		`

		var id int
		err := db.QueryRow(
			stmt,
			canvasID,
			l.StrokeColor,
			l.StrokeWidth,
			pq.Array(l.Points)).Scan(&id)

		if err != nil {
			fmt.Println(err)
			return
		}

		l.DatabaseID = &id
	} else if l.Deleted {
		stmt := ` DELETE FROM drawline
				  WHERE canvasID = $1 AND lineID = $2`
		_, err := db.Exec(stmt, canvasID, l.DatabaseID)

		if err != nil {
			fmt.Println("delete line error ", err)
		}
	} else { /* not deleted */
		stmt := `
			UPDATE drawLine
			SET color = $3, width = $4, points = $5
			WHERE canvasID = $1 AND lineID = $2
		`

		_, err := db.Exec(stmt,
			canvasID,
			l.DatabaseID,
			l.StrokeColor,
			l.StrokeWidth,
			pq.Array(l.Points),
		)

		if err != nil {
			fmt.Println("Save line error", err)
		}
	}
}

func LoadCanvasLines(canvasID int) []*UpdateLine {
	empty := make([]*UpdateLine, 0)
	loaded := make([]*UpdateLine, 0)
	if db == nil {
		fmt.Println("LoadCanvasLines db is down")
		return empty
	}

	stmt := `
		SELECT lineID, color, width, points
		FROM drawLine
		WHERE canvasID = $1
	`

	rows, err := db.Query(stmt, canvasID)

	if err != nil {
		fmt.Println("LoadCanvasLines", err)
		return empty
	}

	for rows.Next() {
		var (
			databaseID  int
			strokeColor string
			strokeWidth uint8
			rawPoints   []sql.NullString
		)

		err := rows.Scan(&databaseID, &strokeColor, &strokeWidth, pq.Array(&rawPoints))
		if err != nil {
			fmt.Println("load canvas error", err)
			return empty
		}

		points := make([]util.Point, len(rawPoints))
		for i, p := range rawPoints {
			_, err = fmt.Sscanf(p.String, "(%d,%d)", &points[i].X, &points[i].Y)
			if err != nil {
				fmt.Println("LoadCanvasLine error", err)
				return empty
			}
		}

		rStr := strokeColor[0:2]
		gStr := strokeColor[2:4]
		bStr := strokeColor[4:6]

		r, _ := hex.DecodeString(rStr)
		g, _ := hex.DecodeString(gStr)
		b, _ := hex.DecodeString(bStr)

		l := &UpdateLine{
			DatabaseID: &databaseID,
			StrokeColor: util.Color{
				R: r[0],
				G: g[0],
				B: b[0],
			},
			StrokeWidth: strokeWidth,
			Points:      points,
		}

		loaded = append(loaded, l)
	}

	return loaded
}
