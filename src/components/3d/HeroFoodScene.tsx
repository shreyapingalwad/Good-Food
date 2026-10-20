import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const HeroFoodScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  useEffect(() => {
    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    if (!containerRef.current) return;
    const container = containerRef.current;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x151916, 0.04);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.3, 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ART-DIRECTED STUDIO LIGHTING
    const ambientLight = new THREE.AmbientLight(0xF7F5EF, 0.85);
    scene.add(ambientLight);

    // Warm Key Light (top-left key)
    const keyLight = new THREE.DirectionalLight(0xFFF7E6, 2.4);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Lime Rim Light (grazing edge glow)
    const rimLight = new THREE.DirectionalLight(0xD8F078, 2.6);
    rimLight.position.set(-6, -3, 3.5);
    scene.add(rimLight);

    // Deep Forest Green Ambient Fill (rich shadow tones)
    const fillLight = new THREE.PointLight(0x123B2A, 4.0, 16);
    fillLight.position.set(0, -3.5, -2);
    scene.add(fillLight);

    // Subtle Golden Warm Accent Spot
    const topSpot = new THREE.SpotLight(0xE4F88D, 1.8, 22, Math.PI / 4.5, 0.45);
    topSpot.position.set(2, 7, 5);
    scene.add(topSpot);

    // ROOT HIERARCHY
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // =========================================================================
    // 1. ELEVATED CERAMIC SUSTAINABLE PLATTER (Glazed Stoneware Lathe Geometry)
    // =========================================================================
    const platterPoints: THREE.Vector2[] = [];
    platterPoints.push(new THREE.Vector2(0, -0.15));
    platterPoints.push(new THREE.Vector2(0.9, -0.15));
    platterPoints.push(new THREE.Vector2(1.7, -0.05));
    platterPoints.push(new THREE.Vector2(2.35, 0.18));
    platterPoints.push(new THREE.Vector2(2.45, 0.28));
    platterPoints.push(new THREE.Vector2(2.38, 0.32));
    platterPoints.push(new THREE.Vector2(2.25, 0.26));
    platterPoints.push(new THREE.Vector2(1.6, 0.08));
    platterPoints.push(new THREE.Vector2(0.8, -0.04));
    platterPoints.push(new THREE.Vector2(0, -0.06));

    const platterGeo = new THREE.LatheGeometry(platterPoints, 64);
    platterGeo.computeVertexNormals();

    const platterMat = new THREE.MeshStandardMaterial({
      color: 0x1A231E,
      roughness: 0.24,
      metalness: 0.08,
    });
    const platter = new THREE.Mesh(platterGeo, platterMat);
    platter.receiveShadow = true;
    platter.position.set(0.4, -1.25, 0);
    platter.rotation.x = 0.42;
    platter.rotation.z = -0.12;
    rootGroup.add(platter);

    // Fine decorative ceramic inlay ring (warm lime glaze line)
    const ringGeo = new THREE.TorusGeometry(2.28, 0.024, 24, 80);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD8F078,
      emissive: 0xD8F078,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.2
    });
    const rimRing = new THREE.Mesh(ringGeo, ringMat);
    rimRing.position.copy(platter.position);
    rimRing.position.y += 0.24;
    rimRing.rotation.x = platter.rotation.x + Math.PI / 2;
    rimRing.rotation.y = platter.rotation.z;
    rootGroup.add(rimRing);

    // =========================================================================
    // 2. SCULPTED HEIRLOOM TOMATO (Organic Multi-Lobe Geometry & Curved Calyx)
    // =========================================================================
    const tomatoGroup = new THREE.Group();
    
    // Create organic lobed tomato by perturbing sphere vertices
    const tomatoGeo = new THREE.SphereGeometry(0.78, 48, 48);
    const pos = tomatoGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      // Gentle 5-lobe organic heirloom variation
      const lobeMod = 1.0 + Math.sin(angle * 5) * 0.08;
      // Slight vertical squashing for realistic tomato proportion
      pos.setX(i, x * lobeMod * 1.08);
      pos.setY(i, y * 0.88);
      pos.setZ(i, z * lobeMod * 1.05);
    }
    tomatoGeo.computeVertexNormals();

    const tomatoMat = new THREE.MeshStandardMaterial({
      color: 0xD63628,
      roughness: 0.16,
      metalness: 0.04
    });
    const tomatoMesh = new THREE.Mesh(tomatoGeo, tomatoMat);
    tomatoMesh.castShadow = true;
    tomatoGroup.add(tomatoMesh);

    // Organic calyx sepals
    const calyxMat = new THREE.MeshStandardMaterial({
      color: 0x3D5430,
      roughness: 0.42,
      metalness: 0.05
    });

    for (let i = 0; i < 5; i++) {
      const sepalAngle = (i / 5) * Math.PI * 2;
      const sepalCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.68, 0),
        new THREE.Vector3(Math.cos(sepalAngle) * 0.24, 0.72, Math.sin(sepalAngle) * 0.24),
        new THREE.Vector3(Math.cos(sepalAngle) * 0.48, 0.58, Math.sin(sepalAngle) * 0.48),
        new THREE.Vector3(Math.cos(sepalAngle) * 0.58, 0.45, Math.sin(sepalAngle) * 0.58)
      ]);
      const sepalGeo = new THREE.TubeGeometry(sepalCurve, 12, 0.045, 8, false);
      const sepalMesh = new THREE.Mesh(sepalGeo, calyxMat);
      tomatoGroup.add(sepalMesh);
    }

    // Curved natural stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.68, 0),
      new THREE.Vector3(0.04, 0.85, 0.02),
      new THREE.Vector3(0.12, 1.02, -0.06),
      new THREE.Vector3(0.16, 1.15, -0.12)
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 16, 0.045, 8, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x274020, roughness: 0.6 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    tomatoGroup.add(stemMesh);

    tomatoGroup.position.set(1.4, -0.3, 0.8);
    tomatoGroup.scale.set(0.95, 0.95, 0.95);
    tomatoGroup.rotation.set(0.1, -0.3, 0.15);
    rootGroup.add(tomatoGroup);

    // =========================================================================
    // 3. SCULPTED EMERALD BELL PEPPER (4-Lobed Capsicum with Indented Crown)
    // =========================================================================
    const pepperGroup = new THREE.Group();
    const pepperGeo = new THREE.CylinderGeometry(0.72, 0.54, 1.35, 48, 24);
    const pPos = pepperGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const x = pPos.getX(i);
      const y = pPos.getY(i);
      const z = pPos.getZ(i);
      const pAngle = Math.atan2(z, x);
      // 4-lobe capsicum contour
      const fourLobe = 1.0 + Math.sin(pAngle * 4) * 0.14;
      // Inward crown indentation near top
      const topTaper = y > 0.4 ? 1.0 - (y - 0.4) * 0.3 : 1.0;
      pPos.setX(i, x * fourLobe * topTaper);
      pPos.setZ(i, z * fourLobe * topTaper);
    }
    pepperGeo.computeVertexNormals();

    const pepperMat = new THREE.MeshStandardMaterial({
      color: 0x1F6B42,
      roughness: 0.22,
      metalness: 0.06
    });
    const pepperMesh = new THREE.Mesh(pepperGeo, pepperMat);
    pepperMesh.castShadow = true;
    pepperGroup.add(pepperMesh);

    // Curved pepper stalk
    const pepperStemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.68, 0),
      new THREE.Vector3(-0.06, 0.92, 0.04),
      new THREE.Vector3(-0.16, 1.15, 0.12)
    ]);
    const pepperStemGeo = new THREE.TubeGeometry(pepperStemCurve, 14, 0.065, 8, false);
    const pepperStemMat = new THREE.MeshStandardMaterial({ color: 0x143D24, roughness: 0.55 });
    const pepperStem = new THREE.Mesh(pepperStemGeo, pepperStemMat);
    pepperGroup.add(pepperStem);

    pepperGroup.position.set(-1.0, -0.15, 1.0);
    pepperGroup.rotation.set(0.25, -0.45, 0.32);
    rootGroup.add(pepperGroup);

    // =========================================================================
    // 4. ROASTED GOLDEN GRAIN CLUSTER (Organic Quinoa / Millet Orb)
    // =========================================================================
    const grainCluster = new THREE.Group();
    const grainBaseGeo = new THREE.SphereGeometry(0.72, 32, 32);
    const gPos = grainBaseGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const y = gPos.getY(i);
      const z = gPos.getZ(i);
      // Subtle irregular organic texture
      const noise = 1.0 + Math.sin(x * 12) * Math.cos(y * 12) * 0.06;
      gPos.setXYZ(i, x * noise, y * noise, z * noise);
    }
    grainBaseGeo.computeVertexNormals();

    const grainMat = new THREE.MeshStandardMaterial({
      color: 0xD4A345,
      roughness: 0.45,
      metalness: 0.12
    });
    const grainMesh = new THREE.Mesh(grainBaseGeo, grainMat);
    grainMesh.castShadow = true;
    grainCluster.add(grainMesh);

    // Micro grain florets around surface
    const floretGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const floretMat = new THREE.MeshStandardMaterial({ color: 0xE8BE66, roughness: 0.38 });
    for (let i = 0; i < 35; i++) {
      const fMesh = new THREE.Mesh(floretGeo, floretMat);
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 0.72;
      fMesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      grainCluster.add(fMesh);
    }

    grainCluster.position.set(0.1, 0.65, 0.4);
    grainCluster.scale.set(0.9, 0.9, 0.9);
    rootGroup.add(grainCluster);

    // =========================================================================
    // 5. CURVED AROMATIC HERB LEAVES (Fresh Sage & Coriander Sprigs)
    // =========================================================================
    const leaves: THREE.Mesh[] = [];
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.24, 0.45, 0, 0.95);
    leafShape.quadraticCurveTo(-0.24, 0.45, 0, 0);

    const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x7E995B,
      roughness: 0.28,
      side: THREE.DoubleSide
    });

    const leafConfigs = [
      { x: -1.75, y: 1.15, z: 1.3, rotX: 0.4, rotY: 0.3, rotZ: -0.65, scale: 0.7 },
      { x: 1.85, y: 1.55, z: 0.9, rotX: -0.25, rotY: 0.8, rotZ: 0.55, scale: 0.6 },
      { x: -0.35, y: 2.05, z: 0.5, rotX: 0.6, rotY: -0.4, rotZ: 0.2, scale: 0.52 },
      { x: 2.1, y: -0.75, z: 1.6, rotX: 0.15, rotY: 0.2, rotZ: -0.45, scale: 0.55 }
    ];

    leafConfigs.forEach((cfg) => {
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      leafMesh.position.set(cfg.x, cfg.y, cfg.z);
      leafMesh.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
      leafMesh.scale.set(cfg.scale, cfg.scale, cfg.scale);
      leafMesh.castShadow = true;
      rootGroup.add(leafMesh);
      leaves.push(leafMesh);
    });

    // =========================================================================
    // 6. AMBIENT GLOW PARTICLES (Golden & Lime Micro Nutrient Specks)
    // =========================================================================
    const particleCount = 85;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 8.5;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xD8F078,
      size: 0.055,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // =========================================================================
    // INTERACTION & SCROLL LISTENERS
    // =========================================================================
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let scrollY = 0;
    let targetScrollY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX = (x / rect.width) * 2 - 1;
      mouseY = -(y / rect.height) * 2 + 1;
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // ANIMATION RENDER LOOP
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Mouse Lerp
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Scroll Lerp (smooth camera pull & descent as user scrolls away from hero)
      targetScrollY += (scrollY - targetScrollY) * 0.08;
      const scrollFactor = Math.min(targetScrollY / 700, 1.0);

      // Camera responds to scroll: pulls back slightly and rises
      camera.position.z = 7.2 + scrollFactor * 1.5;
      camera.position.y = 0.3 + scrollFactor * 0.6;

      // Root group descends and tilts slightly as user leaves hero
      rootGroup.position.y = -scrollFactor * 1.2;
      rootGroup.position.x = scrollFactor * 0.6;
      rootGroup.rotation.y = targetX * 0.4 + (prefersReducedMotion ? 0 : elapsedTime * 0.09) + scrollFactor * 0.4;
      rootGroup.rotation.x = -targetY * 0.3 + (prefersReducedMotion ? 0 : Math.sin(elapsedTime * 0.35) * 0.04) + scrollFactor * 0.2;

      if (!prefersReducedMotion) {
        // Natural floating breathing rhythms
        platter.position.y = -1.25 + Math.sin(elapsedTime * 0.75) * 0.05;
        rimRing.position.y = platter.position.y + 0.24;

        tomatoGroup.position.y = -0.3 + Math.sin(elapsedTime * 1.05 + 1) * 0.08;
        tomatoGroup.rotation.y += 0.006;

        pepperGroup.position.y = -0.15 + Math.cos(elapsedTime * 0.85 + 2) * 0.09;
        pepperGroup.rotation.y += 0.005;

        grainCluster.position.y = 0.65 + Math.sin(elapsedTime * 1.2) * 0.1;
        grainCluster.rotation.y += 0.007;

        // Leaf oscillation
        leaves.forEach((l, idx) => {
          l.position.y += Math.sin(elapsedTime * 1.4 + idx) * 0.002;
          l.rotation.z += Math.cos(elapsedTime * 1.1 + idx) * 0.002;
        });

        // Particle gentle drift
        particleSystem.rotation.y = elapsedTime * 0.035;
        particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP & RESOURCE DISPOSAL
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Deep disposal of geometries & materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[540px] md:h-[680px] lg:h-[760px] flex items-center justify-center overflow-hidden">
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"
      />

      {/* Atmospheric Ambient Depth Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] md:w-[640px] h-[340px] md:h-[640px] rounded-full bg-forest-glow filter blur-[110px] opacity-70" />
        <div className="absolute top-1/3 right-1/4 w-[240px] md:w-[400px] h-[240px] md:h-[400px] rounded-full bg-lime/10 filter blur-[95px] opacity-50" />
      </div>

      {/* Graceful Fallback if WebGL Disabled */}
      {!hasWebGL && (
        <div className="relative z-10 text-center p-8 glass-panel-elevated rounded-3xl max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-forest border border-lime/30 flex items-center justify-center text-lime font-bold text-2xl">
            🌱
          </div>
          <h3 className="text-xl font-editorial text-ivory mb-2">Sustainable Food Architecture</h3>
          <p className="text-sm text-sage">Experience hardware-accelerated 3D food forecasting. (WebGL is in 2D compatibility mode on this device).</p>
        </div>
      )}

      {/* Interactive Telemetry Cue */}
      <div className="absolute bottom-6 left-6 md:left-10 z-20 pointer-events-none hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-full glass-panel border border-lime/20 text-xs text-ivory">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
        </span>
        <span className="font-mono text-lime font-medium">Organic 3D Scene</span>
        <span className="text-[#28312B]">|</span>
        <span className="text-sage">Drag to tilt • Scroll to transition</span>
      </div>
    </div>
  );
};
