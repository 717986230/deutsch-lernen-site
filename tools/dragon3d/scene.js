// 永久会员「双龙戏珠」3D 场景（构建期离线渲染成循环动图，网站运行时不加载 three.js）。
// 坐标：头像半径 = 1，位于原点；相机看向 -z，画面半宽 = 3（= 头像直径的 3 倍，对应 240 画布）。
// window.setup(K) 搭场景；window.renderAt(t) 渲染循环中 t∈[0,1) 时刻的一帧（所有动画都以 1 为周期，首尾无缝）。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
let renderer, scene, camera, K, updaters = [];
const col = (c) => new THREE.Color(c);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 确定性伪随机（每帧可复现 → 循环首尾一致）
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let GLOW;
const sprite = (color, size, opacity = 1, normal) => {
  const m = new THREE.SpriteMaterial({ map: GLOW, color: col(color), transparent: true, opacity, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
};

// ───────── 通用：沿曲线的变径管（龙身、角、须、腿都用它）─────────
// pts: Vector3[]，radius(s), ring 段数；ups: 每点的「背」方向（可选）；deco(s,v,r) 返回半径扰动（鳞片）；color(s,v) 返回顶点色
function tube(pts, radius, radial, opt = {}) {
  const n = pts.length, pos = [], colArr = [], idx = [];
  const T = [], U = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    T.push(b.clone().sub(a).normalize());
  }
  // 背方向：给定 ups 就用，否则平行移动
  let prev = opt.ups ? null : new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    let u;
    if (opt.ups) u = opt.ups[i].clone();
    else { u = prev.clone(); if (Math.abs(u.dot(T[i])) > 0.95) u.set(1, 0, 0); }
    u.sub(T[i].clone().multiplyScalar(u.dot(T[i]))).normalize();
    U.push(u); prev = u;
  }
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), r = radius(s), B = new THREE.Vector3().crossVectors(T[i], U[i]);
    for (let j = 0; j <= radial; j++) {
      const v = j / radial * TAU;                       // v=0 背脊，v=π 腹部
      const rr = r * (1 + (opt.deco ? opt.deco(s, v, r) : 0));
      const d = U[i].clone().multiplyScalar(Math.cos(v)).add(B.clone().multiplyScalar(Math.sin(v)));
      const p = pts[i].clone().add(d.multiplyScalar(rr));
      pos.push(p.x, p.y, p.z);
      if (opt.color) { opt.color(s, v, c); colArr.push(c.r, c.g, c.b); }
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // 封口（尾端/末端收成一点）
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (opt.color) g.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return { geo: g, T, U };
}

function bodyMat() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.62, roughness: 0.3, envMapIntensity: 1.25 });
}

