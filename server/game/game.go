package game

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"../db"
	h "../hub"
	"../utils"
	"cloud.google.com/go/firestore"
	"github.com/gorilla/websocket"
)

// CreateGameHandler TODO: document
func CreateGameHandler(client *firestore.Client) utils.Handler {
	return utils.PostRequest(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		id, err := utils.MakeEasyID(4)
		if err != nil {
			log.Panic("Could not make an ID")
		}
		game := db.Game{ID: id, Status: "pending", Players: make(map[string]string)}
		err = db.CreateGame(ctx, client, &game)
		if err != nil {
			fmt.Fprintf(w, "failed to create game %s %s!", r.Method, id)
			return
		}
		fmt.Fprintf(w, "successfully created game %s %s!", r.Method, id)
	})
}

// JoinGameHandler TODO: document
func JoinGameHandler(client *firestore.Client) utils.Handler {
	return utils.PostRequest(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		paramMap, err := url.ParseQuery(r.URL.RawQuery)
		if err != nil {
			log.Panic("Could not parse URL")
		}
		gameID, err := utils.GetQueryValue(&paramMap, "gameID")
		if err != nil {
			fmt.Fprintf(w, "Invalid gameID")
			return
		}
		playerName, err := utils.GetQueryValue(&paramMap, "playerName")
		if err != nil {
			fmt.Fprintf(w, "Invalid playerName")
			return
		}
		playerID, err := utils.GetQueryValue(&paramMap, "playerID")
		if err != nil {
			fmt.Fprintf(w, "Invalid playerID")
			return
		}

		err = db.AddPlayerToGame(ctx, client, gameID, playerID, playerName)
		if err != nil {
			fmt.Fprintf(w, "Failed to add player %s to %s!", playerName, gameID)
			return
		}
		fmt.Fprintf(w, "Successfully added player \"%s\" to %s!", playerName, gameID)
	})
}

// EchoHandler TODO: document
func EchoHandler() utils.Handler {
	return utils.WebSocketRequest(func(r *http.Request, c *websocket.Conn) {
		paramMap, err := url.ParseQuery(r.URL.RawQuery)
		if err != nil {
			log.Println("Could not parse URL")
			return
		}
		gameIDArray, gameIDExists := paramMap["gameID"]
		if !gameIDExists || len(gameIDArray) != 1 {
			c.WriteJSON(map[string]string{"error": "missing gameID field"})
			c.Close()
			return
		}
		playerIDArray, playerIDExists := paramMap["playerID"]
		if !playerIDExists || len(playerIDArray) != 1 {
			c.WriteJSON(map[string]string{"error": "missing playerID field"})
			c.Close()
			return
		}
		gameID := gameIDArray[0]
		playerID := playerIDArray[0]
		log.Printf("Success: gameID %s playerID %s", gameID, playerID)
		for {
			mt, message, err := c.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				break
			}
			log.Printf("recv: %s", message)
			err = c.WriteMessage(mt, message)
			if err != nil {
				log.Println("write:", err)
				break
			}
		}
	})
}

// PlayerHandler todo
func PlayerHandler(client *firestore.Client, hub *h.Hub) utils.Handler {
	return utils.WebSocketRequest(func(r *http.Request, c *websocket.Conn) {
		paramMap, err := url.ParseQuery(r.URL.RawQuery)
		if err != nil {
			log.Println("Could not parse URL")
			return
		}
		gameID, err := utils.GetQueryValue(&paramMap, "gameID")
		if err != nil {
			c.WriteJSON(map[string]string{"error": "missing gameID field"})
			c.Close()
			return
		}
		playerID, err := utils.GetQueryValue(&paramMap, "playerID")
		if err != nil {
			c.WriteJSON(map[string]string{"error": "missing playerID field"})
			c.Close()
			return
		}
		log.Printf("Success: gameID %s playerID %s", gameID, playerID)
		client := h.NewClient(gameID, playerID, hub, c)
		hub.Register <- client
		go func() {
			for {
				var incoming h.IncomingMessage
				err := c.ReadJSON(incoming)
				if err != nil {
					if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
						log.Printf("error: %v", err)
					}
					log.Println("we breakin", err)
					close(client.Cancel)
					return
				}
				client.Incoming <- &incoming
				log.Println("Received: ", incoming)
			}
		}()
		client.Listen()
	})
}
