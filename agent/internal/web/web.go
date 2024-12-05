package web

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/mux"
)

// KeyDistributionStatus represents the current status of key distribution
type KeyDistributionStatus struct {
	Status    string            `json:"status"`
	Details   string            `json:"details"`
	Progress  int               `json:"progress"`
	AgentKeys map[string]string `json:"agent_keys"` // Map of agent IDs to their key status
}

var (
	currentStatus = KeyDistributionStatus{
		Status:    "Not started",
		Details:   "",
		Progress:  0,
		AgentKeys: make(map[string]string),
	}
	statusMutex sync.RWMutex
)

// UpdateStatus updates the current key distribution status
func UpdateStatus(status string, details string, progress int) {
	statusMutex.Lock()
	defer statusMutex.Unlock()
	
	currentStatus.Status = status
	currentStatus.Details = details
	currentStatus.Progress = progress
}

// UpdateAgentKeyStatus updates the key status for a specific agent
func UpdateAgentKeyStatus(agentID, status string) {
	statusMutex.Lock()
	defer statusMutex.Unlock()
	
	currentStatus.AgentKeys[agentID] = status
}

// StatusHandler returns the current status of SSH key distribution
func StatusHandler(w http.ResponseWriter, r *http.Request) {
	statusMutex.RLock()
	defer statusMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(currentStatus)
}

// StatusPageHandler serves the status page template
func StatusPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "internal/web/templates/status.html")
}

// SetupRoutes sets up the web routes for key distribution status
func SetupRoutes(r *mux.Router) {
	r.HandleFunc("/api/keys/status", StatusHandler).Methods("GET")
	r.HandleFunc("/status", StatusPageHandler).Methods("GET")
}
