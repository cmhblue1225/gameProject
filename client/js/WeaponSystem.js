import * as THREE from 'three';

class WeaponSystem {
    constructor() {
        this.weapons = {
            pistol: {
                damage: 25,
                fireRate: 500,
                ammo: 12,
                maxAmmo: 60,
                reloadTime: 1500,
                accuracy: 0.95,
                range: 100,
                sound: 'pistol-shot'
            },
            rifle: {
                damage: 35,
                fireRate: 150,
                ammo: 30,
                maxAmmo: 120,
                reloadTime: 2000,
                accuracy: 0.85,
                range: 150,
                sound: 'rifle-shot'
            },
            shotgun: {
                damage: 60,
                fireRate: 800,
                ammo: 8,
                maxAmmo: 32,
                reloadTime: 3000,
                accuracy: 0.7,
                range: 50,
                sound: 'shotgun-shot',
                pellets: 5
            },
            sniper: {
                damage: 100,
                fireRate: 1500,
                ammo: 5,
                maxAmmo: 20,
                reloadTime: 2500,
                accuracy: 0.98,
                range: 300,
                sound: 'sniper-shot'
            }
        };
        
        this.currentWeapon = 'pistol';
        this.ammo = {
            pistol: 60,
            rifle: 120,
            shotgun: 32,
            sniper: 20
        };
        
        this.currentAmmo = this.weapons[this.currentWeapon].ammo;
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
    
    shoot() {
        if (!this.canShoot()) return false;
        
        this.currentAmmo--;
        this.lastShotTime = Date.now();
        
        if (this.currentAmmo === 0) {
            this.autoReload();
        }
        
        return true;
    }
    
    reload() {
        if (this.isReloading || this.ammo[this.currentWeapon] === 0) return false;
        
        this.isReloading = true;
        const weapon = this.weapons[this.currentWeapon];
        
        setTimeout(() => {
            const ammoNeeded = weapon.ammo - this.currentAmmo;
            const ammoToReload = Math.min(ammoNeeded, this.ammo[this.currentWeapon]);
            
            this.currentAmmo += ammoToReload;
            this.ammo[this.currentWeapon] -= ammoToReload;
            this.isReloading = false;
        }, weapon.reloadTime);
        
        return true;
    }
    
    autoReload() {
        if (this.ammo[this.currentWeapon] > 0) {
            this.reload();
        }
    }
    
    switchWeapon(direction) {
        const weaponIndex = this.availableWeapons.indexOf(this.currentWeapon);
        let newIndex = weaponIndex + direction;
        
        if (newIndex >= this.availableWeapons.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = this.availableWeapons.length - 1;
        }
        
        this.selectWeapon(this.availableWeapons[newIndex]);
    }
    
    selectWeapon(weaponType) {
        if (!this.availableWeapons.includes(weaponType)) return false;
        
        this.currentWeapon = weaponType;
        this.currentAmmo = this.weapons[weaponType].ammo;
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
            reserve: this.ammo[this.currentWeapon],
            weapon: this.currentWeapon,
            isReloading: this.isReloading
        };
    }
    
    createProjectile(projectileData) {
        return new Projectile(projectileData);
    }
    
    addAmmo(weaponType, amount) {
        if (this.weapons[weaponType]) {
            this.ammo[weaponType] = Math.min(
                this.weapons[weaponType].maxAmmo,
                this.ammo[weaponType] + amount
            );
        }
    }
    
    getWeaponStats(weaponType) {
        return this.weapons[weaponType] || null;
    }
}

class Projectile {
    constructor(data) {
        this.id = data.id;
        this.playerId = data.playerId;
        this.position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
        this.direction = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
        this.weapon = data.weapon;
        this.speed = data.speed;
        this.damage = data.damage;
        this.range = data.range;
        this.startTime = data.startTime;
        this.startPosition = this.position.clone();
        
        this.mesh = this.createMesh();
        this.isActive = true;
    }
    
    createMesh() {
        // 매우 간단한 발사체 - GPU 사용량 최소화
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.position);
        
        return mesh;
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        const moveDistance = this.speed * deltaTime / 1000;
        const movement = this.direction.clone().multiplyScalar(moveDistance);
        this.position.add(movement);
        this.mesh.position.copy(this.position);
        
        const distanceTraveled = this.position.distanceTo(this.startPosition);
        if (distanceTraveled >= this.range) {
            this.isActive = false;
        }
        
        const elapsedTime = Date.now() - this.startTime;
        if (elapsedTime > 3000) { // 3초로 단축
            this.isActive = false;
        }
    }
    
    intersects(target) {
        if (!this.isActive || !target.mesh) return false;
        
        const distance = this.position.distanceTo(target.position);
        return distance <= 2;
    }
    
    shouldRemove() {
        return !this.isActive;
    }
    
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
    }
}

export default WeaponSystem;