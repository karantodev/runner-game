export function updateParticles(particles, delta) {
  for (const particle of particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 0.25 * delta;
    particle.life -= delta;
  }
  return particles.filter((particle) => particle.life > 0);
}
