/* Blue Collar Energy — 3D hero. Concept by Code Bunny.
   A Central Coast home with a 4.0 kW array (ten 400 W panels, the same system the $220
   calculator default sizes) at golden hour. Everything is built in code: no model files.

   Loading rules, so nothing on the page ever waits on this:
   - The hero's text, buttons and a poster image of this exact scene are in the HTML.
   - The canvas swaps in over the poster once its first frame is drawn.
   - The loop pauses when the hero is off screen or the tab is hidden.
   - With reduced motion it draws one still frame and stops. */
import * as THREE from './vendor/three.module.min.js';

const host = document.querySelector('[data-hero3d]');
if (host) {
  try { start(host); } catch (err) { console.warn('3D hero disabled:', err); }
}

function start(host) {
  const POSTER = location.hash === '#poster';           // used to render the poster image
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const canvas = host.querySelector('canvas');
  const tip = host.parentElement.querySelector('[data-hero3d-tip]');
  const kwOut = document.querySelector('[data-hero3d-kw]');
  const batOut = document.querySelector('[data-hero3d-bat]');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: POSTER });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 1200);

  /* ---------- helpers ---------- */
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let seed = 7;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const col = (hex) => new THREE.Color(hex);
  const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, ...o });
  const shadowy = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const box = (w, h, d, mat, x, y, z) => { const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };

  /* ---------- sky ---------- */
  const skyU = {
    top: { value: col('#0b1d33') }, mid: { value: col('#38507a') }, horizon: { value: col('#f59a63') },
    sunDir: { value: new THREE.Vector3(-0.8, 0.25, 0.45).normalize() }, sunCol: { value: col('#ffd3a1') }
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      varying vec3 vDir; uniform vec3 top, mid, horizon, sunDir, sunCol;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.7, h));
        c = mix(c, horizon * 0.55, smoothstep(0.0, -0.08, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 1200.0) * 8.0 + pow(s, 40.0) * 0.6 + pow(s, 6.0) * 0.18);
        c += sunCol * 0.22 * pow(max(-d.x, 0.0), 2.0) * (1.0 - smoothstep(0.0, 0.35, h));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog(col('#c98f72'), 70, 300);

  /* ---------- terrain: flat pad for the house, hills behind, coast to the west ---------- */
  const hgt = (x, z) => {
    const pad = ss(16, 36, Math.hypot(x - 3, (z - 2) * 0.9));
    const back = ss(-30, -95, z - 0.25 * x);                          // ridgeline well behind the house
    let h = back * (7 + 5 * Math.sin(x * 0.04 + 1.3) + 3 * Math.sin(x * 0.1 + z * 0.06) + 1.6 * Math.sin(x * 0.21 - z * 0.12));
    h += 0.8 * Math.sin(x * 0.13) * Math.cos(z * 0.1) + 0.35 * Math.sin(x * 0.37 + z * 0.29);
    const coast = ss(34, 58, -0.8 * x + 0.6 * z);                    // the Pacific, off to the west
    h = h * (1 - coast) - coast * 3.4;
    return h * pad - coast * 3.4 * (1 - pad);
  };
  {
    const g = new THREE.PlaneGeometry(320, 320, 120, 120).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i)));
    const dry = col('#c8a565'), gold = col('#b0904f'), green = col('#6c7440'), dark = col('#4e5a33'), sand = col('#d9c39a');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i += 3) {
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      if (y < -0.6) c.copy(sand);
      else if (y < 1.5) c.copy(dry).lerp(gold, rnd() * 0.6);
      else if (y < 7) c.copy(gold).lerp(green, ss(1.5, 7, y) * 0.8 + rnd() * 0.2);
      else c.copy(green).lerp(dark, ss(7, 16, y) + rnd() * 0.2);
      if (x < -30 && y < 0.2) c.lerp(sand, 0.6);
      for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    ground.receiveShadow = true;
    scene.add(ground);

    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#28496b', roughness: 0.14, metalness: 0.55 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -1.7;
    scene.add(sea);
  }

  /* ---------- house ---------- */
  const house = new THREE.Group();
  scene.add(house);
  const stucco = std('#eee3cf'), trim = std('#fbf8f2', { roughness: 0.6 }), roofMat = std('#474d57', { roughness: 0.85, flatShading: true });
  const glow = new THREE.MeshStandardMaterial({ color: '#2a2017', emissive: '#ffbf73', emissiveIntensity: 0.9, roughness: 0.3 });

  function gable(L, hd, rise, mat, wallMat, x, y, z) {
    const a = [-L / 2, 0, hd], b = [L / 2, 0, hd], c = [L / 2, rise, 0], d = [-L / 2, rise, 0], e = [L / 2, 0, -hd], f = [-L / 2, 0, -hd];
    const tri = (...v) => v.flat();
    const roof = new THREE.BufferGeometry();
    roof.setAttribute('position', new THREE.Float32BufferAttribute(tri(a, b, c, a, c, d, d, c, e, d, e, f, a, f, e, a, e, b), 3));
    roof.computeVertexNormals();
    const ends = new THREE.BufferGeometry();
    ends.setAttribute('position', new THREE.Float32BufferAttribute(tri(b, e, c, a, d, f), 3));
    ends.computeVertexNormals();
    const g = new THREE.Group();
    g.add(shadowy(new THREE.Mesh(roof, mat)), shadowy(new THREE.Mesh(ends, wallMat)));
    g.add(box(L + 0.02, 0.2, 0.08, trim, 0, -0.06, hd), box(L + 0.02, 0.2, 0.08, trim, 0, -0.06, -hd));
    g.position.set(x, y, z);
    return g;
  }

  // Main house: 10 x 7 footprint, ridge along x, south (+z) slope carries the array
  house.add(box(10.4, 0.3, 7.4, std('#b7aa95'), 0, 0.15, 0));
  house.add(box(10, 2.8, 7, stucco, 0, 1.6, 0));
  house.add(gable(10.9, 3.95, 2.0, roofMat, stucco, 0, 3.0, 0));
  // Garage wing
  house.add(box(5.2, 2.6, 5.6, stucco, 7.6, 1.5, 0.2));
  house.add(gable(5.9, 3.2, 1.4, roofMat, stucco, 7.75, 2.8, 0.2));
  // Front: windows, door, garage door
  for (const [x, w] of [[-3.4, 1.7], [-0.9, 1.3]]) {
    house.add(box(w + 0.16, 1.36, 0.06, trim, x, 1.75, 3.52), box(w, 1.2, 0.07, glow, x, 1.75, 3.54));
  }
  house.add(box(1.16, 2.16, 0.06, trim, 1.6, 1.38, 3.52), box(1.0, 2.05, 0.08, std('#6b4a32', { roughness: 0.6 }), 1.6, 1.33, 3.54));
  house.add(box(0.9, 0.5, 0.07, glow, 3.6, 2.2, 3.53));
  {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
    const x = cv.getContext('2d'); x.fillStyle = '#dcd6cb'; x.fillRect(0, 0, 64, 128);
    x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 1; i < 5; i++) x.fillRect(0, i * 25.6 - 1, 64, 2);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    house.add(box(3.5, 2.2, 0.08, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), 7.6, 1.32, 3.02));
  }
  // Wall battery beside the garage door, with a status strip
  const ledMat = new THREE.MeshBasicMaterial({ color: '#ff5a1f', toneMapped: false });
  house.add(box(0.72, 1.15, 0.22, std('#f4f3ef', { roughness: 0.4 }), 5.75, 1.45, 3.13));
  const led = box(0.04, 0.5, 0.02, ledMat, 5.75, 1.5, 3.25); led.castShadow = false; house.add(led);
  // Driveway and walk
  const concrete = std('#cbc3b5');
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 12), concrete); drive.rotation.x = -Math.PI / 2; drive.position.set(7.6, 0.03, 9); drive.receiveShadow = true; house.add(drive);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 6), concrete); walk.rotation.x = -Math.PI / 2; walk.position.set(1.6, 0.03, 6.5); walk.receiveShadow = true; house.add(walk);

  /* ---------- the array: 2 rows x 5 panels on the south slope ---------- */
  const cellTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 400;
    const x = cv.getContext('2d');
    x.fillStyle = '#0f1d33'; x.fillRect(0, 0, 240, 400);
    const cw = 240 / 6, ch = 400 / 10;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) {
      const gx = i * cw + 2, gy = j * ch + 2;
      const g = x.createLinearGradient(gx, gy, gx + cw, gy + ch);
      g.addColorStop(0, '#1b3358'); g.addColorStop(1, '#13274a');
      x.fillStyle = g; x.fillRect(gx, gy, cw - 4, ch - 4);
      x.fillStyle = 'rgba(190,205,225,.35)';
      for (let k = 1; k < 3; k++) x.fillRect(gx + k * (cw - 4) / 3, gy, 1, ch - 4);
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  })();
  const panelMat = () => new THREE.MeshPhysicalMaterial({ map: cellTex, color: '#ffffff', metalness: 0.25, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3, emissive: '#ff5a1f', emissiveIntensity: 0 });
  const frameMat = std('#c3c9d2', { metalness: 0.85, roughness: 0.32 });
  const panels = [];
  const slope = new THREE.Vector3(0, 2.0, -3.95).normalize();        // up the roof
  const normal = new THREE.Vector3(0, 3.95, 2.0).normalize();
  const eave = new THREE.Vector3(0, 3.0, 3.95);
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), normal, slope.clone().negate());
  const q = new THREE.Quaternion().setFromRotationMatrix(basis);
  const PW = 1.0, PL = 1.7, GAP = 0.035;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.BoxGeometry(PW - 0.04, 0.03, PL - 0.04), [frameMat, frameMat, panelMat(), frameMat, frameMat, frameMat]);
    face.position.y = 0.02; face.castShadow = true; face.receiveShadow = true;
    const frame = shadowy(new THREE.Mesh(new THREE.BoxGeometry(PW, 0.045, PL), frameMat));
    g.add(frame, face);
    const along = 0.55 + r * (PL + GAP) + PL / 2;
    const xpos = -1.6 + (c - 2) * (PW + GAP);
    g.position.copy(eave).addScaledVector(slope, along).addScaledVector(normal, 0.13);
    g.position.x = xpos;
    g.quaternion.copy(q);
    g.userData = { idx: r * 5 + c, face, jitter: 0.95 + rnd() * 0.05 };
    panels.push(g);
    house.add(g);
  }

  /* ---------- power flow: array -> conduit -> battery ---------- */
  const flow = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.0, 3.05, 3.98), new THREE.Vector3(4.6, 2.95, 3.98), new THREE.Vector3(4.95, 2.7, 3.7),
    new THREE.Vector3(4.98, 1.9, 3.62), new THREE.Vector3(5.3, 1.75, 3.35), new THREE.Vector3(5.62, 1.65, 3.25)
  ]);
  house.add(shadowy(new THREE.Mesh(new THREE.TubeGeometry(flow, 60, 0.035, 6), std('#e9e6df', { roughness: 0.5 })), true, false));
  const NP = 9;
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ffb067', toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const haloMat = new THREE.MeshBasicMaterial({ color: '#ff5a1f', toneMapped: false, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), dotMat, NP);
  const halos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), haloMat, NP);
  house.add(dots, halos);
  const tmp = new THREE.Object3D();

  /* ---------- trees and planting ---------- */
  const leaf = [std('#566a35', { flatShading: true }), std('#4a5e2e', { flatShading: true }), std('#6b7a3d', { flatShading: true })];
  const bark = std('#5b4632');
  const tree = (x, z, s) => {
    const g = new THREE.Group();
    g.add(box(0.28 * s, 1.6 * s, 0.28 * s, bark, 0, 0.8 * s, 0));
    for (let i = 0; i < 3; i++) {
      const m = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry((1.1 + rnd() * 0.5) * s, 1), leaf[i % 3]));
      m.position.set((rnd() - 0.5) * 1.2 * s, (2.0 + rnd() * 0.9) * s, (rnd() - 0.5) * 1.2 * s);
      g.add(m);
    }
    g.position.set(x, hgt(x, z), z);
    g.rotation.y = rnd() * 6;
    scene.add(g);
  };
  [[-8.5, -1.5, 1.4], [-10, 5, 1.1], [13.5, -3.5, 1.5], [-3, -9.5, 1.6], [6, -9, 1.3], [15.5, 7, 1.0], [-15, -7, 1.7], [22, -12, 1.8], [-22, 2, 1.4], [11, -15, 2.0]]
    .forEach(([x, z, s]) => tree(x, z, s));
  const shrubCols = ['#6f7f3e', '#8a7aa8', '#9a8648', '#5f7236'].map(c => std(c, { flatShading: true }));
  for (let i = 0; i < 16; i++) {
    const x = -4.8 + i * 0.62 + (rnd() - 0.5) * 0.3;
    if (x > 1.0 && x < 2.2) continue;
    const m = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rnd() * 0.25, 0), shrubCols[i % 4]));
    m.position.set(x, 0.3, 4.15 + rnd() * 0.5);
    house.add(m);
  }

  {
    const bushGeo = new THREE.IcosahedronGeometry(1, 0);
    const n = 140, bush = new THREE.InstancedMesh(bushGeo, std('#ffffff', { flatShading: true }), n);
    const tints = ['#6d7a3c', '#7d7a43', '#5d6b34', '#8a8150', '#a1904f'].map(col);
    let k = 0;
    while (k < n) {
      const x = (rnd() - 0.5) * 150, z = (rnd() - 0.5) * 150;
      if (Math.abs(x - 3) < 13 && z > -7 && z < 16) continue;        // keep the lot clear
      const y = hgt(x, z);
      if (y < -0.4) continue;                                       // not on the beach
      const sc = 0.35 + rnd() * 0.9;
      tmp.position.set(x, y + sc * 0.4, z); tmp.scale.set(sc * (1 + rnd() * 0.6), sc * 0.7, sc); tmp.rotation.set(0, rnd() * 6, 0); tmp.updateMatrix();
      bush.setMatrixAt(k, tmp.matrix); bush.setColorAt(k, tints[k % tints.length]); k++;
    }
    bush.castShadow = true; bush.receiveShadow = true;
    scene.add(bush);

    const neighbour = (x, z, ry, wall, roof) => {
      const g = new THREE.Group();
      g.add(box(8, 2.6, 6, std(wall), 0, 1.3, 0));
      g.add(gable(8.7, 3.4, 1.6, std(roof, { flatShading: true }), std(wall), 0, 2.6, 0));
      g.position.set(x, hgt(x, z), z); g.rotation.y = ry;
      scene.add(g);
    };
    neighbour(-20, -14, 0.25, '#e8dcc4', '#6b4a3a');
    neighbour(26, -20, -0.35, '#f1ece2', '#4f565f');
  }

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight('#b4c6e6', '#8a6544', 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc791', 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 120 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  sun.target.position.set(2, 0, 0);
  scene.add(sun, sun.target);

  // Reflections for glass, panels and sea, taken from the sky itself
  {
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(sky.geometry, skyMat));
    scene.environment = pm.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.7;
    pm.dispose();
  }

  /* ---------- camera, pointer, scroll ---------- */
  const target = new THREE.Vector3(2.6, 2.2, 0.4);
  const BASE = { az: 0.62, el: 0.2, r: 41 };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollK = 0;
  let wide = true;

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    wide = w >= 1000;
    camera.aspect = w / h;
    camera.fov = wide ? 28 : 34;
    if (wide) camera.setViewOffset(w, h, -w * 0.2, -h * 0.02, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  if (fine && !POSTER) {
    host.closest('.hero').addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      hover(e, r);
    });
    host.closest('.hero').addEventListener('pointerleave', () => { ptr.tx = 0; ptr.ty = 0; setHover(null); });
  }
  addEventListener('scroll', () => { scrollK = Math.min(1, Math.max(0, scrollY / (host.clientHeight || 1))); }, { passive: true });

  /* ---------- panel hover: inspect a panel ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null, prodKW = 3.4;
  const faces = panels.map(p => p.userData.face);
  function setHover(p) {
    if (hovered === p) return;
    if (hovered) hovered.userData.face.material[2].emissiveIntensity = 0;
    hovered = p;
    host.classList.toggle('is-pointing', !!p);
    if (!tip) return;
    if (!p) { tip.hidden = true; return; }
    p.userData.face.material[2].emissiveIntensity = 0.35;
    tip.hidden = false;
    fillTip();
  }
  function fillTip() {
    if (!hovered || !tip) return;
    const w = Math.round(prodKW * 100 * hovered.userData.jitter);
    tip.innerHTML = `<b>Panel ${String(hovered.userData.idx + 1).padStart(2, '0')}</b><span>400 W rated</span><span>Producing <em>${w} W</em> now</span>`;
  }
  function hover(e, r) {
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(faces, false)[0];
    setHover(hit ? panels.find(p => p.userData.face === hit.object) : null);
    if (hovered && tip) {
      tip.style.transform = `translate(${e.clientX - r.left + 18}px, ${e.clientY - r.top - 12}px)`;
    }
  }

  /* ---------- per-frame ---------- */
  const sunDir = new THREE.Vector3();
  let hudT = 0;
  function update(t) {
    // A slow golden-hour cycle: the sun climbs and settles, shadows swing with it
    const el = THREE.MathUtils.degToRad(15 + 9 * Math.sin(t * 0.09));
    const az = THREE.MathUtils.degToRad(128 + 8 * Math.sin(t * 0.05 + 1));
    sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 60);
    skyU.sunDir.value.copy(sunDir);
    const k = ss(6, 24, THREE.MathUtils.radToDeg(el));
    sun.intensity = 2.4 + 1.2 * k;
    glow.emissiveIntensity = 1.1 - 0.5 * k;
    prodKW = 4.0 * (0.5 + 0.42 * k);

    // Camera: pointer parallax, a slow idle drift, and a gentle pull-back as you scroll away
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    const azC = BASE.az + ptr.x * 0.12 + Math.sin(t * 0.06) * 0.05;
    const elC = BASE.el - ptr.y * 0.05 + scrollK * 0.12;
    const rC = BASE.r * (wide ? 1 : 1.18) + scrollK * 5;
    camera.position.set(
      target.x + rC * Math.cos(elC) * Math.sin(azC),
      target.y + rC * Math.sin(elC),
      target.z + rC * Math.cos(elC) * Math.cos(azC));
    camera.lookAt(target);

    // Power flowing to the battery, faster when the array makes more
    const speed = 0.08 + 0.1 * k;
    for (let i = 0; i < NP; i++) {
      const u = (((i / NP) + t * speed) % 1 + 1) % 1;
      tmp.position.copy(flow.getPointAt(u));
      const s = 0.7 + 0.3 * Math.sin(u * Math.PI);
      tmp.scale.setScalar(s); tmp.updateMatrix();
      dots.setMatrixAt(i, tmp.matrix); halos.setMatrixAt(i, tmp.matrix);
    }
    dots.instanceMatrix.needsUpdate = true; halos.instanceMatrix.needsUpdate = true;
    ledMat.color.setHSL(0.05, 1, 0.45 + 0.12 * Math.sin(t * 2.4));

    if (t - hudT > 0.5 || t === 0) {
      hudT = t;
      if (kwOut) kwOut.textContent = prodKW.toFixed(2) + ' kW';
      if (batOut) batOut.textContent = Math.min(99, Math.round(62 + (t * 0.35) % 36)) + '%';
      fillTip();
    }
  }

  /* ---------- loop ---------- */
  let raf = 0, running = false, live = false;
  const t0 = performance.now();
  const frame = (now) => {
    const t = POSTER || reduce ? 0 : Math.max(0, now - t0) / 1000;
    update(t);
    renderer.render(scene, camera);
    if (!live) { live = true; host.classList.add('is-live'); window.__hero3dReady = true; }
    if (running) raf = requestAnimationFrame(frame);
  };
  const play = () => { if (running || reduce || POSTER) return; running = true; raf = requestAnimationFrame(frame); };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  if (reduce || POSTER) { requestAnimationFrame(frame); return; }
  let onScreen = true;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen && !document.hidden ? play() : pause(); }).observe(host);
  document.addEventListener('visibilitychange', () => { document.hidden ? pause() : onScreen && play(); });
  play();
}
