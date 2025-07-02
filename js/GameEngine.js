import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        
        // 환경 설정
        this.ambientLight = null;
        this.directionalLight = null;
        this.pointLights = [];
        
        // 성능 설정
        this.shadowsEnabled = true;
        this.fogEnabled = true;
    }
    
    async init() {
        try {
            console.log('GameEngine 초기화 시작...');
            
            this.createRenderer();
            this.createScene();
            this.createCamera();
            this.createPhysicsWorld();
            this.createEnvironment();
            this.setupLighting();
            
            console.log('GameEngine 초기화 완료');
            return true;
        } catch (error) {
            console.error('GameEngine 초기화 실패:', error);
            return false;
        }
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 고품질 렌더링 설정
        this.renderer.shadowMap.enabled = this.shadowsEnabled;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        this.renderer.setClearColor(0x6a6a8f, 1); // 훨씬 더 밝은 배경
        
        console.log('렌더러 생성 완료');
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        
        if (this.fogEnabled) {
            this.scene.fog = new THREE.Fog(0x8a8aaf, 200, 1200); // 훨씬 더 밝고 멀리 보이게
        }
        
        console.log('씬 생성 완료');
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.camera.position.set(0, 10, 0);
        this.scene.add(this.camera);
        
        console.log('카메라 생성 완료');
    }
    
    createPhysicsWorld() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -30, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true;
        
        // 기본 재질 설정
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            {
                friction: 0.3,
                restitution: 0.1
            }
        );
        this.world.addContactMaterial(defaultContactMaterial);
        this.world.defaultContactMaterial = defaultContactMaterial;
        
        console.log('물리 엔진 생성 완료');
    }
    
    createEnvironment() {
        this.createSkybox();
        this.createGround();
        this.createCyberpunkBuildings();
        
        console.log('환경 생성 완료');
    }
    
    createSkybox() {
        const skyboxGeometry = new THREE.SphereGeometry(800, 16, 16);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x5a4a7f, // 훨씬 더 밝은 하늘색
            side: THREE.BackSide,
            fog: false
        });
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
        
        // 밝은 사이버펑크 머티리얼로 변경
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x3a3a6f, // 훨씬 더 밝은 바닥색
            emissive: 0x004488, // 더 밝은 발광
            emissiveIntensity: 0.3, // 발광 강도 증가
            transparent: true,
            opacity: 0.9
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // 그리드 라인 추가 (별도 객체로)
        this.createGridLines();
        
        // 물리 바닥
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI / 2);
        this.world.addBody(groundBody);
        
        this.groundMaterial = groundMaterial;
    }
    
    createGridLines() {
        const gridHelper = new THREE.GridHelper(1000, 50, 0x00ffff, 0x00ffff);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
        this.gridHelper = gridHelper;
    }
    
    createCyberpunkBuildings() {
        const buildingMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4a4a8f, // 훨씬 더 밝은 건물색
            metalness: 0.6,
            roughness: 0.3,
            emissive: 0x0066aa, // 더 밝은 발광
            emissiveIntensity: 0.4 // 발광 강도 증가
        });
        
        for (let i = 0; i < 15; i++) {
            const width = Math.random() * 20 + 15;
            const height = Math.random() * 60 + 30;
            const depth = Math.random() * 20 + 15;
            
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const building = new THREE.Mesh(geometry, buildingMaterial);
            
            building.position.set(
                (Math.random() - 0.5) * 400,
                height / 2,
                (Math.random() - 0.5) * 400
            );
            
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            
            // 물리 바디
            const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.copy(building.position);
            this.world.addBody(body);
            
            // 네온 라이트 추가
            this.addBuildingLights(building);
        }
    }
    
    addBuildingLights(building) {
        // 포인트 라이트 수를 크게 제한하여 WebGL 오류 방지
        if (this.pointLights.length >= 8) return; // 최대 8개로 제한
        
        const windowCount = Math.min(2, Math.floor(Math.random() * 3) + 1); // 1-2개로 제한
        
        for (let i = 0; i < windowCount; i++) {
            if (this.pointLights.length >= 8) break; // 추가 안전장치
            
            const light = new THREE.PointLight(
                Math.random() > 0.5 ? 0x00ffff : 0xff00ff,
                3.0, // 강도 크게 증가
                80   // 범위 증가
            );
            
            light.position.set(
                building.position.x + (Math.random() - 0.5) * building.geometry.parameters.width * 0.8,
                building.position.y + (Math.random() - 0.3) * building.geometry.parameters.height * 0.8,
                building.position.z + (Math.random() - 0.5) * building.geometry.parameters.depth * 0.8
            );
            
            // 그림자 비활성화로 성능 향상
            light.castShadow = false;
            
            this.scene.add(light);
            this.pointLights.push(light);
        }
    }
    
    setupLighting() {
        // 환경 조명 (매우 밝게)
        this.ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // 흰색, 매우 밝게
        this.scene.add(this.ambientLight);
        
        // 주 조명 (매우 밝게)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 4.0); // 흰색, 매우 밝게
        this.directionalLight.position.set(100, 200, 100);
        this.directionalLight.castShadow = true;
        
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -200;
        this.directionalLight.shadow.camera.right = 200;
        this.directionalLight.shadow.camera.top = 200;
        this.directionalLight.shadow.camera.bottom = -200;
        
        this.scene.add(this.directionalLight);
        
        console.log('조명 설정 완료');
    }
    
    update(deltaTime) {
        if (this.world) {
            this.world.step(1/60, deltaTime / 1000, 3);
        }
        
        // 그리드 애니메이션 (투명도 변화)
        if (this.gridHelper) {
            const time = this.clock.getElapsedTime();
            const opacity = Math.sin(time * 0.5) * 0.1 + 0.3;
            this.gridHelper.material.opacity = opacity;
        }
        
        // 네온 라이트 애니메이션
        const time = this.clock.getElapsedTime();
        this.pointLights.forEach((light, index) => {
            const intensity = Math.sin(time * 3 + index) * 0.5 + 1.5;
            light.intensity = intensity;
        });
    }
    
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    handleResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}

export default GameEngine;