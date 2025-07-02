class UIManager {
    constructor() {
        this.elements = {
            menu: null,
            loading: null,
            hud: null,
            crosshair: null,
            minimap: null,
            damageOverlay: null
        };
        
        this.isGameUIVisible = false;
        this.notifications = [];
        this.minimapCanvas = null;
        this.minimapContext = null;
    }
    
    init() {
        console.log('UIManager 초기화...');
        this.initializeElements();
        this.setupEventListeners();
        this.setupMinimap();
        this.createNotificationSystem();
        console.log('UIManager 초기화 완료');
    }
    
    initializeElements() {
        this.elements.menu = document.getElementById('menu');
        this.elements.loading = document.getElementById('loading');
        this.elements.hud = document.getElementById('hud');
        this.elements.crosshair = document.getElementById('crosshair');
        this.elements.minimap = document.getElementById('minimap');
        this.elements.damageOverlay = document.getElementById('damageOverlay');
        
        console.log('UI 요소 초기화:', {
            menu: !!this.elements.menu,
            loading: !!this.elements.loading,
            hud: !!this.elements.hud,
            crosshair: !!this.elements.crosshair,
            minimap: !!this.elements.minimap,
            damageOverlay: !!this.elements.damageOverlay
        });
    }
    
    setupEventListeners() {
        // 메뉴 버튼 이벤트는 main.js에서 처리
        console.log('UI 이벤트 리스너 설정 완료');
    }
    
    setupMinimap() {
        if (this.elements.minimap) {
            const canvas = document.createElement('canvas');
            canvas.width = 180;
            canvas.height = 180;
            canvas.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 8px;
            `;
            
            this.elements.minimap.appendChild(canvas);
            this.minimapCanvas = canvas;
            this.minimapContext = canvas.getContext('2d');
        }
    }
    
    createNotificationSystem() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 200;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        document.body.appendChild(container);
        this.notificationContainer = container;
    }
    
    showMenu() {
        if (this.elements.menu) {
            this.elements.menu.style.display = 'flex';
        }
        this.hideGameUI();
    }
    
    hideMenu() {
        if (this.elements.menu) {
            this.elements.menu.style.display = 'none';
        }
    }
    
    showLoading(text = '게임을 로딩 중...') {
        if (this.elements.loading) {
            this.elements.loading.style.display = 'block';
            const loadingText = this.elements.loading.querySelector('div');
            if (loadingText) {
                loadingText.textContent = text;
            }
        }
    }
    
    hideLoading() {
        if (this.elements.loading) {
            this.elements.loading.style.display = 'none';
        }
    }
    
    showGameUI() {
        this.isGameUIVisible = true;
        
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = 'block';
        }
        
        if (this.elements.hud) {
            this.elements.hud.style.display = 'block';
        }
        
        if (this.elements.minimap) {
            this.elements.minimap.style.display = 'block';
        }
        
        this.hideMenu();
        this.hideLoading();
    }
    
    hideGameUI() {
        this.isGameUIVisible = false;
        
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = 'none';
        }
        
        if (this.elements.hud) {
            this.elements.hud.style.display = 'none';
        }
        
        if (this.elements.minimap) {
            this.elements.minimap.style.display = 'none';
        }
    }
    
    updatePlayerStats(playerData) {
        const healthElement = document.getElementById('health');
        const scoreElement = document.getElementById('score');
        
        if (healthElement) {
            healthElement.textContent = Math.max(0, Math.floor(playerData.health));
            
            // 체력에 따른 색상 변화
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
            scoreElement.textContent = playerData.score || 0;
        }
    }
    
    updateAmmo(ammoData) {
        const ammoElement = document.getElementById('ammo');
        const weaponElement = document.getElementById('weapon');
        
        if (ammoElement) {
            const ammoText = `${ammoData.current}/${ammoData.reserve}`;
            ammoElement.textContent = ammoText;
            
            // 탄약에 따른 색상 변화
            if (ammoData.current === 0) {
                ammoElement.style.color = '#ff0000';
            } else if (ammoData.current < 5) {
                ammoElement.style.color = '#ffff00';
            } else {
                ammoElement.style.color = '#00ffff';
            }
        }
        
        if (weaponElement) {
            weaponElement.textContent = ammoData.weapon;
            
            if (ammoData.isReloading) {
                weaponElement.textContent += ' (재장전...)';
                weaponElement.style.color = '#ffff00';
            } else {
                weaponElement.style.color = '#00ffff';
            }
        }
    }
    
    showDamageEffect() {
        if (this.elements.damageOverlay) {
            this.elements.damageOverlay.style.opacity = '0.6';
            
            setTimeout(() => {
                if (this.elements.damageOverlay) {
                    this.elements.damageOverlay.style.opacity = '0';
                }
            }, 200);
        }
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: linear-gradient(45deg, ${this.getNotificationColor(type)});
            color: white;
            padding: 12px 24px;
            margin: 8px 0;
            border-radius: 8px;
            font-family: 'Orbitron', monospace;
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            animation: slideInFromTop 0.5s ease-out;
            box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
            border: 1px solid rgba(0, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        
        notification.textContent = message;
        this.notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutToTop 0.5s ease-in forwards';
            setTimeout(() => {
                if (this.notificationContainer.contains(notification)) {
                    this.notificationContainer.removeChild(notification);
                }
            }, 500);
        }, duration);
        
        // 애니메이션 스타일 추가
        this.addNotificationStyles();
    }
    
    getNotificationColor(type) {
        switch (type) {
            case 'success': return 'rgba(0, 255, 0, 0.9), rgba(0, 200, 0, 0.7)';
            case 'error': return 'rgba(255, 0, 0, 0.9), rgba(200, 0, 0, 0.7)';
            case 'warning': return 'rgba(255, 255, 0, 0.9), rgba(200, 200, 0, 0.7)';
            default: return 'rgba(0, 255, 255, 0.9), rgba(0, 200, 200, 0.7)';
        }
    }
    
    addNotificationStyles() {
        if (!document.head.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = `
                @keyframes slideInFromTop {
                    0% { transform: translateY(-100px) scale(0.8); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes slideOutToTop {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    updateMinimap(playerPosition, enemies, projectiles) {
        if (!this.minimapContext) return;
        
        const ctx = this.minimapContext;
        const canvas = this.minimapCanvas;
        
        // 배경 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 배경
        ctx.fillStyle = 'rgba(10, 10, 31, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 그리드
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let i = 0; i <= canvas.width; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i <= canvas.height; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        const scale = 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const worldToMinimap = (worldPos) => ({
            x: centerX + (worldPos.x - playerPosition.x) * scale,
            y: centerY + (worldPos.z - playerPosition.z) * scale
        });
        
        // 플레이어 (중앙)
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 플레이어 방향 표시
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - 10);
        ctx.stroke();
        
        // 적들
        enemies.forEach(enemy => {
            if (!enemy.isAlive) return;
            
            const pos = worldToMinimap(enemy.position);
            if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
                ctx.fillStyle = enemy.type === 'heavy' ? '#ff8800' : 
                               enemy.type === 'fast' ? '#44ff44' : '#ff4444';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
        
        // 발사체들
        projectiles.forEach(projectile => {
            if (!projectile.isActive) return;
            
            const pos = worldToMinimap(projectile.position);
            if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 1, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }
    
    showLevelTransition(level) {
        const transition = document.createElement('div');
        transition.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff00ff;
            font-size: 4rem;
            font-family: 'Orbitron', monospace;
            font-weight: 900;
            text-shadow: 0 0 40px #ff00ff, 0 0 80px #ff00ff;
            z-index: 500;
            animation: levelTransition 4s ease-out forwards;
            text-transform: uppercase;
            letter-spacing: 3px;
        `;
        
        transition.textContent = `LEVEL ${level}`;
        document.body.appendChild(transition);
        
        // 애니메이션 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
            @keyframes levelTransition {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotateY(90deg); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2) rotateY(0deg); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotateY(0deg); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1) rotateY(-90deg); }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            if (document.body.contains(transition)) {
                document.body.removeChild(transition);
            }
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        }, 4000);
    }
    
    showGameOverScreen(finalScore, kills, deaths) {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(0, 0, 0, 0.95), rgba(26, 10, 31, 0.95));
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #00ffff;
            font-family: 'Orbitron', monospace;
            z-index: 1000;
            animation: fadeIn 1s ease-in;
        `;
        
        gameOverScreen.innerHTML = `
            <h1 style="font-size: 4rem; margin-bottom: 40px; text-shadow: 0 0 30px #ff00ff;">MISSION COMPLETE</h1>
            <div style="font-size: 1.5rem; text-align: center; margin-bottom: 40px;">
                <div style="margin: 10px 0;">FINAL SCORE: ${finalScore}</div>
                <div style="margin: 10px 0;">KILLS: ${kills}</div>
                <div style="margin: 10px 0;">DEATHS: ${deaths}</div>
                <div style="margin: 10px 0;">K/D RATIO: ${deaths > 0 ? (kills / deaths).toFixed(2) : kills}</div>
            </div>
            <button class="menu-button" onclick="location.reload()">다시 플레이</button>
        `;
        
        document.body.appendChild(gameOverScreen);
        
        // 페이드인 애니메이션
        const fadeStyle = document.createElement('style');
        fadeStyle.textContent = `
            @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(fadeStyle);
    }
}

export default UIManager;