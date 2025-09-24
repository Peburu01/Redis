/**
 * Redis CRUD Manager Pro - Optimized Backend API
 * Universal connection support for Local, Railway, and Cloud Redis
 */

const express = require('express');
const redis = require('redis');
const path = require('path');
const { URL } = require('url');

class UniversalRedisManager {
    constructor() {
        this.app = express();
        this.client = null;
        this.currentDatabase = 0;
        this.monitoringInterval = null;
        this.realtimeStats = { opsPerSec: 0, lastOperations: 0, lastUpdate: Date.now() };
        this.connectionConfig = null;
        this.performanceHistory = [];
        this.maxHistoryPoints = 100;
        
        this.initializeApp();
    }

    initializeApp() {
        // Middleware
        this.app.use(express.json());
        this.app.use(express.static('.'));
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            req.method === 'OPTIONS' ? res.sendStatus(200) : next();
        });

        // Routes
        this.app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
        
        // Connection routes
        this.app.post('/api/connect', this.handleConnect.bind(this));
        this.app.post('/api/disconnect', this.handleDisconnect.bind(this));
        this.app.post('/api/test-connection', this.handleTestConnection.bind(this));
        this.app.get('/api/ping', this.handlePing.bind(this));

        // Database management
        this.app.post('/api/switch-database', this.handleSwitchDatabase.bind(this));
        this.app.get('/api/databases-info', this.handleDatabasesInfo.bind(this));
        this.app.delete('/api/flush-database', this.handleFlushDatabase.bind(this));
        this.app.delete('/api/flush-all-databases', this.handleFlushAllDatabases.bind(this));

        // Data operations
        this.app.get('/api/all', this.handleGetAll.bind(this));
        this.app.post('/api/set', this.handleSet.bind(this));
        this.app.delete('/api/delete/:key', this.handleDelete.bind(this));

        // Performance monitoring
        this.app.get('/api/performance', this.handlePerformance.bind(this));
        this.app.get('/api/latency-test', this.handleLatencyTest.bind(this));
        this.app.get('/api/connection-presets', this.handleConnectionPresets.bind(this));
    }

    parseConnectionConfig(connectionData) {
        const { connectionString, connectionType, host, port, password, database } = connectionData;

        if (connectionString && connectionString.trim()) {
            try {
                const url = new URL(connectionString);
                const config = {
                    socket: {
                        host: url.hostname,
                        port: parseInt(url.port) || 6379,
                        tls: url.protocol === 'rediss:' ? {} : undefined,
                        rejectUnauthorized: false
                    },
                    database: parseInt(url.pathname.substring(1)) || database || 0
                };

                if (url.password) config.password = url.password;
                else if (url.username && url.username !== 'default') config.username = url.username;

                // Railway/Cloud optimizations
                if (connectionType === 'railway' || url.hostname.includes('rlwy.net')) {
                    Object.assign(config.socket, { 
                        connectTimeout: 10000, lazyConnect: true, keepAlive: true, family: 4 
                    });
                }

                return config;
            } catch (error) {
                throw new Error(`Invalid connection string: ${error.message}`);
            }
        }

        return {
            socket: { host: host || 'localhost', port: parseInt(port) || 6379 },
            password: password || undefined,
            database: parseInt(database) || 0
        };
    }

    async handleConnect(req, res) {
        try {
            console.log('🔄 Connection request:', req.body.connectionType || 'local');
            
            if (this.client) {
                await this.client.disconnect();
                this.stopMonitoring();
            }

            this.connectionConfig = this.parseConnectionConfig(req.body);
            this.client = redis.createClient(this.connectionConfig);
            
            this.client.on('error', (err) => console.error('❌ Redis Error:', err));

            // Connect with timeout
            await Promise.race([
                this.client.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15000))
            ]);
            
            await this.client.ping();
            this.currentDatabase = this.connectionConfig.database || 0;
            
            if (this.currentDatabase > 0) {
                await this.client.select(this.currentDatabase);
            }

            this.startMonitoring();

            const isRailway = req.body.connectionString?.includes('rlwy.net') || req.body.connectionType === 'railway';
            res.json({ 
                success: true, 
                message: `Connected to ${isRailway ? 'Railway' : 'Local'} Redis`,
                database: this.currentDatabase,
                connectionType: isRailway ? 'railway' : 'local',
                host: this.connectionConfig.socket.host,
                port: this.connectionConfig.socket.port,
                ssl: !!this.connectionConfig.socket.tls
            });

        } catch (error) {
            console.error('💥 Connection failed:', error.message);
            
            if (this.client) {
                try { await this.client.disconnect(); } catch {}
                this.client = null;
            }
            
            this.stopMonitoring();
            res.status(500).json({ 
                success: false, 
                error: `Connection failed: ${error.message}`,
                suggestion: this.getConnectionSuggestion(error.message)
            });
        }
    }

    async handleTestConnection(req, res) {
        try {
            const tempConfig = this.parseConnectionConfig(req.body);
            const tempClient = redis.createClient(tempConfig);
            
            await Promise.race([
                tempClient.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 10000))
            ]);
            
            const start = Date.now();
            await tempClient.ping();
            const latency = Date.now() - start;
            
            await tempClient.disconnect();
            
            res.json({ 
                success: true, 
                message: 'Connection test passed',
                host: tempConfig.socket.host,
                port: tempConfig.socket.port,
                latency
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    getConnectionSuggestion(errorMessage) {
        const suggestions = {
            'ENOTFOUND': 'Check if the host address is correct and accessible',
            'ECONNREFUSED': 'Redis server may not be running or port incorrect',
            'AUTH': 'Check if the password is correct',
            'timeout': 'Connection timeout - check network connectivity'
        };
        
        for (const [key, suggestion] of Object.entries(suggestions)) {
            if (errorMessage.includes(key)) return suggestion;
        }
        return 'Verify connection parameters and network connectivity';
    }

    async handleDisconnect(req, res) {
        try {
            if (this.client) {
                await this.client.disconnect();
                this.client = null;
                this.stopMonitoring();
                console.log('🔌 Disconnected from Redis');
            }
            res.json({ success: true, message: 'Disconnected from Redis' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handlePing(req, res) {
        try {
            this.validateConnection();
            const start = Date.now();
            const pong = await this.client.ping();
            const responseTime = Date.now() - start;
            
            res.json({ 
                success: true, 
                response: pong, 
                responseTime, 
                database: this.currentDatabase
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleSwitchDatabase(req, res) {
        try {
            this.validateConnection();
            const { database } = req.body;
            
            if (database < 0 || database > 15) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Database number must be between 0 and 15' 
                });
            }
            
            await this.client.select(database);
            this.currentDatabase = database;
            
            res.json({ 
                success: true, 
                message: `Switched to database ${database}`, 
                currentDatabase: database 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleDatabasesInfo(req, res) {
        try {
            this.validateConnection();
            const databases = [];
            const originalDb = this.currentDatabase;
            
            for (let i = 0; i < 16; i++) {
                try {
                    await this.client.select(i);
                    const keys = await this.client.dbSize();
                    databases.push({ id: i, keys: keys || 0, expires: 0, avgTtl: 0 });
                } catch {
                    databases.push({ id: i, keys: 0, expires: 0, avgTtl: 0 });
                }
            }
            
            await this.client.select(originalDb);
            
            res.json({ 
                success: true, 
                databases,
                totalKeys: databases.reduce((sum, db) => sum + db.keys, 0),
                currentDatabase: this.currentDatabase
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleFlushDatabase(req, res) {
        try {
            this.validateConnection();
            const { database } = req.body;
            const originalDb = this.currentDatabase;
            const targetDb = database !== undefined ? database : this.currentDatabase;
            
            await this.client.select(targetDb);
            const keysBefore = await this.client.dbSize();
            await this.client.flushDb();
            await this.client.select(originalDb);
            
            res.json({ 
                success: true, 
                message: `Database ${targetDb} flushed successfully`,
                keysDeleted: keysBefore,
                database: targetDb
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleFlushAllDatabases(req, res) {
        try {
            this.validateConnection();
            await this.client.flushAll();
            await this.client.select(this.currentDatabase);
            
            res.json({ 
                success: true, 
                message: 'All databases flushed successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleGetAll(req, res) {
        try {
            this.validateConnection();
            const { pattern = '*', limit = 1000 } = req.query;
            
            const allKeys = new Set();
            let cursor = '0';
            let iterations = 0;
            
            do {
                const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
                cursor = result.cursor;
                
                result.keys.forEach(key => {
                    if (allKeys.size < limit) allKeys.add(key);
                });
                
                iterations++;
            } while (cursor !== '0' && allKeys.size < limit && iterations < 100);
            
            const uniqueKeys = Array.from(allKeys);
            
            if (uniqueKeys.length === 0) {
                return res.json({ 
                    success: true, 
                    count: 0, 
                    data: [], 
                    database: this.currentDatabase
                });
            }
            
            // Batch fetch values
            const keyValuePairs = [];
            const batchSize = 20;
            
            for (let i = 0; i < uniqueKeys.length; i += batchSize) {
                const batch = uniqueKeys.slice(i, i + batchSize);
                const values = await Promise.all(
                    batch.map(async (key) => {
                        try {
                            const value = await this.client.get(key);
                            return { key, value: value || '(null)' };
                        } catch (err) {
                            return { key, value: `Error: ${err.message}` };
                        }
                    })
                );
                keyValuePairs.push(...values);
            }
            
            res.json({ 
                success: true, 
                count: keyValuePairs.length,
                data: keyValuePairs,
                database: this.currentDatabase,
                pattern
            });
            
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleSet(req, res) {
        try {
            this.validateConnection();
            const { key, value, ttl } = req.body;
            
            if (!key || value === undefined) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Key and value are required' 
                });
            }
            
            if (ttl && ttl > 0) {
                await this.client.setEx(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
            
            res.json({ 
                success: true, 
                message: `Key '${key}' set${ttl ? ` with TTL ${ttl}s` : ''}`,
                key, value, ttl: ttl || null
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleDelete(req, res) {
        try {
            this.validateConnection();
            const { key } = req.params;
            
            const exists = await this.client.exists(key);
            if (!exists) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Key not found'
                });
            }
            
            await this.client.del(key);
            res.json({ 
                success: true, 
                message: `Key '${key}' deleted`
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handlePerformance(req, res) {
        try {
            this.validateConnection();
            
            const [info, stats, memory, clients] = await Promise.all([
                this.client.info(),
                this.client.info('stats'),
                this.client.info('memory'),
                this.client.info('clients')
            ]);

            const parsed = this.parseInfo(info);
            const statsInfo = this.parseInfo(stats);
            const memoryInfo = this.parseInfo(memory);
            const clientsInfo = this.parseInfo(clients);

            const totalCommands = parseInt(statsInfo.total_commands_processed) || 0;
            const keyspaceHits = parseInt(statsInfo.keyspace_hits) || 0;
            const keyspaceMisses = parseInt(statsInfo.keyspace_misses) || 0;
            const hitRatio = (keyspaceHits + keyspaceMisses > 0) ? 
                ((keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100).toFixed(2) : '0.00';

            const usedMemory = parseInt(memoryInfo.used_memory) || 0;
            const maxMemory = parseInt(memoryInfo.maxmemory) || 0;

            // Quick latency test
            const start = process.hrtime.bigint();
            await this.client.ping();
            const latency = Number(process.hrtime.bigint() - start) / 1000000;

            const performance = {
                latency: Math.round(latency * 100) / 100,
                opsPerSec: this.realtimeStats.opsPerSec,
                hitRatio,
                memoryUsageMB: Math.round(usedMemory / 1024 / 1024),
                memoryUsagePercent: maxMemory > 0 ? ((usedMemory / maxMemory) * 100).toFixed(2) : 'N/A',
                connectedClients: clientsInfo.connected_clients || '0',
                currentDbKeys: await this.client.dbSize(),
                totalCommands: totalCommands.toLocaleString(),
                keyspaceHits: keyspaceHits.toLocaleString(),
                keyspaceMisses: keyspaceMisses.toLocaleString(),
                usedMemoryHuman: memoryInfo.used_memory_human || '-',
                maxMemoryHuman: memoryInfo.maxmemory_human || 'No limit',
                uptimeHuman: this.formatUptime(parseInt(parsed.uptime_in_seconds) || 0),
                redisVersion: parsed.redis_version || 'Unknown',
                serverMode: parsed.redis_mode || 'standalone'
            };

            res.json({ success: true, performance });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleLatencyTest(req, res) {
        try {
            this.validateConnection();
            const testCount = Math.min(parseInt(req.query.samples) || 50, 200);
            
            const latencies = [];
            const startTime = Date.now();
            
            for (let i = 0; i < testCount; i++) {
                const start = process.hrtime.bigint();
                await this.client.ping();
                latencies.push(Number(process.hrtime.bigint() - start) / 1000000);
            }
            
            latencies.sort((a, b) => a - b);
            const totalTime = Date.now() - startTime;
            
            res.json({ 
                success: true, 
                min: latencies[0].toFixed(2),
                max: latencies[latencies.length - 1].toFixed(2),
                avg: (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2),
                p95: latencies[Math.floor(latencies.length * 0.95)].toFixed(2),
                samples: testCount,
                totalTime,
                throughput: Math.round((testCount / totalTime) * 1000)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleConnectionPresets(req, res) {
        try {
            const presets = {
                local: {
                    name: 'Local Redis',
                    description: 'Connect to local Redis instance',
                    type: 'local',
                    config: { host: 'localhost', port: 6379, password: '', database: 0 }
                },
                railway: {
                    name: 'Railway Redis',
                    description: 'Connect using Railway connection string',
                    type: 'railway',
                    example: 'redis://default:password@host.proxy.rlwy.net:port',
                    config: { connectionString: '', connectionType: 'railway', database: 0 }
                },
                cloud: {
                    name: 'Redis Cloud',
                    description: 'Connect to Redis Cloud or hosted services',
                    type: 'cloud',
                    example: 'redis://username:password@host:port/database',
                    config: { connectionString: '', connectionType: 'cloud', database: 0 }
                }
            };

            res.json({ success: true, presets });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Utility methods
    validateConnection() {
        if (!this.client || !this.client.isReady) {
            throw new Error('Not connected to Redis');
        }
    }

    parseInfo(infoStr) {
        const parsed = {};
        infoStr.split('\r\n').forEach(line => {
            if (line && !line.startsWith('#') && line.includes(':')) {
                const [key, value] = line.split(':');
                parsed[key] = value;
            }
        });
        return parsed;
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }

    startMonitoring() {
        if (this.monitoringInterval) return;
        
        console.log('📊 Starting monitoring...');
        this.monitoringInterval = setInterval(async () => {
            if (this.client && this.client.isReady) {
                try {
                    const stats = await this.client.info('stats');
                    const parsed = this.parseInfo(stats);
                    const currentOps = parseInt(parsed.total_commands_processed) || 0;
                    const timeDiff = (Date.now() - this.realtimeStats.lastUpdate) / 1000;
                    
                    if (timeDiff > 0) {
                        this.realtimeStats.opsPerSec = Math.round((currentOps - this.realtimeStats.lastOperations) / timeDiff);
                        this.realtimeStats.lastOperations = currentOps;
                        this.realtimeStats.lastUpdate = Date.now();
                    }
                } catch (error) {
                    console.error('📊 Monitoring error:', error.message);
                }
            }
        }, 2000);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('📊 Monitoring stopped');
        }
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`🚀 Redis CRUD Manager Pro running on http://localhost:${port}`);
            console.log('📊 Universal Redis support: Local + Railway + Cloud');
        });

        process.on('SIGINT', async () => {
            console.log('\n👋 Shutting down gracefully...');
            this.stopMonitoring();
            if (this.client) {
                try {
                    await this.client.disconnect();
                    console.log('🔌 Redis connection closed');
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
            process.exit(0);
        });
    }
}

// Start the application
const redisManager = new UniversalRedisManager();
redisManager.start();
