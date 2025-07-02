import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Player {
    constructor(id) {
        this.id = id;
        this.position = new THREE.Vector3(0, 1, 0); // 바닥에 가깝게
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // 플레이어 스탯
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.speed = 50;
        this.jumpForce = 25; // 점프 힘 증가
        
        // 상태
        this.isMoving = false;
        this.isJumping = false;
        this.canJump = true;
        this.isAlive = true;
        
        // 3D 모델 및 물리
        this.mesh = null;
        this.body = null;
        this.weaponMesh = null;
        
        this.createPlayerModel();
        this.createPhysicsBody();
    }
    
    createPlayerModel() {
        // 플레이어는 1인칭이므로 무기만 보이게 함
        this.createWeaponModel();
    }
    
    createWeaponModel() {
        const group = new THREE.Group();
        
        // 무기 본체
        const weaponGeometry = new THREE.BoxGeometry(0.15, 0.4, 1.5);
        const weaponMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x004444,
            emissiveIntensity: 0.1
        });
        
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0.6, -0.8, -1.2);
        weapon.rotation.z = Math.PI / 12;
        
        // 총구
        const muzzleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.1);
        const muzzleMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x666666,
            emissive: 0x111111,
            emissiveIntensity: 0.1
        });
        const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
        muzzle.position.set(0, 0, -0.75);
        muzzle.rotation.x = Math.PI / 2;
        weapon.add(muzzle);
        
        // 조준경
        const sightGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
        const sightMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const sight = new THREE.Mesh(sightGeometry, sightMaterial);
        sight.position.set(0, 0.2, -0.2);
        weapon.add(sight);
        
        group.add(weapon);
        this.weaponMesh = weapon;
        this.mesh = group;
        this.mesh.visible = true; // 항상 표시
    }
    
    createPhysicsBody() {
        const shape = new CANNON.Cylinder(0.5, 0.5, 2, 8);
        this.body = new CANNON.Body({ mass: 70 });
        this.body.addShape(shape);
        this.body.position.set(this.position.x, this.position.y, this.position.z);
        this.body.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
        
        // 회전 고정 (넘어지지 않게)
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
        
        // 땅에 닿았는지 체크를 위한 이벤트 (개선된 충돌 감지)
        this.body.addEventListener('collide', (event) => {
            const contact = event.contact;
            const otherBody = contact.bi === this.body ? contact.bj : contact.bi;
            
            // 바닥이나 건물과 충돌했을 때만 점프 가능하게 설정
            if (otherBody.mass === 0) { // 정적 객체 (바닥, 건물)와 충돌
                this.canJump = true;
                this.isJumping = false;
                console.log('바닥 충돌 감지 - 점프 가능해짐');
            }
        });
    }
    
    move(direction) {
        if (!this.body || !this.isAlive) return;
        
        const force = direction.clone().multiplyScalar(this.speed * 60);
        this.body.applyImpulse(new CANNON.Vec3(force.x, 0, force.z));
        
        // 속도 제한 (너무 빨라지지 않게)
        const maxSpeed = 45;
        const velocity = this.body.velocity;
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (horizontalSpeed > maxSpeed) {
            const scale = maxSpeed / horizontalSpeed;
            this.body.velocity.x *= scale;
            this.body.velocity.z *= scale;
        }
        
        this.isMoving = direction.length() > 0;
        
        // 무기 흔들림 효과
        if (this.isMoving && this.weaponMesh) {
            this.updateWeaponSway();
        }
    }
    
    jump() {
        if (!this.body || !this.isAlive) return;
        
        console.log(`점프 시도: canJump=${this.canJump}, isJumping=${this.isJumping}, jumpForce=${this.jumpForce}`);
        
        // 더 관대한 점프 조건 - 바닥 근처에 있으면 점프 허용
        const isNearGround = this.body.position.y <= 3; // 바닥에서 3 이하 높이면 점프 가능
        
        if (isNearGround || this.canJump) {
            this.body.applyImpulse(new CANNON.Vec3(0, this.jumpForce, 0));
            this.isJumping = true;
            this.canJump = false;
            console.log(`점프 실행! 현재 높이: ${this.body.position.y.toFixed(2)}`);
        } else {
            console.log(`점프 실패: 높이=${this.body.position.y.toFixed(2)}, canJump=${this.canJump}`);
        }
    }
    
    updateWeaponSway() {
        if (!this.weaponMesh) return;
        
        const time = Date.now() * 0.005;
        const swayAmount = 0.03;
        
        this.weaponMesh.position.x = 0.6 + Math.sin(time * 2) * swayAmount;
        this.weaponMesh.position.y = -0.8 + Math.sin(time * 1.5) * swayAmount * 0.5;
        this.weaponMesh.rotation.z = Math.PI / 12 + Math.sin(time) * swayAmount * 0.5;
    }
    
    updateRotation(mouseX, mouseY) {
        this.rotation.set(mouseY, mouseX, 0);
        
        // 무기도 함께 회전
        if (this.mesh) {
            this.mesh.rotation.y = mouseX;
        }
    }
    
    takeDamage(damage) {
        if (!this.isAlive) return false;
        
        const oldHealth = this.health;
        this.health = Math.max(0, this.health - damage);
        
        console.log(`플레이어 데미지: ${damage}, 체력 변화: ${oldHealth} -> ${this.health}`);
        
        if (this.health <= 0) {
            this.isAlive = false;
            console.log('플레이어 사망!');
            return true; // 사망
        }
        
        return false;
    }
    
    heal(amount) {
        if (!this.isAlive) return;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    respawn() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.position.set(0, 1, 0); // 바닥에 가깝게
        
        if (this.body) {
            this.body.position.set(0, 1, 0); // 바닥에 가깝게
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }
    }
    
    update(deltaTime) {
        if (!this.body) return;
        
        // 물리 바디와 위치 동기화
        this.position.copy(this.body.position);
        
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
        
        // 무기 흔들림 업데이트
        if (this.isMoving && this.weaponMesh) {
            this.updateWeaponSway();
        }
        
        // 떨어지는 것 방지 (맵 밖으로 나가면 리스폰)
        if (this.position.y < -50) {
            this.respawn();
        }
    }
    
    showWeapon() {
        if (this.mesh) {
            this.mesh.visible = true;
        }
    }
    
    hideWeapon() {
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }
    
    getShootingDirection(camera) {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        return direction;
    }
    
    getShootingPosition(camera) {
        const position = camera.position.clone();
        const direction = this.getShootingDirection(camera);
        position.add(direction.multiplyScalar(2));
        return position;
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

export default Player;