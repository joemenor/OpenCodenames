package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/RobertDHanna/OpenCodenames/db"
	g "github.com/RobertDHanna/OpenCodenames/game"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

// IncomingMessage represents actions players send to the server.
type IncomingMessage struct {
	Action string
}

// Client represents a player or spectator
type Client struct {
	GameID        string
	PlayerID      string
	SessionID     string
	Hub           *Hub
	Conn          *websocket.Conn
	Incoming      chan *IncomingMessage
	Cancel        chan struct{}
	SpectatorOnly bool
	send          chan *db.Game
}

// NewClient creates a new client
func NewClient(gameID string, playerID string, sessionID string, hub *Hub, conn *websocket.Conn, spectator bool) *Client {
	return &Client{
		GameID:        gameID,
		PlayerID:      playerID,
		SessionID:     sessionID,
		Hub:           hub,
		Conn:          conn,
		Incoming:      make(chan *IncomingMessage),
		Cancel:        make(chan struct{}),
		SpectatorOnly: spectator,
		send:          make(chan *db.Game),
	}
}

func broadcastGame(c *Client, game *db.Game) error {
	c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
	w, err := c.Conn.NextWriter(websocket.TextMessage)
	if err != nil {
		return err
	}
	if c.SpectatorOnly {
		bg, err := g.MapGameToBaseGame(game)
		if err != nil {
			log.Println("Game broadcast error", err)
		}
		game := g.PlayerGame{BaseGame: *bg}
		j, err := json.Marshal(game)
		if err != nil {
			return err
		}
		w.Write(j)
	} else {
		playerName := game.Players[c.PlayerID]
		if game.TeamRedSpy == playerName || game.TeamBlueSpy == playerName {
			sg, err := g.MapGameToSpyGame(game, c.PlayerID)
			if err != nil {
				log.Println("Game broadcast error", err)
			}
			j, err := json.Marshal(sg)
			if err != nil {
				return err
			}
			w.Write(j)
		} else {
			gg, err := g.MapGameToGuesserGame(game, c.PlayerID)
			if err != nil {
				log.Println("Game broadcast error", err)
			}
			j, err := json.Marshal(gg)
			if err != nil {
				return err
			}
			w.Write(j)
		}
	}
	if err := w.Close(); err != nil {
		return err
	}
	return nil
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	ctx := context.Background()
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		var message IncomingMessage
		err := c.Conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			log.Println("dropping connection, client encountered error", err)
			break
		}
		if message.Action == "HeartBeat" {
			if game, ok := c.Hub.games[c.GameID]; ok {
				log.Println("Sending game!", game.ID)
				c.send <- game
			}
			continue
		}
		if c.SpectatorOnly {
			log.Println("only a specator, limited abilities")
			continue
		}
		switch {
		case message.Action == "StartGame":
			log.Println("StartGame Handler")
			game, ok := c.Hub.games[c.GameID]
			if !ok {
				log.Println("Error: could not find client game")
				continue
			}
			g.HandleGameStart(ctx, c.Hub.fireStoreClient, game, c.PlayerID)
		case strings.Contains(message.Action, "Guess"):
			game := c.Hub.games[c.GameID]
			g.HandlePlayerGuess(ctx, c.Hub.fireStoreClient, message.Action, c.PlayerID, game)
		case message.Action == "EndTurn":
			game := c.Hub.games[c.GameID]
			g.HandleEndTurn(ctx, c.Hub.fireStoreClient, game, c.PlayerID)
		case strings.Contains(message.Action, "UpdateTeam"):
			log.Println("UpdateTeam Handler")
			game := c.Hub.games[c.GameID]
			g.HandleUpdateTeams(ctx, c.Hub.fireStoreClient, game, message.Action, c.PlayerID)
		}
		log.Println("Received: ", message)
	}
}

