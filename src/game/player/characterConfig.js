// To swap the character, drop a GLB in public/models and update this file.
// `clips` maps each game state to the animation name inside your file.
export const character = {
  url: '/models/character.glb',
  scale: 1,
  rotationY: 0, // model should face +Z; use Math.PI if yours faces the other way
  clips: { idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump', wave: 'Wave' }, // wave is optional
}
