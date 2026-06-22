/**
 * Neural particle system with gentle animations
 * @license Apache-2.0
 */

import { useRef, useMemo } from 'react';
import { Points } from 'three';
import { useFrame } from '@react-three/fiber';

export const ParticleSystem = () => {
  const pointsRef = useRef<Points>(null);

  const particleCount = 150;

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 2 + Math.random() * 3;

      positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i3 + 1] = Math.cos(phi) * radius - 0.5;
      positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      velocities[i3] = (Math.random() - 0.5) * 0.3;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.3;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    return { positions, velocities };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      positions[i3] += velocities[i3] * 0.01;
      positions[i3 + 1] += velocities[i3 + 1] * 0.01;
      positions[i3 + 2] += velocities[i3 + 2] * 0.01;

      if (positions[i3] > 5) positions[i3] = -5;
      if (positions[i3] < -5) positions[i3] = 5;
      if (positions[i3 + 1] > 5) positions[i3 + 1] = -5;
      if (positions[i3 + 1] < -5) positions[i3 + 1] = 5;
      if (positions[i3 + 2] > 5) positions[i3 + 2] = -5;
      if (positions[i3 + 2] < -5) positions[i3 + 2] = 5;

      positions[i3] += Math.sin((i + Date.now()) * 0.001) * 0.0005;
      positions[i3 + 1] += Math.cos((i + Date.now()) * 0.001) * 0.0005;
      positions[i3 + 2] += Math.sin((i + Date.now() * 1.5) * 0.001) * 0.0005;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          color="#A8D5FF"
          sizeAttenuation={true}
          transparent={true}
          opacity={0.7}
        />
      </points>

      {/* Accent particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={40}
            array={new Float32Array(
              Array.from({ length: 40 }, () => [
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
              ]).flat()
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.25}
          color="#B3E5FC"
          sizeAttenuation={true}
          transparent={true}
          opacity={0.5}
        />
      </points>
    </group>
  );
};
