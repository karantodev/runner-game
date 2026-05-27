export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function damp(from, to, smoothing, delta) {
  return lerp(from, to, 1 - Math.exp(-smoothing * delta));
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function chance(probability) {
  return Math.random() < probability;
}
