'use strict';
// Central parameter source for the spline/wave system, including artistic controls and reverse-pipeline tuning knobs.
// Read by `spline.js` and the settings UI in `settings-panels.js`; this file is intentionally declarative (no runtime logic).

window.SPLINE_SETTINGS = {
  gradientPreset: 'default',

  colorR: 37,
  colorG: 89,
  colorB: 179,

  gradientTopMul: 0.09,
  gradientBotMul: 0.62,

  flowSpeed: 0.18,
  tension: 0.12,
  damping: 0.0001,
  length: 0.306001,
  spacing: 407.658,
  timeStep: 1.0,

  bandAmplitude: 0.200,
  bandSecondaryFreq: 7.0,
  bandSecondaryAmp: 0.025,

  travelSpeed1: 0.25,
  travelAmp1: 0.014,
  travelSpeed2: 0.15,
  travelAmp2: 0.008,

  perturbation: 0.0998587,
  perturbationScale: 0.07,
  waveCosAmp: 0.09,
  waveBias: -0.1,
  waveHeightScale: 0.5,
  waveSoftClip: 0.22,

  rePipelineBlend: 0.45,
  reDescriptorStrength: 0.7,
  reSyntheticDescriptorSeed: 1337,
  reSyntheticDescriptorMotion: 0.65,
  reKernelGain: 0.04,
  reNormalizeGain: 0.08,
  reKernelPhaseStep: 0.45,
  reIndexJitter: 0.006,
  reTemporalSmooth: 0.84,

  fresnelPower: 4.0,
  fresnelScale: 0.5,
  opacity: 0.44,
  brightness: 0.55,
  zDetailScale: 0.08,

  ffdScale1X: 5.67726,
  ffdScale1Y: 1.00077,
  ffdScale1Z: 1.0,
  ffdScale2X: 2.82755,
  ffdScale2Y: 1.27579,
  ffdScale2Z: 2.88782,
  ffdOffsetX: 0.0,
  ffdOffsetY: -0.469999,
  ffdOffsetZ: 0.0,
  ffdYAmp: 0.05,
  ffdZAmp: 0.06,
};

(() => {
  const canvas = document.querySelector('.light-waves');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  let spline;
  let animationFrame = 0;
  let previousTime = null;
  let elapsed = 12;

  function render() {
    spline.render(elapsed);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();
  }

  function animate(timestamp) {
    if (previousTime !== null) elapsed += (timestamp - previousTime) / 1000;
    previousTime = timestamp;
    render();
    animationFrame = requestAnimationFrame(animate);
  }

  function updatePlayback() {
    cancelAnimationFrame(animationFrame);
    previousTime = null;
    if (!spline || document.hidden || gl.isContextLost()) return;
    render();
    if (!reducedMotion.matches) animationFrame = requestAnimationFrame(animate);
  }

  window.TrifectaWaves = {
    freeze() {
      cancelAnimationFrame(animationFrame);
      previousTime = null;
      if (spline && !gl?.isContextLost()) render();
    },
    setElapsed(value) {
      elapsed = Number(value) || 0;
      previousTime = null;
      if (spline && !gl?.isContextLost()) render();
    },
  };

  function initialize() {
    try {
      gl = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL2 is unavailable');
      spline = window.createSplineLayer(gl, canvas);
      canvas.classList.remove('wave-fallback');
      resize();
      updatePlayback();
    } catch (error) {
      console.warn('Using the soft-wave fallback:', error);
      canvas.classList.add('wave-fallback');
    }
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);
    canvas.classList.add('wave-fallback');
  });
  canvas.addEventListener('webglcontextrestored', initialize);
  window.addEventListener('resize', () => { if (spline && !gl.isContextLost()) resize(); });
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  initialize();
})();

