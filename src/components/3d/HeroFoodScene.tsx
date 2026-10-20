import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const HeroFoodScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [isLowPower, setIsLowPower] = useState<boolean>(false);

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

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x151916, 0.045);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // LIGHTING SYSTEM (Art-directed studio lighting)
    const ambientLight = new THREE.AmbientLight(0xF7F5EF, 0.7);
    scene.add(ambientLight);

    // Warm Key Light (top-left)
    const keyLight = new THREE.DirectionalLight(0xFFF7E6, 1.8);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    // Lime Rim Light (bottom-right edge glow)
    const rimLight = new THREE.DirectionalLight(0xD8F078, 2.2);
    rimLight.position.set(-6, -4, 3);
    scene.add(rimLight);

    // Forest Green Ambient Fill (subtle depth)
    const fillLight = new THREE.PointLight(0x123B2A, 3.5, 15);
    fillLight.position.set(0, -3, -2);
    scene.add(fillLight);

    // Top Subtle Golden Spot
    const topSpot = new THREE.SpotLight(0xE4F88D, 1.2, 20, Math.PI / 4, 0.5);
    topSpot.position.set(2, 6, 4);
    scene.add(topSpot);

    // OBJECT HIERARCHY
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Ceramic Sustainable Platter / Dining Base
    const platterGeo = new THREE.CylinderGeometry(2.2, 1.8, 0.22, 48);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0x1C221E,
      roughness: 0.35,
      metalness: 0.15,
      wireframe: false
    });
    const platter = new THREE.Mesh(platterGeo, platterMat);
    platter.position.set(0.6, -1.2, 0);
    platter.rotation.x = 0.35;
    platter.rotation.z = -0.15;
    rootGroup.add(platter);

    // Rim highlight ring on the plate
    const ringGeo = new THREE.TorusGeometry(2.22, 0.035, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD8F078,
      emissive: 0xD8F078,
      emissiveIntensity: 0.3,
      roughness: 0.2
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(platter.position);
    ring.rotation.x = platter.rotation.x + Math.PI / 2;
    ring.rotation.y = platter.rotation.z;
    rootGroup.add(ring);

    // 2. Glossy Heirloom Tomato (Stylized Red & Green Crown)
    const tomatoGroup = new THREE.Group();
    const tomatoBodyGeo = new THREE.SphereGeometry(0.72, 32, 32);
    tomatoBodyGeo.scale(1.08, 0.95, 1.05);
    const tomatoMat = new THREE.MeshStandardMaterial({
      color: 0xD93829,
      roughness: 0.18,
      metalness: 0.05
    });
    const tomatoBody = new THREE.Mesh(tomatoBodyGeo, tomatoMat);
    tomatoGroup.add(tomatoBody);

    // Tomato calyx (leaves)
    const calyxMat = new THREE.MeshStandardMaterial({
      color: 0x4D5D35,
      roughness: 0.4
    });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const leafGeo = new THREE.ConeGeometry(0.12, 0.45, 8);
      const leaf = new THREE.Mesh(leafGeo, calyxMat);
      leaf.position.set(Math.cos(angle) * 0.18, 0.68, Math.sin(angle) * 0.18);
      leaf.rotation.z = Math.cos(angle) * 0.8;
      leaf.rotation.x = -Math.sin(angle) * 0.8;
      tomatoGroup.add(leaf);
    }
    tomatoGroup.position.set(1.4, -0.4, 0.6);
    tomatoGroup.scale.set(0.9, 0.9, 0.9);
    rootGroup.add(tomatoGroup);

    // 3. Crisp Bell Pepper / Capsicum (Emerald Green)
    const pepperGroup = new THREE.Group();
    const pepperGeo = new THREE.CylinderGeometry(0.65, 0.5, 1.25, 16, 4);
    const pepperMat = new THREE.MeshStandardMaterial({
      color: 0x2A734C,
      roughness: 0.22,
      metalness: 0.08
    });
    const pepper = new THREE.Mesh(pepperGeo, pepperMat);
    pepperGroup.add(pepper);

    // Pepper stem
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x1A422B, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.72, 0);
    stem.rotation.z = 0.25;
    pepperGroup.add(stem);

    pepperGroup.position.set(-0.8, -0.2, 0.9);
    pepperGroup.rotation.set(0.2, -0.4, 0.3);
    rootGroup.add(pepperGroup);

    // 4. Golden Grain Orb (Sustainable Quinoa / Millet Cluster)
    const grainOrbGeo = new THREE.IcosahedronGeometry(0.75, 2);
    const grainMat = new THREE.MeshStandardMaterial({
      color: 0xD4B258,
      roughness: 0.5,
      metalness: 0.1,
      wireframe: false
    });
    const grainOrb = new THREE.Mesh(grainOrbGeo, grainMat);
    grainOrb.position.set(0.2, 0.6, 0.3);
    rootGroup.add(grainOrb);

    // 5. Floating Fresh Herb Leaves
    const leaves: THREE.Mesh[] = [];
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.25, 0.5, 0, 1.0);
    leafShape.quadraticCurveTo(-0.25, 0.5, 0, 0);

    const extrudeSettings = { depth: 0.02, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const leafGeo = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x889E65,
      roughness: 0.3,
      side: THREE.DoubleSide
    });

    const leafPositions = [
      { x: -1.8, y: 1.2, z: 1.2, rotX: 0.4, rotY: 0.3, rotZ: -0.6, scale: 0.65 },
      { x: 1.9, y: 1.6, z: 0.8, rotX: -0.2, rotY: 0.8, rotZ: 0.5, scale: 0.55 },
      { x: -0.2, y: 2.1, z: 0.4, rotX: 0.6, rotY: -0.4, rotZ: 0.2, scale: 0.48 },
      { x: 2.2, y: -0.8, z: 1.5, rotX: 0.1, rotY: 0.2, rotZ: -0.4, scale: 0.5 }
    ];

    leafPositions.forEach((pos) => {
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      leafMesh.position.set(pos.x, pos.y, pos.z);
      leafMesh.rotation.set(pos.rotX, pos.rotY, pos.rotZ);
      leafMesh.scale.set(pos.scale, pos.scale, pos.scale);
      rootGroup.add(leafMesh);
      leaves.push(leafMesh);
    });

    // 6. Floating Eco Nutrition Particles (Golden & Lime Ambient Specks)
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
      scales[i] = Math.random() * 0.08 + 0.02;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xD8F078,
      size: 0.065,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // MOUSE PARALLAX CONTROLS
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX = (x / rect.width) * 2 - 1;
      mouseY = -(y / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // RESIZE LISTENER
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation towards mouse
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      rootGroup.rotation.y = targetX * 0.45 + elapsedTime * 0.12;
      rootGroup.rotation.x = -targetY * 0.35 + Math.sin(elapsedTime * 0.4) * 0.05;

      // Floating breathing motions
      platter.position.y = -1.2 + Math.sin(elapsedTime * 0.8) * 0.06;
      ring.position.y = platter.position.y;

      tomatoGroup.position.y = -0.4 + Math.sin(elapsedTime * 1.1 + 1) * 0.1;
      tomatoGroup.rotation.y += 0.008;

      pepperGroup.position.y = -0.2 + Math.cos(elapsedTime * 0.9 + 2) * 0.12;
      pepperGroup.rotation.y += 0.006;

      grainOrb.position.y = 0.6 + Math.sin(elapsedTime * 1.3) * 0.14;
      grainOrb.rotation.x += 0.005;
      grainOrb.rotation.y += 0.008;

      // Floating leaves oscillation
      leaves.forEach((l, idx) => {
        l.position.y += Math.sin(elapsedTime * 1.5 + idx) * 0.003;
        l.rotation.z += Math.cos(elapsedTime * 1.2 + idx) * 0.003;
      });

      // Drifting particles
      particleSystem.rotation.y = elapsedTime * 0.04;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[520px] md:h-[680px] lg:h-[750px] flex items-center justify-center overflow-hidden">
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"
      />

      {/* Atmospheric Backing Radial Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] md:w-[620px] h-[340px] md:h-[620px] rounded-full bg-forest-glow filter blur-[100px] opacity-70" />
        <div className="absolute top-1/3 right-1/4 w-[220px] md:w-[380px] h-[220px] md:h-[380px] rounded-full bg-lime/10 filter blur-[90px] opacity-50" />
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

      {/* Subtle Floating Interactive Badge */}
      <div className="absolute bottom-6 left-6 md:left-12 z-20 pointer-events-none hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-full glass-panel border border-lime/20 text-xs text-ivory">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
        </span>
        <span className="font-mono text-sage">Interactive 3D Scene</span>
        <span className="text-charcoal-border">|</span>
        <span className="text-ivory font-medium">Drag to rotate & explore</span>
      </div>
    </div>
  );
};
