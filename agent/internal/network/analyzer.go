package network

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
	"github.com/shirou/gopsutil/v3/net"
	"go.uber.org/zap"
)

// ProtocolType represents a network protocol
type ProtocolType string

const (
	ProtocolTCP  ProtocolType = "tcp"
	ProtocolUDP  ProtocolType = "udp"
	ProtocolICMP ProtocolType = "icmp"
	ProtocolDNS  ProtocolType = "dns"
	ProtocolHTTP ProtocolType = "http"
	ProtocolTLS  ProtocolType = "tls"
)

// Flow represents a network flow
type Flow struct {
	Protocol    ProtocolType `json:"protocol"`
	SrcIP       string      `json:"src_ip"`
	DstIP       string      `json:"dst_ip"`
	SrcPort     uint16      `json:"src_port"`
	DstPort     uint16      `json:"dst_port"`
	BytesSent   uint64      `json:"bytes_sent"`
	BytesRecv   uint64      `json:"bytes_recv"`
	PacketsSent uint64      `json:"packets_sent"`
	PacketsRecv uint64      `json:"packets_recv"`
	StartTime   time.Time   `json:"start_time"`
	LastSeen    time.Time   `json:"last_seen"`
	State       string      `json:"state"`
}

// Connection represents a network connection
type Connection struct {
	Protocol    ProtocolType `json:"protocol"`
	LocalAddr   string      `json:"local_addr"`
	RemoteAddr  string      `json:"remote_addr"`
	State       string      `json:"state"`
	Process     string      `json:"process"`
	ProcessID   int32       `json:"process_id"`
	StartTime   time.Time   `json:"start_time"`
	LastSeen    time.Time   `json:"last_seen"`
}

// Analyzer analyzes network traffic
type Analyzer struct {
	logger       *zap.Logger
	handle       *pcap.Handle
	flows        map[string]*Flow
	connections  map[string]*Connection
	mu           sync.RWMutex
	snapLen      int32
	promiscuous  bool
	timeout      time.Duration
	bpfFilter    string
}

// NewAnalyzer creates a new network analyzer
func NewAnalyzer(logger *zap.Logger) *Analyzer {
	return &Analyzer{
		logger:      logger,
		flows:       make(map[string]*Flow),
		connections: make(map[string]*Connection),
		snapLen:     65535,
		promiscuous: true,
		timeout:     pcap.BlockForever,
	}
}

// Start begins network analysis
func (a *Analyzer) Start(ctx context.Context, iface string) error {
	// Open device
	handle, err := pcap.OpenLive(iface, a.snapLen, a.promiscuous, a.timeout)
	if err != nil {
		return fmt.Errorf("failed to open interface: %w", err)
	}
	a.handle = handle

	// Set BPF filter if configured
	if a.bpfFilter != "" {
		if err := handle.SetBPFFilter(a.bpfFilter); err != nil {
			return fmt.Errorf("failed to set BPF filter: %w", err)
		}
	}

	// Start packet processing
	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
	go a.processPackets(ctx, packetSource)

	// Start connection tracking
	go a.trackConnections(ctx)

	return nil
}

// processPackets processes network packets
func (a *Analyzer) processPackets(ctx context.Context, source *gopacket.PacketSource) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			packet, err := source.NextPacket()
			if err != nil {
				a.logger.Error("Failed to read packet",
					zap.Error(err))
				continue
			}

			a.analyzePacket(packet)
		}
	}
}

// analyzePacket analyzes a single packet
func (a *Analyzer) analyzePacket(packet gopacket.Packet) {
	// Get IP layer
	ipLayer := packet.Layer(layers.LayerTypeIPv4)
	if ipLayer == nil {
		return
	}
	ip, _ := ipLayer.(*layers.IPv4)

	// Get transport layer
	var protocol ProtocolType
	var srcPort, dstPort uint16

	tcpLayer := packet.Layer(layers.LayerTypeTCP)
	if tcpLayer != nil {
		protocol = ProtocolTCP
		tcp, _ := tcpLayer.(*layers.TCP)
		srcPort = uint16(tcp.SrcPort)
		dstPort = uint16(tcp.DstPort)
	}

	udpLayer := packet.Layer(layers.LayerTypeUDP)
	if udpLayer != nil {
		protocol = ProtocolUDP
		udp, _ := udpLayer.(*layers.UDP)
		srcPort = uint16(udp.SrcPort)
		dstPort = uint16(udp.DstPort)
	}

	// Create flow key
	flowKey := fmt.Sprintf("%s-%s:%d-%s:%d",
		protocol,
		ip.SrcIP.String(), srcPort,
		ip.DstIP.String(), dstPort)

	// Update flow statistics
	a.mu.Lock()
	flow, ok := a.flows[flowKey]
	if !ok {
		flow = &Flow{
			Protocol:  protocol,
			SrcIP:     ip.SrcIP.String(),
			DstIP:     ip.DstIP.String(),
			SrcPort:   srcPort,
			DstPort:   dstPort,
			StartTime: time.Now(),
		}
		a.flows[flowKey] = flow
	}

	flow.LastSeen = time.Now()
	flow.PacketsSent++
	flow.BytesSent += uint64(len(packet.Data()))

	a.mu.Unlock()
}

// trackConnections tracks network connections
func (a *Analyzer) trackConnections(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			conns, err := net.Connections("inet")
			if err != nil {
				a.logger.Error("Failed to get connections",
					zap.Error(err))
				continue
			}

			a.updateConnections(conns)
		}
	}
}

// updateConnections updates connection tracking
func (a *Analyzer) updateConnections(conns []net.ConnectionStat) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Create new connections map
	newConns := make(map[string]*Connection)

	for _, conn := range conns {
		key := fmt.Sprintf("%s-%s-%s",
			conn.Type,
			conn.Laddr,
			conn.Raddr)

		// Update existing or create new
		c, ok := a.connections[key]
		if !ok {
			c = &Connection{
				Protocol:   ProtocolType(conn.Type),
				LocalAddr:  conn.Laddr.String(),
				RemoteAddr: conn.Raddr.String(),
				State:     conn.Status,
				ProcessID: conn.Pid,
				StartTime: time.Now(),
			}
		}

		c.LastSeen = time.Now()
		c.State = conn.Status

		newConns[key] = c
	}

	// Replace connections map
	a.connections = newConns
}

// GetFlows returns network flows
func (a *Analyzer) GetFlows() []Flow {
	a.mu.RLock()
	defer a.mu.RUnlock()

	flows := make([]Flow, 0, len(a.flows))
	for _, flow := range a.flows {
		flows = append(flows, *flow)
	}
	return flows
}

// GetConnections returns network connections
func (a *Analyzer) GetConnections() []Connection {
	a.mu.RLock()
	defer a.mu.RUnlock()

	conns := make([]Connection, 0, len(a.connections))
	for _, conn := range a.connections {
		conns = append(conns, *conn)
	}
	return conns
}

// SetBPFFilter sets a BPF filter
func (a *Analyzer) SetBPFFilter(filter string) error {
	if a.handle != nil {
		if err := a.handle.SetBPFFilter(filter); err != nil {
			return fmt.Errorf("failed to set BPF filter: %w", err)
		}
	}
	a.bpfFilter = filter
	return nil
}

// Shutdown stops the network analyzer
func (a *Analyzer) Shutdown(ctx context.Context) error {
	if a.handle != nil {
		a.handle.Close()
	}
	return nil
}

// HealthCheck implements the health.Checker interface
func (a *Analyzer) HealthCheck(ctx context.Context) error {
	if a.handle == nil {
		return fmt.Errorf("packet capture not initialized")
	}
	return nil
}
