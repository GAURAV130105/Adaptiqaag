/**
 * 3D Scene Setup with Three.js and React Three Fiber
 * Soft volumetric lighting, smooth animations, accessible camera
 * @license Apache-2.0
 */

import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import { Suspense } from 'react';
import { AIGuideCharacter } from './AIGuideCharacter';
import { ParticleSystem } from './ParticleSystem';
import { FloatingCards } from './FloatingCards';
import { HolographicElements } from './HolographicElements';
import { SceneSkybox } from './SceneSkybox';

export const Scene3D = () => {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 4], fov: 45, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      className="w-full h-full"
      gl={{
        antialias: true,
        alpha: true,
        stencil: false,
        depth: true,
      }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={45} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={2}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.25}
        />

        {/* Lighting Setup - Soft and Calming */}
        <directionalLight position={[4, 5, 3]} intensity={0.8} color="#FFE5CC" castShadow />
        <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#B3E5FC" castShadow />
        <ambientLight intensity={0.6} color="#F5E6D3" />
        <hemisphereLight color="#E6D5F5" groundColor="#F5E6D3" intensity={0.7} />
        <pointLight position={[0, 5, -8]} intensity={0.5} color="#A8D5FF" />
        <pointLight position={[0, -2, 5]} intensity={0.3} color="#B8D4C8" />

        {/* Skybox */}
        <SceneSkybox />

        {/* AI Guide Character */}
        <AIGuideCharacter position={[0, 0, 0]} />

        {/* Particle System */}
        <ParticleSystem />

        {/* Floating Cards */}
        <FloatingCards />

        {/* Holographic Elements */}
        <HolographicElements />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            height={300}
            mipmapBlur={true}
            intensity={1.2}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
};
