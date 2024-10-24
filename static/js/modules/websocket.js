// WebSocket connection with retry
export class RetryWebSocket {
    constructor(url, options = {}) {
        if (!url) {
            throw new Error('WebSocket URL is required');
        }

        this.url = url;
        this.options = {
            maxRetries: options.maxRetries || 5,
            retryDelay: options.retryDelay || 1000,
            onopen: options.onopen || (() => {}),
            onmessage: options.onmessage || (() => {}),
            onclose: options.onclose || (() => {}),
            onerror: options.onerror || (() => {})
        };
        this.retryCount = 0;
        this.ws = null;
        this.isClosing = false;
        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = (event) => {
                this.retryCount = 0;
                this.isClosing = false;
                console.debug(`WebSocket connected to ${this.url}`);
                this.options.onopen(event);
            };

            this.ws.onmessage = (event) => {
                try {
                    this.options.onmessage(event);
                } catch (error) {
                    console.error('Error in onmessage handler:', error);
                }
            };

            this.ws.onclose = (event) => {
                try {
                    this.options.onclose(event);
                    if (!this.isClosing) {
                        this.retry();
                    }
                } catch (error) {
                    console.error('Error in onclose handler:', error);
                }
            };

            this.ws.onerror = (error) => {
                try {
                    console.error('WebSocket error:', error);
                    this.options.onerror(error);
                } catch (handlerError) {
                    console.error('Error in onerror handler:', handlerError);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.retry();
        }
    }

    retry() {
        if (this.retryCount < this.options.maxRetries && !this.isClosing) {
            this.retryCount++;
            console.log(`WebSocket retry attempt ${this.retryCount}/${this.options.maxRetries}`);

            const delay = this.options.retryDelay * Math.pow(2, this.retryCount - 1);
            setTimeout(() => {
                if (!this.isClosing) {
                    this.connect();
                }
            }, delay);
        } else if (this.retryCount >= this.options.maxRetries) {
            console.error('Maximum retry attempts reached');
        }
    }

    send(data) {
        if (!this.ws) {
            console.error('WebSocket is not initialized');
            return;
        }

        try {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(data);
            } else {
                console.warn('WebSocket is not open, message not sent');
            }
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
        }
    }

    close() {
        this.isClosing = true;
        if (this.ws) {
            try {
                this.ws.close();
            } catch (error) {
                console.error('Error closing WebSocket:', error);
            }
        }
    }

    get readyState() {
        return this.ws ? this.ws.readyState : WebSocket.CLOSED;
    }

    get connected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
