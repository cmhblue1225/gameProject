import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Howl, Howler } from 'howler';

import GameEngine from './GameEngine.js';
import Player from './Player.js';
import Enemy from './Enemy.js';
import WeaponSystem from './WeaponSystem.js';
import LevelManager from './LevelManager.js';
import AudioManager from './AudioManager.js';
import UIManager from './UIManager.js';

class CyberpunkFPS {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gameEngine = new GameEngine(this.canvas);
        
        this.enemies = new Map();
        this.projectiles = [];
        
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager();
        this.weaponSystem = new WeaponSystem();
        this.levelManager = new LevelManager();
        
        this.gameState = 'menu';
        this.currentLevel = 1;
        this.maxLevel = 4;
        this.levelStartTime = null;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        this.playerHealth = 100;
        this.maxPlayerHealth = 100;
        
        this.keys = {};
        this.mouse = { x: 0, y: 0, sensitivity: 0.002 };
        this.locked = false;
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        console.log('Initializing CyberpunkFPS...');
        this.setupEventListeners();
        this.setupPointerLock();
        this.gameEngine.init();
        this.audioManager.init();
        this.uiManager.init();
        
        // 애니메이션 루프 시작
        this.animate();
        
        console.log('CyberpunkFPS initialized successfully');
    }
    
    setupEventListeners() {
        const startGameBtn = document.getElementById('startGame');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        const settingsBtn = document.getElementById('settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
        
        const creditsBtn = document.getElementById('credits');
        if (creditsBtn) {
            creditsBtn.addEventListener('click', () => {
                this.showCredits();
            });
        }
        
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        document.addEventListener('click', (event) => {
            if (this.locked && this.gameState === 'playing') {
                this.shoot();
            }
        });
        
        document.addEventListener('wheel', (event) => {
            if (this.locked && this.gameState === 'playing') {
                this.weaponSystem.switchWeapon(event.deltaY > 0 ? 1 : -1);
            }
        });
        
        window.addEventListener('resize', () => {
            this.gameEngine.handleResize();
        });
        
        // UI 이벤트 리스너
        window.addEventListener('resumeGame', () => {
            this.resumeGame();
        });
        
        window.addEventListener('exitGame', () => {
            this.returnToMenu();
        });
    }
    
    setupPointerLock() {
        const canvas = this.canvas;
        
        canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement === canvas;
            if (this.locked) {
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
            } else {
                document.removeEventListener('mousemove', this.onMouseMove.bind(this));
            }
        });
    }
    
    onMouseMove(event) {
        if (!this.locked || this.gameState !== 'playing') return;
        
        this.mouse.x += event.movementX * this.mouse.sensitivity;
        this.mouse.y += event.movementY * this.mouse.sensitivity;
        
        this.mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouse.y));
        
        if (this.gameEngine.player) {
            this.gameEngine.player.updateRotation(this.mouse.x, this.mouse.y);
        }
    }
    
    handleKeyDown(event) {
        if (this.gameState !== 'playing') return;
        
        switch (event.code) {
            case 'KeyR':
                this.weaponSystem.reload();
                break;
            case 'Digit1':
                this.weaponSystem.selectWeapon('pistol');
                break;
            case 'Digit2':
                this.weaponSystem.selectWeapon('rifle');
                break;
            case 'Digit3':
                this.weaponSystem.selectWeapon('shotgun');
                break;
            case 'Digit4':
                this.weaponSystem.selectWeapon('sniper');
                break;
            case 'Escape':
                this.pauseGame();
                break;
        }
    }
    
    startGame() {
        this.showLoading('게임을 초기화하는 중...');
        
        setTimeout(() => {
            this.initializeGame();
        }, 1000);
    }
    
    initializeGame() {
        this.gameState = 'playing';
        this.currentLevel = 1;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        this.playerHealth = this.maxPlayerHealth;
        this.levelStartTime = Date.now();
        
        this.gameEngine.createScene();
        this.levelManager.setScene(this.gameEngine.scene);
        this.levelManager.loadLevel(this.currentLevel);
        
        this.gameEngine.player = new Player('solo-player');
        this.gameEngine.scene.add(this.gameEngine.player.mesh);
        
        // 물리 세계에 플레이어 추가
        if (this.gameEngine.world) {
            const playerBody = this.gameEngine.player.ensurePhysicsBody();
            if (playerBody) {
                this.gameEngine.world.addBody(playerBody);
            }
        }
        
        this.hideLoading();
        this.hideMenu();
        this.uiManager.showGameUI();
        this.audioManager.playBackgroundMusic('cyberpunk-ambient');
        
        // 적 스폰 시작
        this.startEnemySpawning();
        this.startGameLoop();
    }
    
    showSettings() {
        alert('설정 기능은 향후 업데이트에서 추가될 예정입니다.');
    }
    
    showCredits() {
        alert('Cyberpunk FPS v1.0\\n개발: Claude Code\\n엔진: Three.js + Cannon.js');
    }
    
    startEnemySpawning() {
        this.enemySpawnInterval = setInterval(() => {
            if (this.gameState === 'playing' && this.enemies.size < 3) {
                this.spawnEnemy();
            }
        }, 5000);
    }
    
    spawnEnemy() {
        const enemyTypes = ['basic', 'fast', 'heavy'];
        const weights = this.currentLevel === 1 ? [0.8, 0.2, 0] :
                      this.currentLevel === 2 ? [0.6, 0.3, 0.1] :
                      this.currentLevel === 3 ? [0.5, 0.3, 0.2] :
                      [0.4, 0.3, 0.3];
        
        let random = Math.random();
        let selectedType = 'basic';
        
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) {
                selectedType = enemyTypes[i];
                break;
            }
            random -= weights[i];
        }
        
        const enemyId = `enemy_${Date.now()}_${Math.random()}`;
        const enemy = new Enemy(enemyId, selectedType);
        
        // 플레이어 주변에 스폰 (플레이어로부터 적당한 거리)
        const spawnRadius = 50 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;
        const playerPos = this.gameEngine.player.position;
        
        enemy.position.set(
            playerPos.x + Math.cos(angle) * spawnRadius,
            0,
            playerPos.z + Math.sin(angle) * spawnRadius
        );
        
        this.enemies.set(enemyId, enemy);
        this.gameEngine.scene.add(enemy.mesh);
    }
    
    startGameLoop() {
        this.gameLoopInterval = setInterval(() => {
            if (this.gameState === 'playing') {
                this.updateSoloGameState();
            }
        }, 1000 / 20); // 20fps로 감소
    }
    
    updateSoloGameState() {
        if (this.gameState !== 'playing') return;
        
        // 플레이어 상태 업데이트
        const playerData = {
            health: this.playerHealth,
            score: this.score,
            kills: this.kills,
            deaths: this.deaths
        };
        this.uiManager.updatePlayerStats(playerData);
        
        // 적 AI 업데이트
        for (const enemy of this.enemies.values()) {
            this.updateEnemyAI(enemy);
        }
        
        // 레벨 타이머 업데이트
        const elapsedTime = Date.now() - this.levelStartTime;
        const levelDuration = 8 * 60 * 1000; // 8분
        const timeLeft = Math.max(0, levelDuration - elapsedTime);
        
        this.uiManager.updateGameTimer(timeLeft);
        this.uiManager.updateLevel(this.currentLevel);
        
        // 레벨 완료 체크
        if (timeLeft <= 0 || this.checkLevelComplete()) {
            this.completeLevel();
        }
    }
    
    updateEnemyAI(enemy) {
        if (!enemy.isAlive || !this.gameEngine.player) return;
        
        const playerPos = this.gameEngine.player.position;
        const enemyPos = enemy.position;
        const distance = playerPos.distanceTo(enemyPos);
        
        // 플레이어를 향해 이동
        if (distance > 2) {
            const direction = new THREE.Vector3()
                .subVectors(playerPos, enemyPos)
                .normalize();
            
            const moveSpeed = enemy.type === 'fast' ? 20 : enemy.type === 'heavy' ? 8 : 12;
            const deltaTime = 1/60;
            
            enemyPos.add(direction.multiplyScalar(moveSpeed * deltaTime));
            enemy.updatePosition(enemyPos);
            
            // 플레이어를 바라보도록 회전
            const angle = Math.atan2(direction.x, direction.z);
            enemy.updateRotation({ x: 0, y: angle, z: 0 });
        }
        
        // 공격 범위 내에 있으면 공격 (공격 빈도 감소)
        if (distance < 5 && Date.now() - enemy.lastAttackTime > 3000) {
            this.enemyAttackPlayer(enemy);
            enemy.lastAttackTime = Date.now();
        }
    }
    
    enemyAttackPlayer(enemy) {
        const damage = enemy.type === 'heavy' ? 40 : enemy.type === 'fast' ? 20 : 25;
        
        // 실제 플레이어 체력 감소
        this.playerHealth = Math.max(0, this.playerHealth - damage);
        
        // UI 업데이트
        this.uiManager.showDamageEffect();
        this.uiManager.updatePlayerStats({
            health: this.playerHealth,
            score: this.score,
            kills: this.kills,
            deaths: this.deaths
        });
        
        this.audioManager.playSound('player-hit');
        
        console.log(`Enemy ${enemy.id} attacked player for ${damage} damage. Health: ${this.playerHealth}`);
        
        // 플레이어 사망 처리
        if (this.playerHealth <= 0) {
            this.handlePlayerDeath();
        }
    }
    
    checkLevelComplete() {
        const targetKills = this.currentLevel * 10;
        return this.kills >= targetKills;
    }
    
    completeLevel() {
        if (this.currentLevel >= this.maxLevel) {
            this.endGame();
        } else {
            this.nextLevel();
        }
    }
    
    nextLevel() {
        this.currentLevel++;
        this.levelStartTime = Date.now();
        this.enemies.clear();
        
        // 적 mesh들을 scene에서 제거
        for (const enemy of this.enemies.values()) {
            if (enemy.mesh) {
                this.gameEngine.scene.remove(enemy.mesh);
            }
        }
        this.enemies.clear();
        
        // 새 레벨 로드
        this.levelManager.loadLevel(this.currentLevel);
        
        // 무기 언락
        if (this.currentLevel === 2) {
            this.weaponSystem.addWeapon('rifle');
        } else if (this.currentLevel === 3) {
            this.weaponSystem.addWeapon('shotgun');
        } else if (this.currentLevel === 4) {
            this.weaponSystem.addWeapon('sniper');
        }
        
        this.uiManager.showLevelTransition(this.currentLevel);
    }
    
    removeEnemy(enemyId) {
        const enemy = this.enemies.get(enemyId);
        if (enemy) {
            this.gameEngine.scene.remove(enemy.mesh);
            enemy.dispose(); // 메모리 누수 방지
            this.enemies.delete(enemyId);
            this.audioManager.playSound('enemy-death');
        }
    }
    
    updateEnemyPosition(enemyData) {
        const enemy = this.enemies.get(enemyData.id);
        if (enemy) {
            enemy.updatePosition(enemyData.position);
            enemy.updateRotation(enemyData.rotation);
            enemy.setHealth(enemyData.health, enemyData.maxHealth);
        }
    }
    
    updateEnemyHealth(data) {
        const enemy = this.enemies.get(data.enemyId);
        if (enemy) {
            enemy.setHealth(data.health);
            enemy.showDamage(data.damage);
        }
    }
    
    handleEnemyAttack(data) {
        if (data.targetId === this.playerId) {
            this.uiManager.showDamageEffect();
            this.audioManager.playSound('player-hit');
        }
    }
    
    addProjectile(projectileData) {
        if (!this.gameEngine.scene) {
            console.warn('Scene not ready, skipping projectile add');
            return;
        }
        
        const projectile = this.weaponSystem.createProjectile(projectileData);
        this.projectiles.push(projectile);
        this.gameEngine.scene.add(projectile.mesh);
        
        if (projectileData.playerId === this.playerId) {
            this.audioManager.playWeaponSound(projectileData.weapon);
        }
    }
    
    shoot() {
        if (!this.weaponSystem.canShoot()) return;
        
        const camera = this.gameEngine.camera;
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        
        const position = camera.position.clone();
        position.add(direction.clone().multiplyScalar(2));
        
        // 솔로플레이에서는 직접 발사체 생성
        const projectileData = {
            id: `projectile_${Date.now()}_${Math.random()}`,
            playerId: 'solo-player',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            direction: {
                x: direction.x,
                y: direction.y,
                z: direction.z
            },
            weapon: this.weaponSystem.currentWeapon,
            speed: 200,
            damage: this.weaponSystem.weapons[this.weaponSystem.currentWeapon].damage,
            range: this.weaponSystem.weapons[this.weaponSystem.currentWeapon].range,
            startTime: Date.now()
        };
        
        const projectile = this.weaponSystem.createProjectile(projectileData);
        this.projectiles.push(projectile);
        this.gameEngine.scene.add(projectile.mesh);
        
        this.weaponSystem.shoot();
        this.uiManager.updateAmmo(this.weaponSystem.getCurrentAmmo());
        this.audioManager.playWeaponSound(projectileData.weapon);
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.handleMovement(deltaTime);
        this.updateProjectiles(deltaTime);
        this.gameEngine.update(deltaTime);
        
        this.checkCollisions();
    }
    
    handleMovement(deltaTime) {
        if (!this.gameEngine.player || !this.locked) return;
        
        const moveVector = new THREE.Vector3();
        const speed = 50;
        
        // WASD와 방향키 모두 지원
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.x += 1;
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(speed * deltaTime / 1000);
            
            const camera = this.gameEngine.camera;
            moveVector.applyQuaternion(camera.quaternion);
            moveVector.y = 0;
            
            this.gameEngine.player.move(moveVector);
        }
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            if (projectile.shouldRemove()) {
                this.gameEngine.scene.remove(projectile.mesh);
                projectile.dispose(); // 메모리 누수 방지
                this.projectiles.splice(i, 1);
            }
        }
        
        // 최대 발사체 수 제한 (GPU 부하 감소)
        if (this.projectiles.length > 10) {
            const oldProjectile = this.projectiles.shift();
            this.gameEngine.scene.remove(oldProjectile.mesh);
            oldProjectile.dispose();
        }
    }
    
    checkCollisions() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            for (const [enemyId, enemy] of this.enemies) {
                if (projectile.intersects(enemy)) {
                    // 적에게 데미지 입히기
                    const isDead = enemy.takeDamage(projectile.damage);
                    enemy.showDamage(projectile.damage);
                    
                    if (isDead) {
                        this.removeEnemy(enemyId);
                        this.kills++;
                        this.score += enemy.type === 'heavy' ? 100 : enemy.type === 'fast' ? 75 : 50;
                        this.uiManager.updateScore(this.score);
                        this.audioManager.playSound('enemy-death');
                    }
                    
                    // 발사체 제거 및 메모리 해제
                    this.gameEngine.scene.remove(projectile.mesh);
                    projectile.dispose();
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'paused';
        this.uiManager.showPauseMenu();
        
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        console.log('Game paused');
    }
    
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        this.gameState = 'playing';
        this.uiManager.hidePauseMenu();
        
        console.log('Game resumed');
    }
    
    returnToMenu() {
        this.gameState = 'menu';
        
        // 게임 루프 정리
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        
        // 적 제거 및 메모리 해제
        for (const enemy of this.enemies.values()) {
            if (enemy.mesh) {
                this.gameEngine.scene.remove(enemy.mesh);
            }
            enemy.dispose();
        }
        this.enemies.clear();
        
        // 발사체 제거 및 메모리 해제
        for (const projectile of this.projectiles) {
            if (projectile.mesh) {
                this.gameEngine.scene.remove(projectile.mesh);
            }
            projectile.dispose();
        }
        this.projectiles = [];
        
        this.uiManager.hideGameUI();
        this.audioManager.stopBackgroundMusic();
        
        // 강제 가비지 콜렉션 (메모리 누수 방지)
        if (window.gc) {
            window.gc();
        }
        
        console.log('Returned to menu');
    }
    
    handlePlayerDeath() {
        console.log('Player died!');
        this.deaths++;
        this.playerHealth = this.maxPlayerHealth;
        
        // 플레이어를 안전한 위치로 리스폰
        if (this.gameEngine.player) {
            this.gameEngine.player.position.set(0, 5, 0);
            if (this.gameEngine.player.body) {
                this.gameEngine.player.body.position.set(0, 5, 0);
                this.gameEngine.player.body.velocity.set(0, 0, 0);
            }
        }
        
        // 체력 회복 알림
        this.uiManager.showNotification('부활했습니다!', 'info', 2000);
    }
    
    endGame() {
        this.gameState = 'ended';
        
        // 게임 루프 정리
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        
        const finalScores = [{
            name: 'Player',
            score: this.score,
            kills: this.kills,
            deaths: this.deaths
        }];
        
        this.uiManager.showEndGameScreen(finalScores);
        this.audioManager.stopBackgroundMusic();
    }
    
    showLoading(text) {
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loadingText');
        
        if (loading) {
            loading.style.display = 'block';
        }
        
        if (loadingText) {
            loadingText.textContent = text;
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    hideMenu() {
        const menu = document.getElementById('menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    animate() {
        // 게임이 메뉴 상태일 때 애니메이션 정지
        if (this.gameState === 'menu' || this.gameState === 'paused') {
            setTimeout(() => this.animate(), 100); // 10fps로 딱히 메뉴 체크만
            return;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = currentTime - (this.lastTime || currentTime);
        this.lastTime = currentTime;
        
        // 30fps로 제한
        if (deltaTime < 33) return;
        
        // 게임이 실행 중일 때만 업데이트
        if (this.gameState === 'playing') {
            this.update(deltaTime);
            
            // 렌더링도 게임 중일 때만
            if (this.gameEngine && this.gameEngine.scene) {
                this.gameEngine.render();
            }
        }
    }
}

// DOM이 로드되면 게임 인스턴스 생성
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const game = new CyberpunkFPS();
    });
} else {
    const game = new CyberpunkFPS();
}

export default CyberpunkFPS;