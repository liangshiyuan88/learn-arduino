/* ═══════════════════════════════════════════════════════
   parts.js — 面包板元件模型（程序化生成）
   局部坐标原点 = 第 0 号引脚所在的板面孔，y=0 为板面
   引脚沿 +X 依次排列，间距 U
   ═══════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { U } from './geo.js';

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
};
const cyl = (r, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);

const MAT = {
  leg:    new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: .3, metalness: .85 }),
  body:   new THREE.MeshStandardMaterial({ color: 0xd8b98c, roughness: .62 }),
  black:  new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: .55 }),
  blue:   new THREE.MeshStandardMaterial({ color: 0x2e6fd0, roughness: .55 }),
  blueLt: new THREE.MeshStandardMaterial({ color: 0x4a8bff, roughness: .5 }),
  white:  new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: .7 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xc8ced4, roughness: .3, metalness: .9 }),
};

const BAND = ['#6b3f1f', '#c9302c', '#1f1f1f', '#e0b73a', '#2f7fd0', '#3aa35b'];

/* 引脚：从 y=-.05 到 h */
function leg(parent, x, z = 0, h = .26, mat = MAT.leg) {
  const m = cyl(.028, h + .05, mat, 8);
  m.position.set(x, (h - .05) / 2, z);
  parent.add(m);
  return m;
}

/* ─────── LED ─────── */
function led(spec) {
  const g = new THREE.Group();
  const color = { red: 0xff3b30, green: 0x2fe07a, yellow: 0xffd21f, blue: 0x3b7bff, orange: 0xff8a1f }[spec.color || 'red'];
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0, roughness: .22, metalness: .05,
    transparent: true, opacity: .92,
  });
  leg(g, 0, 0, .22);
  leg(g, U, 0, .18);

  const x = U / 2;
  const body = cyl(.235, .30, mat, 22);
  body.position.set(x, .33, 0); body.castShadow = true;
  body.scale.set(1, 1, .93);
  g.add(body);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(.235, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  dome.position.set(x, .48, 0);
  dome.scale.set(1, .92, .93);
  g.add(dome);

  // 底部法兰
  const flange = cyl(.25, .05, mat, 22);
  flange.position.set(x, .19, 0);
  g.add(flange);

  const light = new THREE.PointLight(color, 0, 2.4, 2);
  light.position.set(x, .55, 0);
  g.add(light);

  g.userData.led = { mat, light, base: color };
  return g;
}

/* ─────── RGB LED ─────── */
function rgbLed() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8, emissive: 0xffffff, emissiveIntensity: 0, roughness: .2,
    transparent: true, opacity: .95,
  });
  [0, U, 2 * U, 3 * U].forEach((x, i) => leg(g, x, 0, i === 1 ? .18 : .22));

  const x = 1.5 * U;
  const body = cyl(.25, .30, mat, 22);
  body.position.set(x, .33, 0);
  body.scale.set(1, 1, .94);
  g.add(body);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(.25, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  dome.position.set(x, .48, 0);
  dome.scale.set(1, .9, .94);
  g.add(dome);

  const light = new THREE.PointLight(0xffffff, 0, 2.6, 2);
  light.position.set(x, .6, 0);
  g.add(light);
  g.userData.led = { mat, light, base: 0xffffff };
  return g;
}

/* ─────── 电阻 ─────── */
function resistor(spec) {
  const g = new THREE.Group();
  const span = 3 * U;
  const y = .23;

  // 两根引脚
  [[0, .12], [span, -.12]].forEach(([x]) => {
    const l = cyl(.026, .30, MAT.leg, 8);
    l.rotation.z = Math.PI / 2;
    l.position.set(x === 0 ? .06 : span - .06, y, 0);
    g.add(l);
    leg(g, x, 0, y);
  });

  const body = box(.54, .21, .21, MAT.body, span / 2, y, 0);
  g.add(body);

  const bands = spec.bands || [1, 2, 3, 4];
  bands.forEach((bi, i) => {
    const b = box(.045, .218, .218, new THREE.MeshStandardMaterial({
      color: BAND[bi], roughness: .6,
    }), span / 2 - .18 + i * .105, y, 0);
    g.add(b);
  });
  return g;
}

