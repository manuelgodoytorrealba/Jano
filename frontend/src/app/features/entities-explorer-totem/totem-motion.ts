export type TotemMotion = {
  position: number;
  velocity: number;
  target: number | null;
};

/** Position and velocity are measured in cards and cards per second. */
export function advanceTotemMotion(motion: TotemMotion, seconds: number): TotemMotion {
  const dt = Math.min(Math.max(seconds, 0), 0.05);
  let { position, velocity, target } = motion;
  if (target === null && Math.abs(velocity) > 1.1) {
    const friction = 3.6;
    const decay = Math.exp(-friction * dt);
    position += (velocity * (1 - decay)) / friction;
    velocity *= decay;
  } else {
    target ??= Math.round(position);
    // Critical damping settles into a detent without a decorative bounce.
    const spring = 18;
    const distance = position - target;
    const momentum = velocity + spring * distance;
    const decay = Math.exp(-spring * dt);
    position = target + (distance + momentum * dt) * decay;
    velocity = (velocity - spring * momentum * dt) * decay;
    if (Math.abs(position - target) < 0.001 && Math.abs(velocity) < 0.015) {
      position = target;
      velocity = 0;
    }
  }
  return { position, velocity, target };
}
