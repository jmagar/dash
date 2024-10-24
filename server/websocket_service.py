import logging
import json
import asyncio
import threading
from typing import Dict, Any, Optional, Set, Callable
from dataclasses import dataclass
from datetime import datetime
from queue import Queue
import weakref
from .utils.logger import LoggerSetup, with_error_handling

logger = LoggerSetup.setup_logger(__name__)

@dataclass
class WebSocketClient:
    """Represents a connected WebSocket client."""
    id: str
    ws: Any
    subscriptions: Set[str]
    last_ping: datetime
    message_queue: Queue

class WebSocketService:
    """Manages WebSocket connections and real-time communication."""

    def __init__(self, ping_interval: int = 30):
        self.clients: Dict[str, WebSocketClient] = {}
        self.event_handlers: Dict[str, Set[Callable]] = {}
        self.ping_interval = ping_interval
        self._client_lock = threading.Lock()
        self._handler_lock = threading.Lock()
        self._start_ping_thread()
        logger.info("WebSocket service initialized")

    def _start_ping_thread(self) -> None:
        """Start background thread for client ping/pong."""
        def ping_worker():
            while True:
                self._check_client_health()
                asyncio.sleep(self.ping_interval)

        thread = threading.Thread(target=ping_worker, daemon=True)
        thread.start()

    def _check_client_health(self) -> None:
        """Check health of connected clients and remove dead ones."""
        current_time = datetime.utcnow()
        with self._client_lock:
            for client_id in list(self.clients.keys()):
                client = self.clients[client_id]
                if (current_time - client.last_ping).seconds > self.ping_interval * 2:
                    logger.warning(f"Client {client_id} timed out")
                    self._remove_client(client_id)

    @with_error_handling(logger=logger, context="register_client")
    def register_client(self, ws: Any) -> str:
        """Register a new WebSocket client."""
        client_id = str(id(ws))
        client = WebSocketClient(
            id=client_id,
            ws=ws,
            subscriptions=set(),
            last_ping=datetime.utcnow(),
            message_queue=Queue()
        )

        with self._client_lock:
            self.clients[client_id] = client
            logger.info(f"Client {client_id} registered")

        # Start message processing thread for this client
        self._start_client_message_thread(client)
        return client_id

    def _start_client_message_thread(self, client: WebSocketClient) -> None:
        """Start a thread to process messages for a client."""
        def message_worker():
            while True:
                try:
                    message = client.message_queue.get()
                    if message is None:  # Shutdown signal
                        break
                    self._send_to_client(client, message)
                except Exception as e:
                    logger.error(f"Error processing message for client {client.id}: {e}")

        thread = threading.Thread(target=message_worker, daemon=True)
        thread.start()

    @with_error_handling(logger=logger, context="unregister_client")
    def unregister_client(self, client_id: str) -> None:
        """Unregister a WebSocket client."""
        with self._client_lock:
            if client_id in self.clients:
                # Send shutdown signal to message thread
                self.clients[client_id].message_queue.put(None)
                self._remove_client(client_id)

    def _remove_client(self, client_id: str) -> None:
        """Remove a client and clean up its resources."""
        if client_id in self.clients:
            client = self.clients[client_id]
            # Remove from all subscriptions
            for event_type in client.subscriptions:
                if event_type in self.event_handlers:
                    self.event_handlers[event_type].discard(client_id)
            del self.clients[client_id]
            logger.info(f"Client {client_id} unregistered")

    @with_error_handling(logger=logger, context="subscribe")
    def subscribe(self, client_id: str, event_type: str) -> None:
        """Subscribe a client to an event type."""
        with self._client_lock, self._handler_lock:
            if client_id in self.clients:
                self.clients[client_id].subscriptions.add(event_type)
                if event_type not in self.event_handlers:
                    self.event_handlers[event_type] = set()
                self.event_handlers[event_type].add(client_id)
                logger.debug(f"Client {client_id} subscribed to {event_type}")

    @with_error_handling(logger=logger, context="unsubscribe")
    def unsubscribe(self, client_id: str, event_type: str) -> None:
        """Unsubscribe a client from an event type."""
        with self._client_lock, self._handler_lock:
            if client_id in self.clients:
                self.clients[client_id].subscriptions.discard(event_type)
                if event_type in self.event_handlers:
                    self.event_handlers[event_type].discard(client_id)
                logger.debug(f"Client {client_id} unsubscribed from {event_type}")

    @with_error_handling(logger=logger, context="broadcast_event")
    def broadcast_event(self, event_type: str, data: Any) -> None:
        """Broadcast an event to all subscribed clients."""
        message = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }

        with self._handler_lock:
            if event_type in self.event_handlers:
                for client_id in self.event_handlers[event_type]:
                    self.send_to_client(client_id, message)

    @with_error_handling(logger=logger, context="send_to_client")
    def send_to_client(self, client_id: str, message: Dict[str, Any]) -> None:
        """Queue a message to be sent to a specific client."""
        with self._client_lock:
            if client_id in self.clients:
                self.clients[client_id].message_queue.put(message)

    def _send_to_client(self, client: WebSocketClient, message: Dict[str, Any]) -> None:
        """Actually send a message to a client."""
        try:
            client.ws.send(json.dumps(message))
            logger.debug(f"Message sent to client {client.id}")
        except Exception as e:
            logger.error(f"Error sending message to client {client.id}: {e}")
            self._remove_client(client.id)

    @with_error_handling(logger=logger, context="handle_client_message")
    def handle_client_message(self, client_id: str, message: str) -> None:
        """Handle a message received from a client."""
        try:
            data = json.loads(message)
            message_type = data.get('type')

            if message_type == 'ping':
                self._handle_ping(client_id)
            elif message_type == 'subscribe':
                self.subscribe(client_id, data.get('event_type'))
            elif message_type == 'unsubscribe':
                self.unsubscribe(client_id, data.get('event_type'))
            else:
                logger.warning(f"Unknown message type from client {client_id}: {message_type}")
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from client {client_id}: {message}")

    def _handle_ping(self, client_id: str) -> None:
        """Handle ping message from client."""
        with self._client_lock:
            if client_id in self.clients:
                self.clients[client_id].last_ping = datetime.utcnow()
                self.send_to_client(client_id, {'type': 'pong'})

    def get_status(self) -> Dict[str, Any]:
        """Get current service status."""
        with self._client_lock, self._handler_lock:
            return {
                'connected_clients': len(self.clients),
                'event_types': list(self.event_handlers.keys()),
                'subscriptions': {
                    event_type: len(clients)
                    for event_type, clients in self.event_handlers.items()
                }
            }
