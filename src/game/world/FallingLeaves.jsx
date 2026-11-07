import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from '../player/playerState'
import { mulberry32 } from './heightfield'
import { world } from './uniforms'

const PETAL = new THREE.Color('#ffc6da')
const LEAF = new THREE.Color('#9dbb4e')
const SEEN_WITHIN = 60

function build(blossoms, oaks, dense) {
  const rand = mulberry32(83)
  const start = [], motion = [], color = []
  const shed = (trees, perTree, tint, height, spread, size) => {
    for (const tree of trees) {
      for (let i = 0; i < perTree; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * spread * tree.scale
        start.push(tree.x + Math.cos(a) * r, tree.y, tree.z + Math.sin(a) * r, (height + rand() * 2) * tree.scale)
        motion.push(rand(), 9 + rand() * 8, rand() * 6.28, size * (0.75 + rand() * 0.5))
        color.push(tint.r, tint.g, tint.b)
      }
    }
  }
  shed(blossoms, dense ? 10 : 4, PETAL, 3.4, 2.6, 0.075)
  shed(oaks, dense ? 2 : 1, LEAF, 5, 3.6, 0.1)

  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0.62, 0, 0, 0, 1, 0, -0.62, 0, 0], 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.setAttribute('aStart', new THREE.InstancedBufferAttribute(new Float32Array(start), 4))
  geometry.setAttribute('aMotion', new THREE.InstancedBufferAttribute(new Float32Array(motion), 4))
  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(color), 3))
  geometry.instanceCount = start.length / 4
  return geometry
}

function buildMaterial(robot) {
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })
  material.customProgramCacheKey = () => 'falling-leaves'
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: world.uTime, uWind: world.uWind, uWindDir: world.uWindDir, uRain: world.uRain, uRobot: robot })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aStart, aMotion;
        attribute vec3 aColor;
        uniform float uTime, uWind, uRain;
        uniform vec2 uWindDir;
        uniform vec3 uRobot;
        varying vec3 vTint;`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', `
        // Everything runs here on a loop, so nothing is tracked or updated from JavaScript.
        float life = fract(uTime / aMotion.y + aMotion.x);
        float tumble = life * aMotion.y * 2.2 + aMotion.z;
        vec3 at = aStart.xyz;
        at.y += aStart.w * (1.0 - life);
        at.xz += uWindDir * life * (1.0 + uWind * 7.0);
        at.xz += vec2(sin(tumble * 0.7), cos(tumble * 0.53)) * 0.45;

        float seen = 1.0 - smoothstep(${(SEEN_WITHIN * 0.7).toFixed(1)}, ${SEEN_WITHIN.toFixed(1)}, distance(at, uRobot));
        float size = aMotion.w * seen * smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.93, 1.0, life)) * (1.0 - uRain * 0.8);
        vec3 transformed = position * size;
        float c = cos(tumble), s = sin(tumble);
        transformed = vec3(transformed.x * c, transformed.y * s + transformed.x * 0.3, transformed.y * c + transformed.x * s);
        transformed += at;
        vTint = aColor;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vTint;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);')
  }
  return material
}

export default function FallingLeaves({ blossoms, oaks, dense }) {
  const robot = useMemo(() => ({ value: new THREE.Vector3() }), [])
  const geometry = useMemo(() => build(blossoms, oaks, dense), [blossoms, oaks, dense])
  const material = useMemo(() => buildMaterial(robot), [robot])

  useFrame(() => robot.value.copy(player.position))
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
