/* ═══════════════════════════════════════════════════════
   geo.js — 统一坐标系统
   1 世界单位 = 1 cm
   面包板孔距 2.54mm = 0.254 单位
   ═══════════════════════════════════════════════════════ */
import * as THREE from 'three';

export const U = 0.254;              // 一个孔距

/* ── 面包板 ── */
export const BB = {
  w: 8.3, d: 5.5, h: 0.5,
  cx: 0, cz: 1.9,                    // 世界坐标中心
  cols: 30,
  rows: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
  top: 0.5,                          // 上表面 y
};

export const ROW_Z = {
  a: -1.55, b: -1.296, c: -1.042, d: -0.788, e: -0.534,
  f: 0.534, g: 0.788, h: 1.042, i: 1.296, j: 1.55,
};

export const RAIL_Z = {
  top: { '+': -2.38, '-': -2.13 },
  bot: { '+': 2.38, '-': 2.13 },
};

/* ── Arduino Uno ── */
export const BOARD = {
  w: 6.86, d: 5.34, t: 0.16,
  cx: 0, cz: -3.45,
  top: 0.16,
};
BOARD.farZ  = BOARD.cz - BOARD.d / 2 + 0.52;   // 远端排针
BOARD.nearZ = BOARD.cz + BOARD.d / 2 - 0.52;   // 近端排针

/** 面包板孔 → 世界坐标。id 形如 'b8'（行 b，列 8） */
export function hole(id) {
  const row = id[0];
  const col = parseInt(id.slice(1), 10);
  if (!(row in ROW_Z)) throw new Error('bad row: ' + id);
  return new THREE.Vector3(
    (col - 1 - (BB.cols - 1) / 2) * U + BB.cx,
    BB.top,
    ROW_Z[row] + BB.cz
  );
}

/** 电源轨孔 → 世界坐标。side: 'top'|'bot'，sign: '+'|'-'，i: 0..24 */
export function rail(side, sign, i) {
  return new THREE.Vector3(
    (i - 12) * U + BB.cx,
    BB.top,
    RAIL_Z[side][sign] + BB.cz
  );
}

/* ── 排针 ── */
const PIN_Y = 0.46;
export const PINS = {};
function pin(name, x, z) { PINS[name] = new THREE.Vector3(x, PIN_Y, z); }

(function buildPins() {
  const fz = BOARD.farZ, nz = BOARD.nearZ;

  // 远端：D0–D7（8 针）
  const low = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
  low.forEach((n, i) => pin(n, -1.95 + (i - 3.5) * U, fz));

  // 远端：D8–D13 + GND + AREF + SDA + SCL（10 针）
  const high = ['D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND', 'AREF', 'SDA', 'SCL'];
  high.forEach((n, i) => pin(n, 1.55 + (i - 4.5) * U, fz));

  // 近端：电源 7 针
  const pw = ['IOREF', 'RESET', '3V3', '5V', 'GND2', 'GND3', 'VIN'];
  pw.forEach((n, i) => pin(n, -1.9 + (i - 3) * U, nz));

  // 近端：模拟 A0–A5（6 针）
  for (let i = 0; i < 6; i++) pin('A' + i, 2.0 + (i - 2.5) * U, nz);
})();

/** 解析端点字符串：'D13' | 'b8' | 'rail:top:-:12' | 'rail:bot:+:3' */
export function resolve(ref) {
  if (ref.startsWith('rail:')) {
    const [, side, sign, i] = ref.split(':');
    return rail(side, sign, parseInt(i, 10));
  }
  if (/^[a-j]\d+$/.test(ref)) return hole(ref);
  if (PINS[ref]) return PINS[ref].clone();
  throw new Error('unknown endpoint: ' + ref);
}

export const isPin = (ref) => /^[A-Z]/.test(ref) && !ref.startsWith('rail:');
