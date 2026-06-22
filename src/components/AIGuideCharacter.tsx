/**
 * AI Guide Character - Low-poly humanoid with welcoming sign language
 * @license Apache-2.0
 */

import { useRef } from 'react';
import { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

interface AIGuideCharacterProps {
  position: [number, number, number];
}

export const AIGuideCharacter = ({ position }: AIGuideCharacterProps) => {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Mesh>(null);
  const leftArmRef = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Gentle floating motion
    groupRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.2;

    // Slow rotation for character visibility
    groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.3;

    // Head look-around
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(time * 0.4) * 0.15;
      headRef.current.rotation.x = Math.sin(time * 0.3 + 1) * 0.1;
    }

    // Left arm - sign language gesture
    if (leftArmRef.current) {
      const armPhase = (time * 0.8) % (Math.PI * 2);
      leftArmRef.current.rotation.x = Math.sin(armPhase) * 0.6 - 0.3;
      leftArmRef.current.rotation.z = Math.cos(armPhase * 0.5) * 0.4;
      leftArmRef.current.position.x = -0.4 + Math.sin(armPhase) * 0.15;
      leftArmRef.current.position.y = Math.cos(armPhase) * 0.2;
    }

    // Right arm - welcoming gesture
    if (rightArmRef.current) {
      const armPhase = (time * 0.7 + Math.PI * 0.5) % (Math.PI * 2);
      rightArmRef.current.rotation.x = Math.sin(armPhase) * 0.5 - 0.4;
      rightArmRef.current.rotation.z = Math.cos(armPhase * 0.6) * 0.35;
      rightArmRef.current.position.x = 0.4 + Math.sin(armPhase) * 0.15;
      rightArmRef.current.position.y = Math.cos(armPhase * 0.8) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <mesh ref={headRef} position={[0, 1.5, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color="#E6D5F5"
          metalness={0.2}
          roughness={0.6}
          emissive="#C8E6FF"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 1.65, 0.32]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#2C3E50" emissive="#3B82F6" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.1, 1.65, 0.32]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#2C3E50" emissive="#3B82F6" emissiveIntensity={0.8} />
      </mesh>

      {/* Eye highlights */}
      <mesh position={[-0.08, 1.67, 0.38]} castShadow>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.12, 1.67, 0.38]} castShadow>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.9, 0.35]} />
        <meshStandardMaterial
          color="#B8D4C8"
          metalness={0.15}
          roughness={0.7}
          emissive="#B3E5FC"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Left arm */}
      <mesh ref={leftArmRef} position={[-0.4, 1.0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.18]} />
        <meshStandardMaterial
          color="#E6D5F5"
          metalness={0.2}
          roughness={0.6}
          emissive="#A8D5FF"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Left hand */}
      <mesh position={[-0.4, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color="#E6D5F5"
          metalness={0.2}
          roughness={0.6}
          emissive="#A8D5FF"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Right arm */}
      <mesh ref={rightArmRef} position={[0.4, 1.0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.7, 0.18]} />
        <meshStandardMaterial
          color="#F5E6D3"
          metalness={0.15}
          roughness={0.7}
          emissive="#FFE5CC"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Right hand */}
      <mesh position={[0.4, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color="#F5E6D3"
          metalness={0.15}
          roughness={0.7}
          emissive="#FFE5CC"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.15, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.45, 0.18]} />
        <meshStandardMaterial
          color="#A8D5FF"
          metalness={0.1}
          roughness={0.8}
          emissive="#B3E5FC"
          emissiveIntensity={0.15}
        />
      </mesh>

      <mesh position={[0.15, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.45, 0.18]} />
        <meshStandardMaterial
          color="#A8D5FF"
          metalness={0.1}
          roughness={0.8}
          emissive="#B3E5FC"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Glow aura */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial
          transparent
          opacity={0.2}
          color="#B3E5FC"
          emissive="#A8D5FF"
          emissiveIntensity={0.4}
          side={2}
        />
      </mesh>
    </group>
  );
};
