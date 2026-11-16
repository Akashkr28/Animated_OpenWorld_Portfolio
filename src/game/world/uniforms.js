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
  // Seasons, each 0 to 1 and blended while the season turns. Summer is when all three are 0.
  uSpring: { value: 0 },
  uAutumn: { value: 0 },
  uSnow: { value: 0 },
}

// Seasonal colouring shared by the ground, plants and rocks. Fragment shaders only.
export const SEASON_GLSL = /* glsl */ `
  uniform float uSpring, uAutumn, uSnow;
  vec3 seasonWorldNormal(vec3 viewNormal) { return normalize((vec4(viewNormal, 0.0) * viewMatrix).xyz); }
  vec3 seasonWorldPos(vec3 viewPos) { return cameraPosition + (vec4(viewPos, 0.0) * viewMatrix).xyz; }
  float seasonHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // Leaves turn amber, gold and red, one colour per tree-sized patch.
  vec3 autumnLeaves(vec3 c, vec3 at, float amount) {
    float h = seasonHash(floor(at.xz * 0.2));
    vec3 leaf = mix(vec3(0.92, 0.36, 0.08), vec3(0.95, 0.66, 0.12), h);
    leaf = mix(leaf, vec3(0.7, 0.13, 0.08), step(0.78, h));
    float light = dot(c, vec3(0.3, 0.59, 0.11));
    return mix(c, leaf * (0.45 + light * 1.4), amount);
  }
  // Grass and moss dry out to straw.
  vec3 autumnDry(vec3 c, float amount) {
    float green = clamp((c.g - max(c.r, c.b)) * 6.0, 0.0, 1.0);
    float light = dot(c, vec3(0.3, 0.59, 0.11));
    return mix(c, vec3(0.55, 0.47, 0.22) * (0.55 + light * 1.1), amount * green);
  }
  // Snow settles on whatever faces the sky.
  vec3 snowCover(vec3 c, vec3 up, float amount) {
    float settle = smoothstep(0.2, 0.75, up.y);
    return mix(c, vec3(0.8, 0.84, 0.92) * (0.82 + 0.18 * settle), amount * settle);
  }
`

// Snow and autumn colour for plain lit materials, such as rocks and tufts.
export function addSeasonal(material, { dry = false } = {}) {
  const previous = material.onBeforeCompile
  const key = material.customProgramCacheKey?.() ?? ''
  material.customProgramCacheKey = () => `${key}-season-${dry}`
  material.onBeforeCompile = (shader, renderer) => {
    previous?.(shader, renderer)
    Object.assign(shader.uniforms, { uSpring: world.uSpring, uAutumn: world.uAutumn, uSnow: world.uSnow })
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SEASON_GLSL}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        ${dry ? 'diffuseColor.rgb = autumnDry(diffuseColor.rgb, uAutumn);' : ''}
        diffuseColor.rgb = snowCover(diffuseColor.rgb, seasonWorldNormal(normal), uSnow * 0.92);`)
  }
  return material
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