// ───────── 雕刻龙头：把高精度球体按剖面函数捏成「颅骨-眉骨-长吻-鼻头」───────────
const g1 = (x, m, w) => Math.exp(-((x - m) * (x - m)) / (2 * w * w));
function sculptHead(top, under) {
  const geo = new THREE.SphereGeometry(1, 96, 64), p = geo.attributes.position, c = new Float32Array(p.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = (x + 1) / 2;                                   // 0 后脑 → 1 鼻尖
    const X = -0.2 + u * 0.72;
    let h = 0.16 - 0.095 * smooth(0.28, 0.82, u) + 0.022 * g1(u, 0.93, 0.05);   // 半高：颅大吻细、鼻头鼓
    let w = 0.155 - 0.07 * smooth(0.25, 0.8, u) + 0.018 * g1(u, 0.94, 0.05);
    w += 0.03 * g1(u, 0.22, 0.1) * (y < 0.2 ? 1 : 0.4);      // 腮
    let Y = y * h * (y > 0 ? 1 : 0.55);                       // 下沿收平（嘴缝）
    Y += 0.045 * g1(u, 0.42, 0.08) * Math.max(0, y) * g1(Math.abs(z), 0.55, 0.25);   // 眉骨
    Y += 0.02 * g1(u, 0.92, 0.04) * Math.max(0, y) * g1(Math.abs(z), 0.5, 0.2);      // 鼻孔鼓包
    Y -= 0.025 * smooth(0.5, 0.9, u) * (y > 0 ? 1 : 0) * (1 - Math.abs(z));          // 鼻梁下凹
    p.setXYZ(i, X, Y + 0.01, z * w);
    tmp.copy(top).lerp(under, smooth(0.1, -0.5, y)); c.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals(); return geo;
}
function sculptJaw(top, under) {
  const geo = new THREE.SphereGeometry(1, 64, 32), p = geo.attributes.position, c = new Float32Array(p.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = (x + 1) / 2;
    const h = 0.05 - 0.02 * smooth(0.3, 1, u), w = 0.12 - 0.06 * smooth(0.2, 0.95, u);
    p.setXYZ(i, -0.12 + u * 0.6, y * h * (y > 0 ? 0.35 : 1), z * w);
    tmp.copy(top).lerp(under, smooth(0, -0.6, y)); c.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals(); return geo;
}

// ───────── 龙（右侧这条，左边镜像）─────────
function makeDragon(phase, side) {
  const g = new THREE.Group();
  const mat = bodyMat();
  const maneMat = new THREE.MeshStandardMaterial({ color: col(K.mane[0]), emissive: col(K.mane[0]), emissiveIntensity: 0.35, metalness: 0.35, roughness: 0.35 });
  const mane2Mat = new THREE.MeshStandardMaterial({ color: col(K.mane[1]), emissive: col(K.mane[1]), emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.4 });
  const hornMat = new THREE.MeshStandardMaterial({ color: col(K.horn), metalness: 0.5, roughness: 0.25, envMapIntensity: 1.4 });
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.2 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: col(K.eye), emissive: col(K.eye), emissiveIntensity: 2.2 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, roughness: 0.6 });
  const B0 = col(K.body[0]), B1 = col(K.body[1]), B2 = col(K.body[2]), BL = col(K.belly);
  const NS = 150;

  const parts = new THREE.Group(); g.add(parts);
  // 动态重建：每帧根据 t 生成脊线 → 龙身、背鳍、头、腿位置
  const spine = (t) => {
    const pts = [], ups = [];
    for (let i = 0; i < NS; i++) {
      const s = i / (NS - 1);
      const th = lerp(205, 34, s) * Math.PI / 180;
      const R = 1.52 + 0.11 * Math.sin(3 * Math.PI * s - TAU * t + phase);
      const z = 0.32 * Math.sin(TAU * 1.25 * s - TAU * t + phase) - 0.05;
      pts.push(new THREE.Vector3(R * Math.sin(th), R * Math.cos(th), z));
    }
    for (let i = 0; i < NS; i++) {                     // 背 = 背离圆心（并带一点朝镜头）
      const p = pts[i]; ups.push(new THREE.Vector3(p.x, p.y, 0).normalize().add(new THREE.Vector3(0, 0, 0.35)).normalize());
    }
    return { pts, ups };
  };
  const rad = (s) => { const a = 0.035 + 0.175 * Math.sin(Math.min(s / 0.5, 1) * Math.PI / 2); return s > 0.82 ? a * (1 - 0.3 * (s - 0.82) / 0.18) : a; };
  // 鳞片：沿身体一排排交错的鱼鳞，鳞片后缘微微翘起
  const deco = (s, v) => {
    const a = s * 120, b = v / TAU * 16 + (Math.floor(a) % 2) * 0.5;
    const fa = a - Math.floor(a), fb = b - Math.floor(b);
    const d = Math.hypot((fb - 0.5) * 1.1, fa * 0.9);
    const scale = Math.max(0, 1 - d) * fa * 0.13;
    const belly = smooth(2.2, 2.6, Math.abs(v - Math.PI) < Math.PI ? Math.PI - Math.abs(v - Math.PI) + 2.2 : 0);
    const plate = Math.abs(v - Math.PI) < 0.9 ? (Math.pow(Math.abs(Math.sin(s * 150 * Math.PI)), 6) * 0.05) : 0;
    return Math.abs(v - Math.PI) < 0.9 ? -plate : scale * (1 - belly * 0) ;
  };
  const colorF = (s, v, c) => {
    const dv = Math.abs(((v + Math.PI) % TAU) - Math.PI);   // 0 = 背脊, π = 腹
    if (dv > Math.PI - 0.9) { c.copy(BL).lerp(B1, 0.12 + 0.25 * Math.pow(Math.abs(Math.sin(s * 150 * Math.PI)), 8)); return; }
    const k = dv / (Math.PI - 0.9);
    c.copy(B2).lerp(B1, smooth(0, 0.55, k)).lerp(B0, 0.35 * smooth(0.45, 0.8, k) * (1 - smooth(0.85, 1, k)));
    const a = s * 120, fa = a - Math.floor(a);
    c.multiplyScalar(0.82 + 0.3 * fa);                      // 每片鳞后缘更亮 → 鳞片层次
  };

  let bodyMesh = null;
  const dorsal = [], legs = [];
  const cone = new THREE.ConeGeometry(1, 1, 10); cone.translate(0, 0.5, 0);
  const finMat = new THREE.MeshStandardMaterial({ color: B2.clone().lerp(B1, 0.35), metalness: 0.7, roughness: 0.28, emissive: col(K.mane[0]), emissiveIntensity: 0.12 });
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(cone, finMat); parts.add(m); dorsal.push(m); }
  // 尾巴火焰毛
  const tailTufts = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(cone, i % 2 ? mane2Mat : maneMat); parts.add(m); tailTufts.push(m); }

  // 头
  const head = new THREE.Group(); parts.add(head);
  const sph = new THREE.SphereGeometry(1, 32, 24);
  const add = (geo, m, p, s, r) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); o.scale.set(...s); if (r) o.rotation.set(...r); head.add(o); return o; };
  const headMat = new THREE.MeshStandardMaterial({ color: B1, metalness: 0.62, roughness: 0.3, envMapIntensity: 1.25 });
  const headLight = new THREE.MeshStandardMaterial({ color: B0.clone().lerp(B1, 0.4), metalness: 0.6, roughness: 0.28 });
  const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.3, envMapIntensity: 1.3 });
  head.add(new THREE.Mesh(sculptHead(B1.clone().lerp(B2, 0.15), BL), skinMat));
  add(sph, mouthMat, [0.47, 0.05, 0.045], [0.014, 0.008, 0.012]); add(sph, mouthMat, [0.47, 0.05, -0.045], [0.014, 0.008, 0.012]);
  [1, -1].forEach((z) => {
    add(sph, eyeMat, [0.085, 0.075, 0.108 * z], [0.034, 0.015, 0.02], [0, 0.35 * z, -0.25]);
    add(sph, new THREE.MeshBasicMaterial({ color: 0x000000 }), [0.092, 0.076, 0.124 * z], [0.008, 0.02, 0.006]);
    const gs = sprite(K.eye, 0.18, 0.9); gs.position.set(0.085, 0.075, 0.125 * z); head.add(gs);
    for (let k = 0; k < 3; k++) add(cone, toothMat, [0.4 - k * 0.07, -0.02, 0.045 * z], [0.011, 0.05, 0.011], [Math.PI, 0, 0]);   // 上獠牙
    // 腮鳍
    for (let k = 0; k < 4; k++) add(cone, k % 2 ? mane2Mat : maneMat, [-0.06, -0.02 + k * 0.03, 0.1 * z], [0.03, 0.22 - k * 0.03, 0.012], [0.5 * z, 0, 1.9 + k * 0.22]);
  });
  // 下颚（张嘴）
  const jaw = new THREE.Group(); jaw.position.set(-0.04, -0.06, 0); head.add(jaw);
  const jm = new THREE.Mesh(sculptJaw(B1, BL), skinMat); jm.position.set(0.04, -0.01, 0); jaw.add(jm);
  const tongue = new THREE.Mesh(sph, mouthMat); tongue.position.set(0.2, 0.02, 0); tongue.scale.set(0.17, 0.02, 0.06); jaw.add(tongue);
  [1, -1].forEach((z) => { for (let k = 0; k < 2; k++) { const t = new THREE.Mesh(cone, toothMat); t.position.set(0.34 - k * 0.09, 0.02, 0.055 * z); t.scale.set(0.011, 0.04, 0.011); jaw.add(t); } });
  // 鹿角
  const hornCurve = (z, sc) => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.02, 0.1, 0.07 * z), new THREE.Vector3(-0.1, 0.24, 0.11 * z), new THREE.Vector3(-0.28, 0.33, 0.15 * z), new THREE.Vector3(-0.46, 0.34, 0.17 * z)].map((p) => p.multiplyScalar(sc))); return c.getPoints(24); };
  [1, -1].forEach((z) => {
    head.add(new THREE.Mesh(tube(hornCurve(z, 1), (s) => 0.034 * (1 - s) + 0.004, 10).geo, hornMat));
    const br = [new THREE.Vector3(-0.17, 0.29, 0.13 * z), new THREE.Vector3(-0.2, 0.4, 0.15 * z), new THREE.Vector3(-0.16, 0.5, 0.16 * z)];
    head.add(new THREE.Mesh(tube(new THREE.CatmullRomCurve3(br).getPoints(12), (s) => 0.02 * (1 - s) + 0.003, 8).geo, hornMat));
  });
  // 头后鬃毛（一圈向后飘的锥）
  const maneHead = [];
  let maneStrands = [];
  // 龙须（每帧重建）
  const whiskerMat = new THREE.MeshStandardMaterial({ color: col(K.mane[1]), emissive: col(K.mane[1]), emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 });
  let whiskers = [];

  // 腿
  const legDefs = [{ s: 0.36 }, { s: 0.74 }];
  let legMeshes = [];

  // 龙息粒子
  const breath = new THREE.Group(); head.add(breath);
  const NB = 70, bp = [];
  for (let i = 0; i < NB; i++) { const sp = sprite(K.fx[1], 0.1, 0.9, i % 3 !== 0); breath.add(sp); bp.push(sp); }
  const core = sprite(K.fx[0], 0.3, 1); core.position.set(0.46, -0.04, 0); breath.add(core);
  let bolts = [];
  const shardGeo = new THREE.OctahedronGeometry(1, 0);
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: col(K.fx[2]), emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.9 });
  const shards = [];
  if (K.breath === 'ice') for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(shardGeo, shardMat); breath.add(m); shards.push(m); }

  const disposeList = (arr) => arr.forEach((m) => { m.parent && m.parent.remove(m); m.geometry && m.geometry !== cone && m.geometry.dispose(); });

  const update = (t) => {
    const { pts, ups } = spine(t);
    if (bodyMesh) { parts.remove(bodyMesh); bodyMesh.geometry.dispose(); }
    const tb = tube(pts, rad, 40, { ups, deco, color: colorF });
    bodyMesh = new THREE.Mesh(tb.geo, mat); parts.add(bodyMesh);
    const Tn = tb.T, Un = tb.U;
    // 背鳍：沿背脊向后掠的锥
    dorsal.forEach((m, k) => {
      const s = 0.08 + k / (dorsal.length - 1) * 0.84, i = Math.round(s * (NS - 1)), r = rad(s);
      const h = r * (k % 2 ? 0.7 : 1.05);
      m.position.copy(pts[i]).add(Un[i].clone().multiplyScalar(r * 0.85));
      const dir = Un[i].clone().multiplyScalar(1).add(Tn[i].clone().multiplyScalar(-0.75)).normalize();
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      m.scale.set(r * 0.7, h, r * 0.16);
    });
    // 尾巴火焰
    tailTufts.forEach((m, k) => {
      const back = Tn[0].clone().negate(), side = new THREE.Vector3().crossVectors(Tn[0], Un[0]);
      const a = (k - 2) * 0.42 + 0.12 * Math.sin(TAU * t * 2 + k);
      const dir = back.clone().multiplyScalar(Math.cos(a)).add(Un[0].clone().multiplyScalar(Math.sin(a))).add(side.clone().multiplyScalar(0.15 * (k - 2))).normalize();
      m.position.copy(pts[0]); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      m.scale.set(0.04, k === 2 ? 0.34 : 0.25, 0.015);
    });
    // 头的姿态：前 = 末端切线（再往上抬一点），上 = 背方向
    const hp = pts[NS - 1], fwd = Tn[NS - 1].clone().add(new THREE.Vector3(0, 0.02, 0.2)).normalize();
    const up = Un[NS - 1].clone().sub(fwd.clone().multiplyScalar(Un[NS - 1].dot(fwd))).normalize();
    const zz = new THREE.Vector3().crossVectors(fwd, up);
    head.matrixAutoUpdate = true;
    head.position.copy(hp).add(fwd.clone().multiplyScalar(0.04));
    head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, up, zz));
    head.scale.setScalar(1.75);
    // 呼吸节奏：每个周期吐一次（两条龙相差半个周期）
    const bt = ((t + (side < 0 ? 0.5 : 0)) % 1);
    const open = smooth(0.05, 0.18, bt) * (1 - smooth(0.62, 0.78, bt));
    jaw.rotation.z = -0.5 * open;
    head.rotation.z += 0;
    // 鬃毛：一束束向后飘的锥形发丝（每帧随风摆）
    disposeList(maneStrands); maneStrands = [];
    for (let k = 0; k < 16; k++) {
      const a = -1.2 + (k % 8) / 7 * 2.4, zz = (k < 8 ? 1 : -1), L = 0.55 - Math.abs(a) * 0.12 + rnd(k) * 0.12;
      const sp = [];
      for (let j = 0; j < 14; j++) {
        const u = j / 13, wv = 0.05 * Math.sin(u * 4 - TAU * t * 2 + k) * u;
        sp.push(new THREE.Vector3(-0.05 - u * L, 0.04 + Math.sin(a) * 0.1 + u * (0.1 + 0.12 * Math.sin(a)) + wv, zz * (0.06 + Math.cos(a) * 0.06 + u * 0.12)));
      }
      const m = new THREE.Mesh(tube(sp, (s) => 0.04 * Math.pow(1 - s, 0.8) + 0.003, 8).geo, k % 3 ? maneMat : mane2Mat);
      head.add(m); maneStrands.push(m);
    }
    // 龙须：从鼻头两侧向后飘
    disposeList(whiskers); whiskers = [];
    [1, -1].forEach((z) => {
      const wp = [];
      for (let k = 0; k < 18; k++) { const u = k / 17; wp.push(new THREE.Vector3(0.38 - u * 0.75, -0.02 - u * 0.28 + 0.06 * Math.sin(u * 5 - TAU * t * 2), (0.06 + u * 0.2) * z)); }
      const m = new THREE.Mesh(tube(wp, (s) => 0.011 * (1 - s) + 0.002, 6).geo, whiskerMat); head.add(m); whiskers.push(m);
    });
    // 腿（朝镜头一侧伸出，三趾爪）
    disposeList(legMeshes); legMeshes = [];
    legDefs.forEach((L, li) => {
      const i = Math.round(L.s * (NS - 1)), p = pts[i], r = rad(L.s);
      const out = new THREE.Vector3(p.x, p.y, 0).normalize(), Tg = Tn[i];
      const sw = 0.06 * Math.sin(TAU * t + li * 2 + phase);
      const base = p.clone().add(new THREE.Vector3(0, 0, r * 0.6));
      const knee = base.clone().add(out.clone().multiplyScalar(0.2)).add(Tg.clone().multiplyScalar(-0.12 + sw)).add(new THREE.Vector3(0, 0, 0.12));
      const paw = knee.clone().add(out.clone().multiplyScalar(0.1)).add(Tg.clone().multiplyScalar(0.17)).add(new THREE.Vector3(0, 0, 0.05));
      const curve = new THREE.CatmullRomCurve3([base, base.clone().lerp(knee, 0.5).add(out.clone().multiplyScalar(0.02)), knee, paw]).getPoints(20);
      const lm = new THREE.Mesh(tube(curve, (s) => r * (0.62 - 0.25 * s), 14, { color: (s, v, c) => c.copy(B1).lerp(B0, 0.25 * Math.max(0, Math.cos(v))) }).geo, mat);
      parts.add(lm); legMeshes.push(lm);
      const tuft = new THREE.Mesh(cone, maneMat); tuft.position.copy(knee);
      tuft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Tg.clone().negate().add(out.clone().multiplyScalar(0.4)).normalize()); tuft.scale.set(0.035, 0.2, 0.015); parts.add(tuft); legMeshes.push(tuft);
      const pd = Tg.clone().add(out.clone().multiplyScalar(0.5)).normalize();
      for (let k = -1; k <= 1; k++) {
        const d = pd.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), k * 0.55);
        const cp = [paw, paw.clone().add(d.clone().multiplyScalar(0.07)), paw.clone().add(d.clone().multiplyScalar(0.12)).add(new THREE.Vector3(0, 0, -0.04))];
        const cm = new THREE.Mesh(tube(new THREE.CatmullRomCurve3(cp).getPoints(8), (s) => 0.018 * (1 - s) + 0.002, 8).geo, hornMat);
        parts.add(cm); legMeshes.push(cm);
      }
    });
    // 龙息
    const amp = smooth(0.12, 0.22, bt) * (1 - smooth(0.6, 0.74, bt));
    breath.visible = amp > 0.01;
    core.material.opacity = amp; core.scale.setScalar(0.35 * amp + 0.05);
    const mouth = new THREE.Vector3(0.44, -0.05, 0);
    bp.forEach((sp, i) => {
      const ph = (rnd(i) + bt * 2.2) % 1;                    // 每个粒子沿喷射方向跑
      const d = ph * 0.85 * (0.6 + amp * 0.6);
      const spread = 0.05 + d * 0.32;
      let x = mouth.x + d, y = mouth.y + (rnd(i + 7) - 0.5) * 2 * spread, z = (rnd(i + 13) - 0.5) * 2 * spread;
      let size = (0.07 + d * 0.38) * (0.6 + rnd(i + 3) * 0.7);
      let c0 = K.fx[0], c1 = K.fx[2];
      if (K.breath === 'fire') y += d * d * 0.25;                  // 火往上蹿
      if (K.breath === 'wind') { const a = d * 14 + i; y = mouth.y + Math.sin(a) * spread * 1.2; z = Math.cos(a) * spread * 1.2; size *= 0.7; }
      if (K.breath === 'water') { y += Math.sin(d * 9 + i * 0.2) * 0.03; size *= 0.75; }
      if (K.breath === 'dark') { size *= 1.35; }
      if (K.breath === 'light') { y = mouth.y + (rnd(i + 7) - 0.5) * (0.04 + d * 0.16); z = (rnd(i + 13) - 0.5) * (0.04 + d * 0.16); }
      if (K.breath === 'rainbow') { const h = (i / NB + bt) % 1; sp.material.color.setHSL(h, 0.9, 0.62); }
      else sp.material.color.copy(col(c0)).lerp(col(c1), smooth(0, 0.8, ph)).lerp(col(K.fx[3]), smooth(0.7, 1, ph) * 0.25);
      sp.position.set(x, y, z); sp.scale.setScalar(size);
      sp.material.opacity = amp * (1 - smooth(0.75, 1, ph)) * (K.breath === 'dark' ? 0.75 : 0.95);
    });
    shards.forEach((m, i) => {
      const ph = (rnd(i + 50) + bt * 1.6) % 1, d = ph * 0.95;
      m.position.set(mouth.x + d, mouth.y + (rnd(i + 51) - 0.5) * (0.05 + d * 0.5), (rnd(i + 52) - 0.5) * (0.05 + d * 0.5));
      m.rotation.set(i + ph * 4, i * 2 + ph * 3, 0);
      const s = 0.025 + rnd(i + 53) * 0.035; m.scale.set(s * 0.6, s * 1.6, s * 0.6);
      m.visible = amp > 0.2 && ph < 0.92;
    });
    // 闪电：每帧新的折线（确定性随机）
    disposeList(bolts); bolts = [];
    if (K.breath === 'bolt' && amp > 0.15) {
      const seed = Math.floor(bt * 48);
      for (let b = 0; b < 3; b++) {
        const bpts = [mouth.clone()];
        let p = mouth.clone();
        for (let k = 1; k <= 9; k++) { p = p.clone().add(new THREE.Vector3(0.11, (rnd(seed * 31 + b * 7 + k) - 0.5) * 0.16, (rnd(seed * 17 + b * 5 + k) - 0.5) * 0.12)); bpts.push(p); }
        const lm1 = new THREE.Mesh(tube(bpts, () => 0.012, 6).geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        breath.add(lm1); bolts.push(lm1);
        bpts.forEach((q, k) => { if (k % 2) { const gs = sprite(k % 4 === 1 ? K.fx[2] : K.fx[3], 0.22, 0.6 * amp); gs.position.copy(q); breath.add(gs); bolts.push(gs); } });
      }
    }
  };
  updaters.push(update);
  if (side < 0) g.scale.x = -1;
  return g;
}

