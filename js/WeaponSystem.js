import * as THREE from 'three';

class WeaponSystem {
    constructor() {
        this.weapons = {
            pistol: {
                name: 'PISTOL',
                damage: 25,
                fireRate: 500,
                magSize: 12,
                totalAmmo: 60,
                reloadTime: 1500,
                accuracy: 0.95,
                range: 100,
                projectileSpeed: 200,
                sound: 'pistol-shot'
            },
            rifle: {
                name: 'RIFLE',
                damage: 35,
                fireRate: 150,
                magSize: 30,
                totalAmmo: 120,
                reloadTime: 2000,
                accuracy: 0.85,
                range: 150,
                projectileSpeed: 300,
                sound: 'rifle-shot'
            },
            shotgun: {
                name: 'SHOTGUN',
                damage: 60,
                fireRate: 800,
                magSize: 8,
                totalAmmo: 32,
                reloadTime: 3000,
                accuracy: 0.7,
                range: 50,
                projectileSpeed: 150,
                pellets: 5,
                sound: 'shotgun-shot'
            },
            sniper: {
                name: 'SNIPER',
                damage: 100,
                fireRate: 1500,
                magSize: 5,
                totalAmmo: 20,
                reloadTime: 2500,
                accuracy: 0.98,
                range: 300,
                projectileSpeed: 500,
                sound: 'sniper-shot'
            }
        };
        
        this.currentWeapon = 'pistol';
        this.currentAmmo = this.weapons.pistol.magSize;
        this.reserveAmmo = {};
        
        // 초기 탄약 설정
        Object.keys(this.weapons).forEach(weaponType => {
            this.reserveAmmo[weaponType] = this.weapons[weaponType].totalAmmo;
        });
        
        this.lastShotTime = 0;
        this.isReloading = false;
        this.availableWeapons = ['pistol'];
    }
    
    canShoot() {
        const weapon = this.weapons[this.currentWeapon];
        const timeSinceLastShot = Date.now() - this.lastShotTime;
        
        return !this.isReloading && 
               this.currentAmmo > 0 && 
               timeSinceLastShot >= weapon.fireRate;
    }
    
    shoot(position, direction) {
        if (!this.canShoot()) return null;
        
        const weapon = this.weapons[this.currentWeapon];
        this.currentAmmo--;
        this.lastShotTime = Date.now();
        
        // 탄약 상태 업데이트
        if (this.currentAmmoState) {
            this.currentAmmoState[this.currentWeapon] = this.currentAmmo;
        }
        
        // 샷건의 경우 여러 발사체 생성
        if (weapon.pellets) {
            const projectiles = [];
            for (let i = 0; i < weapon.pellets; i++) {
                const spread = (Math.random() - 0.5) * (1 - weapon.accuracy);
                const spreadDirection = direction.clone();
                spreadDirection.x += spread;
                spreadDirection.z += spread;
                spreadDirection.normalize();
                
                projectiles.push(this.createProjectile(position, spreadDirection, weapon));
            }
            
            // 자동 재장전 체크
            if (this.currentAmmo === 0) {
                this.autoReload();
            }
            
            return projectiles;
        } else {
            // 정확도에 따른 스프레드
            const spread = (Math.random() - 0.5) * (1 - weapon.accuracy) * 0.1;
            const spreadDirection = direction.clone();
            spreadDirection.x += spread;
            spreadDirection.z += spread;
            spreadDirection.normalize();
            
            const projectile = this.createProjectile(position, spreadDirection, weapon);
            
            // 자동 재장전 체크
            if (this.currentAmmo === 0) {
                this.autoReload();
            }
            
            return [projectile];
        }
    }
    
    createProjectile(position, direction, weapon) {
        return new Projectile({
            id: `projectile_${Date.now()}_${Math.random()}`,
            position: position.clone(),
            direction: direction.clone(),
            speed: weapon.projectileSpeed,
            damage: weapon.damage,
            range: weapon.range,
            weaponType: this.currentWeapon,
            startTime: Date.now()
        });
    }
    
    reload() {
        if (this.isReloading || this.reserveAmmo[this.currentWeapon] === 0 || 
            this.currentAmmo === this.weapons[this.currentWeapon].magSize) {
            return false;
        }
        
        this.isReloading = true;
        const weapon = this.weapons[this.currentWeapon];
        
        setTimeout(() => {
            const ammoNeeded = weapon.magSize - this.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, this.reserveAmmo[this.currentWeapon]);
            
            this.currentAmmo += ammoToReload;
            this.reserveAmmo[this.currentWeapon] -= ammoToReload;
            this.isReloading = false;
        }, weapon.reloadTime);
        
