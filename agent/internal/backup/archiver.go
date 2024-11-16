package backup

import (
	"archive/tar"
	"compress/gzip"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"go.uber.org/zap"
)

// Archiver handles file archiving
type Archiver struct {
	logger     *zap.Logger
	file       *os.File
	gzipWriter *gzip.Writer
	tarWriter  *tar.Writer
	encrypt    bool
	key        []byte
}

// NewArchiver creates a new archiver
func NewArchiver(logger *zap.Logger) *Archiver {
	return &Archiver{
		logger: logger,
	}
}

// Create creates a new archive
func (a *Archiver) Create(path string) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create archive: %w", err)
	}
	a.file = file

	// Set up compression
	a.gzipWriter = gzip.NewWriter(file)
	a.tarWriter = tar.NewWriter(a.gzipWriter)

	return nil
}

// SetEncryption enables encryption
func (a *Archiver) SetEncryption(key []byte) {
	a.encrypt = true
	a.key = key
}

// AddFile adds a file to the archive
func (a *Archiver) AddFile(path, name string) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	header, err := tar.FileInfoHeader(info, "")
	if err != nil {
		return fmt.Errorf("failed to create header: %w", err)
	}
	header.Name = name

	if err := a.tarWriter.WriteHeader(header); err != nil {
		return fmt.Errorf("failed to write header: %w", err)
	}

	if a.encrypt {
		if err := a.copyEncrypted(file, a.tarWriter); err != nil {
			return fmt.Errorf("failed to encrypt file: %w", err)
		}
	} else {
		if _, err := io.Copy(a.tarWriter, file); err != nil {
			return fmt.Errorf("failed to write file: %w", err)
		}
	}

	return nil
}

// AddDirectory adds a directory to the archive
func (a *Archiver) AddDirectory(path string) error {
	return filepath.Walk(path, func(file string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		header, err := tar.FileInfoHeader(fi, "")
		if err != nil {
			return fmt.Errorf("failed to create header: %w", err)
		}

		header.Name = filepath.Join(filepath.Base(path), file[len(path):])

		if err := a.tarWriter.WriteHeader(header); err != nil {
			return fmt.Errorf("failed to write header: %w", err)
		}

		if !fi.IsDir() {
			data, err := os.Open(file)
			if err != nil {
				return err
			}
			defer data.Close()

			if a.encrypt {
				if err := a.copyEncrypted(data, a.tarWriter); err != nil {
					return fmt.Errorf("failed to encrypt file: %w", err)
				}
			} else {
				if _, err := io.Copy(a.tarWriter, data); err != nil {
					return fmt.Errorf("failed to write file: %w", err)
				}
			}
		}
		return nil
	})
}

// Close closes the archive
func (a *Archiver) Close() error {
	var err error
	if a.tarWriter != nil {
		err = a.tarWriter.Close()
	}
	if a.gzipWriter != nil {
		if err2 := a.gzipWriter.Close(); err == nil {
			err = err2
		}
	}
	if a.file != nil {
		if err2 := a.file.Close(); err == nil {
			err = err2
		}
	}
	return err
}

// copyEncrypted copies data with encryption
func (a *Archiver) copyEncrypted(src io.Reader, dst io.Writer) error {
	block, err := aes.NewCipher(a.key)
	if err != nil {
		return err
	}

	// Generate random IV
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return err
	}

	// Write IV to output
	if _, err := dst.Write(iv); err != nil {
		return err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	writer := &cipher.StreamWriter{S: stream, W: dst}

	if _, err := io.Copy(writer, src); err != nil {
		return err
	}

	return nil
}

// Extract extracts an archive
func (a *Archiver) Extract(src, dst string) error {
	file, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open archive: %w", err)
	}
	defer file.Close()

	gzipReader, err := gzip.NewReader(file)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar: %w", err)
		}

		target := filepath.Join(dst, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
		case tar.TypeReg:
			outFile, err := os.Create(target)
			if err != nil {
				return fmt.Errorf("failed to create file: %w", err)
			}
			defer outFile.Close()

			if err := os.Chmod(target, os.FileMode(header.Mode)); err != nil {
				return fmt.Errorf("failed to chmod file: %w", err)
			}

			if a.encrypt {
				if err := a.copyDecrypted(tarReader, outFile); err != nil {
					return fmt.Errorf("failed to decrypt file: %w", err)
				}
			} else {
				if _, err := io.Copy(outFile, tarReader); err != nil {
					return fmt.Errorf("failed to write file: %w", err)
				}
			}
		}
	}

	return nil
}

// copyDecrypted copies data with decryption
func (a *Archiver) copyDecrypted(src io.Reader, dst io.Writer) error {
	block, err := aes.NewCipher(a.key)
	if err != nil {
		return err
	}

	// Read IV from input
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(src, iv); err != nil {
		return err
	}

	stream := cipher.NewCFBDecrypter(block, iv)
	reader := &cipher.StreamReader{S: stream, R: src}

	if _, err := io.Copy(dst, reader); err != nil {
		return err
	}

	return nil
}
