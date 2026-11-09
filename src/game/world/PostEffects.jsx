import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { env } from './environment'
import { player } from '../player/playerState'
import { world } from './uniforms'

// Colour moods through the day: shadow tint, highlight tint, saturation, contrast and exposure.
// Dim scenes get more exposure, because the film curve trims their darkest tones.
const v = (r, g, b) => new THREE.Vector3(r, g, b)
const NIGHT = { shadow: v(0.9, 0.95, 1.1), light: v(0.98, 1, 1.06), saturation: 0.96, contrast: 1.05, exposure: 1.1 }
const MOODS = [
  { t: 0, ...NIGHT },
  { t: 0.21, ...NIGHT },
  { t: 0.27, shadow: v(1.01, 0.94, 1.05), light: v(1.06, 1.01, 0.93), saturation: 1.06, contrast: 1.03, exposure: 1.2 },
  { t: 0.36, shadow: v(0.97, 0.99, 1.04), light: v(1.03, 1.01, 0.98), saturation: 1.06, contrast: 1.05, exposure: 1.06 },
  { t: 0.64, shadow: v(0.97, 0.99, 1.04), light: v(1.03, 1.01, 0.98), saturation: 1.06, contrast: 1.05, exposure: 1.06 },
  { t: 0.74, shadow: v(0.97, 0.91, 1.06), light: v(1.08, 1, 0.9), saturation: 1.08, contrast: 1.05, exposure: 1.2 },
  { t: 0.8, ...NIGHT },
  { t: 1, ...NIGHT },
]
const STORM = v(0.92, 0.97, 1.06)

const GRADE = /* glsl */ `
  uniform vec3 uShadow, uLight;
  uniform float uSaturation, uContrast, uExposure, uLift;
  // Graded in display brightness, the way the eye judges it, then handed back as linear light.
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2)) * uExposure;
    c += uLift * (1.0 - c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSaturation);
    c = (c - 0.5) * uContrast + 0.5;
    c *= mix(uShadow, uLight, smoothstep(0.1, 0.8, l));
    outputColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(2.2)), inputColor.a);
  }
`

class GradeEffect extends Effect {
  constructor() {
    super('Grade', GRADE, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uShadow', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['uLight', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['uSaturation', new THREE.Uniform(1)],
        ['uContrast', new THREE.Uniform(1)],
        ['uExposure', new THREE.Uniform(1)],
        ['uLift', new THREE.Uniform(0.035)],
      ]),
    })
  }

  follow(time, gloom) {
    const i = MOODS.findIndex((m) => m.t > time)
    const a = MOODS[Math.max(0, i - 1)], b = MOODS[Math.max(0, i)]
    const k = b.t > a.t ? (time - a.t) / (b.t - a.t) : 0
    const u = this.uniforms
    u.get('uShadow').value.lerpVectors(a.shadow, b.shadow, k).lerp(STORM, gloom)
    u.get('uLight').value.lerpVectors(a.light, b.light, k).lerp(STORM, gloom * 0.8)
    u.get('uSaturation').value = THREE.MathUtils.lerp(a.saturation, b.saturation, k) * (1 - gloom * 0.28)
    u.get('uContrast').value = THREE.MathUtils.lerp(a.contrast, b.contrast, k)
    u.get('uExposure').value = THREE.MathUtils.lerp(a.exposure, b.exposure, k)
  }
}

// Low mist that pools in the valleys and over the river. It thickens around dawn and after dark.
const MIST = /* glsl */ `
  uniform mat4 uInverseProjection, uCameraWorld;
  uniform vec3 uMistColor;
  uniform float uDensity;
  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    if (depth >= 0.9999) { outputColor = inputColor; return; }
    vec4 view = uInverseProjection * vec4(vec3(uv, depth) * 2.0 - 1.0, 1.0);
    vec3 at = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
    vec3 eye = uCameraWorld[3].xyz;
    // Density falls off with height, integrated along the line of sight.
    float from = max(eye.y - 2.2, -4.0) / 2.6, to = max(at.y - 2.2, -4.0) / 2.6;
    float layer = abs(to - from) > 0.01 ? (exp(-from) - exp(-to)) / (to - from) : exp(-from);
    float far = distance(at, eye);
    // Close by the air stays clear, so the robot and its surroundings keep their colour.
    float amount = (1.0 - exp(-uDensity * far * layer)) * smoothstep(12.0, 60.0, far);
    outputColor = vec4(mix(inputColor.rgb, uMistColor, clamp(amount, 0.0, 0.8)), inputColor.a);
  }
`
const MIST_BY_TIME = [[0, 0.006], [0.2, 0.0065], [0.28, 0.008], [0.36, 0.003], [0.64, 0.0025], [0.74, 0.005], [0.82, 0.006], [1, 0.006]]
const white = new THREE.Color('#ffffff')

class MistEffect extends Effect {
  constructor() {
    super('Mist', MIST, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uInverseProjection', new THREE.Uniform(new THREE.Matrix4())],
        ['uCameraWorld', new THREE.Uniform(new THREE.Matrix4())],
        ['uMistColor', new THREE.Uniform(new THREE.Color())],
        ['uDensity', new THREE.Uniform(0)],
      ]),
    })
  }

  follow(camera, time) {
    const u = this.uniforms
    u.get('uInverseProjection').value.copy(camera.projectionMatrixInverse)
    u.get('uCameraWorld').value.copy(camera.matrixWorld)
    const i = MIST_BY_TIME.findIndex(([t]) => t > time)
    const [t0, d0] = MIST_BY_TIME[Math.max(0, i - 1)], [t1, d1] = MIST_BY_TIME[Math.max(0, i)]
    const k = t1 > t0 ? (time - t0) / (t1 - t0) : 0
    u.get('uDensity').value = (d0 + (d1 - d0) * k) * (1 + env.rain * 0.5) * (player.indoors ? 0 : 1)
    u.get('uMistColor').value.copy(world.uHorizon.value).lerp(white, 0.2 * (1 - env.night)).multiplyScalar(0.5 + (1 - env.night) * 0.3)
  }
}

const SHARP_ENOUGH = 3.2e6 // pixels: past this, edges are fine without extra smoothing

// Film-like light handling for the whole island. Phones and low quality skip the glow and the
// extra edge smoothing, which are the costly parts.
export default function PostEffects({ rich }) {
  const grade = useMemo(() => new GradeEffect(), [])
  const mist = useMemo(() => new MistEffect(), [])
  const pixels = useThree((s) => s.size.width * s.size.height * s.viewport.dpr ** 2)

  useFrame(({ camera }) => {
    const time = env.time % 1
    grade.follow(time, Math.max(env.cloud * env.rain, env.fog * 0.7))
    mist.follow(camera, time)
  })

  return (
    <EffectComposer multisampling={rich && pixels < SHARP_ENOUGH ? 4 : 0} frameBufferType={THREE.HalfFloatType}>
      <primitive object={mist} />
      {rich ? <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.6} radius={0.7} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <primitive object={grade} />
      <Vignette offset={0.35} darkness={0.32} />
    </EffectComposer>
  )
}
