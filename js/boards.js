/* ═══════════════════════════════════════════════════════
   boards.js — 桌面 / 面包板 / Arduino Uno 的三维建模
   全部程序化生成，不依赖任何外部模型或贴图资源
   ═══════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { U, BB, BOARD, PINS, ROW_Z, RAIL_Z } from './geo.js';

/* ───────── 通用材质 ───────── */
const M = {
  pcb:      new THREE.MeshStandardMaterial({ color: 0x0e7c74, roughness: .62, metalness: .08 }),
  pcbDark:  new THREE.MeshStandardMaterial({ color: 0x0a5f59, roughness: .7 }),
  plasticB: new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: .55 }),
  plasticW: new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: .74 }),
  plasticG: new THREE.MeshStandardMaterial({ color: 0x8f949c, roughness: .8 }),
  gold:     new THREE.MeshStandardMaterial({ color: 0xd8b25c, roughness: .32, metalness: .95 }),
  silver:   new THREE.MeshStandardMaterial({ color: 0xc2c8ce, roughness: .28, metalness: .92 }),
  black:    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: .5 }),
  red:      new THREE.MeshStandardMaterial({ color: 0xd8302a, roughness: .5 }),
  blue:     new THREE.MeshStandardMaterial({ color: 0x2b6fd6, roughness: .55 }),
  hole:     new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: .9 }),
};

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
const cyl = (r1, r2, h, mat, seg = 24) =>
  new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);

/* ───────── 纹理工具 ───────── */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/** 世界(局部)坐标 → 画布像素。用于贴在旋转 -90° 的水平面上的纹理 */
function px(lx, lz, w, d, W, H) {
  return [((lx + w / 2) / w) * W, ((lz + d / 2) / d) * H];
}

/* ═════════════ 桌面 ═════════════ */
export function buildDesk() {
  const g = new THREE.Group();

  const [c, ctx] = makeCanvas(1024, 1024);
  ctx.fillStyle = '#0f1319';
  ctx.fillRect(0, 0, 1024, 1024);
  // 细网格
  ctx.strokeStyle = 'rgba(120,160,200,.045)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex, color: 0xffffff, roughness: .95, metalness: .02,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  plane.receiveShadow = true;
  g.add(plane);
  return g;
}

