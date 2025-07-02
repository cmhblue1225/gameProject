class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.playerId = null;
        this.serverLatency = 0;
        
        this.eventHandlers = new Map();
        this.messageQueue = [];
        this.isProcessingQueue = false;
        
        this.connectionTimeout = 10000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        
        this.lastPingTime = 0;
        this.pingInterval = 5000;
        
        this.networkStats = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesTransferred: 0,
            packetsLost: 0
        };
    }
    
    connect(serverUrl, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(serverUrl, {
                    timeout: this.connectionTimeout,
                    ...options
                });
                
                this.setupSocketEvents();
                
                const connectionTimer = setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, this.connectionTimeout);
                
                this.socket.on('connect', () => {
                    clearTimeout(connectionTimer);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log('Connected to server');
                    this.startPingMonitoring();
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    clearTimeout(connectionTimer);
                    console.error('Connection error:', error);
                    reject(error);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    setupSocketEvents() {
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.log('Disconnected from server:', reason);
            
            if (reason === 'io server disconnect') {
                this.handleServerDisconnect();
            } else {
                this.attemptReconnect();
            }
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log(`Reconnected after ${attemptNumber} attempts`);
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('Reconnection failed:', error);
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('Failed to reconnect after maximum attempts');
            this.handleConnectionFailed();
        });
        
        this.socket.on('pong', (data) => {
            this.serverLatency = Date.now() - data.timestamp;
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
        
        this.socket.onAny((eventName, ...args) => {
            this.networkStats.messagesReceived++;
            this.processMessage(eventName, args);
        });
    }
    
    processMessage(eventName, args) {
        this.messageQueue.push({ eventName, args, timestamp: Date.now() });
        
        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
    }
    
    async processMessageQueue() {
        this.isProcessingQueue = true;
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            const handlers = this.eventHandlers.get(message.eventName);
            
            if (handlers) {
                for (const handler of handlers) {
                    try {
                        await handler(...message.args);
                    } catch (error) {
                        console.error(`Error in handler for ${message.eventName}:`, error);
                    }
                }
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, new Set());
        }
        
        this.eventHandlers.get(eventName).add(handler);
    }
    
    off(eventName, handler) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(eventName);
            }
        }
    }
    
    emit(eventName, data) {
        if (!this.isConnected || !this.socket) {
            console.warn(`Cannot emit ${eventName}: not connected`);
            return false;
        }
        
        try {
            this.socket.emit(eventName, data);
            this.networkStats.messagesSent++;
            
            if (data) {
                this.networkStats.bytesTransferred += JSON.stringify(data).length;
            }
            
            return true;
        } catch (error) {
            console.error(`Error emitting ${eventName}:`, error);
            return false;
        }
    }
    
    emitReliable(eventName, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.socket) {
                reject(new Error('Not connected'));
                return;
            }
            
            const messageId = this.generateMessageId();
            const timeoutId = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, timeout);
            
            const responseHandler = (response) => {
                if (response.messageId === messageId) {
                    clearTimeout(timeoutId);
                    this.off(`${eventName}_response`, responseHandler);
                    resolve(response.data);
                }
            };
            
            this.on(`${eventName}_response`, responseHandler);
            
            this.socket.emit(eventName, {
                ...data,
                messageId: messageId,
                timestamp: Date.now()
            });
        });
    }
    
    startPingMonitoring() {
        setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping', { timestamp: Date.now() });
            }
        }, this.pingInterval);
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Maximum reconnect attempts reached');
            this.handleConnectionFailed();
            return;
        }
        
        this.reconnectAttempts++;
        
        setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.socket.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
    }
    
    handleServerDisconnect() {
        console.log('Server intentionally disconnected the client');
    }
    
    handleConnectionFailed() {
        console.error('Connection failed permanently');
        
        if (this.eventHandlers.has('connectionFailed')) {
            const handlers = this.eventHandlers.get('connectionFailed');
            for (const handler of handlers) {
                handler();
            }
        }
    }
    
    sendPlayerUpdate(playerData) {
        if (!this.isConnected) return;
        
        const optimizedData = this.optimizePlayerData(playerData);
        this.emit('playerMove', optimizedData);
    }
    
    optimizePlayerData(playerData) {
        return {
            position: {
                x: Math.round(playerData.position.x * 100) / 100,
                y: Math.round(playerData.position.y * 100) / 100,
                z: Math.round(playerData.position.z * 100) / 100
            },
            rotation: {
                x: Math.round(playerData.rotation.x * 1000) / 1000,
                y: Math.round(playerData.rotation.y * 1000) / 1000,
                z: Math.round(playerData.rotation.z * 1000) / 1000
            },
            timestamp: Date.now()
        };
    }
    
    sendShootEvent(shootData) {
        const optimizedData = {
            position: {
                x: Math.round(shootData.position.x * 100) / 100,
                y: Math.round(shootData.position.y * 100) / 100,
                z: Math.round(shootData.position.z * 100) / 100
            },
            direction: {
                x: Math.round(shootData.direction.x * 1000) / 1000,
                y: Math.round(shootData.direction.y * 1000) / 1000,
                z: Math.round(shootData.direction.z * 1000) / 1000
            },
            weapon: shootData.weapon,
            timestamp: Date.now()
        };
        
        this.emit('playerShoot', optimizedData);
    }
    
    sendHitEvent(hitData) {
        this.emit('hitEnemy', {
            enemyId: hitData.enemyId,
            damage: hitData.damage,
            hitPosition: hitData.hitPosition,
            timestamp: Date.now()
        });
    }
    
    generateMessageId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    getLatency() {
        return this.serverLatency;
    }
    
    getNetworkStats() {
        return { ...this.networkStats };
    }
    
    isConnectionHealthy() {
        return this.isConnected && this.serverLatency < 200;
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
            this.socket = null;
        }
    }
    
    setPlayerId(id) {
        this.playerId = id;
    }
    
    getPlayerId() {
        return this.playerId;
    }
    
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            latency: this.serverLatency,
            reconnectAttempts: this.reconnectAttempts,
            stats: this.networkStats
        };
    }
    
    enableDebugMode() {
        this.socket.onAny((eventName, ...args) => {
            console.log(`Received: ${eventName}`, args);
        });
        
        const originalEmit = this.socket.emit.bind(this.socket);
        this.socket.emit = (eventName, ...args) => {
            console.log(`Sending: ${eventName}`, args);
            return originalEmit(eventName, ...args);
        };
    }
    
    dispose() {
        this.disconnect();
        this.eventHandlers.clear();
        this.messageQueue = [];
    }
}

export default NetworkManager;