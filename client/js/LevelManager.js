import * as THREE from 'three';

class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 4;
        this.levelData = this.createLevelData();
        this.scene = null;
        this.levelObjects = [];
    }
    
    createLevelData() {
        return {
            1: {
                name: "네온 시티 아웃스커트",
                description: "사이버펑크 도시 외곽 지역",
                environment: {
                    skyColor: { top: 0x0a0a1f, bottom: 0x1a0a2f },
                    fogColor: 0x1a0a1f,
                    fogDensity: 0.01,
                    ambientColor: 0x404080,
                    ambientIntensity: 0.3
                },
                lighting: [
                    { type: 'directional', color: 0x6060ff, intensity: 0.8, position: [50, 100, 50] },
                    { type: 'point', color: 0xff0080, intensity: 1, position: [25, 20, 25] },
                    { type: 'point', color: 0x00ff80, intensity: 1, position: [-25, 20, 25] }
                ],
                spawns: {
                    player: [
                        { x: 0, y: 2, z: 0 },
                        { x: 10, y: 2, z: 10 },
                        { x: -10, y: 2, z: 10 },
                        { x: 0, y: 2, z: -10 }
                    ],
                    enemies: {
                        basic: 8,
                        fast: 2,
                        heavy: 0
                    }
                },
                duration: 480000,
                objectives: [
                    "적 10마리 처치",
                    "생존하기"
                ]
            },
            2: {
                name: "산업 단지",
                description: "폐공장과 창고가 있는 산업 지역",
                environment: {
                    skyColor: { top: 0x1a1a0f, bottom: 0x2a1a1f },
                    fogColor: 0x2a1a1f,
                    fogDensity: 0.015,
                    ambientColor: 0x606040,
                    ambientIntensity: 0.4
                },
                lighting: [
                    { type: 'directional', color: 0xff6060, intensity: 0.7, position: [100, 80, 100] },
                    { type: 'point', color: 0xff4400, intensity: 1.2, position: [50, 30, 0] },
                    { type: 'point', color: 0x0044ff, intensity: 1.2, position: [-50, 30, 0] }
                ],
                spawns: {
                    player: [
                        { x: 0, y: 2, z: 0 },
                        { x: 15, y: 2, z: 15 },
                        { x: -15, y: 2, z: 15 },
                        { x: 0, y: 2, z: -15 }
                    ],
                    enemies: {
                        basic: 10,
                        fast: 4,
                        heavy: 1
                    }
                },
                duration: 480000,
                objectives: [
                    "적 15마리 처치",
                    "헤비 유닛 처치",
                    "공장 지역 정리"
                ]
            },
            3: {
                name: "다운타운 전투",
                description: "네온사인이 빛나는 도심 전투",
                environment: {
                    skyColor: { top: 0x2a0a2a, bottom: 0x4a0a4a },
                    fogColor: 0x4a0a4a,
                    fogDensity: 0.02,
                    ambientColor: 0x804080,
                    ambientIntensity: 0.5
                },
                lighting: [
                    { type: 'directional', color: 0xff00ff, intensity: 0.6, position: [80, 120, 80] },
                    { type: 'point', color: 0xff0088, intensity: 1.5, position: [0, 40, 0] },
                    { type: 'point', color: 0x8800ff, intensity: 1.5, position: [40, 25, 40] },
                    { type: 'point', color: 0x00ff88, intensity: 1.5, position: [-40, 25, 40] }
                ],
                spawns: {
                    player: [
                        { x: 0, y: 2, z: 0 },
                        { x: 20, y: 2, z: 20 },
                        { x: -20, y: 2, z: 20 },
                        { x: 0, y: 2, z: -20 }
                    ],
                    enemies: {
                        basic: 12,
                        fast: 6,
                        heavy: 2
                    }
                },
                duration: 480000,
                objectives: [
                    "적 20마리 처치",
                    "헤비 유닛 2마리 처치",
                    "다운타운 지역 확보"
                ]
            },
            4: {
                name: "사이버 코어 최종전",
                description: "적의 본거지 사이버 코어",
                environment: {
                    skyColor: { top: 0x4a0a0a, bottom: 0x6a0a2a },
                    fogColor: 0x6a0a2a,
                    fogDensity: 0.025,
                    ambientColor: 0xa04040,
                    ambientIntensity: 0.6
                },
                lighting: [
                    { type: 'directional', color: 0xff0000, intensity: 0.5, position: [100, 150, 100] },
                    { type: 'point', color: 0xff0044, intensity: 2, position: [0, 50, 0] },
                    { type: 'point', color: 0xff4400, intensity: 1.8, position: [60, 30, 60] },
                    { type: 'point', color: 0x4400ff, intensity: 1.8, position: [-60, 30, 60] },
                    { type: 'point', color: 0x44ff00, intensity: 1.8, position: [0, 30, -60] }
                ],
                spawns: {
                    player: [
                        { x: 0, y: 2, z: 0 },
                        { x: 25, y: 2, z: 25 },
                        { x: -25, y: 2, z: 25 },
                        { x: 0, y: 2, z: -25 }
                    ],
                    enemies: {
                        basic: 15,
                        fast: 8,
                        heavy: 4
                    }
                },
                duration: 600000,
                objectives: [
                    "적 27마리 처치",
                    "헤비 유닛 4마리 처치",
                    "사이버 코어 파괴",
                    "최종 보스 처치"
                ]
            }
        };
    }
    
    loadLevel(levelNumber) {
        this.currentLevel = levelNumber;
        const level = this.levelData[levelNumber];
        
        if (!level) {
            console.error(`Level ${levelNumber} not found`);
            return;
        }
        
        this.clearLevel();
        this.setupEnvironment(level.environment);
        this.setupLighting(level.lighting);
        this.createLevelGeometry(levelNumber);
        this.createLevelObjects(levelNumber);
        
        return level;
    }
    
    clearLevel() {
        this.levelObjects.forEach(obj => {
            if (this.scene && obj.parent === this.scene) {
                this.scene.remove(obj);
            }
            
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        this.levelObjects = [];
    }
    
    setupEnvironment(environment) {
        if (!this.scene) return;
        
        this.scene.fog = new THREE.Fog(
            environment.fogColor,
            50,
            200 / environment.fogDensity
        );
        
        const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyboxMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(environment.skyColor.top) },
                bottomColor: { value: new THREE.Color(environment.skyColor.bottom) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
        this.levelObjects.push(skybox);
    }
    
    setupLighting(lighting) {
        if (!this.scene) return;
        
        lighting.forEach(lightData => {
            let light;
            
            switch (lightData.type) {
                case 'directional':
                    light = new THREE.DirectionalLight(lightData.color, lightData.intensity);
                    light.position.set(...lightData.position);
                    light.castShadow = true;
                    
                    light.shadow.mapSize.width = 2048;
                    light.shadow.mapSize.height = 2048;
                    light.shadow.camera.near = 0.5;
                    light.shadow.camera.far = 500;
                    light.shadow.camera.left = -100;
                    light.shadow.camera.right = 100;
                    light.shadow.camera.top = 100;
                    light.shadow.camera.bottom = -100;
                    break;
                    
                case 'point':
                    light = new THREE.PointLight(lightData.color, lightData.intensity, 100);
                    light.position.set(...lightData.position);
                    light.castShadow = true;
                    
                    light.shadow.mapSize.width = 1024;
                    light.shadow.mapSize.height = 1024;
                    light.shadow.camera.near = 0.5;
                    light.shadow.camera.far = 100;
                    break;
                    
                default:
                    console.warn(`Unknown light type: ${lightData.type}`);
                    return;
            }
            
            this.scene.add(light);
            this.levelObjects.push(light);
        });
    }
    
    createLevelGeometry(levelNumber) {
        if (!this.scene) return;
        
        switch (levelNumber) {
            case 1:
                this.createLevel1Geometry();
                break;
            case 2:
                this.createLevel2Geometry();
                break;
            case 3:
                this.createLevel3Geometry();
                break;
            case 4:
                this.createLevel4Geometry();
                break;
        }
    }
    
    createLevel1Geometry() {
        const buildingMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a2f,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x002244,
            emissiveIntensity: 0.1
        });
        
        for (let i = 0; i < 15; i++) {
            const width = Math.random() * 12 + 8;
            const height = Math.random() * 30 + 15;
            const depth = Math.random() * 12 + 8;
            
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const building = new THREE.Mesh(geometry, buildingMaterial);
            
            building.position.set(
                (Math.random() - 0.5) * 200,
                height / 2,
                (Math.random() - 0.5) * 200
            );
            
            building.castShadow = true;
            building.receiveShadow = true;
            
            this.scene.add(building);
            this.levelObjects.push(building);
            
            this.addBuildingDetails(building, 0x00ffff);
        }
    }
    
    createLevel2Geometry() {
        const factoryMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x2a2a1f,
            metalness: 0.9,
            roughness: 0.3,
            emissive: 0x442200,
            emissiveIntensity: 0.2
        });
        
        for (let i = 0; i < 12; i++) {
            const width = Math.random() * 20 + 15;
            const height = Math.random() * 25 + 10;
            const depth = Math.random() * 20 + 15;
            
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const factory = new THREE.Mesh(geometry, factoryMaterial);
            
            factory.position.set(
                (Math.random() - 0.5) * 250,
                height / 2,
                (Math.random() - 0.5) * 250
            );
            
            factory.castShadow = true;
            factory.receiveShadow = true;
            
            this.scene.add(factory);
            this.levelObjects.push(factory);
            
            this.addFactoryDetails(factory);
        }
        
        this.createIndustrialStructures();
    }
    
    createLevel3Geometry() {
        const neonMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x2a1a2a,
            metalness: 0.7,
            roughness: 0.1,
            emissive: 0x440044,
            emissiveIntensity: 0.3
        });
        
        for (let i = 0; i < 18; i++) {
            const width = Math.random() * 18 + 12;
            const height = Math.random() * 50 + 25;
            const depth = Math.random() * 18 + 12;
            
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const skyscraper = new THREE.Mesh(geometry, neonMaterial);
            
            skyscraper.position.set(
                (Math.random() - 0.5) * 300,
                height / 2,
                (Math.random() - 0.5) * 300
            );
            
            skyscraper.castShadow = true;
            skyscraper.receiveShadow = true;
            
            this.scene.add(skyscraper);
            this.levelObjects.push(skyscraper);
            
            this.addBuildingDetails(skyscraper, 0xff00ff);
            this.addNeonSigns(skyscraper);
        }
    }
    
    createLevel4Geometry() {
        const coreMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4a1a1a,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x660022,
            emissiveIntensity: 0.4
        });
        
        const coreGeometry = new THREE.CylinderGeometry(30, 30, 100, 8);
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.set(0, 50, 0);
        
        this.scene.add(core);
        this.levelObjects.push(core);
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 80;
            
            const towerGeometry = new THREE.BoxGeometry(15, 60, 15);
            const tower = new THREE.Mesh(towerGeometry, coreMaterial);
            
            tower.position.set(
                Math.cos(angle) * radius,
                30,
                Math.sin(angle) * radius
            );
            
            tower.castShadow = true;
            tower.receiveShadow = true;
            
            this.scene.add(tower);
            this.levelObjects.push(tower);
            
            this.addEnergyBeams(tower, core);
        }
        
        this.createCoreDetails(core);
    }
    
    addBuildingDetails(building, lightColor) {
        const windowCount = Math.floor(Math.random() * 12) + 8;
        
        for (let i = 0; i < windowCount; i++) {
            const windowGeometry = new THREE.PlaneGeometry(2, 2);
            const windowMaterial = new THREE.MeshBasicMaterial({
                color: lightColor,
                transparent: true,
                opacity: 0.8
            });
            
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(
                building.position.x + (Math.random() - 0.5) * building.geometry.parameters.width * 0.8,
                building.position.y + (Math.random() - 0.5) * building.geometry.parameters.height * 0.8,
                building.position.z + building.geometry.parameters.depth / 2 + 0.1
            );
            
            this.scene.add(window);
            this.levelObjects.push(window);
            
            const light = new THREE.PointLight(lightColor, 0.5, 15);
            light.position.copy(window.position);
            light.position.z += 2;
            
            this.scene.add(light);
            this.levelObjects.push(light);
        }
    }
    
    addFactoryDetails(factory) {
        const smokeStackGeometry = new THREE.CylinderGeometry(2, 2, 15);
        const smokeStackMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.4
        });
        
        const smokeStack = new THREE.Mesh(smokeStackGeometry, smokeStackMaterial);
        smokeStack.position.set(
            factory.position.x,
            factory.position.y + factory.geometry.parameters.height / 2 + 7.5,
            factory.position.z
        );
        
        this.scene.add(smokeStack);
        this.levelObjects.push(smokeStack);
    }
    
    createIndustrialStructures() {
        for (let i = 0; i < 6; i++) {
            const craneGeometry = new THREE.BoxGeometry(2, 30, 2);
            const craneMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xffaa00,
                metalness: 0.9,
                roughness: 0.2
            });
            
            const crane = new THREE.Mesh(craneGeometry, craneMaterial);
            crane.position.set(
                (Math.random() - 0.5) * 200,
                15,
                (Math.random() - 0.5) * 200
            );
            
            this.scene.add(crane);
            this.levelObjects.push(crane);
        }
    }
    
    addNeonSigns(building) {
        const signGeometry = new THREE.PlaneGeometry(8, 2);
        const signMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff00ff : 0x00ffff,
            transparent: true,
            opacity: 0.9
        });
        
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(
            building.position.x,
            building.position.y + building.geometry.parameters.height / 3,
            building.position.z + building.geometry.parameters.depth / 2 + 0.5
        );
        
        this.scene.add(sign);
        this.levelObjects.push(sign);
    }
    
    addEnergyBeams(tower, core) {
        const beamGeometry = new THREE.CylinderGeometry(0.2, 0.2, 80);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0044,
            transparent: true,
            opacity: 0.6
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        
        const direction = new THREE.Vector3()
            .subVectors(core.position, tower.position)
            .normalize();
        
        beam.position.lerpVectors(tower.position, core.position, 0.5);
        beam.lookAt(core.position);
        beam.rotateX(Math.PI / 2);
        
        this.scene.add(beam);
        this.levelObjects.push(beam);
    }
    
    createCoreDetails(core) {
        const ringCount = 5;
        
        for (let i = 0; i < ringCount; i++) {
            const ringGeometry = new THREE.TorusGeometry(35 + i * 5, 2, 8, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.4
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.copy(core.position);
            ring.position.y += (i - 2) * 15;
            ring.rotation.x = Math.PI / 2;
            
            this.scene.add(ring);
            this.levelObjects.push(ring);
        }
    }
    
    createLevelObjects(levelNumber) {
        this.createHealthPacks();
        this.createAmmoPacks();
        this.createCover();
    }
    
    createHealthPacks() {
        const packCount = 3 + this.currentLevel;
        
        for (let i = 0; i < packCount; i++) {
            const packGeometry = new THREE.BoxGeometry(1, 1, 1);
            const packMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });
            
            const pack = new THREE.Mesh(packGeometry, packMaterial);
            pack.position.set(
                (Math.random() - 0.5) * 150,
                0.5,
                (Math.random() - 0.5) * 150
            );
            
            pack.userData = { type: 'healthpack', value: 25 };
            
            this.scene.add(pack);
            this.levelObjects.push(pack);
        }
    }
    
    createAmmoPacks() {
        const packCount = 4 + this.currentLevel;
        
        for (let i = 0; i < packCount; i++) {
            const packGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const packMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
            });
            
            const pack = new THREE.Mesh(packGeometry, packMaterial);
            pack.position.set(
                (Math.random() - 0.5) * 150,
                0.4,
                (Math.random() - 0.5) * 150
            );
            
            pack.userData = { type: 'ammopack', value: 30 };
            
            this.scene.add(pack);
            this.levelObjects.push(pack);
        }
    }
    
    createCover() {
        const coverCount = 8 + this.currentLevel * 2;
        
        for (let i = 0; i < coverCount; i++) {
            const coverGeometry = new THREE.BoxGeometry(
                Math.random() * 3 + 2,
                Math.random() * 2 + 1,
                Math.random() * 3 + 2
            );
            const coverMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x666666,
                metalness: 0.5,
                roughness: 0.7
            });
            
            const cover = new THREE.Mesh(coverGeometry, coverMaterial);
            cover.position.set(
                (Math.random() - 0.5) * 180,
                cover.geometry.parameters.height / 2,
                (Math.random() - 0.5) * 180
            );
            
            cover.castShadow = true;
            cover.receiveShadow = true;
            
            this.scene.add(cover);
            this.levelObjects.push(cover);
        }
    }
    
    getLevelData(levelNumber) {
        return this.levelData[levelNumber] || null;
    }
    
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    getSpawnPoints(type) {
        const level = this.levelData[this.currentLevel];
        return level ? level.spawns[type] || [] : [];
    }
    
    changeLevel(newLevel) {
        if (newLevel >= 1 && newLevel <= this.maxLevel) {
            this.currentLevel = newLevel;
            this.loadLevel(newLevel);
        }
    }
    
    setScene(scene) {
        this.scene = scene;
    }
    
    update(deltaTime) {
        this.levelObjects.forEach(obj => {
            if (obj.userData && obj.userData.animate) {
                obj.rotation.y += deltaTime * 0.001;
            }
        });
    }
    
    dispose() {
        this.clearLevel();
    }
}

export default LevelManager;