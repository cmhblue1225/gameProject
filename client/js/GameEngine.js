import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        
        this.player = null;
        this.lights = [];
        this.effects = [];
        
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        
        this.shadowsEnabled = true;
        this.postProcessing = true;
    }
    
    init() {
        console.log('GameEngine init started...');
        
        if (!this.canvas) {
            console.error('Canvas not found!');
            return;
        }
        
        this.createRenderer();
        this.createPhysicsWorld();
        
        console.log('GameEngine init completed');
    }
    
    createRenderer() {
        console.log('Creating WebGL renderer...');
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);
        
        this.renderer.shadowMap.enabled = false;
        this.renderer.physicallyCorrectLights = false;
        
        this.renderer.setClearColor(0x0a0a0f, 1);
        
        console.log('WebGL renderer created successfully');
    }
    
    createScene() {
        console.log('Creating 3D scene...');
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x1a0a1f, 50, 300);
        
        // 물리 세계를 먼저 생성
        if (!this.world) {
            this.createPhysicsWorld();
        }
        
        this.createCamera();
        this.createEnvironment();
        this.addLighting();
        
        console.log('3D scene created successfully');
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV 감소로 성능 향상
            window.innerWidth / window.innerHeight,
            1, // near plane 증가
            200 // far plane 감소
        );
        
        this.camera.position.set(0, 10, 0);
        this.scene.add(this.camera);
    }
    
    createPhysicsWorld() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.1;
        
        // 물리 엔진 성능 최적화
        this.world.allowSleep = true;
        this.world.sleepSpeedLimit = 0.1;
        this.world.sleepTimeLimit = 1;
    }
    
    createEnvironment() {
        this.createSkybox();
        this.createGround();
        this.createBuildings();
        this.createNeonLights();
    }
    
    createSkybox() {
        const skyboxGeometry = new THREE.SphereGeometry(300, 8, 8);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a0a2f,
            side: THREE.BackSide,
            fog: false
        });
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        skybox.frustumCulled = false;
        this.scene.add(skybox);
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
        
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x0a0a1f
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = false;
        ground.frustumCulled = true;
        this.scene.add(ground);
        
        // 물리 세계에 바닥 추가 (물리 세계가 있을 때만)
        if (this.world) {
            const groundShape = new CANNON.Plane();
            const groundBody = new CANNON.Body({ mass: 0 });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI / 2);
            this.world.addBody(groundBody);
        }
    }
    
    createBuildings() {
        const buildingMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a2f
        });
        
        // 건물 수를 대폭 줄임
        for (let i = 0; i < 5; i++) {
            const width = 20;
            const height = 30;
            const depth = 20;
            
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const building = new THREE.Mesh(geometry, buildingMaterial);
            
            building.position.set(
                (i - 2) * 60,
                height / 2,
                -100
            );
            
            building.castShadow = false;
            building.receiveShadow = false;
            building.frustumCulled = true;
            this.scene.add(building);
            
            // 물리 세계에 건물 추가 (물리 세계가 있을 때만)
            if (this.world) {
                const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
                const body = new CANNON.Body({ mass: 0 });
                body.addShape(shape);
                body.position.copy(building.position);
                this.world.addBody(body);
            }
        }
    }
    
    addBuildingLights(building) {
        // 건물 조명 제거하여 성능 최적화
    }
    
    createNeonLights() {
        // 네온 조명 제거하여 성능 최적화
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0x6060ff, 0.4);
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = false;
        
        this.scene.add(mainLight);
    }
    
    addLighting() {
        if (!this.scene) return;
        
        this.setupLighting();
        
        // 기본 조명만 사용하여 성능 최적화
    }
    
    setupPostProcessing() {
    }
    
    update(deltaTime) {
        if (!this.world) return;
        
        // 물리 엔진 스텝 빈도 제한
        this.world.step(1/30, deltaTime / 1000, 2);
        
        if (this.player) {
            this.updateCameraPosition();
        }
    }
    
    updateNeonLights(deltaTime) {
        // 네온 조명 업데이트 제거
    }
    
    updateGroundShader(deltaTime) {
        // 셰이더 업데이트 제거 (단순한 재질 사용)
    }
    
    updateCameraPosition() {
        if (!this.player || !this.camera) return;
        
        this.camera.position.copy(this.player.position);
        this.camera.position.y += 8;
    }
    
    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    render() {
        if (!this.renderer || !this.scene || !this.camera) {
            return;
        }
        
        // 렌더링 최적화
        this.renderer.setPixelRatio(1);
        
        // 프러스텀 컶링 활성화
        this.camera.updateMatrixWorld();
        
        this.renderer.render(this.scene, this.camera);
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