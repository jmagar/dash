package keyexchange

import (
	"bytes"
	"io/ioutil"
	"net/http"
)

// ExchangeKeys sends the SSH keys to the host.
func ExchangeKeys(keys []string, hostURL string) error {
	for _, key := range keys {
		keyData, err := ioutil.ReadFile(key)
		if err != nil {
			return err
		}

		_, err = http.Post(hostURL+"/api/keys", "text/plain", bytes.NewBuffer(keyData))
		if err != nil {
			return err
		}
	}
	return nil
}

// DistributeKeys sends the keys to all agents.
func DistributeKeys(keys []string, agents []string) error {
	for _, agent := range agents {
		for _, key := range keys {
			// Send the key to the agent's endpoint
			_, err := http.Post(agent+"/api/keys", "text/plain", bytes.NewBuffer([]byte(key)))
			if err != nil {
				return err
			}
		}
	}
	return nil
}
