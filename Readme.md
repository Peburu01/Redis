# Redis Installation and Startup Process Documentation

## Overview
This document outlines the complete process for installing and running Redis locally on Windows using Docker.

## Prerequisites
- Docker Desktop installed and running on Windows
- Windows Command Prompt or PowerShell access

## Installation Steps

### Step 1: Pull Redis Image
Open Command Prompt and run:
```bash
docker pull redis:latest
```
This downloads the latest Redis image from Docker Hub. The system will show a digest confirmation when complete.

### Step 2: Create and Start Redis Container
Run the following command to create a new Redis container:
```bash
docker run --name local-redis -p 6379:6379 -d redis
```
- `--name local-redis`: Names the container "local-redis"
- `-p 6379:6379`: Maps container port 6379 to host port 6379
- `-d`: Runs container in detached mode (background)
- Returns a container ID when successful

### Step 3: Verify Installation
Connect to Redis using the command-line interface:
```bash
docker exec -it local-redis redis-cli
```
This opens the Redis CLI with the prompt: `127.0.0.1:6379>`

### Step 4: Test Connection
Test Redis functionality by running:
```
ping
```
Expected response: `PONG`

## Container Management Commands

### Check Running Containers
```bash
docker ps
```

### Stop Redis Container
```bash
docker stop local-redis
```

### Start Existing Container
```bash
docker start local-redis
```

### Remove Container
```bash
docker rm local-redis
```

## Connection Information
- **Host**: localhost or 127.0.0.1
- **Port**: 6379
- **Container Name**: local-redis

## Notes
- Redis runs in-memory by default
- Data is not persistent unless volumes are configured
- The container runs Redis 7.x (latest version)
- No authentication required for local development