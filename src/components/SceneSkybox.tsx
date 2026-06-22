/**
 * Calm gradient skybox with animated waves
 * @license Apache-2.0
 */

import { useRef } from 'react';
import { Mesh, ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';

export const SceneSkybox = () => {
  const skyboxRef = useRef<Mesh>(null);

  const vertexShader = `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vPosition;
    uniform float uTime;
    
    void main() {
      vec3 normalizedPos = normalize(vPosition);
      
      vec3 color1 = vec3(0.902, 0.839, 0.961); // Lavender
      vec3 color2 = vec3(0.702, 0.902, 0.988); // Soft Cyan
      vec3 color3 = vec3(0.961, 0.902, 0.827); // Warm Beige
      
      vec3 color;
      float y = normalizedPos.y * 0.5 + 0.5;
      
      if (y < 0.5) {
        color = mix(color3, color2, y * 2.0);
      } else {
        color = mix(color2, color1, (y - 0.5) * 2.0);
      }
      
      float wave = sin(normalizedPos.x * 2.0 + uTime * 0.5) * 0.05;
      color += vec3(wave) * 0.1;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  useFrame(({ clock }) => {
    if (skyboxRef.current && skyboxRef.current.material instanceof ShaderMaterial) {
      skyboxRef.current.material.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={skyboxRef} scale={[-100, 100, 100]}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
        }}
        side={2}
      />
    </mesh>
  );
};
