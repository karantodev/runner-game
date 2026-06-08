import * as THREE from '../../../../node_modules/three/build/three.module.js';

export class ThreeEntityManager {
  constructor(scene, textureCache, windUniform) {
    this.scene = scene;
    this.textureCache = textureCache;
    this.windUniform = windUniform;

    this.objects = new Map();
    this.entityHandles = new Map();
    this.entitySprites = new Map();

    this.scratchMatrix = new THREE.Matrix4();
    this.scratchScale = new THREE.Vector3();

    this.particles = null;
    this.sparkles = null;
    this.collectPops = null;
  }

  init() {
    this.buildParticles();
    this.buildSparkles();
    this.buildCollectPops();
  }

  buildParticles() {
    const CAP = 64;
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.05, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, depthWrite: false, fog: false }),
      CAP,
    );
    mesh.name = 'collect-sparks';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CAP; i += 1) mesh.setMatrixAt(i, hidden);
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    this.particles = {
      mesh,
      cap: CAP,
      cursor: 0,
      maxLife: 0.25,
      pos: Array.from({ length: CAP }, () => new THREE.Vector3()),
      vel: Array.from({ length: CAP }, () => new THREE.Vector3()),
      life: new Float32Array(CAP),
    };
  }

  buildSparkles() {
    const CAP = 128;
    const tex = this.textureCache.get('collectibles/orchid_gold/orchid_gold_main.png');
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xfff0aa, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.12), mat, CAP);
    mesh.name = 'coin-sparkles';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    this.sparkles = { mesh, cap: CAP, cursor: 0 };
  }

  buildCollectPops() {
    const CAP = 8;
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, fog: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.2, 0.3, 16), mat, CAP);
    mesh.name = 'collect-pops';
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    this.collectPops = {
      mesh,
      cap: CAP,
      cursor: 0,
      maxLife: 0.2,
      life: new Float32Array(CAP),
      pos: Array.from({ length: CAP }, () => new THREE.Vector3()),
    };
  }

  spawnCollectSparks(playerPos) {
    const p = this.particles;
    if (!p) return;
    for (let n = 0; n < 3; n += 1) {
      const i = p.cursor;
      p.cursor = (p.cursor + 1) % p.cap;
      p.pos[i].set(playerPos.x, playerPos.y + 0.35, playerPos.z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 1.0;
      p.vel[i].set(Math.cos(angle) * speed, 1.3 + Math.random() * 0.8, Math.sin(angle) * speed * 0.45);
      p.life[i] = p.maxLife;
    }
  }

  spawnCollectPop(playerPos) {
    const p = this.collectPops;
    if (!p) return;
    const i = p.cursor;
    p.cursor = (p.cursor + 1) % p.cap;
    p.pos[i].copy(playerPos);
    p.pos[i].y += 0.4;
    p.life[i] = p.maxLife;
  }

  updateEffects(delta) {
    this.updateParticles(delta);
    this.updateCollectPops(delta);
  }

  updateParticles(delta) {
    const p = this.particles;
    if (!p) return;
    let dirty = false;
    for (let i = 0; i < p.cap; i += 1) {
      if (p.life[i] <= 0) continue;
      dirty = true;
      p.life[i] -= delta;
      if (p.life[i] <= 0) {
        this.scratchMatrix.makeScale(0, 0, 0);
        p.mesh.setMatrixAt(i, this.scratchMatrix);
        continue;
      }
      p.pos[i].addScaledVector(p.vel[i], delta);
      p.vel[i].y -= 9.8 * delta;
      const t = p.life[i] / p.maxLife;
      const s = 0.5 + t * 0.5;
      this.scratchMatrix.makeTranslation(p.pos[i].x, p.pos[i].y, p.pos[i].z);
      this.scratchMatrix.scale(this.scratchScale.set(s, s, s));
      p.mesh.setMatrixAt(i, this.scratchMatrix);
    }
    if (dirty) p.mesh.instanceMatrix.needsUpdate = true;
  }

  updateCollectPops(delta) {
    const p = this.collectPops;
    if (!p) return;
    let dirty = false;
    for (let i = 0; i < p.cap; i += 1) {
      if (p.life[i] <= 0) continue;
      dirty = true;
      p.life[i] -= delta;
      if (p.life[i] <= 0) {
        this.scratchMatrix.makeScale(0, 0, 0);
        p.mesh.setMatrixAt(i, this.scratchMatrix);
        continue;
      }
      const t = 1.0 - (p.life[i] / p.maxLife);
      const s = 1.0 + t * 3.0;
      this.scratchMatrix.makeTranslation(p.pos[i].x, p.pos[i].y, p.pos[i].z);
      this.scratchMatrix.scale(this.scratchScale.set(s, s, s));
      p.mesh.setMatrixAt(i, this.scratchMatrix);
      p.mesh.material.opacity = 1.0 - t;
    }
    if (dirty) p.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const obj of this.objects.values()) {
      obj.removeFromParent();
    }
    this.objects.clear();
    this.entityHandles.clear();
    for (const entry of this.entitySprites.values()) {
      if (entry.object?.parent) entry.object.parent.remove(entry.object);
    }
    this.entitySprites.clear();
    if (this.particles) this.scene.remove(this.particles.mesh);
    if (this.sparkles) this.scene.remove(this.sparkles.mesh);
    if (this.collectPops) this.scene.remove(this.collectPops.mesh);
    // textureCache is shared — disposed by ThreeSceneRenderer.
  }
}