// ───────── 16 翼天使翅膀 ─────────
function makeWings() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.bezierCurveTo(0.09, 0.18, 0.08, 0.7, 0, 1); shape.bezierCurveTo(-0.08, 0.7, -0.09, 0.18, 0, 0);
  const fgeo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 });
  // 顶点色：羽根深 → 羽梢亮
  { const p = fgeo.attributes.position, c = new Float32Array(p.count * 3), a = col(K.w[3]), b = col(K.w[1]), w = col(K.w[0]), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); tmp.copy(col(K.w[2])).lerp(col(K.w[1]), smooth(0, 0.35, y)).lerp(new THREE.Color(0xffffff), smooth(0.3, 0.95, y) * 0.85); if (K.rainbow) tmp.setHSL((y * 0.8 + 0.6) % 1, 0.8, 0.55 + y * 0.25); c.set([tmp.r, tmp.g, tmp.b], i * 3); }
    fgeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const fm = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.4, emissive: col(K.halo), emissiveIntensity: 0.06, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  const spec = [[-58, 1.0], [-42, 0.97], [-27, 0.92], [-12, 0.86], [3, 0.78], [19, 0.68], [35, 0.58], [52, 0.48]];
  const wings = [];
  [1, -1].forEach((sx) => spec.forEach(([elev, k], wi) => {
    const root = new THREE.Group();
    root.position.set(sx * 1.08, -0.08 + elev * 0.0035, -0.55 - (wi % 2) * 0.12);
    root.rotation.z = sx > 0 ? -elev * Math.PI / 180 : elev * Math.PI / 180;
    root.scale.x = sx;
    const flap = new THREE.Group(); root.add(flap);
    const L = 1.95 * k, n = 9;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, x = t * L * 0.95, y = Math.sin(Math.PI * x / L) * L * 0.15;
      const f = new THREE.Mesh(fgeo, fm);
      const len = L * (0.34 + 0.5 * t);
      f.position.set(x, y, 0.01 * i);
      f.rotation.set(0.25 * t, 0, Math.PI - (15 - t * 82) * Math.PI / 180);
      f.scale.set(len * (0.85 + 0.4 * t), len, len);
      flap.add(f);
      if (t < 0.8) { const c = new THREE.Mesh(fgeo, fm); c.position.set(x - L * 0.03, y + 0.02, 0.06 + 0.01 * i); c.rotation.copy(f.rotation); c.rotation.z += 0.18; c.scale.set(len * 0.5, len * 0.48, len * 0.5); flap.add(c); }
    }
    wings.push({ flap, wi });
    g.add(root);
  }));
  updaters.push((t) => wings.forEach(({ flap, wi }) => { flap.rotation.z = 0.09 * Math.sin(TAU * t - wi * 0.25); flap.rotation.y = 0.12 * Math.sin(TAU * t - wi * 0.25); }));
  return g;
}