        return true;
    }
    
    autoReload() {
        if (this.reserveAmmo[this.currentWeapon] > 0) {
            this.reload();
        }
    }
    
    switchWeapon(direction) {
        const currentIndex = this.availableWeapons.indexOf(this.currentWeapon);
        let newIndex = currentIndex + direction;
        
        if (newIndex >= this.availableWeapons.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = this.availableWeapons.length - 1;
        }
        
        this.selectWeapon(this.availableWeapons[newIndex]);
    }
    
    selectWeapon(weaponType) {
        if (!this.availableWeapons.includes(weaponType)) {
            console.log(`무기 ${weaponType}이 잠금 해제되지 않았습니다. 사용 가능한 무기:`, this.availableWeapons);
            return false;
        }
        
        // 현재 무기가 이미 선택된 무기라면 변경하지 않음
        if (this.currentWeapon === weaponType) return true;
        
        console.log(`무기 변경: ${this.currentWeapon} -> ${weaponType}`);
        this.currentWeapon = weaponType;
        // 탄약은 무기별로 개별 관리되므로 magSize로 리셋하지 않음
        // 대신 현재 저장된 탄약 상태 유지
        if (!this.currentAmmoState) this.currentAmmoState = {};
        
        // 처음 선택하는 무기라면 풀 탄창으로 시작
        if (!this.currentAmmoState[weaponType]) {
            this.currentAmmo = this.weapons[weaponType].magSize;
            this.currentAmmoState[weaponType] = this.currentAmmo;
        } else {
            this.currentAmmo = this.currentAmmoState[weaponType];
        }
        
        return true;
    }
    
    addWeapon(weaponType) {
        if (!this.availableWeapons.includes(weaponType)) {
            this.availableWeapons.push(weaponType);
        }
    }
    
    getCurrentAmmo() {
        return {
            current: this.currentAmmo,
            reserve: this.reserveAmmo[this.currentWeapon],
            weapon: this.weapons[this.currentWeapon].name,
            isReloading: this.isReloading
        };
    }
    
    addAmmo(weaponType, amount) {
        if (this.weapons[weaponType]) {
            this.reserveAmmo[weaponType] = Math.min(
                this.weapons[weaponType].totalAmmo,
                this.reserveAmmo[weaponType] + amount
            );
        }
    }
}

class Projectile {
    constructor(data) {
        this.id = data.id;
        this.position = data.position;
        this.direction = data.direction;
        this.speed = data.speed;
        this.damage = data.damage;
        this.range = data.range;
        this.weaponType = data.weaponType;
        this.startTime = data.startTime;
        this.startPosition = this.position.clone();
        
        this.mesh = this.createMesh();
        this.isActive = true;
    }
    
    createMesh() {
        let geometry, material;
        
        switch (this.weaponType) {
            case 'pistol':
                geometry = new THREE.SphereGeometry(0.03, 6, 6);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0xffff00,
                    emissive: 0xffff00,
                    emissiveIntensity: 0.8
                });
                break;
                
            case 'rifle':
                geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.15);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0xff8800,
                    emissive: 0xff4400,
                    emissiveIntensity: 0.6
                });
                break;
                
            case 'shotgun':
                geometry = new THREE.SphereGeometry(0.04, 4, 4);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 0.7
                });
                break;
                
            case 'sniper':
                geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x00ffff,
                    emissive: 0x00ffff,
                    emissiveIntensity: 1.0
                });
                break;
                
            default:
                geometry = new THREE.SphereGeometry(0.03, 6, 6);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0xffffff,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.5
                });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.position);
        
        // 트레일 효과 추가
        this.createTrail(mesh);
        
        return mesh;
    }
    
    createTrail(parent) {
        const trailGeometry = new THREE.CylinderGeometry(0.005, 0.02, 0.5);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4
        });
        
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.z = -0.25;
        
        if (this.weaponType === 'rifle' || this.weaponType === 'sniper') {
            trail.rotation.x = Math.PI / 2;
        }
        
        parent.add(trail);
        this.trail = trail;
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        const moveDistance = this.speed * deltaTime / 1000;
        const movement = this.direction.clone().multiplyScalar(moveDistance);
        this.position.add(movement);
        this.mesh.position.copy(this.position);
        
        // 발사체 방향 설정
        this.mesh.lookAt(this.position.clone().add(this.direction));
        
        // 사거리 체크
        const distanceTraveled = this.position.distanceTo(this.startPosition);
        if (distanceTraveled >= this.range) {
            this.isActive = false;
        }
        
        // 시간 체크 (5초 후 자동 제거)
        const elapsedTime = Date.now() - this.startTime;
        if (elapsedTime > 5000) {
            this.isActive = false;
        }
        
        // 트레일 투명도 조정
        if (this.trail) {
            this.trail.material.opacity = Math.max(0, 0.4 - (elapsedTime / 5000) * 0.4);
        }
    }
    
    intersects(target) {
        if (!this.isActive || !target.mesh) return false;
        
        const distance = this.position.distanceTo(target.position);
        const hitRadius = target.stats ? target.stats.scale * 1.2 : 1.0;
        
        return distance <= hitRadius;
    }
    
    shouldRemove() {
        return !this.isActive;
    }
    
    createImpactEffect(hitPosition) {
        // 충돌 효과 파티클 생성
        const particleCount = 10;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
            const particleMaterial = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(hitPosition);
            
            // 랜덤 방향으로 파티클 발사
            const randomDirection = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random(),
                (Math.random() - 0.5) * 2
            ).normalize();
            
            particle.userData = {
                velocity: randomDirection.multiplyScalar(Math.random() * 5 + 2),
                life: 1.0
            };
            
            particles.add(particle);
        }
        
        return particles;
    }
    
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.trail) {
                if (this.trail.geometry) this.trail.geometry.dispose();
                if (this.trail.material) this.trail.material.dispose();
            }
        }
    }
}

export default WeaponSystem;
export { Projectile };