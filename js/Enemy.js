import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

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
        this.fbxModel = null;
        this.mixer = null;
        this.animations = {
            walking: null,
            running: null,
            dancing: null
        };
        this.currentAnimation = null;
        
        // 충돌 감지를 위한 실제 모델 중심 위치
        this.modelCenter = new THREE.Vector3();
        
        // 카메라 참조 (빌보드 효과를 위해)
        this.camera = null;
        
        // AI 경로 찾기
        this.currentPath = [];
        this.pathIndex = 0;
        this.lastPathUpdate = 0;
        
        this.init();
    }
    
    getTypeStats() {
        const stats = {
            basic: {
                maxHealth: 75,
                damage: 25,
                speed: 20,
                attackRange: 8,
                attackCooldown: 2000,
                color: 0xff4444,
                scale: 0.03, // FBX 모델에 맞게 스케일 조정
                emissive: 0x440000,
                animationType: 'walking'
            },
            fast: {
                maxHealth: 50,
                damage: 20,
                speed: 22,
                attackRange: 6,
                attackCooldown: 1500,
                color: 0x44ff44,
                scale: 0.025, // 더 작게
                emissive: 0x004400,
                animationType: 'running'
            },
            heavy: {
                maxHealth: 150,
                damage: 40,
                speed: 12,
                attackRange: 10,
                attackCooldown: 3000,
                color: 0xff8800,
                scale: 0.035, // 더 크게
                emissive: 0x442200,
                animationType: 'dancing'
            }
        };
        
        return stats[this.type] || stats.basic;
    }
    
    async init() {
        await this.createModel();
        this.createPhysicsBody();
    }
    
    async loadFBXModel() {
        const loader = new FBXLoader();
        
        // 타입별로 다른 애니메이션 사용
        let fbxPath;
        switch (this.stats.animationType) {
            case 'walking':
                fbxPath = './biped/Animation_Walking_frame_rate_60.fbx';
                break;
            case 'running':
                fbxPath = './biped/Animation_Running_frame_rate_60.fbx';
                break;
            case 'dancing':
                fbxPath = './biped/Animation_Boom_Dance_frame_rate_60.fbx';
                break;
            default:
                fbxPath = './biped/Animation_Walking_frame_rate_60.fbx';
        }
        
        return new Promise((resolve, reject) => {
            loader.load(
                fbxPath,
                (fbx) => {
                    this.fbxModel = fbx;
                    
                    // 애니메이션 믹서 설정
                    if (fbx.animations && fbx.animations.length > 0) {
                        this.mixer = new THREE.AnimationMixer(fbx);
                        this.currentAnimation = this.mixer.clipAction(fbx.animations[0]);
                        this.currentAnimation.play();
                    }
                    
                    console.log(`FBX 모델 로드 성공 (${this.type}):`, fbxPath);
                    resolve(fbx);
                },
                (progress) => {
                    console.log('로딩 진행률:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('FBX 로드 실패:', error);
                    reject(error);
                }
            );
        });
    }
    
    createFallbackModel(group) {
        // 폴백: 기본 기하학적 모델 생성
        const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 3, 8);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: this.stats.color,
            metalness: 0.7,
            roughness: 0.3,
            emissive: this.stats.emissive,
            emissiveIntensity: 0.3
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.5;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // 헤드
        const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 3.5;
        head.castShadow = true;
        group.add(head);
        
        console.log('폴백 모델 생성됨');
    }
    
    updateModelCenter() {
        if (this.mesh && this.fbxModel) {
            // FBX 모델의 실제 중심 위치 계산
            this.modelCenter.copy(this.mesh.position);
            
            // FBX 모델의 높이 중간 지점으로 조정 (고정된 높이)
            this.modelCenter.y += 1.5; // 모델 중심 높이로 조정 (스케일과 독립적)
        } else {
            // 폴백: 물리 바디 위치 사용
            this.modelCenter.copy(this.position);
        }
    }
    
    async createModel() {
        const group = new THREE.Group();
        
        try {
            // FBX 모델 로드
            await this.loadFBXModel();
            
            if (this.fbxModel) {
                // 스케일 조정
                this.fbxModel.scale.setScalar(this.stats.scale);
                
                // 위치 조정 (바닥에 맞춤)
                this.fbxModel.position.y = 0;
                
                // 그림자 설정
                this.fbxModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // 타입별 색상 적용
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.color = new THREE.Color(this.stats.color);
                                    mat.emissive = new THREE.Color(this.stats.emissive);
                                    mat.emissiveIntensity = 0.3;
                                });
                            } else {
                                child.material.color = new THREE.Color(this.stats.color);
                                child.material.emissive = new THREE.Color(this.stats.emissive);
                                child.material.emissiveIntensity = 0.3;
                            }
                        }
                    }
                });
                
                group.add(this.fbxModel);
            }
        } catch (error) {
            console.error('FBX 모델 로드 실패:', error);
            // 폴백: 기본 기하학적 모델 생성
            this.createFallbackModel(group);
        }
        
        // 타입 표시기
        this.createTypeIndicator(group);
        
        // 체력바
        this.createHealthBar(group);
        
        this.mesh = group;
    }
    
    createTypeIndicator(parent) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256; // 더 큰 캔버스
        canvas.height = 64;
        
        // 배경
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 텍스트
        context.fillStyle = '#00ffff';
        context.font = 'bold 32px Arial'; // 더 큰 폰트
        context.textAlign = 'center';
        context.fillText(this.type.toUpperCase(), canvas.width / 2, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.y = 5.5; // 적 머리 훨씬 위로 이동
        sprite.scale.set(4, 1, 1); // 더 크게
        
        parent.add(sprite);
        this.typeIndicator = sprite;
    }
    
    createHealthBar(parent) {
        const barGeometry = new THREE.PlaneGeometry(3.0, 0.3); // 더 크게
        const barMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        const healthBar = new THREE.Mesh(barGeometry, barMaterial);
        healthBar.position.y = 4.8; // 적 머리 위로 이동 (타입 표시기 아래)
        
        // 항상 카메라를 향하도록
        const backgroundBar = new THREE.Mesh(
            new THREE.PlaneGeometry(3.0, 0.3), // 더 크게
            new THREE.MeshPhongMaterial({ color: 0x333333, transparent: true, opacity: 0.5 })
        );
        backgroundBar.position.y = 4.8; // 적 머리 위로 이동 (타입 표시기 아래)
        backgroundBar.position.z = -0.01;
        
        parent.add(backgroundBar);
        parent.add(healthBar);
        this.healthBar = healthBar;
        this.healthBarBackground = backgroundBar;
    }
    
    createPhysicsBody() {
        // FBX 모델에 맞게 물리 바디 크기 조정
        const radius = 30 * this.stats.scale; // FBX 스케일에 맞춤
        const height = 60 * this.stats.scale;
        
        const shape = new CANNON.Cylinder(radius, radius, height, 8);
        
        this.body = new CANNON.Body({ mass: 50 });
        this.body.addShape(shape);
        this.body.position.set(this.position.x, this.position.y + height/2, this.position.z);
        this.body.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
        
        // 회전 제한 (넘어지지 않게)
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
    }
    
    setTarget(target) {
        this.target = target;
    }
    
    setCamera(camera) {
        this.camera = camera;
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
        if (this.healthBar && this.healthBarBackground && this.typeIndicator && this.camera) {
            // 카메라 위치를 향하도록 설정
            this.healthBar.lookAt(this.camera.position);
            this.healthBarBackground.lookAt(this.camera.position);
            this.typeIndicator.lookAt(this.camera.position);
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
        
        // 애니메이션 믹서 업데이트
        if (this.mixer) {
            this.mixer.update(deltaTime / 1000); // deltaTime을 초 단위로 변환
        }
        
        // 물리 바디와 위치 동기화
        this.position.copy(this.body.position);
        
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            // FBX 모델의 위치를 바닥에 맞춤
            this.mesh.position.y = this.position.y - (30 * this.stats.scale);
        }
        
        // 모델 중심 위치 업데이트
        this.updateModelCenter();
        
        // AI 업데이트
        if (this.isAlive) {
            this.updateAI(deltaTime);
        }
        
        // 떨어지는 것 방지
        if (this.position.y < -10) {
            this.position.y = 30 * this.stats.scale; // FBX 모델 높이에 맞춤
            if (this.body) {
                this.body.position.y = 30 * this.stats.scale;
            }
        }
    }
    
    intersectsProjectile(projectile) {
        if (!this.isAlive || !this.mesh || !projectile.mesh) return false;
        
        // FBX 모델의 실제 중심 위치 사용
        this.updateModelCenter();
        
        // 3D 거리 계산
        const distance = this.modelCenter.distanceTo(projectile.position);
        
        // 수평 거리도 별도로 계산 (Y축 차이가 클 때를 위해)
        const horizontalDistance = Math.sqrt(
            Math.pow(this.modelCenter.x - projectile.position.x, 2) + 
            Math.pow(this.modelCenter.z - projectile.position.z, 2)
        );
        
        // Y축 차이
        const verticalDifference = Math.abs(this.modelCenter.y - projectile.position.y);
        
        // 히트박스: 수평 거리와 수직 차이를 별도로 체크
        const hitRadiusHorizontal = 4.0; // 수평 히트박스 (4미터)
        const hitRadiusVertical = 3.0;   // 수직 히트박스 (3미터)
        
        const hit = (horizontalDistance <= hitRadiusHorizontal) && (verticalDifference <= hitRadiusVertical);
        
        // 디버그 로그 (가끔씩)
        if (Math.random() < 0.01) {
            console.log(`🎯 충돌 체크: 적 ${this.type}, 3D거리: ${distance.toFixed(2)}, 수평거리: ${horizontalDistance.toFixed(2)}, 수직차이: ${verticalDifference.toFixed(2)}, 히트: ${hit}, 모델중심: (${this.modelCenter.x.toFixed(1)}, ${this.modelCenter.y.toFixed(1)}, ${this.modelCenter.z.toFixed(1)}), 발사체위치: (${projectile.position.x.toFixed(1)}, ${projectile.position.y.toFixed(1)}, ${projectile.position.z.toFixed(1)})`);
        }
        
        if (hit) {
            console.log(`💥 적 ${this.type} 명중! 수평거리: ${horizontalDistance.toFixed(2)}, 수직차이: ${verticalDifference.toFixed(2)}`);
        }
        
        return hit;
    }
    
    dispose() {
        // 애니메이션 믹서 정리
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
        
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
        
        // FBX 모델 정리
        if (this.fbxModel) {
            this.fbxModel = null;
        }
    }
}

export default Enemy;