package sshkeys

import (
	"io/ioutil"
	"os"
	"path/filepath"
)

// DiscoverKeys finds SSH keys in the user's .ssh directory.
func DiscoverKeys() ([]string, error) {
	var keys []string
	sshDir := filepath.Join(os.Getenv("HOME"), ".ssh")

	files, err := ioutil.ReadDir(sshDir)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		if file.Mode().Perm() == 0400 || file.Mode().Perm() == 0600 {
			keys = append(keys, filepath.Join(sshDir, file.Name()))
		}
	}
	return keys, nil
}
