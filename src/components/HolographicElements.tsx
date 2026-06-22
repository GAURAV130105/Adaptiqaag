/**
 * Holographic accessibility elements
 * @license Apache-2.0
 */

import { useRef } from 'react';
import { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HolographicIcon = ({
  position,
  speed,
  color,
}: {
  position: [number, number, number];
  speed: number;
  color: string;
}) => {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !meshRef.current) return;

    const time = clock.getElapsedTime();

    groupRef.current.position.x = position[0] + Math.cos(time * speed) * 0.5;
    groupRef.current.position.y = position[1] + Math.sin(time * speed * 0.7) * 0.3;
    groupRef.current.position.z = position[2] + Math.sin(time * speed * 0.5) * 0.5;

    meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.y += 0.015;

    const pulse = 1 + Math.sin(time * speed) * 0.1;
    meshRef.current.scale.multiplyScalar(pulse / meshRef.current.scale.x);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.3, 2]} />
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          transparent={true}
          opacity={0.8}
          emissive={color}
          emissiveIntensity={0.8}
          wireframe={true}
        />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.35, 2]} />
        <meshStandardMaterial
          transparent={true}
          opacity={0.2}
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          side={2}
        />
      </mesh>
    </group>
  );
};

export const HolographicElements = () => {
  return (
    <group>
      <HolographicIcon position={[-2, 1.5, -2]} speed={1} color="#A8D5FF" />
      <HolographicIcon position={[2, 1.5, -2]} speed={1.2} color="#B8D4C8" />
      <HolographicIcon position={[-1.5, -0.5, 2]} speed={0.8} color="#E6D5F5" />
      <HolographicIcon position={[1.5, -0.5, 2]} speed={0.9} color="#FFE5CC" />
      <HolographicIcon position={[0, 0.3, 0]} speed={0.5} color="#B3E5FC" />

      <DataStream position={[-1.5, 1, -1]} direction={[1, -0.5, 0]} />
      <DataStream position={[1.5, 1, -1]} direction={[-1, -0.5, 0]} />
    </group>
  );
};

const DataStream = ({
  position,
  direction,
}: {
  position: [number, number, number];
  direction: [number, number, number];
}) => {
  const lineRef = useRef<Mesh>(null);

  return (
    <mesh ref={lineRef} position={position}>
      <tubeGeometry
        args={[
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(
              direction[0] * 0.5,
              direction[1] * 0.5,
              direction[2] * 0.5
            ),
            new THREE.Vector3(
              direction[0] * 1.5,
              direction[1] * 1.5,
              direction[2] * 1.5
            ),
          ]),
          8,
          0.05,
          3,
        ]}
      />
      <meshStandardMaterial
        color="#A8D5FF"
        transparent={true}
        opacity={0.4}
        emissive="#A8D5FF"
        emissiveIntensity={0.6}
      />
    </mesh>
  );
};
