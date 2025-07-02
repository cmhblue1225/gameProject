import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Enemy {
    constructor(id, type = 'basic') {
        this.id = id;
        this.type = type;
        
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        // 타입별 스탯 설정
        this.stats = this.getTypeStats();
        this.health = this.stats.maxHealth;
        this.maxHealth = this.stats.maxHealth;
        
        // AI 상태
        this.target = null;
        this.lastAttackTime = 0;
        this.lastDamageTime = 0;
        this.isAlive = true;
        this.isAttacking = false;
        
        // 3D 모델 및 물리
        this.mesh = null;
        this.body = null;
        this.healthBar = null;
        
        // AI 경로 찾기
        this.currentPath = [];
        this.pathIndex = 0;
        this.lastPathUpdate = 0;
        
        this.createModel();
        this.createPhysicsBody();
    }
    
    getTypeStats() {
        const stats = {
            basic: {
                maxHealth: 75,
                damage: 25,
                speed: 20, // 더 감소
                attackRange: 8,
                attackCooldown: 2000,
                color: 0xff4444,
                scale: 1.0,
                emissive: 0x440000
            },
            fast: {
                maxHealth: 50,
                damage: 20,
                speed: 22, // 훨씬 더 감소 (35 → 22)
                attackRange: 6,
                attackCooldown: 1500,
                color: 0x44ff44,
                scale: 0.8,
                emissive: 0x004400
            },
            heavy: {
                maxHealth: 150,
                damage: 40,
                speed: 12, // 더 감소
                attackRange: 10,
                attackCooldown: 3000,
                color: 0xff8800,
                scale: 1.3,
                emissive: 0x442200
            }
        };
        
        return stats[this.type] || stats.basic;
    }
    
    createModel() {
        const group = new THREE.Group();
        
        // 메인 바디 (적당한 크기)
        const bodyGeometry = new THREE.CylinderGeometry(
            this.stats.scale * 0.8,
            this.stats.scale * 0.8,
            this.stats.scale * 3,
            8
        );
        
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: this.stats.color,
            metalness: 0.7,
            roughness: 0.3,
            emissive: this.stats.emissive,
            emissiveIntensity: 0.3
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = this.stats.scale * 1.5; // 바닥에서 적당한 높이
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // 헤드 (적당한 크기)
        const headGeometry = new THREE.SphereGeometry(this.stats.scale * 0.5, 8, 8);
        const headMaterial = new THREE.MeshPhysicalMaterial({
            color: this.stats.color,
            metalness: 0.5,
            roughness: 0.5,
            emissive: this.stats.emissive,
            emissiveIntensity: 0.2
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = this.stats.scale * 3.5; // 몸체 위에
        head.castShadow = true;
        group.add(head);
        
        // 눈 (사이버펑크 스타일) - 적당한 크기와 위치
        const eyeGeometry = new THREE.SphereGeometry(0.08, 4, 4);
        const eyeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 1
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 3.5, 0.4);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 3.5, 0.4);
        group.add(rightEye);
        
        // 타입 표시기
        this.createTypeIndicator(group);
        
        // 체력바
        this.createHealthBar(group);
        
        this.mesh = group;
    }
    
    createTypeIndicator(parent) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        
        // 배경
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 텍스트
        context.fillStyle = '#00ffff';
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.fillText(this.type.toUpperCase(), canvas.width / 2, 20);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.y = this.stats.scale * 4.5;
        sprite.scale.set(2, 0.5, 1);
        
        parent.add(sprite);
        this.typeIndicator = sprite;
    }
    
    createHealthBar(parent) {
        const barGeometry = new THREE.PlaneGeometry(1.5, 0.15);
        const barMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        const healthBar = new THREE.Mesh(barGeometry, barMaterial);
        healthBar.position.y = this.stats.scale * 4.2;
        
        // 항상 카메라를 향하도록
        const backgroundBar = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 0.15),
            new THREE.MeshPhongMaterial({ color: 0x333333, transparent: true, opacity: 0.5 })
        );
        backgroundBar.position.y = this.stats.scale * 4.2;
        backgroundBar.position.z = -0.01;
        
        parent.add(backgroundBar);
        parent.add(healthBar);
        this.healthBar = healthBar;
        this.healthBarBackground = backgroundBar;
    }
    
    createPhysicsBody() {
        const shape = new CANNON.Cylinder(
            this.stats.scale * 0.8,
            this.stats.scale * 0.8,
            this.stats.scale * 3,
            8
        );
        
        this.body = new CANNON.Body({ mass: 50 });
        this.body.addShape(shape);
        this.body.position.set(this.position.x, this.position.y, this.position.z);
        this.body.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
        
        // 회전 제한 (넘어지지 않게)
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
    }
    
    setTarget(target) {
        this.target = target;
    }
    
    updateAI(deltaTime) {
        if (!this.isAlive || !this.target) return;
        
        const targetPosition = this.target.position;
        const distance = this.position.distanceTo(targetPosition);
        
        // 디버그 로그 (가끔씩)
        if (Math.random() < 0.001) { // 0.1% 확률로 로그
            console.log(`적 ${this.type} AI: 거리 ${distance.toFixed(2)}, 공격범위 ${this.stats.attackRange}, 위치 Y: ${this.position.y.toFixed(2)}`);
        }
        
        // 공격 범위 체크 - Enemy AI에서는 공격 가능 여부만 체크하고 실제 공격은 main.js에서 처리
        if (distance <= this.stats.attackRange) {
            // 공격 범위 내에 있을 때는 이동 중지
            this.isAttacking = true;
        } else {
            // 타겟을 향해 이동
            this.isAttacking = false;
            this.moveTowardsTarget(targetPosition, deltaTime);
        }
        
        // 타겟을 바라보기
        this.lookAtTarget(targetPosition);
        
        // 체력바가 항상 카메라를 향하도록
        this.updateHealthBarRotation();
    }
    
    moveTowardsTarget(targetPosition, deltaTime) {
        if (!this.body) return;
        
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.position)
            .normalize();
        
        const moveSpeed = this.stats.speed;
        const force = direction.multiplyScalar(moveSpeed * 10);
        
        this.body.applyImpulse(new CANNON.Vec3(force.x, 0, force.z));
    }
    
    lookAtTarget(targetPosition) {
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.position)
            .normalize();
        
        const angle = Math.atan2(direction.x, direction.z);
        this.rotation.y = angle;
        
        if (this.mesh) {
            this.mesh.rotation.y = angle;
        }
    }
    
    canAttack() {
        const now = Date.now();
        const timeSinceLastAttack = now - this.lastAttackTime;
        const canAttack = timeSinceLastAttack >= this.stats.attackCooldown;
        
        // 디버그 로그 (가끔씩)
        if (Math.random() < 0.01) { // 1% 확률로 로그
            console.log(`적 ${this.type} 공격 쿨다운: ${timeSinceLastAttack}ms / ${this.stats.attackCooldown}ms, 공격가능: ${canAttack}`);
        }
        
        return canAttack;
    }
    
    attack() {
        if (!this.canAttack()) {
            console.log(`❌ 적 ${this.type} 공격 불가 - 쿨다운 중`);
            return false;
        }
        
        console.log(`⚡ 적 ${this.type} 공격 실행! 데미지: ${this.stats.damage}`);
        
        this.lastAttackTime = Date.now();
        this.isAttacking = true;
        
        // 공격 애니메이션 효과
        this.playAttackAnimation();
        
        // 실제 데미지는 게임 매니저에서 처리
        setTimeout(() => {
            this.isAttacking = false;
        }, 300);
        
        return {
            damage: this.stats.damage,
            attacker: this,
            position: this.position.clone()
        };
    }
    
    playAttackAnimation() {
        if (!this.mesh) return;
        
        // 간단한 공격 애니메이션 (크기 변화)
        const originalScale = this.mesh.scale.clone();
        this.mesh.scale.multiplyScalar(1.1);
        
        setTimeout(() => {
            if (this.mesh) {
                this.mesh.scale.copy(originalScale);
            }
        }, 200);
        
        // 눈 번쩍임 효과
        this.mesh.children.forEach(child => {
            if (child.material && child.material.emissive) {
                const originalIntensity = child.material.emissiveIntensity;
                child.material.emissiveIntensity = 1;
                
                setTimeout(() => {
                    if (child.material) {
                        child.material.emissiveIntensity = originalIntensity;
                    }
                }, 150);
            }
        });
    }
    
    takeDamage(damage) {
        if (!this.isAlive) return false;
        
        this.health = Math.max(0, this.health - damage);
        this.lastDamageTime = Date.now();
        
        // 데미지 효과
        this.playDamageEffect();
        
        // 체력바 업데이트
        this.updateHealthBar();
        
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        return false;
    }
    
    playDamageEffect() {
        if (!this.mesh) return;
        
        // 빨간색 번쩍임
        this.mesh.children.forEach(child => {
            if (child.material && child.material.color) {
                const originalColor = child.material.color.clone();
                child.material.color.setHex(0xff0000);
                
                setTimeout(() => {
                    if (child.material) {
                        child.material.color.copy(originalColor);
                    }
                }, 100);
            }
        });
    }
    
    updateHealthBar() {
        if (!this.healthBar) return;
        
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.scale.x = healthPercent;
        
        // 체력에 따른 색상 변화
        if (healthPercent > 0.6) {
            this.healthBar.material.color.setHex(0x00ff00);
        } else if (healthPercent > 0.3) {
            this.healthBar.material.color.setHex(0xffff00);
        } else {
            this.healthBar.material.color.setHex(0xff0000);
        }
    }
    
    updateHealthBarRotation() {
        // 체력바가 항상 카메라를 향하도록 (빌보드 효과)
        if (this.healthBar && this.healthBarBackground) {
            // 실제 게임에서는 카메라 참조가 필요하지만, 여기서는 Y축 회전만 고려
            this.healthBar.lookAt(this.position.x, this.position.y + 5, this.position.z + 10);
            this.healthBarBackground.lookAt(this.position.x, this.position.y + 5, this.position.z + 10);
        }
    }
    
    die() {
        this.isAlive = false;
        
        // 사망 애니메이션
        if (this.mesh) {
            // 떨어지는 애니메이션
            const fallAnimation = () => {
                this.mesh.rotation.x += 0.1;
                this.mesh.position.y -= 0.1;
                
                if (this.mesh.position.y > -2) {
                    requestAnimationFrame(fallAnimation);
                }
            };
            fallAnimation();
        }
    }
    
    update(deltaTime) {
        if (!this.body) return;
        
        // 물리 바디와 위치 동기화
        this.position.copy(this.body.position);
        
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
        
        // AI 업데이트
        if (this.isAlive) {
            this.updateAI(deltaTime);
        }
        
        // 떨어지는 것 방지
        if (this.position.y < -10) {
            this.position.y = 0;
            if (this.body) {
                this.body.position.y = 0;
            }
        }
    }
    
    intersectsProjectile(projectile) {
        if (!this.isAlive || !this.mesh || !projectile.mesh) return false;
        
        const distance = this.position.distanceTo(projectile.position);
        const hitRadius = this.stats.scale * 4; // 히트박스 크게 증가
        
        // 디버그 로그 (가끔씩)
        if (Math.random() < 0.01) {
            console.log(`🎯 충돌 체크: 적 ${this.type}, 거리: ${distance.toFixed(2)}, 히트반지름: ${hitRadius.toFixed(2)}, 적위치: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)}), 발사체위치: (${projectile.position.x.toFixed(1)}, ${projectile.position.y.toFixed(1)}, ${projectile.position.z.toFixed(1)})`);
        }
        
        const hit = distance <= hitRadius;
        if (hit) {
            console.log(`💥 적 ${this.type} 명중! 거리: ${distance.toFixed(2)}, 히트반지름: ${hitRadius.toFixed(2)}`);
        }
        
        return hit;
    }
    
    dispose() {
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
}

export default Enemy;