/* ═════════════ 面包板 ═════════════ */
export function buildBreadboard() {
  const g = new THREE.Group();
  g.position.set(BB.cx, 0, BB.cz);

  // 本体
  const body = box(BB.w, BB.h, BB.d, M.plasticW, 0, BB.h / 2, 0);
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // 底部圆角脚垫（暗色边）
  const base = box(BB.w + .04, .06, BB.d + .04, M.plasticG, 0, .03, 0);
  g.add(base);

  /* ── 丝印贴图 ── */
  const W = 1100, H = 729;
  const [c, ctx] = makeCanvas(W, H);

  const cx = (lx) => px(lx, 0, BB.w, BB.d, W, H)[0];
  const cy = (lz) => px(0, lz, BB.w, BB.d, W, H)[1];
  const toPx = (lx, lz) => px(lx, lz, BB.w, BB.d, W, H);

  // 电源轨彩线
  const railLine = (z, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(cx(-3.35), cy(z)); ctx.lineTo(cx(3.35), cy(z));
    ctx.stroke();
  };
  for (const side of ['top', 'bot']) {
    const z = RAIL_Z[side];
    railLine(z['+'] - .085, 'rgba(214,54,44,.85)');
    railLine(z['+'] + .085, 'rgba(214,54,44,.55)');
    railLine(z['-'] - .085, 'rgba(40,90,200,.8)');
    railLine(z['-'] + .085, 'rgba(40,90,200,.5)');
  }

  // 中央凹槽
  ctx.fillStyle = 'rgba(0,0,0,.10)';
  ctx.fillRect(cx(-3.9), cy(-.30), cx(3.9) - cx(-3.9), cy(.30) - cy(-.30));
  ctx.strokeStyle = 'rgba(0,0,0,.16)';
  ctx.lineWidth = 1.4;
  for (const z of [-.30, .30]) {
    ctx.beginPath(); ctx.moveTo(cx(-3.9), cy(z)); ctx.lineTo(cx(3.9), cy(z)); ctx.stroke();
  }

  // 孔环 + 编号
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const drawHole = (x, z) => {
    const [a, b] = toPx(x, z);
    ctx.beginPath(); ctx.arc(a, b, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(90,86,76,.16)'; ctx.fill();
    ctx.beginPath(); ctx.arc(a, b, 9.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120,114,100,.34)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(a, b, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,38,34,.30)'; ctx.fill();
  };

  for (let col = 1; col <= 30; col++) {
    const x = (col - 1 - 14.5) * U;
    for (const row of BB.rows) drawHole(x, ROW_Z[row] + 0.0);
  }
  for (const side of ['top', 'bot']) {
    for (const sign of ['+', '-']) {
      for (let i = 0; i < 25; i++) drawHole((i - 12) * U, RAIL_Z[side][sign]);
    }
  }

  // 列号
  ctx.font = '600 26px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(90,86,78,.85)';
  for (let col = 1; col <= 30; col++) {
    const x = (col - 1 - 14.5) * U;
    const [a, t] = toPx(x, -2.66);
    ctx.fillText(String(col), a, t);
    const [a2, b2] = toPx(x, 2.66);
    ctx.fillText(String(col), a2, b2);
  }
  // 行字母
  ctx.font = '600 26px ui-monospace, monospace';
  for (const row of BB.rows) {
    const z = ROW_Z[row];
    const [l, y] = toPx(-3.94, z);
    ctx.fillText(row, l, y);
    const [r, y2] = toPx(3.94, z);
    ctx.fillText(row, r, y2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const topMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: .72, metalness: .02,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BB.w, BB.d), topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = BB.h + 0.002;
  top.receiveShadow = true;
  g.add(top);

  /* ── 真实孔洞（实例化） ── */
  const holeGeo = new THREE.CylinderGeometry(.062, .046, .05, 10, 1, true);
  const positions = [];
  for (let col = 1; col <= 30; col++) {
    const x = (col - 1 - 14.5) * U;
    for (const row of BB.rows) positions.push([x, ROW_Z[row]]);
  }
  for (const side of ['top', 'bot']) {
    for (const sign of ['+', '-']) {
      for (let i = 0; i < 25; i++) positions.push([(i - 12) * U, RAIL_Z[side][sign]]);
    }
  }
  const inst = new THREE.InstancedMesh(holeGeo, M.hole, positions.length);
  const m4 = new THREE.Matrix4();
  positions.forEach(([x, z], i) => {
    m4.makeTranslation(x, BB.h - .022, z);
    inst.setMatrixAt(i, m4);
  });
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);

  return g;
}

/* ═════════════ Arduino Uno ═════════════ */
export function buildArduino() {
  const g = new THREE.Group();
  g.position.set(BOARD.cx, 0, BOARD.cz);

  const T = BOARD.t;   // 0.16
  // PCB
  const pcb = box(BOARD.w, T, BOARD.d, M.pcb, 0, T / 2, 0);
  g.add(pcb);

  // 板边一圈浅色倒角
  const rim = box(BOARD.w - .02, .012, BOARD.d - .02, M.pcbDark, 0, T + .002, 0);
  g.add(rim);

  /* ── 丝印 ── */
  const W = 1372, H = 1068;
  const [c, ctx] = makeCanvas(W, H);

  const L = (ref) => ({
    x: PINS[ref].x - BOARD.cx,
    z: PINS[ref].z - BOARD.cz,
  });
  const P = (lx, lz) => px(lx, lz, BOARD.w, BOARD.d, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 外框
  ctx.strokeStyle = 'rgba(236,245,246,.30)';
  ctx.lineWidth = 1.6;
  const [x0, y0] = P(-3.3, -2.56);
  const [x1, y1] = P(3.3, 2.56);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

  // 引脚编号
  ctx.fillStyle = 'rgba(240,248,248,.82)';
  ctx.font = '600 27px ui-monospace, monospace';
  const farLabels = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
                     'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND', 'AREF', 'SDA', 'SCL'];
  for (const n of farLabels) {
    if (!PINS[n]) continue;
    const p = L(n);
    const [a, b] = P(p.x, p.z + .40);
    ctx.fillText(n.replace(/^D/, ''), a, b);
  }
  const nearLabels = ['IOREF', 'RESET', '3V3', '5V', 'GND2', 'GND3', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  for (const n of nearLabels) {
    if (!PINS[n]) continue;
    const p = L(n);
    const [a, b] = P(p.x, p.z - .40);
    ctx.fillText(n.replace(/^D/, '').replace(/GND\d/, 'GND'), a, b);
  }

  // 区块标题
  ctx.fillStyle = 'rgba(240,248,248,.62)';
  ctx.font = '600 21px ui-monospace, monospace';
  const blockTitle = (text, lx, lz) => {
    const [a, b] = P(lx, lz);
    ctx.fillText(text, a, b);
  };
  blockTitle('DIGITAL (PWM~)', 1.55, -2.44);
  blockTitle('POWER', -1.9, 2.44);
  blockTitle('ANALOG IN', 2.0, 2.44);

  // 丝印 LOGO（放在板中央空白处）
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  let [tx, ty] = P(-1.42, -0.18);
  ctx.fillText('ARDUINO', tx, ty);

  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.font = '800 104px Inter, system-ui, sans-serif';
  [tx, ty] = P(-1.48, 0.66);
  ctx.fillText('UNO', tx, ty);

  ctx.fillStyle = 'rgba(255,255,255,.40)';
  ctx.font = '500 15px ui-monospace, monospace';
  [tx, ty] = P(-1.44, 0.98);
  ctx.fillText('Made in Italy', tx, ty);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  ctx.font = '500 15px ui-monospace, monospace';
  [tx, ty] = P(1.15, 1.30);
  ctx.fillText('www.arduino.cc', tx, ty);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const silkMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: .65,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.d), silkMat);
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = T + .003;
  silk.receiveShadow = true;
  g.add(silk);

  /* ── 排针 ── */
  const header = (count, cx, cz) => {
    const hg = new THREE.Group();
    const w = count * U + .06;
    hg.add(box(w, .24, .24, M.plasticB, 0, T + .12, 0));
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * U;
      hg.add(box(.05, .30, .05, M.gold, x, T + .15, 0));
    }
    hg.position.set(cx, 0, cz);
    return hg;
  };
  g.add(header(8, -1.95, BOARD.farZ - BOARD.cz));
  g.add(header(10, 1.55, BOARD.farZ - BOARD.cz));
  g.add(header(7, -1.9, BOARD.nearZ - BOARD.cz));
  g.add(header(6, 2.0, BOARD.nearZ - BOARD.cz));

  /* ── USB-B ── */
  const usb = new THREE.Group();
  usb.add(box(1.28, .58, 1.14, M.silver, 0, T + .29, 0));
  usb.add(box(.86, .30, .5, M.black, .10, T + .30, 0));
  usb.position.set(-3.06, 0, -1.95);
  g.add(usb);

  /* ── 电源座 ── */
  const jack = new THREE.Group();
  const jc = cyl(.46, .46, .95, M.black, 20);
  jc.rotation.z = Math.PI / 2;
  jc.position.set(0, T + .30, 0);
  jc.castShadow = true;
  jack.add(jc);
  jack.add(box(.14, .10, .18, M.silver, -.48, T + .30, 0));
  jack.position.set(-3.16, 0, -1.05);
  g.add(jack);

  /* ── 主控芯片 ── */
  const chip = box(.86, .10, .86, M.black, -.55, T + .05, -1.55);
  g.add(chip);
  for (let i = 0; i < 7; i++) {
    const off = (i - 3) * .11;
    g.add(box(.05, .03, .10, M.silver, -.55 + off, T + .01, -1.14));
    g.add(box(.05, .03, .10, M.silver, -.55 + off, T + .01, -1.96));
  }
  // 1 脚标记
  const dot = cyl(.05, .05, .012, M.silver, 10);
  dot.position.set(-.88, T + .105, -1.24);
  g.add(dot);

  /* ── 晶振 ── */
  const xtal = new THREE.Group();
  xtal.add(box(.44, .12, .22, M.silver, 0, T + .06, 0));
  xtal.position.set(.55, 0, -2.35);
  g.add(xtal);

  /* ── 稳压器 ── */
  const reg = new THREE.Group();
  reg.add(box(.34, .30, .42, M.black, 0, T + .15, 0));
  reg.add(box(.16, .22, .44, M.silver, 0, T + .32, 0));
  reg.position.set(-2.52, 0, 0.92);
  g.add(reg);

  /* ── 电解电容 ── */
  const cap = (r, h, x, z, mat = M.black) => {
    const m = cyl(r, r, h, mat, 18);
    m.position.set(x, T + h / 2, z);
    m.castShadow = true;
    g.add(m);
    const top = cyl(r * .96, r * .96, .012, M.silver, 18);
    top.position.set(x, T + h + .004, z);
    g.add(top);
  };
  cap(.30, .58, -1.55, -1.05);
  cap(.26, .50, .05, -1.05);
  cap(.22, .42, 1.45, -1.20);

  /* ── 复位按键 ── */
  const rst = new THREE.Group();
  rst.add(box(.42, .16, .42, M.plasticB, 0, T + .08, 0));
  const rcap = cyl(.13, .13, .10, M.blue, 14);
  rcap.position.set(0, T + .20, 0);
  rst.add(rcap);
  rst.position.set(-1.05, 0, -1.0);
  g.add(rst);

  /* ── 板载 LED ── */
  const onLed = box(.10, .06, .06, new THREE.MeshStandardMaterial({
    color: 0x38ff9e, emissive: 0x25b46e, emissiveIntensity: 1.6, roughness: .3,
  }), -1.62, T + .03, -1.05);
  g.add(onLed);
  const pin13Led = box(.10, .06, .06, new THREE.MeshStandardMaterial({
    color: 0xffd166, emissive: 0x6a4a00, emissiveIntensity: 1, roughness: .3,
  }), 1.05, T + .03, -2.01);
  pin13Led.name = 'pin13led';
  g.add(pin13Led);

  // 安装孔
  for (const [x, z] of [[-2.95, -2.3], [2.95, -2.3], [-2.95, 2.3], [2.95, 2.3]]) {
    const h = cyl(.13, .13, T + .01, M.hole, 14);
    h.position.set(x, T / 2, z);
    g.add(h);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