/* ─────── 按键 ─────── */
function button() {
  const g = new THREE.Group();
  const legsXZ = [[0, 0], [3 * U, 0], [0, U], [3 * U, U]];
  legsXZ.forEach(([x, z]) => leg(g, x, z, .2));

  const base = box(.80, .13, .54, MAT.black, 1.5 * U, .245, U / 2);
  g.add(base);
  const tab = box(.86, .04, .16, MAT.silver, 1.5 * U, .20, U / 2);
  g.add(tab);

  const cap = cyl(.155, .11, new THREE.MeshStandardMaterial({ color: 0xd8342c, roughness: .45 }), 18);
  cap.position.set(1.5 * U, .37, U / 2);
  cap.name = 'cap';
  g.add(cap);

  const presser = box(.34, .10, .34, MAT.plasticB || MAT.black, 1.5 * U, .30, U / 2);
  g.add(presser);
  presser.visible = false;
  g.userData.presser = presser;

  g.userData.press = { cap, baseY: .37 };
  return g;
}

/* ─────── 蜂鸣器 ─────── */
function buzzer() {
  const g = new THREE.Group();
  leg(g, 0, 0, .18);
  leg(g, 2 * U, 0, .18);
  const x = U;
  const body = cyl(.55, .42, MAT.black, 26);
  body.position.set(x, .31, 0);
  body.castShadow = true;
  g.add(body);
  const top = cyl(.40, .02, new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: .6 }), 26);
  top.position.set(x, .53, 0);
  g.add(top);
  const hole = cyl(.07, .025, new THREE.MeshStandardMaterial({ color: 0x050607 }), 12);
  hole.position.set(x, .535, 0);
  g.add(hole);
  return g;
}

/* ─────── 电位器 ─────── */
function pot() {
  const g = new THREE.Group();
  [0, U, 2 * U].forEach((x, i) => leg(g, x, 0, i === 1 ? .16 : .2));
  const x = U;
  const body = box(.94, .34, .94, MAT.blue, x, .27, 0);
  g.add(body);
  const rim = box(1.00, .05, 1.00, new THREE.MeshStandardMaterial({ color: 0x1f56a8, roughness: .6 }), x, .45, 0);
  g.add(rim);
  const knob = cyl(.30, .16, new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: .5 }), 22);
  knob.position.set(x, .54, 0);
  g.add(knob);
  const mark = box(.20, .02, .045, MAT.white, x, .625, 0);
  mark.position.x = x - .10;
  g.add(mark);
  g.userData.knob = knob;
  return g;
}

/* ─────── 光敏电阻 ─────── */
function ldr() {
  const g = new THREE.Group();
  leg(g, 0, 0, .2);
  leg(g, U, 0, .2);
  const x = U / 2;
  const disc = cyl(.27, .075, new THREE.MeshStandardMaterial({ color: 0xf6f2d8, roughness: .55 }), 24);
  disc.position.set(x, .27, 0);
  g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.20, .022, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xb06a20, roughness: .5 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, .31, 0);
  g.add(ring);
  return g;
}

/* ─────── 超声波 HC-SR04 ─────── */
function hcsr04() {
  const g = new THREE.Group();
  [0, U, 2 * U, 3 * U].forEach((x) => leg(g, x, 0, .3));

  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1f6fbf, roughness: .6 });
  const pcb = box(4.4, .14, 1.9, pcbMat, 1.5 * U, .38, -.98);
  g.add(pcb);

  [[-1.45, 'T'], [1.30, 'R']].forEach(([dx]) => {
    const t = cyl(.42, .44, MAT.silver, 26);
    t.position.set(1.5 * U + dx, .58, -.98);
    t.castShadow = true;
    g.add(t);
    const face = cyl(.34, .02, new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: .8 }), 26);
    face.position.set(1.5 * U + dx, .805, -.98);
    g.add(face);
  });

  const xtal = box(.34, .10, .22, MAT.silver, 1.5 * U, .50, -1.62);
  g.add(xtal);
  const chip = box(.30, .08, .22, MAT.black, 1.5 * U, .49, -1.06);
  g.add(chip);
  return g;
}

