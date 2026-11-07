import { Color, Vector2, Vector3 } from 'three'

// Shared by every shader. environment.js animates them each frame.
export const world = {
  uTime: { value: 0 },
  uTop: { value: new Color('#6db6e6') },
  uHorizon: { value: new Color('#ffe0bd') },
  uSunColor: { value: new Color('#fff1d6') },
  uSunDir: { value: new Vector3(0.5, 0.6, 0.4).normalize() },
  uMoonDir: { value: new Vector3(-0.5, 0.6, 0.3).normalize() },
  uNight: { value: 0 },
  uCloud: { value: 0.1 },
  uRain: { value: 0 },
  uWet: { value: 0 },
  uWind: { value: 0.2 },
  uWindDir: { value: new Vector2(0.8, 0.6) },
  uFlash: { value: 0 },
  uFocus: { value: 7.6 }, // camera-to-character distance
  uFogNear: { value: 90 },
  uFogFar: { value: 430 },
}

export const SKY_GLSL = /* glsl */ `
  uniform vec3 uTop, uHorizon, uSunColor, uSunDir, uMoonDir;
  uniform float uNight, uCloud, uFlash;
  vec3 skyGradient(vec3 d) {
    return mix(uHorizon, uTop, pow(clamp(d.y * 1.4, 0.0, 1.0), 0.6));
  }
`

// Bends instanced plants in world space, with gust fronts rolling across the island.
export function addSway(material, strength = 0.05) {
  // The strength is baked into the shader, so each value needs its own compiled program.
  material.customProgramCacheKey = () => `sway-${strength}`
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = world.uTime
    shader.uniforms.uWind = world.uWind
    shader.uniforms.uWindDir = world.uWindDir
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWind;\nuniform vec2 uWindDir;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
        vec3 root = instanceMatrix[3].xyz;
        float front = sin(dot(root.xz, uWindDir) * 0.05 - uTime * 1.7) * 0.5 + 0.5;
        float gust = uWind * (0.3 + front * front * 1.5);
        float bend = transformed.y * transformed.y * ${strength.toFixed(4)};
        float flutter = sin(uTime * 7.0 + root.x + transformed.y * 2.0 + transformed.x * 3.0);
        mvPosition.xz += uWindDir * bend * (gust * 2.4 + sin(uTime * 1.3 + root.z) * 0.2);
        mvPosition.xz += vec2(-uWindDir.y, uWindDir.x) * bend * flutter * gust * 0.35;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`)
  }
  return material
}

// Trees move in layers: the trunk leans with gusts, each branch swings on its own beat, and the
// leaves shiver. aWind.x is how free a vertex is (0 at the trunk, 1 at a leaf tip) and aWind.y its
// beat. Wood stores a negative beat, so shaders can tell it from foliage.
export function addTreeSway(material, strength = 0.05) {
  material.customProgramCacheKey = () => `tree-sway-${strength}`
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = world.uTime
    shader.uniforms.uWind = world.uWind
    shader.uniforms.uWindDir = world.uWindDir
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 aWind;
        uniform float uTime, uWind;
        uniform vec2 uWindDir;
        varying float vLeaf;`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
        vec3 root = instanceMatrix[3].xyz;
        vLeaf = step(0.0, aWind.y);
        float front = sin(dot(root.xz, uWindDir) * 0.05 - uTime * 1.7) * 0.5 + 0.5;
        float gust = uWind * (0.3 + front * front * 1.5);
        float bend = transformed.y * transformed.y * ${strength.toFixed(4)};
        mvPosition.xz += uWindDir * bend * (gust * 2.4 + sin(uTime * 1.3 + root.z) * 0.2);

        float beat = abs(aWind.y) * 6.283 + root.x * 0.7 + root.z * 0.4;
        float swing = sin(uTime * (1.5 + abs(aWind.y) * 0.9) + beat);
        mvPosition.xz += uWindDir * aWind.x * gust * (0.3 + swing * 0.22);
        mvPosition.y += aWind.x * swing * (0.018 + gust * 0.16);

        float shiver = sin(uTime * 8.5 + beat * 3.0 + transformed.x * 2.1 + transformed.z * 1.7);
        mvPosition.xyz += vec3(shiver, shiver * 0.6, -shiver) * aWind.x * aWind.x * vLeaf * (0.012 + gust * 0.075);

        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`)
  }
  return material
}