// WritePump does stuff
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case game, ok := <-c.send:
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			err := broadcastGame(c, game)
			if err != nil {
				fmt.Println(err)
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Hub manages clients and connections by game
type Hub struct {
	clients         map[string]map[string]*Client // map of gameID to [map of PlayerID to Client]
	games           map[string]*db.Game           // map of gameID to Game
	watchers        map[string]*GameWatcher
	fireStoreClient *firestore.Client
	gameBroadcast   chan *db.Game
	Register        chan *Client
	Unregister      chan *Client
}

// NewHub creates a new hub
func NewHub(client *firestore.Client) *Hub {
	return &Hub{
		clients:         map[string]map[string]*Client{},
		games:           map[string]*db.Game{},
		watchers:        map[string]*GameWatcher{},
		fireStoreClient: client,
		Register:        make(chan *Client),
		gameBroadcast:   make(chan *db.Game),
		Unregister:      make(chan *Client),
	}
}

func reapClient(client *Client, hub *Hub) {
	if _, ok := hub.clients[client.GameID][client.SessionID]; ok {
		log.Println("removing client from hub")
		close(client.send)
		close(client.Incoming)
		delete(hub.clients[client.GameID], client.SessionID)
		if len(hub.clients[client.GameID]) == 0 {
			log.Println("no more clients, stopping game watcher")
			close(hub.watchers[client.GameID].cancel)
			delete(hub.watchers, client.GameID)
		}
	}
}

// Run starts the hub
func (h *Hub) Run() {
	defer func() {
		close(h.gameBroadcast)
	}()
	ctx := context.Background()
	for {
		select {
		// When a game changes, messages are pushed onto this channel to be broadcasted to
		// all participants
		case game := <-h.gameBroadcast:
			log.Println("broadcasting game change", h.games, h.clients)
			h.games[game.ID] = game
			for _, client := range h.clients[game.ID] {
				select {
				case client.send <- game:
				default:
					log.Println("Closing client to not block")
					reapClient(client, h)
				}
			}
		// When a client wants to join a game they push themselves onto this channel
		case client := <-h.Register:
			log.Println("client registration", client)
			game, err := db.GetGame(ctx, h.fireStoreClient, client.GameID)
			if err != nil {
				log.Println("Could not find game", err)
				client.Conn.WriteJSON(map[string]string{"error": "could not find game"})
				reapClient(client, h)
				continue
			}
			if _, ok := game.Players[client.PlayerID]; !ok && !client.SpectatorOnly {
				log.Println("Player does not belong to game and is not spectator", err)
				client.Conn.WriteJSON(map[string]string{"error": "access denied"})
				reapClient(client, h)
				continue
			}
			if h.clients[game.ID] == nil {
				h.clients[game.ID] = make(map[string]*Client)
			}
			h.clients[game.ID][client.SessionID] = client
			client.send <- game
			// If there is no game watcher set up we need to start one
			if _, ok := h.watchers[game.ID]; !ok {
				h.games[game.ID] = game
				h.watchers[game.ID] = &GameWatcher{game.ID, h.gameBroadcast, make(chan struct{})}
				go h.watchers[game.ID].watch(h.fireStoreClient)
			}
			log.Println("we registered")
		// When a client leaves a game or we decide to close the connection
		case client := <-h.Unregister:
			log.Println("client unregistration", client)
			reapClient(client, h)
		}
	}
}

// GameWatcher listens for changes on a game and sends them to the gameBroadcast channel
type GameWatcher struct {
	gameID        string
	gameBroadcast chan *db.Game
	cancel        chan struct{}
}

func (gw *GameWatcher) watch(client *firestore.Client) {
	log.Println("watching game", gw.gameID)
	ctx := context.Background()
	stop := db.ListenToGame(ctx, client, gw.gameID, func(game *db.Game) {
		gw.gameBroadcast <- game
		log.Println("game update", game)
	})
	for {
		select {
		case <-gw.cancel:
			stop()
			log.Println("cancelling watcher", gw.gameID)
			return
		}
	}
}
