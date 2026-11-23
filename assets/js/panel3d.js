/* Blue Collar Energy — the panel. Concept by Code Bunny.
   One photoreal solar panel, modelled in code: bevelled aluminium frame, transmissive glass,
   frosted encapsulant, 120 half-cut mono cells, backsheet and junction box, lit by studio
   softboxes. It sits in the hero, then the scroll story takes it apart layer by layer.

   Loading rules: the hero text and a poster render of this exact frame are in the HTML, the
   canvas replaces the poster once it has drawn, rendering stops whenever the stage is off
   screen, and reduced-motion users get the poses without the idle drift. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const stage = document.querySelector('[data-stage]');
if (stage) {
  try { run(stage); } catch (err) { console.warn('3D panel disabled:', err); }
}

function run(stage) {
  const POSTER = location.hash === '#poster';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const sticky = stage.querySelector('.stage__sticky');
  const canvas = sticky.querySelector('canvas');
  const hero = stage.querySelector('.hero');
  const story = stage.querySelector('.inside');
  const tags = [...stage.querySelectorAll('[data-tag]')];
  const steps = [...stage.querySelectorAll('[data-step]')];
  const HQ = innerWidth >= 900 && (navigator.hardwareConcurrency || 8) >= 4;

  /* ---------- renderer & post ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !HQ, powerPreference: 'high-performance', preserveDrawingBuffer: POSTER });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, HQ ? 1.75 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b14');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  let composer = null, bloom = null;
  if (HQ) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.5, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---------- studio: softboxes for reflections, a warm and a cool glow behind ---------- */
  {
    const env = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; void main(){
        float h = vP.y;
        vec3 c = mix(vec3(0.05,0.03,0.02), vec3(0.32,0.16,0.08), smoothstep(-0.25, 0.05, h));
        c = mix(c, vec3(0.03,0.05,0.09), smoothstep(0.05, 0.6, h));
        gl_FragColor = vec4(c, 1.0); }`
    }));
    env.add(dome);
    const box = (w, h, color, k, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
    };
    box(9, 4, '#ffd6ad', 3.6, [9, 7, 7]);      // key: big warm softbox, upper right
    box(1.2, 12, '#cfe0ff', 3.2, [-10, 2, 4]);  // strip: cool, left
    box(10, 10, '#ffffff', 0.9, [0, 14, -2]);   // top fill
    // The sheen: a narrow strip with soft falloff, angled, placed where the glass mirrors it in the
    // hero pose. As the panel drifts, its reflection slides across the face as a diagonal band.
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 16), new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec2 vUv; void main(){ float a = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5)); float b = 1.0 - smoothstep(0.25, 0.5, abs(vUv.y - 0.5)); gl_FragColor = vec4(vec3(0.92, 0.95, 1.0) * 2.4 * a * a * b, 1.0); }'
    }));
    strip.position.set(-7.5, 12.5, 1.5); strip.lookAt(0, 0, 0); strip.rotateZ(0.65); env.add(strip);
    box(8, 1.4, '#ff7a3a', 4.0, [2, -6, -9]);   // low orange kicker, behind
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.035).texture;
    pm.dispose();
  }
  const glowU = { warm: { value: new THREE.Color('#ff6a28') }, cool: { value: new THREE.Color('#2f6db3') }, wp: { value: new THREE.Vector2(0.72, 0.32) }, k: { value: 1 } };
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.ShaderMaterial({
    uniforms: glowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 warm, cool; uniform vec2 wp; uniform float k;
      void main(){
        vec2 a = vec2(1.75, 1.0);
        float w = 1.0 - smoothstep(0.0, 0.42, distance(vUv * a, wp * a));
        float c = 1.0 - smoothstep(0.0, 0.55, distance(vUv * a, vec2(0.18, 0.9) * a));
        vec3 col = warm * pow(w, 2.2) * 0.27 * k + cool * pow(c, 2.0) * 0.16;
        gl_FragColor = vec4(col, 1.0); }`
  }));
  backdrop.position.z = -14;
  scene.add(backdrop);
  const key = new THREE.DirectionalLight('#ffd9b5', 2.2); key.position.set(5, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#9cc2ff', 1.2); rim.position.set(-6, 2, -3); scene.add(rim);

  /* ---------- the panel ---------- */
  const W = 1.134, H = 1.762, FW = 0.034, FD = 0.035;
  const IW = W - 2 * FW + 0.004, IH = H - 2 * FW + 0.004;

  const cellTex = (() => {
    // All-black panel: dark half-cut mono cells on a black backsheet, fine busbars, faint fingers
    const cw = 2048, ch = Math.round(2048 * IH / IW);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const x = cv.getContext('2d');
    x.fillStyle = '#07090d'; x.fillRect(0, 0, cw, ch);
    const mx = cw * 0.022, my = ch * 0.02, cols = 6, rows = 10, gap = cw * 0.0035;
    const cellW = (cw - 2 * mx - gap * (cols - 1)) / cols, cellH = (ch - 2 * my - gap * (rows - 1)) / rows;
    let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x0 = mx + i * (cellW + gap), y0 = my + j * (cellH + gap), c = cellW * 0.045;
      for (let half = 0; half < 2; half++) {
        const hy = y0 + half * (cellH / 2 + 1), hh = cellH / 2 - 1;
        const top = half === 0, bot = half === 1;
        x.save(); x.beginPath();
        x.moveTo(x0 + (top ? c : 0), hy); x.lineTo(x0 + cellW - (top ? c : 0), hy);
        x.lineTo(x0 + cellW, hy + (top ? c : 0)); x.lineTo(x0 + cellW, hy + hh - (bot ? c : 0));
        x.lineTo(x0 + cellW - (bot ? c : 0), hy + hh); x.lineTo(x0 + (bot ? c : 0), hy + hh);
        x.lineTo(x0, hy + hh - (bot ? c : 0)); x.lineTo(x0, hy + (top ? c : 0)); x.closePath();
        const g = x.createLinearGradient(x0, hy, x0 + cellW * 0.7, hy + hh);
        const v = r() * 6;
        g.addColorStop(0, `rgb(${22 + v},${34 + v},${62 + v * 1.6})`);
        g.addColorStop(1, `rgb(${13 + v},${20 + v},${40 + v * 1.4})`);
        x.fillStyle = g; x.fill(); x.clip();
        x.fillStyle = 'rgba(120,140,170,0.07)';
        for (let fy = hy + 3; fy < hy + hh; fy += 5) x.fillRect(x0, fy, cellW, 1);
        x.fillStyle = 'rgba(178,190,208,0.4)';
        for (let b = 1; b <= 12; b++) x.fillRect(x0 + (cellW * b) / 13 - 0.7, hy, 1.4, hh);
        x.restore();
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  })();

  const mats = {
    frame: new THREE.MeshPhysicalMaterial({ color: '#d9dde3', metalness: 1, roughness: 0.2, anisotropy: 0.8, envMapIntensity: 1.35 }),
    glass: HQ
      ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.01, ior: 1.52, envMapIntensity: 1.4, specularIntensity: 1 })
      : new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.16, envMapIntensity: 1.6 }),
    eva: HQ
      ? new THREE.MeshPhysicalMaterial({ color: '#f1f4f6', metalness: 0, roughness: 0.42, transmission: 0.82, thickness: 0.004, ior: 1.48 })
      : new THREE.MeshPhysicalMaterial({ color: '#f1f4f6', roughness: 0.5, transparent: true, opacity: 0.28 }),
    cells: new THREE.MeshPhysicalMaterial({ map: cellTex, metalness: 0.2, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.08, iridescence: 0.35, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 420], envMapIntensity: 1.1 }),
    edge: new THREE.MeshStandardMaterial({ color: '#1a2333', roughness: 0.5 }),
    back: new THREE.MeshStandardMaterial({ color: '#e4e3de', roughness: 0.75 }),
    jb: new THREE.MeshPhysicalMaterial({ color: '#121418', roughness: 0.4, clearcoat: 0.4 })
  };

  const frameGeo = (() => {
    const s = new THREE.Shape(); s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, H / 2); s.lineTo(-W / 2, H / 2); s.closePath();
    const h = new THREE.Path(); h.moveTo(-W / 2 + FW, -H / 2 + FW); h.lineTo(-W / 2 + FW, H / 2 - FW); h.lineTo(W / 2 - FW, H / 2 - FW); h.lineTo(W / 2 - FW, -H / 2 + FW); h.closePath();
    s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: FD - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 3, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, -FD + 0.003, 0);
    return g;
  })();
  const sheet = (t, top, side = mats.edge) => new THREE.Mesh(new THREE.BoxGeometry(IW, t, IH), [side, side, top, side, side, side]);

  // [mesh, assembled y, exploded y]; order matches the story list and the tags (top to bottom)
  const panel = new THREE.Group();
  const layers = [
    [new THREE.Mesh(frameGeo, mats.frame), 0, -0.5],
    [sheet(0.0032, mats.glass, mats.glass), -0.0025, 0.64],
    [sheet(0.0008, mats.eva, mats.eva), -0.0047, 0.42],
    [sheet(0.0016, mats.cells), -0.006, 0.2],
    [sheet(0.0008, mats.eva, mats.eva), -0.0075, -0.02],
    [sheet(0.002, mats.back, mats.back), -0.0092, -0.24],
    [(() => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.028, 0.11), mats.jb); g.add(b);
      for (const sx of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.085, -0.004, 0), new THREE.Vector3(sx * 0.2, -0.02, 0.05), new THREE.Vector3(sx * 0.27, -0.03, 0.22)]);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 8), mats.jb));
        const mc4 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 12), mats.jb);
        mc4.position.set(sx * 0.27, -0.03, 0.25); mc4.rotation.x = Math.PI / 2; g.add(mc4);
      }
      g.position.z = -H / 2 + 0.2;
      return g;
    })(), -0.026, -0.7]
  ];
  layers.forEach(([m, y]) => { m.position.y = y; panel.add(m); });
  const rig = new THREE.Group(); rig.rotation.order = 'YXZ';
  rig.add(panel); scene.add(rig);

  // anchor on each layer's right edge, for the floating labels
  const anchors = layers.map(() => new THREE.Vector3(IW / 2 + 0.1, 0, -IH * 0.47));

  /* ---------- poses ---------- */
  const POSES = {
    heroWide: { x: 1.38, y: -0.05, z: 0, s: 1.42, rx: 0.98, ry: -0.62, rz: 0.06 },
    heroNarrow: { x: 0, y: -0.55, z: 0, s: 0.9, rx: 1.02, ry: -0.5, rz: 0.04 },
    storyWide: { x: 1.15, y: -0.1, z: 0, s: 1.22, rx: 0.78, ry: -0.78, rz: 0.0 },
    storyNarrow: { x: 0, y: 0.35, z: 0, s: 0.82, rx: 0.8, ry: -0.7, rz: 0 }
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const cur = { ...POSES.heroWide, ex: 0 };

  /* ---------- sizing ---------- */
  let wide = true, vw = 1, vh = 1;
  const resize = () => {
    vw = sticky.clientWidth; vh = sticky.clientHeight;
    if (!vw || !vh) return;
    wide = vw >= 900;
    renderer.setSize(vw, vh, false);
    if (composer) { composer.setSize(vw, vh); bloom.resolution.set(vw, vh); }
    camera.aspect = vw / vh;
    camera.fov = vw / vh < 1 ? 42 : 30;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(sticky);
  resize();

  /* ---------- input ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine && !reduce && !POSTER) addEventListener('pointermove', (e) => { ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const progress = () => {
    const y = scrollY;
    const hp = Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight)));
    const st = story.getBoundingClientRect().top + y, sh = story.offsetHeight - innerHeight;
    const sp = Math.min(1, Math.max(0, (y - st) / Math.max(1, sh)));
    return { hp, sp };
  };

  /* ---------- per frame ---------- */
  const v = new THREE.Vector3();
  let active = -1;
  function update(t, damp) {
    const { hp, sp } = POSTER ? { hp: 0, sp: 0 } : progress();
    const A = wide ? POSES.heroWide : POSES.heroNarrow, B = wide ? POSES.storyWide : POSES.storyNarrow;
    const k = ss(0, 1, hp);
    const ex = ss(0.1, 0.5, sp) * (1 - ss(0.84, 0.99, sp));
    const turn = ss(0.5, 0.84, sp) * (1 - ss(0.84, 0.99, sp));            // a slow turn while it's apart
    const target = {};
    for (const p of ['x', 'y', 'z', 's', 'rx', 'ry', 'rz']) target[p] = lerp(A[p], B[p], k);
    target.ry += turn * 0.9;
    target.rx -= turn * 0.25;
    target.ex = ex;
    const idle = reduce || POSTER ? 0 : 1;
    target.y += idle * Math.sin(t * 0.7) * 0.035 * (1 - ex);
    target.ry += idle * (Math.sin(t * 0.33) * 0.05 + ptr.x * 0.12);
    target.rx += idle * ptr.y * 0.08;
    for (const p in target) cur[p] = damp ? lerp(cur[p], target[p], 0.085) : target[p];

    rig.position.set(cur.x, cur.y, cur.z);
    rig.scale.setScalar(cur.s);
    rig.rotation.set(cur.rx, cur.ry, cur.rz);
    layers.forEach(([m, y0, y1]) => { m.position.y = lerp(y0, y1, cur.ex); });

    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    glowU.wp.value.set(lerp(wide ? 0.72 : 0.5, wide ? 0.66 : 0.5, k), lerp(wide ? 0.34 : 0.22, 0.4, k));
    glowU.k.value = 1 + 0.25 * Math.sin(t * 0.5) * idle;

    // labels follow their layers while the panel is apart
    const show = cur.ex > 0.55;
    rig.updateMatrixWorld();
    tags.forEach((el, i) => {
      const [m] = layers[i];
      v.copy(anchors[i]); v.y = m.position.y;
      v.applyMatrix4(panel.matrixWorld).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2 * vw).toFixed(1)}px, ${((1 - v.y) / 2 * vh).toFixed(1)}px)`;
      el.classList.toggle('on', show);
    });
    const a = show ? Math.min(6, Math.floor(ss(0.16, 0.82, sp) * 7)) : -1;
    if (a !== active) {
      active = a;
      steps.forEach((s, i) => s.classList.toggle('is-on', i === a));
      tags.forEach((s, i) => s.classList.toggle('is-on', i === a));
    }
  }

  const render = () => composer ? composer.render() : renderer.render(scene, camera);

  /* ---------- loop: only while the stage is on screen ---------- */
  let raf = 0, running = false, live = false;
  const t0 = performance.now();
  const frame = (now) => {
    update(Math.max(0, now - t0) / 1000, live);
    render();
    if (!live) { live = true; sticky.classList.add('is-live'); window.__panel3dReady = true; }
    if (running) raf = requestAnimationFrame(frame);
  };
  if (POSTER) { requestAnimationFrame(frame); return; }
  const play = () => { if (running) return; running = true; raf = requestAnimationFrame(frame); };
  const pause = () => { running = false; cancelAnimationFrame(raf); };
  let onScreen = true;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen && !document.hidden ? play() : pause(); }).observe(stage);
  document.addEventListener('visibilitychange', () => { document.hidden ? pause() : onScreen && play(); });
  play();
}
