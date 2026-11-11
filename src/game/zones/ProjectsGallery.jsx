import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { heightAt } from '../world/heightfield'
import { pedestals, ZONES } from '../world/layout'
import { pillLabel } from '../world/labels'
import { world } from '../world/uniforms'
import { zoneText } from '../../data/portfolio'
import { useGameStore } from '../../store/useGameStore'
import ZoneMarker from './ZoneMarker'

const SCREEN_W = 1.92, SCREEN_H = 1.08
const SCREEN_Y = 2.6

// Drawn through a canvas, so SVG illustrations work as well as photos.
function loadScreenshot(src, done) {
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 540
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    done(texture)
  }
  image.src = src
}

// The project's screenshot, with a light band sweeping down it like a hologram refreshing.
function screenMaterial(image) {
  const material = new THREE.MeshBasicMaterial({ color: '#2e2c5c', toneMapped: true })
  loadScreenshot(image, (texture) => {
    material.map = texture
    material.color.set('#ffffff')
    material.needsUpdate = true
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = world.uTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vScreen;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvScreen = uv;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vScreen;')
      .replace('#include <opaque_fragment>', `
        float band = smoothstep(0.08, 0.0, abs(fract(1.0 - vScreen.y - uTime * 0.12) - 0.5));
        float lines = 0.96 + 0.04 * sin(vScreen.y * 420.0);
        vec2 edge = min(vScreen, 1.0 - vScreen);
        float vignette = smoothstep(0.0, 0.08, min(edge.x, edge.y * 1.8));
        outgoingLight = outgoingLight * lines * mix(0.72, 1.0, vignette) + vec3(0.55, 0.8, 1.0) * band * 0.12;
        #include <opaque_fragment>`)
  }
  return material
}

const toward = new THREE.Vector3()

// A slim floating display above each pedestal, beamed up from a projector in the plinth.
function ProjectScreen({ project, x, z, y, index, id }) {
  const group = useRef()
  const beam = useRef()
  const screen = useMemo(() => screenMaterial(project.image), [project.image])
  const edge = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(project.color).multiplyScalar(1.8) }), [project.color])
  useEffect(() => () => { screen.map?.dispose(); screen.dispose(); edge.dispose() }, [screen, edge])
  // Faces the middle of the gallery, where visitors walk in.
  const rest = Math.atan2(ZONES.projects.x - x, ZONES.projects.z - z)

  useFrame(({ camera }, dt) => {
    const near = useGameStore.getState().nearby?.id === id
    const t = world.uTime.value
    const g = group.current
    toward.set(camera.position.x - x, 0, camera.position.z - z)
    // Close by, it turns to face the visitor's view. Otherwise it drifts gently on its stand.
    const target = near ? Math.atan2(toward.x, toward.z) : rest + Math.sin(t * 0.4 + index) * 0.22
    const turn = Math.atan2(Math.sin(target - g.rotation.y), Math.cos(target - g.rotation.y))
    g.rotation.y += turn * Math.min(1, dt * (near ? 5 : 2))
    g.rotation.x = Math.sin(t * 0.7 + index) * 0.04
    g.position.y = SCREEN_Y + Math.sin(t * 1.2 + index) * 0.08
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, near ? 1.18 : 1, 6, dt))
    beam.current.material.opacity = THREE.MathUtils.damp(beam.current.material.opacity, near ? 0.32 : 0.14, 6, dt)
  })

  return (
    <>
      <mesh ref={beam} position-y={(1.52 + SCREEN_Y - SCREEN_H / 2) / 2 + 0.02}>
        <cylinderGeometry args={[0.85, 0.3, SCREEN_Y - SCREEN_H / 2 - 1.5, 6, 1, true]} />
        <meshBasicMaterial color={project.color} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <group ref={group} position-y={SCREEN_Y} rotation-y={rest}>
        <mesh castShadow>
          <boxGeometry args={[SCREEN_W + 0.14, SCREEN_H + 0.14, 0.07]} />
          <meshLambertMaterial color="#1f1c42" />
        </mesh>
        <mesh position-z={0.037} material={edge}>
          <planeGeometry args={[SCREEN_W + 0.07, SCREEN_H + 0.07]} />
        </mesh>
        <mesh position-z={0.039} material={screen}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        </mesh>
        <mesh position={[0, -SCREEN_H / 2 - 0.09, -0.02]}>
          <boxGeometry args={[0.5, 0.06, 0.12]} />
          <meshLambertMaterial color="#2e2c5c" />
        </mesh>
      </group>
    </>
  )
}

function Pedestal({ project, x, z, index }) {
  const ring = useRef()
  const y = heightAt(x, z)
  const label = useMemo(() => pillLabel(project.title, { color: project.color, size: 44 }), [project])
  const id = `project-${project.id}`

  useFrame((_, dt) => {
    const near = useGameStore.getState().nearby?.id === id
    ring.current.material.opacity = THREE.MathUtils.damp(ring.current.material.opacity, near ? 0.9 : 0.3, 8, dt)
  })

  return (
    <group position={[x, y, z]}>
      <mesh position-y={0.1} receiveShadow>
        <cylinderGeometry args={[1.25, 1.4, 0.2, 6]} />
        <meshLambertMaterial color="#8d86a3" flatShading />
      </mesh>
      <mesh position-y={0.8} castShadow>
        <cylinderGeometry args={[0.62, 0.85, 1.25, 6]} />
        <meshLambertMaterial color="#3a3670" flatShading />
      </mesh>
      <mesh position-y={1.46}>
        <cylinderGeometry args={[0.8, 0.68, 0.1, 6]} />
        <meshLambertMaterial color={project.color} flatShading />
      </mesh>
      <mesh position-y={1.53}>
        <cylinderGeometry args={[0.3, 0.36, 0.06, 12]} />
        <meshBasicMaterial color={project.color} />
      </mesh>
      <ProjectScreen project={project} x={x} z={z} y={y} index={index} id={id} />
      <mesh ref={ring} position-y={0.24} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.5, 1.72, 24]} />
        <meshBasicMaterial color={project.color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <sprite position-y={3.75} scale={[0.72 * label.aspect, 0.72, 1]}>
        <spriteMaterial map={label.texture} transparent depthWrite={false} fog={false} />
      </sprite>
    </group>
  )
}

export default function ProjectsGallery() {
  return (
    <>
      <ZoneMarker zone={ZONES.projects} label={zoneText.projects.label} height={10} />
      {pedestals.map((p, i) => <Pedestal key={p.project.id} {...p} index={i} />)}
      <RigidBody type="fixed" colliders={false}>
        {pedestals.map(({ project, x, z }) => (
          <CylinderCollider key={project.id} args={[1.2, 0.85]} position={[x, heightAt(x, z) + 1.2, z]} />
        ))}
      </RigidBody>
    </>
  )
}
