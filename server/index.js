const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8081;

app.use(express.static(path.join(__dirname, '../public')));

const gameState = {
    players: new Map(),
    enemies: new Map(),
    projectiles: [],
    items: [],
    gameStatus: 'lobby',
    currentLevel: 1,
    maxLevel: 4,
    levelStartTime: null,
    scores: new Map()
};

const GAME_CONFIG = {
    maxPlayers: 4,
    levelDuration: 10 * 60 * 1000,
    enemySpawnRate: 2000,
    maxEnemies: 20,
    playerHealth: 100,
    weapons: {
        pistol: { damage: 25, fireRate: 500, ammo: 12, range: 100 },
        rifle: { damage: 35, fireRate: 150, ammo: 30, range: 150 },
        shotgun: { damage: 60, fireRate: 800, ammo: 8, range: 50 },
        sniper: { damage: 100, fireRate: 1500, ammo: 5, range: 300 }
    }
};

class Player {
    constructor(id, socketId, name) {
        this.id = id;
        this.socketId = socketId;
        this.name = name;
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.health = GAME_CONFIG.playerHealth;
        this.weapons = ['pistol'];
        this.currentWeapon = 'pistol';
        this.ammo = { pistol: 60, rifle: 120, shotgun: 32, sniper: 20 };
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        this.isAlive = true;
        this.lastShotTime = 0;
    }

    canShoot() {
        const weapon = GAME_CONFIG.weapons[this.currentWeapon];
        return Date.now() - this.lastShotTime >= weapon.fireRate;
    }

    shoot() {
        if (!this.canShoot() || this.ammo[this.currentWeapon] <= 0) return false;
        
        this.ammo[this.currentWeapon]--;
        this.lastShotTime = Date.now();
        return true;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            this.deaths++;
        }
    }

    respawn() {
        this.health = GAME_CONFIG.playerHealth;
        this.isAlive = true;
        this.position = { x: Math.random() * 100 - 50, y: 0, z: Math.random() * 100 - 50 };
    }
}

class Enemy {
    constructor(id, type = 'basic') {
        this.id = id;
        this.type = type;
        this.position = { 
            x: Math.random() * 200 - 100, 
            y: 0, 
            z: Math.random() * 200 - 100 
        };
        this.rotation = { x: 0, y: Math.random() * Math.PI * 2, z: 0 };
        this.health = type === 'heavy' ? 150 : 75;
        this.maxHealth = this.health;
        this.speed = type === 'fast' ? 15 : 8;
        this.damage = type === 'heavy' ? 40 : 25;
        this.target = null;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000;
        this.state = 'patrol';
        this.patrolTarget = null;
        this.detectionRange = 80;
        this.attackRange = 15;
    }

    update(deltaTime) {
        const nearestPlayer = this.findNearestPlayer();
        
        if (nearestPlayer && this.distanceTo(nearestPlayer) < this.detectionRange) {
            this.target = nearestPlayer;
            this.state = 'chase';
        }

        switch (this.state) {
            case 'patrol':
                this.patrol(deltaTime);
                break;
            case 'chase':
                this.chase(deltaTime);
                break;
            case 'attack':
                this.attack(deltaTime);
                break;
        }
    }