// ───────── 龙珠 + 光环 + 主环 ─────────
function makePearl() {
  const g = new THREE.Group(); g.position.set(0, 1.78, 0.35);
  const pm = new THREE.MeshPhysicalMaterial({ color: col(K.fx[1]), emissive: col(K.fx[2]), emissiveIntensity: 0.9, metalness: 0.1, roughness: 0.05, clearcoat: 1 });
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 40, 30), pm); g.add(pearl);
  const glow = sprite(K.glow, 0.9, 0.85); g.add(glow);
  const flames = []; for (let i = 0; i < 10; i++) { const s = sprite(i % 2 ? K.fx[2] : K.fx[1], 0.22, 0.8); g.add(s); flames.push(s); }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 16, 64), new THREE.MeshStandardMaterial({ color: col(K.halo), emissive: col(K.halo), emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.2 }));
  halo.rotation.x = Math.PI / 2 - 0.35; g.add(halo);
  const hg = sprite(K.halo, 0.75, 0.45); g.add(hg);
  updaters.push((t) => {
    const p = 1 + 0.08 * Math.sin(TAU * t * 2); pearl.scale.setScalar(p); glow.scale.setScalar(0.9 * p);
    halo.position.y = 0.3 + 0.03 * Math.sin(TAU * t); hg.position.y = halo.position.y;
    flames.forEach((s, i) => { const a = i / flames.length * TAU + TAU * t; s.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.02); s.scale.setScalar(0.16 + 0.07 * Math.sin(TAU * t * 2 + i)); });
  });
  return g;
}
function makeRing() {
  const g = new THREE.Group();
  const rm = new THREE.MeshStandardMaterial({ color: col(K.w[1]), metalness: 0.9, roughness: 0.18, emissive: col(K.glow), emissiveIntensity: 0.25, envMapIntensity: 1.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.06, 24, 120), rm); g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.018, 12, 120), new THREE.MeshStandardMaterial({ color: col(K.glow), emissive: col(K.glow), emissiveIntensity: 1.4 })); g.add(ring2);
  const gm = new THREE.MeshPhysicalMaterial({ color: col(K.gem), emissive: col(K.gem), emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  [Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), gm); m.position.set(Math.cos(a) * 1.06, Math.sin(a) * 1.06, 0.07); g.add(m); const s = sprite(K.gem, 0.35, 0.7); s.position.copy(m.position); g.add(s); });
  const sparks = []; for (let i = 0; i < 26; i++) { const s = sprite(K.rainbow ? `hsl(${i * 47 % 360},90%,65%)` : (i % 3 ? K.fx[1] : K.halo), 0.12, 1); g.add(s); sparks.push(s); }
  updaters.push((t) => {
    ring.rotation.z = -TAU * t / 3; ring2.rotation.z = TAU * t / 3;
    sparks.forEach((s, i) => { const a = rnd(i) * TAU + TAU * t * (i % 2 ? 1 : -1) / 3, r = 1.25 + rnd(i + 9) * 1.4; s.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.4); const tw = Math.max(0, Math.sin(TAU * (t * 2 + rnd(i + 3)))); s.material.opacity = tw; s.scale.setScalar(0.05 + 0.13 * tw); });
  });
  return g;
}

window.setup = (pal, size) => {
  K = pal; updaters = [];
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1); renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  GLOW = glowTex();
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 3 / Math.tan(15 * Math.PI / 180)); camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(col(K.glow), 2.5); rim.position.set(2, -1, -4); scene.add(rim);
  const fill = new THREE.PointLight(col(K.glow), 6, 6, 1.5); fill.position.set(0, 0, 1.2); scene.add(fill);
  scene.add(makeWings());
  scene.add(makeRing());
  scene.add(makeDragon(0, 1));
  scene.add(makeDragon(Math.PI * 0.7, -1));
  scene.add(makePearl());
  return true;
};
window.renderAt = (t) => { updaters.forEach((u) => u(t)); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); };
// 调试用：把镜头对准 (x,y)，画面半宽 hw
window.setCam = (x, y, hw) => { camera.fov = 2 * Math.atan(hw / 11.2) * 180 / Math.PI; camera.position.set(x, y, 11.2); camera.lookAt(x, y, 0); camera.updateProjectionMatrix(); };
