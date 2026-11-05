import { useMemo } from 'react'
import * as THREE from 'three'

// <shaderMaterial> copies its uniforms, so numbers like uTime would freeze at their first value.
// Building the material directly keeps it pointing at the shared, live uniform objects.
export default function SharedShader({ ref, ...options }) {
  const material = useMemo(() => new THREE.ShaderMaterial(options), []) // eslint-disable-line react-hooks/exhaustive-deps
  if (ref) ref.current = material
  return <primitive object={material} attach="material" />
}