/* ─────── 舵机（桌面上） ─────── */
function servo() {
  const g = new THREE.Group();
  const body = box(2.30, 1.16, 1.62, MAT.blue, 0, .60, 0);
  g.add(body);
  const tabL = box(.62, .20, 1.62, MAT.blue, -1.42, .32, 0);
  const tabR = box(.62, .20, 1.62, MAT.blue, 1.42, .32, 0);
  g.add(tabL, tabR);
  const topBox = box(1.05, .62, 1.30, MAT.blueLt, -.32, 1.48, 0);
  g.add(topBox);

  const shaft = cyl(.13, .34, MAT.white, 14);
  shaft.position.set(-.32, 1.95, 0);
  g.add(shaft);

  const horn = new THREE.Group();
  horn.position.set(-.32, 2.12, 0);
  const arm = box(1.75, .075, .26, MAT.white, .35, 0, 0);
  horn.add(arm);
  const hub = cyl(.22, .09, MAT.white, 16);
  horn.add(hub);
  g.add(horn);

  // 三根线的接头
  const conn = box(.62, .34, .18, new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: .6 }), -.85, .55, .82);
  g.add(conn);
  const wires = [0xffb020, 0xd8342c, 0x8a5a2b];
  wires.forEach((c, i) => {
    const w = box(.05, .05, .5, new THREE.MeshStandardMaterial({ color: c, roughness: .7 }), -.98 + i * .13, .55, 1.12);
    g.add(w);
  });

  g.userData.horn = horn;
  g.userData.attach = [
    new THREE.Vector3(-1.02, .62, 1.34),
    new THREE.Vector3(-.89, .62, 1.34),
    new THREE.Vector3(-.76, .62, 1.34),
  ];
  return g;
}

/* ─────── 直流电机（桌面上） ─────── */
function motor() {
  const g = new THREE.Group();
  const body = cyl(.62, 1.85, MAT.silver, 26);
  body.position.y = 1.02;
  body.castShadow = true;
  g.add(body);
  const capTop = cyl(.64, .10, MAT.black, 26);
  capTop.position.y = 1.96;
  g.add(capTop);
  const shaft = cyl(.085, .55, MAT.leg, 12);
  shaft.position.y = 2.26;
  g.add(shaft);

  const prop = new THREE.Group();
  prop.position.y = 2.44;
  for (let i = 0; i < 3; i++) {
    const blade = box(1.42, .035, .20, new THREE.MeshStandardMaterial({ color: 0xe94b3c, roughness: .5 }), .62, 0, 0);
    blade.rotation.y = (i * Math.PI * 2) / 3;
    const holder = new THREE.Group();
    holder.rotation.y = (i * Math.PI * 2) / 3;
    holder.add(box(.72, .035, .20, new THREE.MeshStandardMaterial({ color: 0xe94b3c, roughness: .5 }), .36, 0, 0));
    prop.add(holder);
  }
  g.add(prop);

  // 接线柱
  [[-.28, 0xd8342c], [.28, 0x22262c]].forEach(([dx, c]) => {
    const t = box(.10, .16, .10, new THREE.MeshStandardMaterial({ color: c, roughness: .6 }), dx, 1.62, .56);
    g.add(t);
  });

  g.userData.prop = prop;
  g.userData.attach = [
    new THREE.Vector3(-.28, 1.66, .70),
    new THREE.Vector3(.28, 1.66, .70),
  ];
  return g;
}

/* ─────── NPN 三极管 ─────── */
function transistor() {
  const g = new THREE.Group();
  [0, U, 2 * U].forEach((x, i) => leg(g, x, 0, i === 1 ? .16 : .2));
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(.26, .26, .46, 20, 1, false, 0, Math.PI),
    MAT.black);
  body.rotation.y = Math.PI / 2;
  body.rotation.z = -Math.PI / 2;
  body.position.set(U, .42, 0);
  body.castShadow = true;
  g.add(body);
  const back = box(.48, .44, .04, MAT.black, U, .42, -.01);
  g.add(back);
  return g;
}

export const PARTS = {
  led, rgbLed, resistor, button, buzzer, pot, ldr, hcsr04, servo, motor, transistor,
};

/** 依据课程定义创建一个元件实例 */
export function buildPart(spec) {
  const fn = PARTS[spec.kind];
  if (!fn) throw new Error('unknown part kind: ' + spec.kind);
  const g = fn(spec);
  if (spec.id) g.name = spec.id;
  g.userData.partId = spec.id;
  g.userData.kind = spec.kind;
  g.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.partId = spec.id; }
  });
  return g;
}
