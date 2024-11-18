package integration

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
)

// MockService provides a test HTTP service
type MockService struct {
	server *httptest.Server
	mu     sync.RWMutex
	calls  map[string]int
}

// NewMockService creates a new mock service
func NewMockService() *MockService {
	m := &MockService{
		calls: make(map[string]int),
	}
	m.server = httptest.NewServer(m.handler())
	return m
}

// URL returns the mock service URL
func (m *MockService) URL() string {
	return m.server.URL
}

// Calls returns the number of calls to a specific endpoint
func (m *MockService) Calls(endpoint string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.calls[endpoint]
}

// Reset resets call counters
func (m *MockService) Reset() {
	m.mu.Lock()
	m.calls = make(map[string]int)
	m.mu.Unlock()
}

// Close shuts down the mock service
func (m *MockService) Close() {
	m.server.Close()
}

// handler creates the HTTP handler
func (m *MockService) handler() http.Handler {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		m.recordCall("/health")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// Echo endpoint
	mux.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		m.recordCall("/echo")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"echo"}`))
	})

	// Error endpoint
	mux.HandleFunc("/error", func(w http.ResponseWriter, r *http.Request) {
		m.recordCall("/error")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"test error"}`))
	})

	return mux
}

// recordCall records an endpoint call
func (m *MockService) recordCall(endpoint string) {
	m.mu.Lock()
	m.calls[endpoint]++
	m.mu.Unlock()
}

// MockDB provides a test database
type MockDB struct {
	mu    sync.RWMutex
	data  map[string]interface{}
	calls map[string]int
}

// NewMockDB creates a new mock database
func NewMockDB() *MockDB {
	return &MockDB{
		data:  make(map[string]interface{}),
		calls: make(map[string]int),
	}
}

// Get retrieves a value
func (m *MockDB) Get(key string) interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()
	m.calls["get"]++
	return m.data[key]
}

// Set stores a value
func (m *MockDB) Set(key string, value interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls["set"]++
	m.data[key] = value
}

// Delete removes a value
func (m *MockDB) Delete(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls["delete"]++
	delete(m.data, key)
}

// Calls returns the number of calls to an operation
func (m *MockDB) Calls(operation string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.calls[operation]
}

// Reset resets the mock database
func (m *MockDB) Reset() {
	m.mu.Lock()
	m.data = make(map[string]interface{})
	m.calls = make(map[string]int)
	m.mu.Unlock()
}

// MockFileSystem provides a test file system
type MockFileSystem struct {
	mu    sync.RWMutex
	files map[string][]byte
	calls map[string]int
}

// NewMockFileSystem creates a new mock file system
func NewMockFileSystem() *MockFileSystem {
	return &MockFileSystem{
		files: make(map[string][]byte),
		calls: make(map[string]int),
	}
}

// ReadFile reads a file
func (m *MockFileSystem) ReadFile(path string) ([]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	m.calls["read"]++
	if data, ok := m.files[path]; ok {
		return data, nil
	}
	return nil, os.ErrNotExist
}

// WriteFile writes a file
func (m *MockFileSystem) WriteFile(path string, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls["write"]++
	m.files[path] = data
	return nil
}

// DeleteFile deletes a file
func (m *MockFileSystem) DeleteFile(path string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls["delete"]++
	delete(m.files, path)
	return nil
}

// Exists checks if a file exists
func (m *MockFileSystem) Exists(path string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	m.calls["exists"]++
	_, ok := m.files[path]
	return ok
}

// Calls returns the number of calls to an operation
func (m *MockFileSystem) Calls(operation string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.calls[operation]
}

// Reset resets the mock file system
func (m *MockFileSystem) Reset() {
	m.mu.Lock()
	m.files = make(map[string][]byte)
	m.calls = make(map[string]int)
	m.mu.Unlock()
}

// TestContext provides a test context with mocks
type TestContext struct {
	Context    context.Context
	Cancel     context.CancelFunc
	Service    *MockService
	DB         *MockDB
	FileSystem *MockFileSystem
}

// NewTestContext creates a new test context
func NewTestContext() *TestContext {
	ctx, cancel := context.WithCancel(context.Background())
	return &TestContext{
		Context:    ctx,
		Cancel:     cancel,
		Service:    NewMockService(),
		DB:         NewMockDB(),
		FileSystem: NewMockFileSystem(),
	}
}

// Close cleans up the test context
func (t *TestContext) Close() {
	t.Cancel()
	t.Service.Close()
}

// Reset resets all mocks
func (t *TestContext) Reset() {
	t.Service.Reset()
	t.DB.Reset()
	t.FileSystem.Reset()
}