    findNearestPlayer() {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const player of gameState.players.values()) {
            if (!player.isAlive) continue;
            const distance = this.distanceTo(player);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = player;
            }
        }
        return nearest;
    }

    distanceTo(target) {
        const dx = this.position.x - target.position.x;
        const dz = this.position.z - target.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    patrol(deltaTime) {
        if (!this.patrolTarget) {
            this.patrolTarget = {
                x: this.position.x + (Math.random() - 0.5) * 40,
                z: this.position.z + (Math.random() - 0.5) * 40
            };
        }

        this.moveTowards(this.patrolTarget, deltaTime);
        
        if (this.distanceTo({ position: this.patrolTarget }) < 5) {
            this.patrolTarget = null;
        }
    }

    chase(deltaTime) {
        if (!this.target || !this.target.isAlive) {
            this.state = 'patrol';
            this.target = null;
            return;
        }

        const distance = this.distanceTo(this.target);
        
        if (distance <= this.attackRange) {
            this.state = 'attack';
        } else if (distance > this.detectionRange * 1.5) {
            this.state = 'patrol';
            this.target = null;
        } else {
            this.moveTowards(this.target.position, deltaTime);
        }
    }

    attack(deltaTime) {
        if (!this.target || !this.target.isAlive) {
            this.state = 'patrol';
            this.target = null;
            return;
        }

        const distance = this.distanceTo(this.target);
        
        if (distance > this.attackRange) {
            this.state = 'chase';
            return;
        }

        if (Date.now() - this.lastAttackTime >= this.attackCooldown) {
            this.target.takeDamage(this.damage);
            this.lastAttackTime = Date.now();
            
            io.emit('enemyAttack', {
                enemyId: this.id,
                targetId: this.target.id,
                damage: this.damage
            });
        }
    }

    moveTowards(target, deltaTime) {
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0) {
            const moveDistance = this.speed * deltaTime / 1000;
            this.position.x += (dx / distance) * moveDistance;
            this.position.z += (dz / distance) * moveDistance;
            
            this.rotation.y = Math.atan2(dx, dz);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

function spawnEnemy() {
    if (gameState.enemies.size >= GAME_CONFIG.maxEnemies) return;
    
    const enemyTypes = ['basic', 'fast', 'heavy'];
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const enemy = new Enemy(uuidv4(), type);
    gameState.enemies.set(enemy.id, enemy);
    
    io.emit('enemySpawned', {
        id: enemy.id,
        type: enemy.type,
        position: enemy.position,
        rotation: enemy.rotation,
        health: enemy.health,
        maxHealth: enemy.maxHealth
    });
}

function updateEnemies(deltaTime) {
    for (const enemy of gameState.enemies.values()) {
        enemy.update(deltaTime);
    }
}

function startGame() {
    gameState.gameStatus = 'playing';
    gameState.levelStartTime = Date.now();
    gameState.currentLevel = 1;
    
    for (const player of gameState.players.values()) {
        player.respawn();
    }
    
    io.emit('gameStarted', {
        level: gameState.currentLevel,
        players: Array.from(gameState.players.values())
    });
}

function nextLevel() {
    gameState.currentLevel++;
    gameState.levelStartTime = Date.now();
    gameState.enemies.clear();
    
    for (const player of gameState.players.values()) {
        player.respawn();
        if (gameState.currentLevel === 2 && !player.weapons.includes('rifle')) {
            player.weapons.push('rifle');
        } else if (gameState.currentLevel === 3 && !player.weapons.includes('shotgun')) {
            player.weapons.push('shotgun');
        } else if (gameState.currentLevel === 4 && !player.weapons.includes('sniper')) {
            player.weapons.push('sniper');
        }
    }
    
    io.emit('levelChanged', {
        level: gameState.currentLevel,
        players: Array.from(gameState.players.values())
    });
}

function endGame() {
    gameState.gameStatus = 'finished';
    const finalScores = Array.from(gameState.players.values())
        .map(p => ({ name: p.name, score: p.score, kills: p.kills, deaths: p.deaths }))
        .sort((a, b) => b.score - a.score);
    
    io.emit('gameEnded', { scores: finalScores });
}

let lastTime = Date.now();
setInterval(() => {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameState.gameStatus === 'playing') {
        updateEnemies(deltaTime);
        
        if (Math.random() < 0.1) {
            spawnEnemy();
        }
        
        const elapsed = currentTime - gameState.levelStartTime;
        if (elapsed >= GAME_CONFIG.levelDuration) {
            if (gameState.currentLevel >= GAME_CONFIG.maxLevel) {
                endGame();
            } else {
                nextLevel();
            }
        }
        
        io.emit('gameUpdate', {
            players: Array.from(gameState.players.values()),
            enemies: Array.from(gameState.enemies.values()),
            projectiles: gameState.projectiles,
            timeLeft: Math.max(0, GAME_CONFIG.levelDuration - elapsed),
            level: gameState.currentLevel
        });
    }
}, 1000 / 60);

io.on('connection', (socket) => {
    console.log(`플레이어 연결: ${socket.id}`);
    
    socket.on('joinGame', (data) => {
        if (gameState.players.size >= GAME_CONFIG.maxPlayers) {
            socket.emit('joinFailed', { reason: '서버가 가득 참' });
            return;
        }
        
        const player = new Player(uuidv4(), socket.id, data.name || `Player${gameState.players.size + 1}`);
        gameState.players.set(player.id, player);
        
        socket.emit('joinedGame', {
            playerId: player.id,
            gameState: {
                status: gameState.gameStatus,
                level: gameState.currentLevel,
                players: Array.from(gameState.players.values()),
                enemies: Array.from(gameState.enemies.values())
            }
        });
        
        socket.broadcast.emit('playerJoined', player);
    });
    
    socket.on('startGame', () => {
        if (gameState.gameStatus === 'lobby' && gameState.players.size > 0) {
            startGame();
        }
    });
    
    socket.on('playerMove', (data) => {
        const player = Array.from(gameState.players.values()).find(p => p.socketId === socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            socket.broadcast.emit('playerMoved', {
                playerId: player.id,
                position: data.position,
                rotation: data.rotation
            });
        }
    });
    
    socket.on('playerShoot', (data) => {
        const player = Array.from(gameState.players.values()).find(p => p.socketId === socket.id);
        if (player && player.shoot()) {
            const projectile = {
                id: uuidv4(),
                playerId: player.id,
                position: { ...data.position },
                direction: { ...data.direction },
                weapon: player.currentWeapon,
                speed: 200,
                damage: GAME_CONFIG.weapons[player.currentWeapon].damage,
                range: GAME_CONFIG.weapons[player.currentWeapon].range,
                startTime: Date.now()
            };
            
            gameState.projectiles.push(projectile);
            
            io.emit('projectileFired', projectile);
            
            setTimeout(() => {
                gameState.projectiles = gameState.projectiles.filter(p => p.id !== projectile.id);
            }, 3000);
        }
    });
    
    socket.on('changeWeapon', (data) => {
        const player = Array.from(gameState.players.values()).find(p => p.socketId === socket.id);
        if (player && player.weapons.includes(data.weapon)) {
            player.currentWeapon = data.weapon;
            socket.emit('weaponChanged', { weapon: data.weapon });
        }
    });
    
    socket.on('hitEnemy', (data) => {
        const enemy = gameState.enemies.get(data.enemyId);
        const player = Array.from(gameState.players.values()).find(p => p.socketId === socket.id);
        
        if (enemy && player) {
            const isDead = enemy.takeDamage(data.damage);
            
            if (isDead) {
                gameState.enemies.delete(enemy.id);
                player.score += enemy.type === 'heavy' ? 100 : enemy.type === 'fast' ? 75 : 50;
                player.kills++;
                
                io.emit('enemyKilled', {
                    enemyId: enemy.id,
                    killerId: player.id,
                    score: player.score
                });
            } else {
                io.emit('enemyHit', {
                    enemyId: enemy.id,
                    health: enemy.health,
                    damage: data.damage
                });
            }
        }
    });
    
    socket.on('disconnect', () => {
        const player = Array.from(gameState.players.values()).find(p => p.socketId === socket.id);
        if (player) {
            gameState.players.delete(player.id);
            socket.broadcast.emit('playerLeft', { playerId: player.id });
            console.log(`플레이어 연결 해제: ${player.name}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`게임 접속: http://localhost:${PORT}`);
});