/**
 * Redis CRUD Manager Pro - Enhanced Backend API with Advanced Monitoring
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
        
        // Enhanced monitoring storage
        this.alertsStorage = [];
        this.performanceHistory = [];
        this.systemAlerts = [];
        this.maxHistoryPoints = 100;
        
        this.initializeMiddleware();
        this.initializeRoutes();
    }

    initializeMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static('.'));
        
        // CORS middleware for cross-origin requests
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    initializeRoutes() {
        // Static file serving
        this.app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

        // Connection routes
        this.app.post('/api/connect', this.handleConnect.bind(this));
        this.app.post('/api/disconnect', this.handleDisconnect.bind(this));
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
        this.app.get('/api/slowlog', this.handleSlowlog.bind(this));

        // Statistics
        this.app.get('/api/info', this.handleInfo.bind(this));
        this.app.get('/api/memory-stats', this.handleMemoryStats.bind(this));
        this.app.get('/api/client-info', this.handleClientInfo.bind(this));

        // Connection presets
        this.app.get('/api/connection-presets', this.handleConnectionPresets.bind(this));

        // Enhanced monitoring routes
        this.app.get('/api/monitoring/realtime', this.handleRealtimeMonitoring.bind(this));
        this.app.get('/api/monitoring/alerts', this.handleGetAlerts.bind(this));
        this.app.post('/api/monitoring/alerts', this.handleCreateAlert.bind(this));
        this.app.delete('/api/monitoring/alerts/:id', this.handleDeleteAlert.bind(this));
        this.app.get('/api/monitoring/history', this.handlePerformanceHistory.bind(this));
        this.app.get('/api/monitoring/system-health', this.handleSystemHealth.bind(this));
        this.app.get('/api/monitoring/top-keys', this.handleTopKeys.bind(this));
        this.app.post('/api/monitoring/flush-logs', this.handleFlushLogs.bind(this));
    }

    /**
     * Parse Redis connection string or build config from individual parameters
     * Supports formats:
     * - redis://username:password@host:port/database
     * - redis://default:password@host:port
     * - Local: host, port, password, database
     */
    parseConnectionConfig(connectionData) {
        const { connectionString, connectionType, host, port, password, database } = connectionData;

        // If connection string is provided, parse it
        if (connectionString && connectionString.trim()) {
            try {
                const url = new URL(connectionString);
                
                const config = {
                    socket: {
                        host: url.hostname,
                        port: parseInt(url.port) || 6379,
                        tls: url.protocol === 'rediss:' ? {} : undefined,
                        rejectUnauthorized: false // For self-signed certificates
                    },
                    database: parseInt(url.pathname.substring(1)) || database || 0
                };

                // Handle authentication
                if (url.password) {
                    config.password = url.password;
                } else if (url.username && url.username !== 'default') {
                    config.username = url.username;
                }

                // Railway/Cloud specific configurations
                if (connectionType === 'railway' || url.hostname.includes('rlwy.net')) {
                    config.socket.connectTimeout = 10000;
                    config.socket.lazyConnect = true;
                    config.socket.keepAlive = true;
                    config.socket.family = 4; // Force IPv4
                }

                return config;
            } catch (error) {
                console.error('❌ Error parsing connection string:', error.message);
                throw new Error(`Invalid connection string format: ${error.message}`);
            }
        }

        // Build config from individual parameters (Local connection)
        return {
            socket: {
                host: host || 'localhost',
                port: parseInt(port) || 6379
            },
            password: password || undefined,
            database: parseInt(database) || 0
        };
    }

    // Enhanced connection handler with universal support
    async handleConnect(req, res) {
        try {
            console.log('🔄 Connection request received:', JSON.stringify(req.body, null, 2));
            
            // Disconnect existing connection
            if (this.client) {
                await this.client.disconnect();
                this.stopMonitoring();
            }

            // Parse connection configuration
            this.connectionConfig = this.parseConnectionConfig(req.body);
            console.log('🔧 Parsed config:', JSON.stringify(this.connectionConfig, null, 2));

            // Create Redis client with enhanced error handling
            this.client = redis.createClient(this.connectionConfig);
            
            // Enhanced error handling
            this.client.on('error', (err) => {
                console.error('❌ Redis Client Error:', err);
                // Don't throw here, let connection attempts handle it
            });

            this.client.on('connect', () => {
                console.log('🔗 Redis client connected');
            });

            this.client.on('ready', () => {
                console.log('✅ Redis client ready');
            });

            this.client.on('end', () => {
                console.log('🔚 Redis connection ended');
            });

            // Connect with timeout
            const connectPromise = this.client.connect();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000);
            });

            await Promise.race([connectPromise, timeoutPromise]);
            
            // Test connection with ping
            const pingResult = await this.client.ping();
            console.log('🏓 Connection test:', pingResult);

            // Switch to specified database
            this.currentDatabase = this.connectionConfig.database || 0;
            if (this.currentDatabase > 0) {
                await this.client.select(this.currentDatabase);
            }

            // Start monitoring
            this.startMonitoring();

            // Determine connection type for response
            const isRailway = req.body.connectionString?.includes('rlwy.net') || req.body.connectionType === 'railway';
            const connectionType = isRailway ? 'Railway' : 'Local';
            const connectionHost = this.connectionConfig.socket.host;
            const connectionPort = this.connectionConfig.socket.port;

            res.json({ 
                success: true, 
                message: `Connected to ${connectionType} Redis at ${connectionHost}:${connectionPort} DB ${this.currentDatabase}`,
                database: this.currentDatabase,
                connectionType: connectionType.toLowerCase(),
                host: connectionHost,
                port: connectionPort,
                ssl: !!this.connectionConfig.socket.tls
            });

        } catch (error) {
            console.error('💥 Connection failed:', error.message);
            
            // Clean up on failure
            if (this.client) {
                try {
                    await this.client.disconnect();
                } catch (disconnectError) {
                    console.error('Error during cleanup disconnect:', disconnectError);
                }
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

    // Connection presets handler
    async handleConnectionPresets(req, res) {
        try {
            const presets = {
                local: {
                    name: 'Local Redis',
                    description: 'Connect to local Redis instance',
                    type: 'local',
                    config: {
                        host: 'localhost',
                        port: 6379,
                        password: '',
                        database: 0
                    }
                },
                railway: {
                    name: 'Railway Redis',
                    description: 'Connect using Railway connection string',
                    type: 'railway',
                    example: 'redis://default:password@host.proxy.rlwy.net:port',
                    config: {
                        connectionString: 'redis://default:QcwgNhXhWOWPwZAfuUDJixoQLVfYZTda@crossover.proxy.rlwy.net:23278',
                        connectionType: 'railway',
                        database: 0
                    }
                },
                cloud: {
                    name: 'Redis Cloud',
                    description: 'Connect to Redis Cloud or other hosted services',
                    type: 'cloud',
                    example: 'redis://username:password@host:port/database',
                    config: {
                        connectionString: '',
                        connectionType: 'cloud',
                        database: 0
                    }
                }
            };

            res.json({ success: true, presets });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Helper method for connection suggestions
    getConnectionSuggestion(errorMessage) {
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
            return 'Check if the host address is correct and accessible';
        }
        if (errorMessage.includes('ECONNREFUSED')) {
            return 'Redis server may not be running or the port may be incorrect';
        }
        if (errorMessage.includes('AUTH')) {
            return 'Check if the password is correct';
        }
        if (errorMessage.includes('timeout')) {
            return 'Connection timeout - check network connectivity or try a different port';
        }
        return 'Verify your connection parameters and network connectivity';
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
            console.error('❌ Disconnect error:', error);
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
                database: this.currentDatabase,
                serverTime: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Database management handlers (enhanced)
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
                    const info = await this.client.info('keyspace');
                    
                    let dbInfo = { id: i, keys: keys || 0, expires: 0, avgTtl: 0 };
                    
                    // Parse keyspace info for additional details
                    const lines = info.split('\r\n');
                    const dbLine = lines.find(line => line.startsWith(`db${i}:`));
                    if (dbLine) {
                        const match = dbLine.match(/keys=(\d+),expires=(\d+),avg_ttl=(\d+)/);
                        if (match) {
                            dbInfo.expires = parseInt(match[2]);
                            dbInfo.avgTtl = parseInt(match[3]);
                        }
                    }
                    
                    databases.push(dbInfo);
                } catch (dbError) {
                    console.warn(`Warning: Could not access database ${i}:`, dbError.message);
                    databases.push({ id: i, keys: 0, expires: 0, avgTtl: 0 });
                }
            }
            
            // Return to original database
            await this.client.select(originalDb);
            
            const totalKeys = databases.reduce((sum, db) => sum + db.keys, 0);
            res.json({ 
                success: true, 
                databases,
                totalKeys,
                currentDatabase: this.currentDatabase
            });
        } catch (error) {
            console.error('❌ Database info error:', error);
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
            
            // Get total keys before flushing
            let totalKeysBefore = 0;
            for (let i = 0; i < 16; i++) {
                try {
                    await this.client.select(i);
                    totalKeysBefore += await this.client.dbSize();
                } catch (err) {
                    console.warn(`Could not check database ${i}:`, err.message);
                }
            }
            
            await this.client.flushAll();
            await this.client.select(this.currentDatabase);
            
            res.json({ 
                success: true, 
                message: 'All databases flushed successfully',
                totalKeysDeleted: totalKeysBefore
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // FIXED: handleGetAll method - this was the main issue
    async handleGetAll(req, res) {
        try {
            this.validateConnection();
            const { pattern = '*', limit = 1000 } = req.query;
            
            console.log(`🔍 Fetching keys with pattern: ${pattern}, limit: ${limit}`);
            
            // Use SCAN to get all keys matching the pattern
            const allKeys = new Set(); // Use Set to avoid duplicates
            let cursor = '0';
            let scanIterations = 0;
            const maxIterations = 100; // Prevent infinite loops
            
            do {
                const result = await this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100 // Scan batch size
                });
                
                cursor = result.cursor;
                
                // Add keys to Set (automatically handles duplicates)
                result.keys.forEach(key => {
                    if (allKeys.size < limit) { // Respect the limit
                        allKeys.add(key);
                    }
                });
                
                scanIterations++;
                console.log(`🔍 Scan iteration ${scanIterations}: cursor=${cursor}, found=${result.keys.length} keys, total unique=${allKeys.size}`);
                
                // Break if we hit the limit or max iterations
                if (allKeys.size >= limit || scanIterations >= maxIterations) {
                    break;
                }
                
            } while (cursor !== '0');
            
            // Convert Set back to Array
            const uniqueKeys = Array.from(allKeys);
            console.log(`📊 Total unique keys found: ${uniqueKeys.length}`);
            
            if (uniqueKeys.length === 0) {
                return res.json({ 
                    success: true, 
                    count: 0, 
                    data: [], 
                    database: this.currentDatabase,
                    pattern,
                    scanIterations
                });
            }
            
            // Get values for all keys (in smaller batches to avoid overwhelming Redis)
            const batchSize = 20; // Smaller batch size for better performance
            const keyValuePairs = [];
            
            console.log(`📥 Fetching values for ${uniqueKeys.length} keys in batches of ${batchSize}...`);
            
            for (let i = 0; i < uniqueKeys.length; i += batchSize) {
                const batch = uniqueKeys.slice(i, i + batchSize);
                console.log(`📥 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueKeys.length/batchSize)}: ${batch.length} keys`);
                
                const values = await Promise.all(
                    batch.map(async (key) => {
                        try {
                            const value = await this.client.get(key);
                            return { key, value: value || '(null)' };
                        } catch (err) {
                            console.error(`❌ Error getting value for key ${key}:`, err.message);
                            return { key, value: `Error: ${err.message}` };
                        }
                    })
                );
                keyValuePairs.push(...values);
            }
            
            console.log(`✅ Successfully fetched ${keyValuePairs.length} key-value pairs`);
            
            // Return the actual data
            res.json({ 
                success: true, 
                count: keyValuePairs.length,     // This is the actual count of returned data
                totalScanned: uniqueKeys.length,  // This shows how many unique keys were found
                data: keyValuePairs,              // This is the actual data array
                database: this.currentDatabase,
                pattern,
                scanIterations,
                limited: uniqueKeys.length >= limit
            });
            
        } catch (error) {
            console.error('❌ HandleGetAll error:', error);
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
            
            // Set with optional TTL
            if (ttl && ttl > 0) {
                await this.client.setEx(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
            
            res.json({ 
                success: true, 
                message: `Key '${key}' set in database ${this.currentDatabase}${ttl ? ` with TTL ${ttl}s` : ''}`,
                key, 
                value, 
                ttl: ttl || null,
                database: this.currentDatabase 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleDelete(req, res) {
        try {
            this.validateConnection();
            const { key } = req.params;
            
            // Check if key exists first
            const exists = await this.client.exists(key);
            if (!exists) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Key not found', 
                    key, 
                    database: this.currentDatabase 
                });
            }
            
            const result = await this.client.del(key);
            
            res.json({ 
                success: true, 
                message: `Key '${key}' deleted from database ${this.currentDatabase}`, 
                key, 
                database: this.currentDatabase,
                deletedCount: result
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Performance monitoring handlers (enhanced)
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
            const currentDbKeys = await this.client.dbSize();

            // Enhanced latency test
            const latencyTests = [];
            for (let i = 0; i < 5; i++) {
                const start = process.hrtime.bigint();
                await this.client.ping();
                const end = process.hrtime.bigint();
                latencyTests.push(Number(end - start) / 1000000);
            }
            const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;

            const performance = {
                latency: Math.round(avgLatency * 100) / 100,
                opsPerSec: this.realtimeStats.opsPerSec,
                hitRatio,
                memoryUsageMB: Math.round(usedMemory / 1024 / 1024),
                memoryUsagePercent: maxMemory > 0 ? ((usedMemory / maxMemory) * 100).toFixed(2) : 'N/A',
                connectedClients: clientsInfo.connected_clients || '0',
                currentDbKeys,
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
            const testCount = parseInt(req.query.samples) || 50;
            const maxTests = Math.min(testCount, 200); // Limit to prevent overload
            
            console.log(`🧪 Running latency test with ${maxTests} samples...`);
            
            const latencies = [];
            const startTime = Date.now();
            
            for (let i = 0; i < maxTests; i++) {
                const start = process.hrtime.bigint();
                await this.client.ping();
                const end = process.hrtime.bigint();
                latencies.push(Number(end - start) / 1000000);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            latencies.sort((a, b) => a - b);
            
            const min = latencies[0].toFixed(2);
            const max = latencies[latencies.length - 1].toFixed(2);
            const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
            const median = latencies[Math.floor(latencies.length / 2)].toFixed(2);
            const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
            const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);

            res.json({ 
                success: true, 
                min, max, avg, median, p95, p99,
                samples: maxTests,
                totalTime,
                throughput: Math.round((maxTests / totalTime) * 1000)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleSlowlog(req, res) {
        try {
            this.validateConnection();
            const count = parseInt(req.query.count) || 10;
            const slowlog = await this.client.sendCommand(['SLOWLOG', 'GET', count.toString()]);
            
            const formattedSlowlog = slowlog.map(entry => ({
                id: entry[0],
                timestamp: entry[1],
                duration: entry[2],
                command: entry[3],
                clientInfo: entry[4] || 'N/A'
            }));

            res.json({ 
                success: true, 
                slowlog: formattedSlowlog,
                count: formattedSlowlog.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Statistics handlers (enhanced)
    async handleInfo(req, res) {
        try {
            this.validateConnection();
            const section = req.query.section || 'all';
            const info = await this.client.info(section);
            const parsed = this.parseInfo(info);
            
            res.json({ 
                success: true, 
                raw: info, 
                parsed, 
                database: this.currentDatabase,
                section 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleMemoryStats(req, res) {
        try {
            this.validateConnection();
            const stats = await this.client.sendCommand(['MEMORY', 'STATS']);
            
            const memoryStats = {};
            for (let i = 0; i < stats.length; i += 2) {
                const key = stats[i].replace(/\./g, '_');
                memoryStats[key] = stats[i + 1];
            }
            
            res.json({ 
                success: true, 
                stats: memoryStats, 
                database: this.currentDatabase 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleClientInfo(req, res) {
        try {
            this.validateConnection();
            const [clientList, clientInfo] = await Promise.all([
                this.client.sendCommand(['CLIENT', 'LIST']),
                this.client.info('clients')
            ]);
            
            res.json({ 
                success: true, 
                info: { clientList, clientInfo }, 
                database: this.currentDatabase 
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ========== ENHANCED MONITORING ENDPOINTS ==========

    // Real-time monitoring data
    async handleRealtimeMonitoring(req, res) {
        try {
            this.validateConnection();
            
            const [info, memory, stats, clients] = await Promise.all([
                this.client.info(),
                this.client.info('memory'),
                this.client.info('stats'),
                this.client.info('clients')
            ]);

            const parsedInfo = this.parseInfo(info);
            const parsedMemory = this.parseInfo(memory);
            const parsedStats = this.parseInfo(stats);
            const parsedClients = this.parseInfo(clients);

            const realtimeData = {
                timestamp: Date.now(),
                cpu: {
                    usedCpuSys: parseFloat(parsedInfo.used_cpu_sys) || 0,
                    usedCpuUser: parseFloat(parsedInfo.used_cpu_user) || 0,
                    usedCpuSysChildren: parseFloat(parsedInfo.used_cpu_sys_children) || 0,
                    usedCpuUserChildren: parseFloat(parsedInfo.used_cpu_user_children) || 0
                },
                memory: {
                    usedMemory: parseInt(parsedMemory.used_memory) || 0,
                    usedMemoryRss: parseInt(parsedMemory.used_memory_rss) || 0,
                    usedMemoryPeak: parseInt(parsedMemory.used_memory_peak) || 0,
                    usedMemoryHuman: parsedMemory.used_memory_human || '0B',
                    memFragmentationRatio: parseFloat(parsedMemory.mem_fragmentation_ratio) || 0,
                    maxMemory: parseInt(parsedMemory.maxmemory) || 0,
                    maxMemoryHuman: parsedMemory.maxmemory_human || 'No limit'
                },
                network: {
                    totalConnectionsReceived: parseInt(parsedStats.total_connections_received) || 0,
                    totalCommandsProcessed: parseInt(parsedStats.total_commands_processed) || 0,
                    instantaneousOpsPerSec: parseInt(parsedStats.instantaneous_ops_per_sec) || 0,
                    totalNetInputBytes: parseInt(parsedStats.total_net_input_bytes) || 0,
                    totalNetOutputBytes: parseInt(parsedStats.total_net_output_bytes) || 0,
                    instantaneousInputKbps: parseFloat(parsedStats.instantaneous_input_kbps) || 0,
                    instantaneousOutputKbps: parseFloat(parsedStats.instantaneous_output_kbps) || 0
                },
                clients: {
                    connectedClients: parseInt(parsedClients.connected_clients) || 0,
                    clientRecentMaxInputBuffer: parseInt(parsedClients.client_recent_max_input_buffer) || 0,
                    clientRecentMaxOutputBuffer: parseInt(parsedClients.client_recent_max_output_buffer) || 0,
                    blockedClients: parseInt(parsedClients.blocked_clients) || 0
                },
                keyspace: {
                    keyspaceHits: parseInt(parsedStats.keyspace_hits) || 0,
                    keyspaceMisses: parseInt(parsedStats.keyspace_misses) || 0,
                    hitRatio: this.calculateHitRatio(parsedStats),
                    evictedKeys: parseInt(parsedStats.evicted_keys) || 0,
                    expiredKeys: parseInt(parsedStats.expired_keys) || 0
                },
                server: {
                    uptimeInSeconds: parseInt(parsedInfo.uptime_in_seconds) || 0,
                    uptimeHuman: this.formatUptime(parseInt(parsedInfo.uptime_in_seconds) || 0),
                    redisVersion: parsedInfo.redis_version || 'Unknown',
                    serverMode: parsedInfo.redis_mode || 'standalone',
                    processId: parseInt(parsedInfo.process_id) || 0,
                    tcpPort: parseInt(parsedInfo.tcp_port) || 6379
                }
            };

            // Store in history (keep last 100 points)
            this.performanceHistory.push(realtimeData);
            if (this.performanceHistory.length > this.maxHistoryPoints) {
                this.performanceHistory.shift();
            }

            // Check for alerts
            this.checkSystemAlerts(realtimeData);

            res.json({ success: true, data: realtimeData });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // System health check
    async handleSystemHealth(req, res) {
        try {
            this.validateConnection();
            
            const health = {
                timestamp: Date.now(),
                status: 'healthy',
                issues: [],
                recommendations: []
            };

            // Get latest realtime data
            const latest = this.performanceHistory[this.performanceHistory.length - 1];
            if (!latest) {
                health.status = 'warning';
                health.issues.push('No performance data available');
                return res.json({ success: true, health });
            }

            // Memory health check
            if (latest.memory.memFragmentationRatio > 1.5) {
                health.status = 'warning';
                health.issues.push(`High memory fragmentation: ${latest.memory.memFragmentationRatio.toFixed(2)}`);
                health.recommendations.push('Consider restarting Redis to defragment memory');
            }

            // Hit ratio check
            if (latest.keyspace.hitRatio < 80) {
                health.status = 'warning';
                health.issues.push(`Low cache hit ratio: ${latest.keyspace.hitRatio}%`);
                health.recommendations.push('Review caching strategy and key expiration policies');
            }

            // Memory usage check
            const memoryUsagePercent = latest.memory.maxMemory > 0 ? 
                (latest.memory.usedMemory / latest.memory.maxMemory) * 100 : 0;
            
            if (memoryUsagePercent > 90) {
                health.status = 'critical';
                health.issues.push(`Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`);
                health.recommendations.push('Increase memory limit or implement key eviction policies');
            } else if (memoryUsagePercent > 75) {
                health.status = 'warning';
                health.issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
                health.recommendations.push('Monitor memory usage closely');
            }

            // Connection check
            if (latest.clients.connectedClients > 1000) {
                health.status = 'warning';
                health.issues.push(`High connection count: ${latest.clients.connectedClients}`);
                health.recommendations.push('Review connection pooling and timeout settings');
            }

            res.json({ success: true, health });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Performance history
    async handlePerformanceHistory(req, res) {
        try {
            const { points = 50 } = req.query;
            const requestedPoints = Math.min(parseInt(points), this.maxHistoryPoints);
            
            const history = this.performanceHistory.slice(-requestedPoints);
            
            res.json({ 
                success: true, 
                history,
                totalPoints: this.performanceHistory.length,
                requestedPoints: requestedPoints
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Top keys analysis
    async handleTopKeys(req, res) {
        try {
            this.validateConnection();
            const { limit = 20 } = req.query;
            
            // Get sample of keys and their memory usage
            const keys = [];
            let cursor = '0';
            let scanCount = 0;
            
            do {
                const result = await this.client.scan(cursor, { COUNT: 100 });
                cursor = result.cursor;
                
                for (const key of result.keys.slice(0, Math.min(50, result.keys.length))) {
                    try {
                        const [type, ttl, size] = await Promise.all([
                            this.client.type(key),
                            this.client.ttl(key),
                            this.client.sendCommand(['MEMORY', 'USAGE', key]).catch(() => 0)
                        ]);
                        
                        keys.push({
                            key,
                            type,
                            ttl: ttl === -1 ? 'Never' : ttl === -2 ? 'Expired' : `${ttl}s`,
                            memoryUsage: size || 0,
                            memoryHuman: this.formatBytes(size || 0)
                        });
                    } catch (err) {
                        console.warn(`Error analyzing key ${key}:`, err.message);
                    }
                }
                
                scanCount++;
                if (keys.length >= limit || scanCount > 10) break;
                
            } while (cursor !== '0' && keys.length < limit);
            
            // Sort by memory usage
            keys.sort((a, b) => b.memoryUsage - a.memoryUsage);
            
            res.json({ 
                success: true, 
                topKeys: keys.slice(0, limit),
                totalAnalyzed: keys.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Alert management
    async handleGetAlerts(req, res) {
        try {
            res.json({ 
                success: true, 
                alerts: this.alertsStorage,
                systemAlerts: this.systemAlerts
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleCreateAlert(req, res) {
        try {
            const { name, condition, threshold, enabled = true } = req.body;
            
            const alert = {
                id: Date.now().toString(),
                name,
                condition,
                threshold,
                enabled,
                triggered: false,
                lastTriggered: null,
                createdAt: Date.now()
            };
            
            this.alertsStorage.push(alert);
            
            res.json({ success: true, alert });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleDeleteAlert(req, res) {
        try {
            const { id } = req.params;
            const index = this.alertsStorage.findIndex(alert => alert.id === id);
            
            if (index === -1) {
                return res.status(404).json({ success: false, error: 'Alert not found' });
            }
            
            this.alertsStorage.splice(index, 1);
            res.json({ success: true, message: 'Alert deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async handleFlushLogs(req, res) {
        try {
            this.performanceHistory = [];
            this.systemAlerts = [];
            
            res.json({ success: true, message: 'Monitoring logs cleared' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ========== UTILITY METHODS ==========

    validateConnection() {
        if (!this.client || !this.client.isReady) {
            throw new Error('Not connected to Redis or connection not ready');
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

    // Helper methods for monitoring
    calculateHitRatio(stats) {
        const hits = parseInt(stats.keyspace_hits) || 0;
        const misses = parseInt(stats.keyspace_misses) || 0;
        const total = hits + misses;
        return total > 0 ? Math.round((hits / total) * 100) : 0;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    checkSystemAlerts(data) {
        const now = Date.now();
        
        // Clear old system alerts (older than 5 minutes)
        this.systemAlerts = this.systemAlerts.filter(alert => 
            now - alert.timestamp < 5 * 60 * 1000
        );
        
        // Check memory usage
        if (data.memory.maxMemory > 0) {
            const memoryPercent = (data.memory.usedMemory / data.memory.maxMemory) * 100;
            if (memoryPercent > 90) {
                this.addSystemAlert('critical', 'Memory Critical', 
                    `Memory usage at ${memoryPercent.toFixed(1)}%`);
            }
        }
        
        // Check fragmentation
        if (data.memory.memFragmentationRatio > 2.0) {
            this.addSystemAlert('warning', 'High Memory Fragmentation', 
                `Fragmentation ratio: ${data.memory.memFragmentationRatio.toFixed(2)}`);
        }
        
        // Check hit ratio
        if (data.keyspace.hitRatio < 70) {
            this.addSystemAlert('warning', 'Low Cache Hit Ratio', 
                `Hit ratio dropped to ${data.keyspace.hitRatio}%`);
        }
    }

    addSystemAlert(severity, title, message) {
        // Don't add duplicate alerts
        const duplicate = this.systemAlerts.find(alert => 
            alert.title === title && Date.now() - alert.timestamp < 60000
        );
        
        if (!duplicate) {
            this.systemAlerts.push({
                id: Date.now().toString(),
                severity,
                title,
                message,
                timestamp: Date.now()
            });
        }
    }

    startMonitoring() {
        if (this.monitoringInterval) return;
        
        console.log('📊 Starting performance monitoring...');
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
            console.log('📊 Performance monitoring stopped');
        }
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log('🚀 Redis CRUD Manager Pro (Universal) running on http://localhost:' + port);
            console.log('📊 Features: Local + Railway + Cloud Redis support + Advanced Monitoring');
            console.log('🔗 Supported formats:');
            console.log('   • Local: host, port, password, database');
            console.log('   • Railway: redis://default:password@host.rlwy.net:port');
            console.log('   • Cloud: redis://username:password@host:port/database');
            console.log('🔍 Monitoring endpoints:');
            console.log('   • /api/monitoring/realtime - Real-time system metrics');
            console.log('   • /api/monitoring/system-health - System health check');
            console.log('   • /api/monitoring/alerts - Alert management');
            console.log('   • /api/monitoring/top-keys - Memory usage analysis');
        });

        process.on('SIGINT', async () => {
            console.log('\n👋 Shutting down gracefully...');
            this.stopMonitoring();
            if (this.client) {
                try {
                    await this.client.disconnect();
                    console.log('🔌 Redis connection closed');
                } catch (err) {
                    console.error('Error closing Redis connection:', err);
                }
            }
            process.exit(0);
        });
    }
}

// Start the application
const redisManager = new UniversalRedisManager();
redisManager.start();
