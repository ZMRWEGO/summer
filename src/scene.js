import './audio.js';
import './orientation.js';
import * as THREE from 'three';
import { ClothSimulation } from './cloth.js';
import { createBannerTexture, createWeaveTexture } from './texture.js';

const container = document.getElementById('scene');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
// Supersample even on standard-DPI displays; cloth print stays crisp in close-ups.
renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio, 2), 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.setAttribute('aria-label', '一块印有中文排版的白色布料，由四个木衣夹固定在晾衣绳上，随风摆动。');
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
const cameraTarget = new THREE.Vector3(0, 0.55, 0);
const hemi = new THREE.HemisphereLight(0xe9f3ff, 0x7b7d85, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8eb, 3.2);
sun.position.set(-3.5, 7, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -5; sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 24;
sun.shadow.bias = -0.00035;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xbdd8f5, 0.7);
fill.position.set(5, 1, 4); scene.add(fill);

// Soft clouds are generated here, not downloaded image assets.
let seed = 7419;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 34; i++) {
    const x = 70 + rand() * 372, y = 85 + rand() * 95;
    const r = 35 + rand() * 75;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.15 + rand() * 0.18})`);
    g.addColorStop(0.48, 'rgba(255,255,255,.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const cloudMap = cloudTexture();
const clouds = [];
for (let i = 0; i < 14; i++) {
  const material = new THREE.SpriteMaterial({ map: cloudMap, transparent: true, opacity: 0.52 + rand() * 0.28, depthWrite: false, color: 0xffffff });
  const sprite = new THREE.Sprite(material);
  const scale = 7 + rand() * 9;
  sprite.scale.set(scale, scale * (0.34 + rand() * 0.15), 1);
  sprite.position.set((rand() - 0.5) * 32, -5.5 + rand() * 7.5, -7 - rand() * 14);
  sprite.userData.startX = sprite.position.x;
  sprite.userData.speed = 0.025 + rand() * 0.055;
  clouds.push(sprite); scene.add(sprite);
}

// Rope and four independently removable wooden clothespins.
const ropePoints = [];
for (let i = 0; i <= 32; i++) {
  const x = -14 + i * 28 / 32;
  ropePoints.push(new THREE.Vector3(x, 2.48 - 0.085 * (1 - (x / 14) ** 2), -0.035));
}
const rope = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePoints), 160, 0.012, 6, false),
  new THREE.MeshStandardMaterial({ color: 0x6f684d, roughness: 0.92 })
);
rope.castShadow = true; scene.add(rope);
const pinObjects = [];
const pinMeshes = [];
const pinFractions = [0.075, 0.37, 0.665, 0.935];
const wood = new THREE.MeshStandardMaterial({ color: 0xc59c54, roughness: 0.75 });
const woodDark = new THREE.MeshStandardMaterial({ color: 0x7e6336, roughness: 0.8 });
const metal = new THREE.MeshStandardMaterial({ color: 0x5b5a50, roughness: 0.4, metalness: 0.65 });
for (let i = 0; i < 4; i++) {
  const group = new THREE.Group();
  const x = (pinFractions[i] - 0.5) * 4.8;
  group.position.set(x, 2.27, 0.045);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.35, 0.065), wood);
  left.position.x = -0.031; left.rotation.z = -0.035;
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.35, 0.065), wood);
  right.position.x = 0.031; right.rotation.z = 0.035;
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.21, 0.073), woodDark);
  slit.position.y = 0.065;
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.009, 6, 16), metal);
  spring.position.set(0, 0.025, 0.047);
  group.add(left, right, slit, spring);
  group.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.userData.pinIndex = i; pinMeshes.push(obj); } });
  group.userData = { index: i, base: group.position.clone(), active: true, velocity: new THREE.Vector3(), spin: new THREE.Vector3() };
  pinObjects.push(group); scene.add(group);
}

const cloth = new ClothSimulation();
const geometry = new THREE.PlaneGeometry(cloth.width, cloth.height, cloth.w, cloth.h);
const banner = createBannerTexture();
banner.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const weave = createWeaveTexture();
weave.anisotropy = renderer.capabilities.getMaxAnisotropy();
const material = new THREE.MeshPhysicalMaterial({
  map: banner.texture, bumpMap: weave, bumpScale: 0.013,
  color: 0xf5f2e9, roughness: 0.96, metalness: 0,
  sheen: 0.35, sheenColor: new THREE.Color(0xf4f0e8), sheenRoughness: 0.9,
  side: THREE.DoubleSide,
});
const clothMesh = new THREE.Mesh(geometry, material);
clothMesh.castShadow = true; clothMesh.receiveShadow = true; clothMesh.frustumCulled = false;
clothMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
scene.add(clothMesh);

const cameraStates = [
  { p: [0, 0.62, 9.2], t: [0, 0.48, 0], fov: 38 },
  { p: [-0.28, 0.82, 6.6], t: [0, 0.68, 0], fov: 38 },
  { p: [1.85, 0.95, 7.3], t: [0, 0.65, 0], fov: 38 },
  { p: [-1.9, 1.35, 7.8], t: [0, 0.62, 0], fov: 38 },
  { p: [0.1, 1.45, 11.6], t: [0, 0.52, 0], fov: 38 },
];
const palettes = [
  ['#6e9fca', '#a9c9df', '#dbe7e9', 'rgba(255,255,255,.58)'],
  ['#79a8d0', '#b5d2e2', '#dce8e8', 'rgba(255,255,255,.68)'],
  ['#718bbd', '#b8c5da', '#e2e1df', 'rgba(255,244,230,.48)'],
  ['#9c89a6', '#d5aaa0', '#eadac8', 'rgba(255,221,180,.60)'],
  ['#c37f70', '#e2ac8c', '#eed9bd', 'rgba(255,224,173,.78)'],
];
const colorA = new THREE.Color(), colorB = new THREE.Color();
function paletteAt(progress) {
  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * 4;
  const index = Math.min(3, Math.floor(scaled)), mix = scaled - index;
  const values = palettes[index].map((value, i) => {
    if (i < 3) return '#' + colorA.set(value).lerp(colorB.set(palettes[index + 1][i]), mix).getHexString();
    const a = value.match(/[\d.]+/g).map(Number), b = palettes[index + 1][i].match(/[\d.]+/g).map(Number);
    return `rgba(${a.map((v, k) => k === 3 ? THREE.MathUtils.lerp(v, b[k], mix).toFixed(3) : Math.round(THREE.MathUtils.lerp(v, b[k], mix))).join(',')})`;
  });
  const root = document.documentElement.style;
  root.setProperty('--sky-top', values[0]); root.setProperty('--sky-mid', values[1]);
  root.setProperty('--sky-bottom', values[2]); root.setProperty('--glow', values[3]);
}

let targetProgress = 0, progress = 0, page = -1;
let wind = 0, gust = 0, gusts = 0, paused = false;
let simTime = 0, fps = 60, frames = 0, fpsTime = 0, lastTextureUpdate = -1;
const clock = new THREE.Clock();
const pages = [...document.querySelectorAll('.pager button')];
const cards = [null, ...[1, 2, 3, 4].map((n) => document.getElementById(`card${n}`))];
const CARD_STORAGE_KEY = 'kimi-cloth-intro-cards-v1';
let seenCards;
try { seenCards = new Set(JSON.parse(localStorage.getItem(CARD_STORAGE_KEY) || '[]')); }
catch { seenCards = new Set(); }
let cardTimer;
function hideCard(card) {
  if (!card) return;
  card.classList.remove('visible'); card.setAttribute('aria-hidden', 'true');
}

function setPage(next) {
  if (page === next) return;
  page = next;
  clearTimeout(cardTimer);
  document.getElementById('pageNow').textContent = String(page + 1).padStart(2, '0');
  pages.forEach((button, i) => {
    button.classList.toggle('active', i === page);
    if (i === page) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  });
  cards.forEach(hideCard);
  const card = cards[page];
  if (card && !seenCards.has(page)) {
    seenCards.add(page);
    try { localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify([...seenCards])); } catch { /* private mode */ }
    card.classList.add('visible'); card.setAttribute('aria-hidden', 'false');
    cardTimer = setTimeout(() => hideCard(card), 5500);
  }
  lastTextureUpdate = -1;
}
function readScroll() {
  targetProgress = THREE.MathUtils.clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);
  setPage(Math.round(targetProgress * 4));
}
addEventListener('scroll', readScroll, { passive: true });
pages.forEach((button, i) => button.addEventListener('click', () => {
  // Jump the document, then let the damped camera supply the cinematic transition.
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto'; scrollTo(0, i * innerHeight);
  requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
}));

const windInput = document.getElementById('wind');
const windValue = document.getElementById('windValue');
function updateWindInput() {
  wind = Number(windInput.value);
  windValue.value = `${wind.toFixed(1)} 米/秒`;
  windValue.textContent = `${wind.toFixed(1)} 米/秒`;
  windInput.style.setProperty('--fill', `${wind / 24 * 100}%`);
  windInput.setAttribute('aria-valuetext', `风速 ${wind.toFixed(1)} 米每秒`);
  lastTextureUpdate = -1;
}
windInput.addEventListener('input', updateWindInput);
function triggerGust() {
  if (paused) setPaused(false);
  gust = Math.min(2.4, gust + 1.65); gusts++;
  const button = document.getElementById('gust');
  button.classList.add('gusting'); setTimeout(() => button.classList.remove('gusting'), 260);
  lastTextureUpdate = -1;
}
function setPaused(value) {
  paused = value;
  const button = document.getElementById('pause');
  button.textContent = paused ? '继续' : '暂停';
  button.setAttribute('aria-pressed', String(paused));
  if (!paused) clock.getDelta();
}
function resetCloth() {
  cloth.reset(); gust = 0; gusts = 0; setPaused(false);
  windInput.value = '0'; updateWindInput();
  pinObjects.forEach((pin) => {
    pin.userData.active = true; pin.visible = true;
    pin.position.copy(pin.userData.base); pin.rotation.set(0, 0, 0);
    pin.userData.velocity.set(0, 0, 0); pin.userData.spin.set(0, 0, 0);
  });
  lastTextureUpdate = -1;
}
document.getElementById('gust').addEventListener('click', triggerGust);
document.getElementById('pause').addEventListener('click', () => setPaused(!paused));
document.getElementById('reset').addEventListener('click', resetCloth);
addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === 'Space') { event.preventDefault(); triggerGust(); }
  if (event.key.toLowerCase() === 'p') setPaused(!paused);
  if (event.key.toLowerCase() === 'r') resetCloth();
});

function popPin(index) {
  const pin = pinObjects[index];
  const attached = cloth.togglePin(index);
  pin.userData.active = attached;
  if (!attached) {
    pin.userData.velocity.set((index - 1.5) * 0.18, 0.75, 0.55);
    pin.userData.spin.set(2.2, 1.1, index % 2 ? 2.5 : -2.5);
  } else {
    pin.position.copy(pin.userData.base); pin.rotation.set(0, 0, 0); pin.visible = true;
  }
  lastTextureUpdate = -1;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
const planeNormal = new THREE.Vector3();
let dragging = false, pinCandidate = -1, downX = 0, downY = 0;
const ring = document.getElementById('cursorRing');
function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
function hitCloth() { return raycaster.intersectObject(clothMesh, false)[0]; }
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  setPointer(event); downX = event.clientX; downY = event.clientY;
  const pinHit = raycaster.intersectObjects(pinMeshes.filter((m) => pinObjects[m.userData.pinIndex].userData.active), false)[0];
  if (pinHit) { pinCandidate = pinHit.object.userData.pinIndex; renderer.domElement.setPointerCapture(event.pointerId); return; }
  const hit = hitCloth();
  if (hit && hit.uv) {
    dragging = true; cloth.grabbed = cloth.nearestParticle(hit.uv); cloth.grabTarget.copy(hit.point);
    camera.getWorldDirection(planeNormal); dragPlane.setFromNormalAndCoplanarPoint(planeNormal, hit.point);
    renderer.domElement.setPointerCapture(event.pointerId);
    ring.classList.add('grab');
    if (event.pointerType === 'touch') event.preventDefault();
  }
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch') {
    ring.style.left = `${event.clientX}px`; ring.style.top = `${event.clientY}px`; ring.style.opacity = '1';
  }
  setPointer(event);
  if (dragging) {
    if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) cloth.grabTarget.copy(hitPoint);
    return;
  }
  const overPin = raycaster.intersectObjects(pinMeshes.filter((m) => pinObjects[m.userData.pinIndex].userData.active), false).length > 0;
  const overCloth = !overPin && !!hitCloth();
  renderer.domElement.style.cursor = event.pointerType === 'touch' ? 'auto' : 'none';
  ring.style.width = overPin || overCloth ? '42px' : '32px'; ring.style.height = overPin || overCloth ? '42px' : '32px';
});
function releasePointer(event) {
  if (pinCandidate >= 0 && Math.hypot(event.clientX - downX, event.clientY - downY) < 8) popPin(pinCandidate);
  pinCandidate = -1; dragging = false; cloth.grabbed = -1; ring.classList.remove('grab');
  if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
}
renderer.domElement.addEventListener('pointerup', releasePointer);
renderer.domElement.addEventListener('pointercancel', releasePointer);
renderer.domElement.addEventListener('pointerleave', () => { if (!dragging) ring.style.opacity = '0'; });

function updateCamera(dt) {
  progress = reduceMotion ? targetProgress : THREE.MathUtils.damp(progress, targetProgress, 7, dt);
  const scaled = progress * 4, index = Math.min(3, Math.floor(scaled));
  const rawMix = scaled - index, mix = rawMix * rawMix * (3 - 2 * rawMix);
  const a = cameraStates[index], b = cameraStates[index + 1];
  camera.position.set(
    THREE.MathUtils.lerp(a.p[0], b.p[0], mix),
    THREE.MathUtils.lerp(a.p[1], b.p[1], mix),
    THREE.MathUtils.lerp(a.p[2], b.p[2], mix),
  );
  if (camera.aspect < 1.1) camera.position.z *= 0.95 / camera.aspect;
  cameraTarget.set(
    THREE.MathUtils.lerp(a.t[0], b.t[0], mix),
    THREE.MathUtils.lerp(a.t[1], b.t[1], mix),
    THREE.MathUtils.lerp(a.t[2], b.t[2], mix),
  );
  camera.fov = THREE.MathUtils.lerp(a.fov, b.fov, mix); camera.updateProjectionMatrix(); camera.lookAt(cameraTarget);
  paletteAt(progress);
  const sunset = THREE.MathUtils.smoothstep(progress, 0.45, 1);
  sun.color.set(0xfff8eb).lerp(new THREE.Color(0xffc48c), sunset);
  sun.position.set(THREE.MathUtils.lerp(-3.5, -6, progress), THREE.MathUtils.lerp(7, 3.2, progress), 6);
  sun.intensity = THREE.MathUtils.lerp(3.2, 4.0, sunset);
  hemi.color.set(0xe9f3ff).lerp(new THREE.Color(0xffd8bb), sunset);
  fill.intensity = THREE.MathUtils.lerp(0.7, 0.35, sunset);
  clouds.forEach((cloud) => { cloud.material.color.set(0xffffff).lerp(new THREE.Color(0xffdfc2), sunset * 0.65); });
}

function updateCloth(dt) {
  if (!paused) {
    simTime += dt;
    gust = THREE.MathUtils.damp(gust, 0, 0.82, dt);
    const actualWind = wind * (0.9 + Math.sin(simTime * 0.73) * 0.1);
    cloth.step(simTime, actualWind, gust);
  }
  const attribute = geometry.attributes.position;
  for (let i = 0; i < cloth.count; i++) {
    const k = i * 3;
    attribute.setXYZ(i, cloth.positions[k], cloth.positions[k + 1], cloth.positions[k + 2]);
  }
  attribute.needsUpdate = true; geometry.computeVertexNormals();
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1, 0), 30);
}

function updatePins(dt) {
  pinObjects.forEach((pin) => {
    if (pin.userData.active || !pin.visible) return;
    pin.userData.velocity.y -= 4.5 * dt;
    pin.position.addScaledVector(pin.userData.velocity, dt);
    pin.rotation.x += pin.userData.spin.x * dt; pin.rotation.y += pin.userData.spin.y * dt; pin.rotation.z += pin.userData.spin.z * dt;
    if (pin.position.y < -8) pin.visible = false;
  });
}

function draw() { renderer.render(scene, camera); }
let accumulator = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  accumulator += dt;
  while (accumulator >= 1 / 60) { updateCloth(1 / 60); accumulator -= 1 / 60; }
  updateCamera(dt); updatePins(dt);
  clouds.forEach((cloud, i) => { cloud.position.x = cloud.userData.startX + Math.sin(simTime * cloud.userData.speed + i) * 1.4; });
  frames++; fpsTime += dt;
  if (fpsTime >= 0.5) { fps = THREE.MathUtils.lerp(fps, frames / fpsTime, 0.35); frames = 0; fpsTime = 0; }
  if (simTime - lastTextureUpdate > 0.25 || lastTextureUpdate < 0) {
    banner.draw({ page: Math.max(0, page), wind, gusts, stretch: cloth.stretch, fps, scroll: progress, pins: cloth.pinActive.filter(Boolean).length });
    lastTextureUpdate = simTime;
  }
  draw();
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); readScroll();
});

// Inspection hooks are intentionally tiny and make cold-start/interaction verification reproducible.
window.__APP__ = {
  get state() { return { wind, gust, gusts, paused, page, progress, pins: [...cloth.pinActive], stretch: cloth.stretch, particles: cloth.count, springs: cloth.constraints.length, dragging, fps, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
  gust: triggerGust, reset: resetCloth,
};
window.__seek = (seconds) => {
  setPaused(true);
  for (let i = 0; i < Math.min(600, Math.round(Number(seconds) * 60)); i++) { simTime += 1 / 60; cloth.step(simTime, wind, gust); }
  updateCloth(0); draw();
};
window.__play = () => setPaused(false);
readScroll(); updateWindInput(); updateCloth(0); updateCamera(1 / 60); draw();
requestAnimationFrame(() => {
  document.getElementById('loading').classList.add('done');
  setTimeout(() => document.getElementById('loading').remove(), 400);
  window.__SCENE_READY__ = true;
});
