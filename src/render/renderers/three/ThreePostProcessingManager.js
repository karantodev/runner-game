import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Retro pixelation (#3): point-sample the composited scene on a fixed low-res grid
const PIXELATION_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(480, 270) },
    uLevels: { value: 24 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uLevels;
    varying vec2 vUv;

    float bayer2(vec2 a) {
      return mix(mix(0.0, 2.0, a.x), mix(3.0, 1.0, a.x), a.y);
    }
    float bayer4(vec2 p) {
      vec2 q = mod(p, 4.0);
      vec2 sup = mod(floor(q * 0.5), 2.0);
      vec2 inr = mod(q, 2.0);
      return (4.0 * bayer2(sup) + bayer2(inr)) / 16.0;
    }

    void main() {
      vec2 grid = floor(vUv * uResolution);
      vec2 cell = (grid + 0.5) / uResolution;
      vec4 texel = texture2D(tDiffuse, cell);
      vec3 color = floor(texel.rgb * uLevels + bayer4(grid)) / uLevels;
      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

export class ThreePostProcessingManager {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.options = options;

    this.composer = null;
    this.renderPass = null;
    this.ssaoPass = null;
    this.bloomPass = null;
    this.vignettePass = null;
    this.pixelPass = null;

    this.bloomBase = options.bloomBase ?? 0.45;
    this.pixelHeight = options.pixelHeight ?? 270;
  }

  init() {
    const fb = this.renderer.getSize(new THREE.Vector2());
    const w = fb.x;
    const h = fb.y;

    const composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this.renderPass);

    this.ssaoPass = new SSAOPass(this.scene, this.camera, w, h);
    this.ssaoPass.kernelRadius = 2;
    this.ssaoPass.minDistance = 0.002;
    this.ssaoPass.maxDistance = 0.02;
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;
    composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), this.bloomBase, 0.3, 0.98);
    composer.addPass(this.bloomPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = 0.95;
    this.vignettePass.uniforms['darkness'].value = 0.35;
    composer.addPass(this.vignettePass);

    this.pixelPass = new ShaderPass(PIXELATION_SHADER);
    const fbAspect = h > 0 ? w / h : 16 / 9;
    this.pixelPass.uniforms.uResolution.value.set(Math.max(1, Math.round(this.pixelHeight * fbAspect)), this.pixelHeight);
    composer.addPass(this.pixelPass);

    composer.addPass(new OutputPass());

    this.composer = composer;
  }

  updateCamera(camera) {
    this.camera = camera;
    if (this.renderPass) this.renderPass.camera = camera;
    if (this.ssaoPass) this.ssaoPass.camera = camera;
  }

  setSize(w, h, pixelRatio) {
    if (this.composer) {
      this.composer.setPixelRatio?.(pixelRatio);
      this.composer.setSize(w, h);
    }
    this.updatePixelResolution(w, h);
  }

  updatePixelResolution(w, h) {
    if (this.pixelPass) {
      const aspect = h > 0 ? w / h : 16 / 9;
      this.pixelPass.uniforms.uResolution.value.set(Math.max(1, Math.round(this.pixelHeight * aspect)), this.pixelHeight);
    }
  }

  setPixelHeight(height, w, h) {
    this.pixelHeight = height;
    this.updatePixelResolution(w, h);
  }

  setBloomStrength(strength) {
    if (this.bloomPass) {
      this.bloomPass.strength = strength;
    }
  }

  setVignetteDarkness(darkness) {
    if (this.vignettePass) {
      this.vignettePass.uniforms['darkness'].value = darkness;
    }
  }

  setSSAOEnabled(enabled) {
    if (this.ssaoPass) {
      this.ssaoPass.enabled = enabled;
    }
  }

  render(delta) {
    if (this.composer) {
      this.composer.render(delta);
    }
  }

  dispose() {
    this.composer?.dispose?.();
    this.ssaoPass?.dispose?.();
    this.bloomPass?.dispose?.();
    this.renderPass?.dispose?.();
    this.composer = null;
  }
}
