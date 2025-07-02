class UIManager {
    constructor() {
        this.elements = {
            crosshair: null,
            hud: null,
            menu: null,
            loading: null,
            pauseMenu: null,
            endGameScreen: null
        };
        
        this.isGameUIVisible = false;
        this.damageOverlay = null;
        this.notifications = [];
    }
    
    init() {
        console.log('Initializing UIManager...');
        this.initializeElements();
    }
    
    initializeElements() {
        // 기본 UI 요소들 찾기
        this.elements.crosshair = document.getElementById('crosshair');
        this.elements.hud = document.getElementById('hud');
        this.elements.menu = document.getElementById('menu');
        this.elements.loading = document.getElementById('loading');
        
        console.log('UI Elements found:', {
            crosshair: !!this.elements.crosshair,
            hud: !!this.elements.hud,
            menu: !!this.elements.menu,
            loading: !!this.elements.loading
        });
        
        // 동적 UI 요소들 생성
        this.createPauseMenu();
        this.createEndGameScreen();
        this.createDamageOverlay();
        this.createNotificationSystem();
        this.createMinimap();
        
        this.setupEventListeners();
        
        console.log('UIManager initialized successfully');
    }
    
    createPauseMenu() {
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #00ffff;
            font-family: 'Courier New', monospace;
            z-index: 1000;
        `;
        
        pauseMenu.innerHTML = `
            <h2 style="margin-bottom: 40px; text-shadow: 0 0 20px #00ffff;">게임 일시정지</h2>
            <button class="menu-button" id="resumeGame">게임 계속</button>
            <button class="menu-button" id="gameSettings">설정</button>
            <button class="menu-button" id="exitGame">게임 종료</button>
        `;
        
        document.body.appendChild(pauseMenu);
        this.elements.pauseMenu = pauseMenu;
    }
    
    createEndGameScreen() {
        const endGameScreen = document.createElement('div');
        endGameScreen.id = 'endGameScreen';
        endGameScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(0, 0, 0, 0.9), rgba(26, 10, 31, 0.9));
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #00ffff;
            font-family: 'Courier New', monospace;
            z-index: 1000;
        `;
        
        endGameScreen.innerHTML = `
            <h1 style="margin-bottom: 30px; text-shadow: 0 0 30px #ff00ff;">미션 완료!</h1>
            <div id="finalScores" style="margin-bottom: 40px; text-align: center;"></div>
            <button class="menu-button" id="playAgain">다시 플레이</button>
            <button class="menu-button" id="backToMenu">메인 메뉴</button>
        `;
        
        document.body.appendChild(endGameScreen);
        this.elements.endGameScreen = endGameScreen;
    }
    
    createDamageOverlay() {
        // 이미 존재하는 오버레이 확인
        let existingOverlay = document.getElementById('damageOverlay');
        if (existingOverlay) {
            this.damageOverlay = existingOverlay;
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'damageOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, transparent 0%, rgba(255, 0, 0, 0.3) 100%);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 50;
        `;
        
        document.body.appendChild(overlay);
        this.damageOverlay = overlay;
    }
    
    createNotificationSystem() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 200;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
        this.notificationContainer = container;
    }
    
    createMinimap() {
        const minimap = document.getElementById('minimap');
        if (minimap) {
            const canvas = document.createElement('canvas');
            canvas.width = 180;
            canvas.height = 180;
            canvas.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 5px;
            `;
            
            minimap.appendChild(canvas);
            this.minimapCanvas = canvas;
            this.minimapContext = canvas.getContext('2d');
        }
    }
    
    setupEventListeners() {
        document.getElementById('resumeGame')?.addEventListener('click', () => {
            this.hidePauseMenu();
            // 게임 계속 이벤트 발생
            window.dispatchEvent(new CustomEvent('resumeGame'));
        });
        
        document.getElementById('exitGame')?.addEventListener('click', () => {
            this.showMenu();
            this.hidePauseMenu();
            // 게임 종료 이벤트 발생
            window.dispatchEvent(new CustomEvent('exitGame'));
        });
        
        document.getElementById('playAgain')?.addEventListener('click', () => {
            location.reload();
        });
        
        document.getElementById('backToMenu')?.addEventListener('click', () => {
            location.reload();
        });
    }
    
    showGameUI() {
        this.isGameUIVisible = true;
        
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = 'block';
        }
        
        if (this.elements.hud) {
            this.elements.hud.style.display = 'block';
        }
        
        if (this.elements.menu) {
            this.elements.menu.style.display = 'none';
        }
        
        this.updateCrosshair();
    }
    
    hideGameUI() {
        this.isGameUIVisible = false;
        
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = 'none';
        }
        
        if (this.elements.hud) {
            this.elements.hud.style.display = 'none';
        }
        
        console.log('Game UI hidden');
    }
    
    showMenu() {
        if (this.elements.menu) {
            this.elements.menu.style.display = 'flex';
        }
        this.hideGameUI();
    }
    
    showPauseMenu() {
        if (this.elements.pauseMenu) {
            this.elements.pauseMenu.style.display = 'flex';
        }
    }
    
    hidePauseMenu() {
        if (this.elements.pauseMenu) {
            this.elements.pauseMenu.style.display = 'none';
        }
    }
    
    showEndGameScreen(scores) {
        const scoresContainer = document.getElementById('finalScores');
        
        let scoresHTML = '<h3>최종 스코어</h3><div style="display: flex; flex-direction: column; gap: 10px;">';
        
        scores.forEach((score, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            scoresHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0, 255, 255, 0.1); border-radius: 5px; min-width: 300px;">
                    <span>${medal} ${rank}. ${score.name}</span>
                    <div style="text-align: right;">
                        <div>점수: ${score.score}</div>
                        <div style="font-size: 12px; opacity: 0.7;">킬: ${score.kills} | 데스: ${score.deaths}</div>
                    </div>
                </div>
            `;
        });
        
        scoresHTML += '</div>';
        scoresContainer.innerHTML = scoresHTML;
        
        if (this.elements.endGameScreen) {
            this.elements.endGameScreen.style.display = 'flex';
        }
        this.hideGameUI();
    }
    
    updatePlayerStats(playerData) {
        const healthElement = document.getElementById('health');
        const scoreElement = document.getElementById('score');
        
        if (healthElement) {
            healthElement.textContent = Math.max(0, Math.floor(playerData.health));
            
            const healthPercent = playerData.health / 100;
            if (healthPercent > 0.6) {
                healthElement.style.color = '#00ff00';
            } else if (healthPercent > 0.3) {
                healthElement.style.color = '#ffff00';
            } else {
                healthElement.style.color = '#ff0000';
            }
        }
        
        if (scoreElement) {
            scoreElement.textContent = playerData.score;
        }
    }
    
    updateAmmo(ammoData) {
        const ammoElement = document.getElementById('ammo');
        const weaponElement = document.getElementById('weapon');
        
        if (ammoElement) {
            const ammoText = `${ammoData.current}/${ammoData.reserve}`;
            ammoElement.textContent = ammoText;
            
            if (ammoData.current === 0) {
                ammoElement.style.color = '#ff0000';
            } else if (ammoData.current < 5) {
                ammoElement.style.color = '#ffff00';
            } else {
                ammoElement.style.color = '#00ffff';
            }
        }
        
        if (weaponElement) {
            weaponElement.textContent = ammoData.weapon.toUpperCase();
            
            if (ammoData.isReloading) {
                weaponElement.textContent += ' (재장전...)';
            }
        }
    }
    
    updateScore(score) {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = score;
        }
    }
    
    updateGameTimer(timeLeft) {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        const timerElement = document.getElementById('gameTimer') || this.createTimerElement();
        timerElement.textContent = `시간: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft < 30000) {
            timerElement.style.color = '#ff0000';
            timerElement.style.animation = 'blink 1s infinite';
        } else {
            timerElement.style.color = '#00ffff';
            timerElement.style.animation = 'none';
        }
    }
    
    createTimerElement() {
        const timer = document.createElement('div');
        timer.id = 'gameTimer';
        timer.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ffff;
            font-size: 18px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 0 10px #00ffff;
            z-index: 100;
        `;
        
        document.body.appendChild(timer);
        return timer;
    }
    
    updateLevel(level) {
        const levelElement = document.getElementById('currentLevel') || this.createLevelElement();
        levelElement.textContent = `레벨: ${level}/4`;
    }
    
    createLevelElement() {
        const levelEl = document.createElement('div');
        levelEl.id = 'currentLevel';
        levelEl.style.cssText = `
            position: absolute;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ffff;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 0 10px #00ffff;
            z-index: 100;
        `;
        
        document.body.appendChild(levelEl);
        return levelEl;
    }
    
    showLevelTransition(level) {
        const transition = document.createElement('div');
        transition.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff00ff;
            font-size: 48px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 0 30px #ff00ff;
            z-index: 500;
            animation: levelTransition 3s ease-out forwards;
        `;
        
        transition.textContent = `레벨 ${level}`;
        document.body.appendChild(transition);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes levelTransition {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            document.body.removeChild(transition);
            document.head.removeChild(style);
        }, 3000);
    }
    
    showDamageEffect() {
        // 데미지 오버레이가 없으면 생성
        if (!this.damageOverlay) {
            this.createDamageOverlay();
        }
        
        if (!this.damageOverlay) {
            console.warn('Failed to create damage overlay');
            return;
        }
        
        this.damageOverlay.style.opacity = '1';
        
        setTimeout(() => {
            if (this.damageOverlay) {
                this.damageOverlay.style.opacity = '0';
            }
        }, 200);
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: rgba(${type === 'error' ? '255, 0, 0' : type === 'success' ? '0, 255, 0' : '0, 255, 255'}, 0.9);
            color: white;
            padding: 10px 20px;
            margin: 5px 0;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            text-align: center;
            animation: slideInFromTop 0.3s ease-out;
            box-shadow: 0 0 20px rgba(${type === 'error' ? '255, 0, 0' : type === 'success' ? '0, 255, 0' : '0, 255, 255'}, 0.5);
        `;
        
        notification.textContent = message;
        this.notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutToTop 0.3s ease-in forwards';
            setTimeout(() => {
                if (this.notificationContainer.contains(notification)) {
                    this.notificationContainer.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromTop {
                0% { transform: translateY(-100%); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideOutToTop {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-100%); opacity: 0; }
            }
        `;
        
        if (!document.head.querySelector('style[data-notifications]')) {
            style.setAttribute('data-notifications', 'true');
            document.head.appendChild(style);
        }
    }
    
    updateCrosshair() {
        if (!this.elements.crosshair) return;
        
        const crosshair = this.elements.crosshair;
        
        crosshair.style.borderColor = '#00ffff';
        crosshair.style.boxShadow = '0 0 10px #00ffff';
        
        const pulseAnimation = `
            @keyframes crosshairPulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); }
            }
        `;
        
        const existingStyle = document.head.querySelector('style[data-crosshair]');
        if (!existingStyle) {
            const style = document.createElement('style');
            style.setAttribute('data-crosshair', 'true');
            style.textContent = pulseAnimation;
            document.head.appendChild(style);
        }
    }
    
    updateMinimap(playerPosition, enemies, otherPlayers) {
        if (!this.minimapContext) return;
        
        const ctx = this.minimapContext;
        const canvas = this.minimapCanvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const scale = 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const worldToMinimap = (worldPos) => ({
            x: centerX + (worldPos.x - playerPosition.x) * scale,
            y: centerY + (worldPos.z - playerPosition.z) * scale
        });
        
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
        
        enemies.forEach(enemy => {
            const pos = worldToMinimap(enemy.position);
            if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
            }
        });
        
        otherPlayers.forEach(player => {
            const pos = worldToMinimap(player.position);
            if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
            }
        });
    }
    
    showKillFeed(killerName, victimName, weapon) {
        const killFeed = document.getElementById('killFeed') || this.createKillFeed();
        
        const killEntry = document.createElement('div');
        killEntry.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            padding: 5px 10px;
            margin: 2px 0;
            border-left: 3px solid #ff0000;
            font-size: 12px;
            animation: fadeInOut 5s ease-out forwards;
        `;
        
        killEntry.innerHTML = `<span style="color: #00ffff;">${killerName}</span> → <span style="color: #ff0000;">${victimName}</span> [${weapon}]`;
        
        killFeed.appendChild(killEntry);
        
        setTimeout(() => {
            if (killFeed.contains(killEntry)) {
                killFeed.removeChild(killEntry);
            }
        }, 5000);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(100%); }
                10% { opacity: 1; transform: translateX(0); }
                90% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(-100%); }
            }
        `;
        
        if (!document.head.querySelector('style[data-killfeed]')) {
            style.setAttribute('data-killfeed', 'true');
            document.head.appendChild(style);
        }
    }
    
    createKillFeed() {
        const killFeed = document.createElement('div');
        killFeed.id = 'killFeed';
        killFeed.style.cssText = `
            position: absolute;
            top: 80px;
            right: 20px;
            width: 300px;
            font-family: 'Courier New', monospace;
            z-index: 150;
        `;
        
        document.body.appendChild(killFeed);
        return killFeed;
    }
}

export default UIManager;