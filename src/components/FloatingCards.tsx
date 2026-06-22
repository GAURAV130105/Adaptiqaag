/**
 * Floating glass cards with glassmorphism
 * @license Apache-2.0
 */

import { useRef } from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';

interface CardProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

const FloatingCard = ({ position, rotation, scale }: CardProps) => {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();

    groupRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.3;

    groupRef.current.rotation.x = rotation[0] + Math.sin(time * 0.3) * 0.1;
    groupRef.current.rotation.y = rotation[1] + time * 0.2;
    groupRef.current.rotation.z = rotation[2] + Math.cos(time * 0.3) * 0.1;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.2, 1.2, 8, 8]} />
        <meshStandardMaterial
          color="#E6F3FF"
          metalness={0.3}
          roughness={0.5}
          transparent={true}
          opacity={0.7}
          emissive="#B3E5FC"
          emissiveIntensity={0.4}
        />
      </mesh>

      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.25, 1.25]} />
        <meshStandardMaterial
          color="#A8D5FF"
          transparent={true}
          opacity={0.3}
          emissive="#A8D5FF"
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh position={[0, 0.2, 0.02]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#B8D4C8"
          metalness={0.4}
          roughness={0.4}
          emissive="#B3E5FC"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
};

export const FloatingCards = () => {
  const cards: CardProps[] = [
    {
      position: [-3, 2, -1],
      rotation: [0.3, 0.5, 0.2],
      scale: 0.8,
    },
    {
      position: [3, 2, -1],
      rotation: [-0.3, -0.5, -0.2],
      scale: 0.8,
    },
    {
      position: [-2.5, -1, 1],
      rotation: [0.2, -0.3, 0.3],
      scale: 0.75,
    },
    {
      position: [2.5, -1, 1],
      rotation: [-0.2, 0.3, -0.3],
      scale: 0.75,
    },
    {
      position: [0, 3, -2],
      rotation: [0, 0, 0],
      scale: 0.85,
    },
  ];

  return (
    <group>
      {cards.map((card, i) => (
        <FloatingCard key={i} {...card} />
      ))}
    </group>
  );
};
