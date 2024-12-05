package plugins

import (
	"fmt"
	"log"
	"time"

	"github.com/yourorg/dash/agent/internal/keyexchange"
	"github.com/yourorg/dash/agent/internal/sshkeys"
	"github.com/yourorg/dash/agent/internal/web"
)

// SSHKeyPlugin manages SSH key discovery, exchange, and distribution.
type SSHKeyPlugin struct {
	HostURL string
	Agents  []string
	AgentID string
}

// Name returns the name of the plugin.
func (p *SSHKeyPlugin) Name() string {
	return "SSHKeyManagement"
}

// Start initializes the plugin functionality.
func (p *SSHKeyPlugin) Start() {
	web.UpdateStatus("Starting key discovery", "Searching for SSH keys...", 0)
	
	keys, err := sshkeys.DiscoverKeys()
	if err != nil {
		log.Printf("Error discovering SSH keys: %v", err)
		web.UpdateStatus("Error", fmt.Sprintf("Failed to discover keys: %v", err), 0)
		web.UpdateAgentKeyStatus(p.AgentID, "error: key discovery failed")
		return
	}
	
	web.UpdateStatus("Keys discovered", fmt.Sprintf("Found %d SSH keys", len(keys)), 25)
	web.UpdateAgentKeyStatus(p.AgentID, "keys discovered")
	
	// Exchange keys with host
	web.UpdateStatus("Exchanging keys", "Sending keys to host...", 50)
	if err := keyexchange.ExchangeKeys(keys, p.HostURL); err != nil {
		log.Printf("Error exchanging SSH keys: %v", err)
		web.UpdateStatus("Error", fmt.Sprintf("Failed to exchange keys: %v", err), 50)
		web.UpdateAgentKeyStatus(p.AgentID, "error: key exchange failed")
		return
	}
	
	web.UpdateStatus("Keys exchanged", "Successfully exchanged keys with host", 75)
	web.UpdateAgentKeyStatus(p.AgentID, "keys exchanged")
	
	// Distribute keys to other agents
	web.UpdateStatus("Distributing keys", "Sending keys to other agents...", 75)
	for _, agent := range p.Agents {
		if err := keyexchange.DistributeKeys(keys, []string{agent}); err != nil {
			log.Printf("Error distributing SSH keys to agent %s: %v", agent, err)
			web.UpdateAgentKeyStatus(agent, fmt.Sprintf("error: distribution failed - %v", err))
			continue
		}
		web.UpdateAgentKeyStatus(agent, "keys received")
		time.Sleep(time.Second) // Add delay between agents to prevent overwhelming the network
	}
	
	web.UpdateStatus("Complete", "SSH keys successfully exchanged and distributed", 100)
	web.UpdateAgentKeyStatus(p.AgentID, "distribution complete")
}
