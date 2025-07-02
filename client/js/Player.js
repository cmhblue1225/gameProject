import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Player {
    constructor(id, isLocalPlayer = true) {
        this.id = id;
        this.isLocalPlayer = isLocalPlayer;
        
        this.position = new THREE.Vector3(0, 5, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        
        this.mesh = null;
        this.body = null;
        
        this.weapons = ['pistol'];
        this.currentWeapon = 'pistol';
        this.ammo = {
            pistol: 60,
            rifle: 120,
            shotgun: 32,
            sniper: 20
        };
        
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        
        this.isMoving = false;
        this.isJumping = false;
        this.canJump = true;
        
        this.movementSpeed = 50;
        this.jumpForce = 20;
        
        this.createMesh();
        
        // 물리 body는 나중에 필요할 때 생성
        this.body = null;
    }
    
    createMesh() {
        if (this.isLocalPlayer) {
            this.createFirstPersonView();
        } else {
            this.createThirdPersonView();
        }
    }
    
    createFirstPersonView() {
        const group = new THREE.Group();
        
        const handGeometry = new THREE.BoxGeometry(0.3, 0.3, 1);
        const handMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x8B4513,
            metalness: 0.1,
            roughness: 0.8
        });
        
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(-0.8, -1, -1.5);
        
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0.8, -1, -1.5);
        
        group.add(leftHand);
        group.add(rightHand);
        
        this.createWeaponModel(group);
        
        this.mesh = group;
        this.mesh.visible = false;
    }
    
    createThirdPersonView() {
        const group = new THREE.Group();
        
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x003366,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x001122,
            emissiveIntensity: 0.2
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        group.add(body);
        
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const headMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x8B4513,
            metalness: 0.1,
            roughness: 0.8
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.2;
        group.add(head);
        
        const eyeGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 2.3, 0.25);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 2.3, 0.25);
        group.add(rightEye);
        
        this.addNameTag(group);
        this.addHealthBar(group);
        
        this.mesh = group;
    }
    
    createWeaponModel(parent) {
        const weaponGeometry = new THREE.BoxGeometry(0.1, 0.3, 1.2);
        const weaponMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x004444,
            emissiveIntensity: 0.1
        });
        
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0.5, -0.8, -1);
        weapon.rotation.z = Math.PI / 12;
        
        const muzzleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1);
        const muzzleMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
        muzzle.position.set(0, 0, -0.6);
        muzzle.rotation.x = Math.PI / 2;
        weapon.add(muzzle);
        
        parent.add(weapon);
        this.weaponMesh = weapon;
    }
    
    addNameTag(parent) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#00ffff';
        context.font = '16px Courier New';
        context.textAlign = 'center';
        context.fillText(`Player ${this.id.substring(0, 8)}`, canvas.width / 2, 20);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.y = 3;
        sprite.scale.set(2, 0.5, 1);
        
        parent.add(sprite);
        this.nameTag = sprite;
    }
    
    addHealthBar(parent) {
        const barGeometry = new THREE.PlaneGeometry(1, 0.1);
        const barMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        const healthBar = new THREE.Mesh(barGeometry, barMaterial);
        healthBar.position.y = 2.8;
        
        parent.add(healthBar);
        this.healthBar = healthBar;
    }
    
    createPhysicsBody() {
        if (this.body) return; // 이미 생성된 경우 건너뛰기
        
        const shape = new CANNON.Cylinder(0.5, 0.5, 2, 8);
        this.body = new CANNON.Body({ mass: 70 });
        this.body.addShape(shape);
        this.body.position.set(this.position.x, this.position.y, this.position.z);
        this.body.material = new CANNON.Material({ friction: 0.3, restitution: 0.1 });
        
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
    }
    
    ensurePhysicsBody() {
        if (!this.body) {
            this.createPhysicsBody();
        }
        return this.body;
    }
    
    move(direction) {
        if (!this.body) return;
        
        const force = direction.clone().multiplyScalar(this.movementSpeed * 10);
        this.body.applyImpulse(new CANNON.Vec3(force.x, 0, force.z));
        
        this.isMoving = direction.length() > 0;
        
        if (this.isMoving && this.weaponMesh) {
            this.updateWeaponSway();
        }
    }
    
    jump() {
        if (!this.canJump || !this.body) return;
        
        this.body.applyImpulse(new CANNON.Vec3(0, this.jumpForce, 0));
        this.isJumping = true;
        this.canJump = false;
        
        setTimeout(() => {
            this.canJump = true;
            this.isJumping = false;
        }, 500);
    }
    
    updateWeaponSway() {
        if (!this.weaponMesh) return;
        
        const time = Date.now() * 0.005;
        const swayAmount = 0.02;
        
        this.weaponMesh.position.x = 0.5 + Math.sin(time * 2) * swayAmount;
        this.weaponMesh.position.y = -0.8 + Math.sin(time * 1.5) * swayAmount * 0.5;
        this.weaponMesh.rotation.z = Math.PI / 12 + Math.sin(time) * swayAmount * 0.5;
    }
    
    updatePosition(position) {
        this.position.set(position.x, position.y, position.z);
        
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
        
        if (this.body) {
            this.body.position.set(position.x, position.y, position.z);
        }
    }
    
    updateRotation(x, y) {
        this.rotation.set(y, x, 0);
        
        if (this.mesh && !this.isLocalPlayer) {
            this.mesh.rotation.y = x;
        }
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.scale.x = healthPercent;
            
            if (healthPercent > 0.6) {
                this.healthBar.material.color.setHex(0x00ff00);
            } else if (healthPercent > 0.3) {
                this.healthBar.material.color.setHex(0xffff00);
            } else {
                this.healthBar.material.color.setHex(0xff0000);
            }
        }
        
        return this.health <= 0;
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.scale.x = healthPercent;
            this.healthBar.material.color.setHex(0x00ff00);
        }
    }
    
    addWeapon(weaponType) {
        if (!this.weapons.includes(weaponType)) {
            this.weapons.push(weaponType);
        }
    }
    
    switchWeapon(weaponType) {
        if (this.weapons.includes(weaponType)) {
            this.currentWeapon = weaponType;
            this.updateWeaponModel();
        }
    }
    
    updateWeaponModel() {
        if (!this.weaponMesh) return;
        
        const weaponConfigs = {
            pistol: { color: 0x333333, scale: new THREE.Vector3(1, 1, 1) },
            rifle: { color: 0x222222, scale: new THREE.Vector3(1.2, 1, 1.5) },
            shotgun: { color: 0x444444, scale: new THREE.Vector3(1.5, 1.2, 1.3) },
            sniper: { color: 0x111111, scale: new THREE.Vector3(0.8, 1, 2) }
        };
        
        const config = weaponConfigs[this.currentWeapon];
        if (config) {
            this.weaponMesh.material.color.setHex(config.color);
            this.weaponMesh.scale.copy(config.scale);
        }
    }
    
    update(deltaTime) {
        if (this.body && this.mesh) {
            this.position.copy(this.body.position);
            this.mesh.position.copy(this.position);
            
            if (this.nameTag && !this.isLocalPlayer) {
                this.nameTag.lookAt(this.mesh.parent.position);
            }
        }
        
        if (this.isMoving && this.weaponMesh) {
            this.updateWeaponSway();
        }
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