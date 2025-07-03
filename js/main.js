import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import GameEngine from './GameEngine.js';
import Player from './Player.js';
import Enemy from './Enemy.js';
import WeaponSystem from './WeaponSystem.js';
import UIManager from './UIManager.js';

class CyberpunkFPS {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gameEngine = new GameEngine(this.canvas);
        
        // 게임 시스템들
        this.player = null;
        this.enemies = new Map();
        this.projectiles = [];
        this.weaponSystem = new WeaponSystem();
        this.uiManager = new UIManager();
        
        // 게임 상태
        this.gameState = 'menu'; // menu, loading, playing, paused, ended
        this.currentLevel = 1;
        this.maxLevel = 4;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        
        // 스테이지 시스템
        this.stageTimeLimit = 60000; // 60초 제한
        this.stageTargetScore = 500; // 목표 점수
        this.stageStartTime = null;
        this.stageTimeRemaining = 0;
        this.stageCompleting = false; // 스테이지 완료 중 플래그 추가
        
        // 입력 및 컨트롤
        this.keys = {};
        this.mouse = { x: 0, y: 0, sensitivity: 0.0005 }; // 민감도 1/4로 감소
        this.isPointerLocked = false;
        
        // 게임 루프
        this.animationId = null;
        this.lastTime = 0;
        
        // 게임 타이머
        this.enemySpawnInterval = null;
        this.gameLoopInterval = null;
        this.levelStartTime = null;
        
