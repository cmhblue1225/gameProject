import * as THREE from 'three';

class Enemy {
    constructor(id, type = 'basic') {
        this.id = id;
        this.type = type;
        
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        this.health = this.getMaxHealth();
        this.maxHealth = this.health;
        
        this.mesh = null;
        this.isAlive = true;
        this.lastAttackTime = 0;
        
        this.createMesh();
    }
    
    getMaxHealth() {
        switch (this.type) {
            case 'fast': return 50;
            case 'heavy': return 150;
            case 'basic':
            default: return 75;
        }
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // 간단한 적 모델
        const geometry = new THREE.BoxGeometry(1.5, 2, 1.5);
        const material = new THREE.MeshBasicMaterial({
            color: this.getTypeColor()
        });
        
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 1;
        group.add(body);
        
        // 간단한 헤드
        const headGeometry = new THREE.SphereGeometry(0.4, 6, 6);
        const headMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.2;
        group.add(head);
        
        this.mesh = group;
    }
    
    getTypeColor() {
        switch (this.type) {
            case 'fast': return 0x00ff00;
            case 'heavy': return 0xff8800;
            case 'basic':
            default: return 0xff0000;
        }
    }
    
    updatePosition(position) {
        this.position.copy(position);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }
    
    updateRotation(rotation) {
        this.rotation.set(rotation.x, rotation.y, rotation.z);
        if (this.mesh) {
            this.mesh.rotation.copy(this.rotation);
        }
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        
        if (this.health <= 0) {
            this.isAlive = false;
            return true;
        }
        
        return false;
    }
    
    showDamage(damage) {
        // 간단한 데미지 표시 (콘솔)
        console.log(`Enemy ${this.id} took ${damage} damage`);
    }
    
    setHealth(health, maxHealth = null) {
        this.health = health;
        if (maxHealth !== null) {
            this.maxHealth = maxHealth;
        }
    }
    
    intersects(projectile) {
        if (!this.mesh || !projectile.mesh) return false;
        
        const distance = this.position.distanceTo(projectile.position);
        return distance < 2;
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