        this.init();
    }
    
    async init() {
        console.log('CyberpunkFPS 초기화 시작...');
        
        try {
            // UI 초기화
            this.uiManager.init();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            this.setupPointerLock();
            
            // 게임 엔진 초기화
            const engineReady = await this.gameEngine.init();
            if (!engineReady) {
                throw new Error('GameEngine 초기화 실패');
            }
            
            // 애니메이션 루프 시작
            this.startAnimationLoop();
            
            console.log('CyberpunkFPS 초기화 완료');
            
        } catch (error) {
            console.error('CyberpunkFPS 초기화 실패:', error);
            this.uiManager.showNotification('게임 초기화 실패', 'error');
        }
    }
    
    setupEventListeners() {
        // 메뉴 버튼들
        document.getElementById('startGame')?.addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('settings')?.addEventListener('click', () => {
            this.uiManager.showNotification('설정 기능은 추후 업데이트 예정입니다', 'info');
        });
        
        document.getElementById('credits')?.addEventListener('click', () => {
            this.uiManager.showNotification('Cyberpunk FPS v2.0 - Three.js + Cannon.js', 'info', 5000);
        });
        
        // 키보드 입력
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // 마우스 입력
        document.addEventListener('click', (event) => {
            if (this.isPointerLocked && this.gameState === 'playing') {
                this.shoot();
            }
        });
        
        document.addEventListener('wheel', (event) => {
            if (this.isPointerLocked && this.gameState === 'playing') {
                event.preventDefault();
                const direction = event.deltaY > 0 ? 1 : -1;
                this.weaponSystem.switchWeapon(direction);
                this.updateAmmoUI();
                this.uiManager.showNotification(`무기 변경: ${this.weaponSystem.weapons[this.weaponSystem.currentWeapon].name}`, 'info', 1500);
            }
        }, { passive: false });
        
        // 창 크기 변경
        window.addEventListener('resize', () => {
            this.gameEngine.handleResize();
        });
    }
    
    setupPointerLock() {
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
            
            if (this.isPointerLocked) {
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
            } else {
                document.removeEventListener('mousemove', this.onMouseMove.bind(this));
            }
        });
    }
    
    onMouseMove(event) {
        if (!this.isPointerLocked || this.gameState !== 'playing') return;
        
        // 마우스 방향 수정 (정상적인 FPS 컨트롤)
        this.mouse.x -= event.movementX * this.mouse.sensitivity; // 좌우 반전
        this.mouse.y -= event.movementY * this.mouse.sensitivity; // 위아래 반전
        
        // 수직 시야 제한
        this.mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouse.y));
        
        // 플레이어 회전 업데이트
        if (this.player) {
            this.player.updateRotation(this.mouse.x, this.mouse.y);
        }
        
        // 카메라 회전 업데이트 (FPS 스타일)
        if (this.gameEngine.camera) {
            this.gameEngine.camera.rotation.order = 'YXZ';
            this.gameEngine.camera.rotation.y = this.mouse.x;
            this.gameEngine.camera.rotation.x = this.mouse.y;
            this.gameEngine.camera.rotation.z = 0; // Z축 회전 방지
        }
    }
    
    handleKeyDown(event) {
        if (this.gameState !== 'playing') return;
        
        switch (event.code) {
            case 'KeyR':
                this.weaponSystem.reload();
                this.updateAmmoUI();
                break;
            case 'Digit1':
                if (this.weaponSystem.selectWeapon('pistol')) {
                    this.updateAmmoUI();
                    this.uiManager.showNotification(`무기 선택: ${this.weaponSystem.weapons.pistol.name}`, 'info', 1500);
                }
                break;
            case 'Digit2':
                if (this.weaponSystem.selectWeapon('rifle')) {
                    this.updateAmmoUI();
                    this.uiManager.showNotification(`무기 선택: ${this.weaponSystem.weapons.rifle.name}`, 'info', 1500);
                } else {
                    this.uiManager.showNotification('라이플이 잠금 해제되지 않았습니다', 'error', 1500);
                }
                break;
            case 'Digit3':
                if (this.weaponSystem.selectWeapon('shotgun')) {
                    this.updateAmmoUI();
                    this.uiManager.showNotification(`무기 선택: ${this.weaponSystem.weapons.shotgun.name}`, 'info', 1500);
                } else {
                    this.uiManager.showNotification('샷건이 잠금 해제되지 않았습니다', 'error', 1500);
                }
                break;
            case 'Digit4':
                if (this.weaponSystem.selectWeapon('sniper')) {
                    this.updateAmmoUI();
                    this.uiManager.showNotification(`무기 선택: ${this.weaponSystem.weapons.sniper.name}`, 'info', 1500);
                } else {
                    this.uiManager.showNotification('저격총이 잠금 해제되지 않았습니다', 'error', 1500);
                }
                break;
            case 'Space':
                event.preventDefault();
                if (this.player) {
                    this.player.jump();
                }
                break;
            case 'Escape':
                this.pauseGame();
                break;
        }
    }
    
    async startGame() {
        console.log('게임 시작...');
        
        this.uiManager.showLoading('게임을 초기화하는 중...');
        this.gameState = 'loading';
        
        // 로딩 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            this.initializeGame();
            this.uiManager.showNotification('게임 시작!', 'success', 2000);
        } catch (error) {
            console.error('게임 시작 실패:', error);
            this.uiManager.showNotification('게임 시작 실패', 'error');
            this.gameState = 'menu';
            this.uiManager.hideLoading();
            this.uiManager.showMenu();
        }
    }
    
    initializeGame() {
        // 게임 상태 초기화
        this.gameState = 'playing';
        this.currentLevel = 1;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        this.levelStartTime = Date.now();
        
        // 스테이지 시스템 초기화
        this.stageStartTime = Date.now();
        this.stageTargetScore = 300 + (this.currentLevel * 200); // 레벨당 목표 점수 증가
        this.stageTimeLimit = 90000 - (this.currentLevel * 10000); // 시간은 점점 짧아짐
        this.stageTimeRemaining = this.stageTimeLimit;
        this.stageCompleting = false; // 플래그 초기화
        
        // 플레이어 생성
        this.player = new Player('player-1');
        this.gameEngine.scene.add(this.player.mesh);
        this.gameEngine.world.addBody(this.player.body);
        this.player.showWeapon();
        
        // 카메라를 플레이어 위치로 이동 (눈높이)
        this.gameEngine.camera.position.copy(this.player.position);
        this.gameEngine.camera.position.y += 2.5;
        
        // UI 표시
        this.uiManager.hideLoading();
        this.uiManager.showGameUI();
        this.updatePlayerUI();
        this.updateAmmoUI();
        
        // 적 스폰 시작
        this.startEnemySpawning();
        
        // 게임 루프 시작
        this.startGameLoop();
        
        // 첫 스테이지 정보 표시
        setTimeout(() => {
            this.uiManager.showNotification(
                `🚀 스테이지 ${this.currentLevel} 시작! 목표: ${this.stageTargetScore}점 (${this.stageTimeLimit/1000}초)`, 
                'info', 
                4000
            );
        }, 1000);
        
        console.log('게임 초기화 완료');
    }
    
    startEnemySpawning() {
        this.enemySpawnInterval = setInterval(async () => {
            if (this.gameState === 'playing' && this.enemies.size < 5) {
                await this.spawnEnemy();
            }
        }, 3000);
    }
    
    async spawnEnemy() {
        const enemyTypes = ['basic', 'fast', 'heavy'];
        const weights = [0.6, 0.3, 0.1]; // 기본, 빠름, 중장갑 비율
        
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
        
        try {
            const enemy = new Enemy(enemyId, selectedType);
            
            // Enemy 초기화가 완료될 때까지 대기
            // Enemy의 init()이 완료되면 mesh와 body가 준비됨
            
            // 플레이어 주변에 스폰 (적당한 거리)
            const spawnRadius = 40 + Math.random() * 30;
            const angle = Math.random() * Math.PI * 2;
            const playerPos = this.player.position;
            
            // FBX 모델에 맞게 스폰 높이 조정
            const spawnHeight = 30 * enemy.stats.scale; // FBX 모델 높이에 맞춤
            
            enemy.position.set(
                playerPos.x + Math.cos(angle) * spawnRadius,
                spawnHeight, // FBX 모델에 맞게 조정
                playerPos.z + Math.sin(angle) * spawnRadius
            );
            
            // 물리 바디 위치도 설정 (Enemy의 init이 완료된 후)
            setTimeout(() => {
                if (enemy.body) {
                    enemy.body.position.set(
                        enemy.position.x,
                        spawnHeight,
                        enemy.position.z
                    );
                }
            }, 100); // 짧은 딜레이로 init 완료 보장
            
            // 타겟 설정
            enemy.setTarget(this.player);
            
            // 카메라 참조 설정 (빌보드 효과를 위해)
            enemy.setCamera(this.gameEngine.camera);
            
            // 씬에 추가 (mesh가 준비되면)
            setTimeout(() => {
                if (enemy.mesh && enemy.body) {
                    this.enemies.set(enemyId, enemy);
                    this.gameEngine.scene.add(enemy.mesh);
                    this.gameEngine.world.addBody(enemy.body);
                    console.log(`${selectedType} 타입 적 스폰 완료:`, enemyId);
                }
            }, 200); // FBX 로딩을 위한 적절한 딜레이
            
        } catch (error) {
            console.error('적 스폰 실패:', error);
        }
    }
    
    startGameLoop() {
        this.gameLoopInterval = setInterval(() => {
            if (this.gameState === 'playing') {
                this.updateGameLogic();
            }
        }, 1000 / 10); // 10fps로 늘려서 더 자주 체크
    }
    
    updateGameLogic() {
        // 게임 로직이 실행되는지 확인 (가끔씩 로그)
        if (Math.random() < 0.1) {
            console.log(`🎮 게임 로직 업데이트 중... 적 수: ${this.enemies.size}, 플레이어 살아있음: ${this.player?.isAlive}`);
        }
        
        // 적들 AI 업데이트
        for (const enemy of this.enemies.values()) {
            if (enemy.isAlive && this.player && this.player.isAlive) {
                enemy.updateAI(1/30);
                
                // 거리 기반 공격 체크
                const distance = enemy.position.distanceTo(this.player.position);
                
                // 디버그: 모든 적의 거리 로그 (더 자주)
                if (Date.now() % 2000 < 200) { // 2초마다
                    console.log(`🎯 적 ${enemy.type} | 거리: ${distance.toFixed(2)} | 공격범위: ${enemy.stats.attackRange} | 공격가능: ${enemy.canAttack()} | 적위치: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}, ${enemy.position.z.toFixed(1)}) | 플레이어위치: (${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)})`);
                }
                
                // 실제 공격 처리: 범위 내이고 공격 가능한 상태일 때
                if (distance <= enemy.stats.attackRange && enemy.canAttack()) {
                    console.log(`🔥 적 ${enemy.type}이 거리 ${distance.toFixed(2)}에서 실제 공격 실행!`);
                    this.handleEnemyAttack(enemy);
                }
            }
        }
        
        // 플레이어 UI 업데이트
        this.updatePlayerUI();
        
        // 스테이지 진행 체크
        this.checkStageProgress();
    }
    
    handleEnemyAttack(enemy) {
        const distance = enemy.position.distanceTo(this.player.position);
        const damage = enemy.stats.damage;
        
        console.log(`⚔️ 공격 처리 시작 - 적: ${enemy.type}, 거리: ${distance.toFixed(2)}, 데미지: ${damage}`);
        
        // 적의 공격 쿨다운 설정 (먼저 실행)
        enemy.attack();
        console.log(`🕒 적 ${enemy.type} 공격 쿨다운 설정됨`);
        
        // 플레이어에게 데미지 적용
        const oldHealth = this.player.health;
        const isDead = this.player.takeDamage(damage);
        const newHealth = this.player.health;
        
        console.log(`💔 HP 변화: ${oldHealth} -> ${newHealth} (데미지: ${damage})`);
        
        // UI 효과 및 알림
        this.uiManager.showDamageEffect();
        this.uiManager.showNotification(`-${damage} HP`, 'error', 1000);
        
        // 즉시 UI 업데이트
        this.updatePlayerUI();
        
        console.log(`✅ UI 업데이트 완료. 현재 HP: ${this.player.health}`);
        
        if (isDead) {
            console.log('💀 플레이어 사망 처리');
            this.handlePlayerDeath();
        }
    }
    
    handlePlayerDeath() {
        this.deaths++;
        this.uiManager.showNotification('사망! 3초 후 부활...', 'error', 3000);
        
        setTimeout(() => {
            this.player.respawn();
            this.gameEngine.camera.position.copy(this.player.position);
            this.gameEngine.camera.position.y += 2.5;
            this.uiManager.showNotification('부활!', 'success', 1500);
        }, 3000);
    }
    
    checkStageProgress() {
        // 스테이지 완료 중이면 체크 중단
        if (this.stageCompleting) return;
        
        const now = Date.now();
        const elapsed = now - this.stageStartTime;
        this.stageTimeRemaining = Math.max(0, this.stageTimeLimit - elapsed);
        
        // 목표 점수 달성 시 스테이지 클리어 (한 번만 실행)
        if (this.score >= this.stageTargetScore && !this.stageCompleting) {
            console.log(`🎉 스테이지 ${this.currentLevel} 클리어! 점수: ${this.score}/${this.stageTargetScore}, 남은시간: ${(this.stageTimeRemaining/1000).toFixed(1)}초`);
            this.stageCompleting = true; // 플래그 설정으로 중복 실행 방지
            this.completeStage();
        }
        // 시간 초과 시 게임 오버 (한 번만 실행)
        else if (this.stageTimeRemaining <= 0 && !this.stageCompleting) {
            console.log(`⏰ 시간 초과! 점수: ${this.score}/${this.stageTargetScore}`);
            this.stageCompleting = true; // 플래그 설정으로 중복 실행 방지
            this.stageTimeOut();
        }
        
        // UI에 시간과 목표 점수 표시 (1초마다)
        if (elapsed % 1000 < 100) {
            this.updateStageUI();
        }
    }
    
    completeStage() {
        this.uiManager.showNotification(`🎉 스테이지 ${this.currentLevel} 클리어!`, 'success', 3000);
        
        if (this.currentLevel >= this.maxLevel) {
            this.endGame();
        } else {
            setTimeout(() => {
                this.nextStage();
            }, 2000);
        }
    }
    
    stageTimeOut() {
        this.uiManager.showNotification(`⏰ 시간 초과! 목표: ${this.stageTargetScore}, 달성: ${this.score}`, 'error', 4000);
        setTimeout(() => {
            this.endGame();
        }, 3000);
    }
    
    updateStageUI() {
        const timeLeft = Math.ceil(this.stageTimeRemaining / 1000);
        this.uiManager.showNotification(
            `⏰ ${timeLeft}초 | 🎯 ${this.score}/${this.stageTargetScore}점`, 
            'info', 
            1000
        );
    }
    
    completeLevel() {
        if (this.currentLevel >= this.maxLevel) {
            this.endGame();
        } else {
            this.nextLevel();
        }
    }
    
    nextStage() {
        this.currentLevel++;
        this.levelStartTime = Date.now();
        
        // 스테이지 시스템 업데이트
        this.stageStartTime = Date.now();
        this.stageTargetScore = 300 + (this.currentLevel * 200);
        this.stageTimeLimit = Math.max(30000, 90000 - (this.currentLevel * 15000)); // 최소 30초
        this.stageTimeRemaining = this.stageTimeLimit;
        this.stageCompleting = false; // 새 스테이지 시작시 플래그 리셋
        
        // 적들 제거
        this.clearEnemies();
        
        // 새 무기 언락
        if (this.currentLevel === 2) {
            this.weaponSystem.addWeapon('rifle');
            this.uiManager.showNotification('라이플 잠금 해제!', 'success', 3000);
        } else if (this.currentLevel === 3) {
            this.weaponSystem.addWeapon('shotgun');
            this.uiManager.showNotification('샷건 잠금 해제!', 'success', 3000);
        } else if (this.currentLevel === 4) {
            this.weaponSystem.addWeapon('sniper');
            this.uiManager.showNotification('저격총 잠금 해제!', 'success', 3000);
        }
        
        this.uiManager.showNotification(
            `🚀 스테이지 ${this.currentLevel} 시작! 목표: ${this.stageTargetScore}점 (${this.stageTimeLimit/1000}초)`, 
            'info', 
            4000
        );
        
        console.log(`새 스테이지 ${this.currentLevel}: 목표 ${this.stageTargetScore}점, 제한시간 ${this.stageTimeLimit/1000}초`);
    }
    
    nextLevel() {
        this.currentLevel++;
        this.levelStartTime = Date.now();
        
        // 적들 제거
        this.clearEnemies();
        
        // 새 무기 언락
        if (this.currentLevel === 2) {
            this.weaponSystem.addWeapon('rifle');
            this.uiManager.showNotification('라이플 잠금 해제!', 'success');
        } else if (this.currentLevel === 3) {
            this.weaponSystem.addWeapon('shotgun');
            this.uiManager.showNotification('샷건 잠금 해제!', 'success');
        } else if (this.currentLevel === 4) {
            this.weaponSystem.addWeapon('sniper');
            this.uiManager.showNotification('저격총 잠금 해제!', 'success');
        }
        
        this.uiManager.showLevelTransition(this.currentLevel);
    }
    
    clearEnemies() {
        for (const [enemyId, enemy] of this.enemies) {
            this.gameEngine.scene.remove(enemy.mesh);
            this.gameEngine.world.removeBody(enemy.body);
            enemy.dispose();
        }
        this.enemies.clear();
    }
    
    shoot() {
        if (!this.player || !this.player.isAlive) return;
        
        const shootPosition = this.player.getShootingPosition(this.gameEngine.camera);
        const shootDirection = this.player.getShootingDirection(this.gameEngine.camera);
        
        const projectiles = this.weaponSystem.shoot(shootPosition, shootDirection);
        
        if (projectiles && projectiles.length > 0) {
            projectiles.forEach(projectile => {
                this.projectiles.push(projectile);
                this.gameEngine.scene.add(projectile.mesh);
            });
            
            this.updateAmmoUI();
            
            // 무기별 사운드 효과 시뮬레이션
            const weaponName = this.weaponSystem.weapons[this.weaponSystem.currentWeapon].name;
            console.log(`${weaponName} 발사! 탄약: ${this.weaponSystem.currentAmmo}/${this.weaponSystem.reserveAmmo[this.weaponSystem.currentWeapon]}`);
            
            // 크로스헤어 점프 효과
            if (this.uiManager.elements.crosshair) {
                this.uiManager.elements.crosshair.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    if (this.uiManager.elements.crosshair) {
                        this.uiManager.elements.crosshair.style.transform = 'scale(1)';
                    }
                }, 100);
            }
        } else {
            // 발사 실패 (탄약 부족 등)
            console.log('발사 실패 - 탄약 부족 또는 재장전 중');
        }
    }
    
    updatePlayerUI() {
        this.uiManager.updatePlayerStats({
            health: this.player ? this.player.health : 100,
            score: this.score
        });
    }
    
    updateAmmoUI() {
        this.uiManager.updateAmmo(this.weaponSystem.getCurrentAmmo());
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // 플레이어 이동 처리
        this.handleMovement(deltaTime);
        
        // 게임 엔진 업데이트
        this.gameEngine.update(deltaTime);
        
        // 플레이어 업데이트
        if (this.player) {
            this.player.update(deltaTime);
            
            // 카메라를 플레이어 위치에 맞춤 (눈높이)
            this.gameEngine.camera.position.copy(this.player.position);
            this.gameEngine.camera.position.y += 2.5;
        }
        
        // 적들 업데이트
        for (const enemy of this.enemies.values()) {
            enemy.update(deltaTime);
        }
        
        // 발사체 업데이트
        this.updateProjectiles(deltaTime);
        
        // 충돌 검사
        this.checkCollisions();
        
        // UI 업데이트 (매 프레임마다)
        this.updatePlayerUI();
        this.updateAmmoUI();
        
        // 미니맵 업데이트
        if (this.player) {
            this.uiManager.updateMinimap(
                this.player.position,
                Array.from(this.enemies.values()),
                this.projectiles
            );
        }
    }
    
    handleMovement(deltaTime) {
        if (!this.player || !this.isPointerLocked) return;
        
        const moveVector = new THREE.Vector3();
        const speed = 15; // 플레이어 속도 더 증가
        
        // WASD와 방향키 모두 지원
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.x += 1;
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(speed);
            
            // 카메라 방향 기준으로 이동
            const cameraDirection = new THREE.Vector3();
            this.gameEngine.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0; // Y축 제거 (수평 이동만)
            cameraDirection.normalize();
            
            const right = new THREE.Vector3();
            right.crossVectors(this.gameEngine.camera.up, cameraDirection).normalize();
            
            const movement = new THREE.Vector3();
            movement.addScaledVector(right, -moveVector.x); // 좌우 반전
            movement.addScaledVector(cameraDirection, -moveVector.z);
            movement.y = 0;
            movement.normalize();
            
            this.player.move(movement);
        }
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            if (projectile.shouldRemove()) {
                this.gameEngine.scene.remove(projectile.mesh);
                projectile.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            for (const [enemyId, enemy] of this.enemies) {
                if (enemy.intersectsProjectile(projectile)) {
                    // 적에게 데미지
                    const isDead = enemy.takeDamage(projectile.damage);
                    
                    if (isDead) {
                        this.removeEnemy(enemyId);
                        this.kills++;
                        this.score += enemy.stats.maxHealth;
                        this.uiManager.showNotification(`+${enemy.stats.maxHealth} 점수!`, 'success', 1500);
                        console.log(`적 처치! 총 킬: ${this.kills}`);
                    }
                    
                    // 발사체 제거
                    this.gameEngine.scene.remove(projectile.mesh);
                    projectile.dispose();
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    removeEnemy(enemyId) {
        const enemy = this.enemies.get(enemyId);
        if (enemy) {
            this.gameEngine.scene.remove(enemy.mesh);
            this.gameEngine.world.removeBody(enemy.body);
            enemy.dispose();
            this.enemies.delete(enemyId);
        }
    }
    
    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'paused';
        
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        this.uiManager.showNotification('게임 일시정지 - ESC로 재개', 'info');
        
        setTimeout(() => {
            if (this.gameState === 'paused') {
                this.resumeGame();
            }
        }, 3000);
    }
    
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        this.gameState = 'playing';
        this.uiManager.showNotification('게임 재개!', 'success', 1000);
    }
    
    endGame() {
        this.gameState = 'ended';
        
        // 게임 루프 정지
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
            this.enemySpawnInterval = null;
        }
        
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // 게임 오버 화면 표시
        this.uiManager.showGameOverScreen(this.score, this.kills, this.deaths);
        
        console.log('게임 종료 - 최종 점수:', this.score);
    }
    
    startAnimationLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            // 업데이트
            this.update(deltaTime);
            
            // 렌더링
            this.gameEngine.render();
        };
        
        animate();
    }
    
    dispose() {
        // 애니메이션 루프 정지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // 게임 루프 정리
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        
        // 자원 정리
        this.clearEnemies();
        
        this.projectiles.forEach(projectile => {
            projectile.dispose();
        });
        this.projectiles = [];
        
        if (this.player) {
            this.player.dispose();
        }
        
        this.gameEngine.dispose();
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    const game = new CyberpunkFPS();
});

export default CyberpunkFPS;