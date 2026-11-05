/* ═══════════════════════════════════════════════════════
   lab.js — 3D 工作台：场景 / 相机 / 导线 / 动画
   ═══════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { buildDesk, buildBreadboard, buildArduino } from './boards.js';
import { buildPart } from './parts.js';
import { resolve, isPin, BOARD } from './geo.js';

const ANGLE = {
  iso:   { theta: 0.58, phi: 0.86 },
  top:   { theta: 0.02, phi: 0.14 },
  close: { theta: 0.40, phi: 0.72 },
};
const CLOSE_VIEW = { radius: 11.5, target: new THREE.Vector3(0.2, 0.5, 0.6) };

export class Lab {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090b0f);
    this.scene.fog = new THREE.Fog(0x090b0f, 26, 52);

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);

    this._lights();
    this.scene.add(buildDesk());

    this.hardware = new THREE.Group();
    this.hardware.add(buildBreadboard());
    this.hardware.add(buildArduino());
    this.scene.add(this.hardware);

    this.lessonGroup = new THREE.Group();
    this.scene.add(this.lessonGroup);

    this.wires = [];
    this.actors = {};
    this.actorStep = {};
    this.actorScale = {};
    this.stepIndex = 0;
    this.pickables = [];
    this.onPartClick = null;

    this._initCamera();
    this._initInput();
    this.resize();
  }

  /* ───── 灯光 ───── */
  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xdfefff, 0x141a24, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(5.5, 11, 6.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    const s = 11;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    key.shadow.bias = -0.0012;
    key.shadow.radius = 3;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x9fc4ff, 0.85);
    fill.position.set(-7, 5, -5);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xff6a4d, 14, 22, 2);
    rim.position.set(-6, 4.5, -7);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0x7fe3ff, 6, 18, 2);
    warm.position.set(7, 3, 6);
    this.scene.add(warm);
  }

  /* ───── 相机 ───── */
  _initCamera() {
    this.goal = { theta: ANGLE.iso.theta, phi: ANGLE.iso.phi, radius: 26 };
    this.cur = { ...this.goal };
    this.target = new THREE.Vector3(0, 0, -0.7);
    this.goalTarget = this.target.clone();
    this._applyCamera();
  }

  /** 量一下当前课程内容的包围盒，用来适配取景 */
  _measure() {
    const box = new THREE.Box3().setFromObject(this.hardware);
    if (this.lessonGroup.children.length) box.expandByObject(this.lessonGroup);
    this.fitBox = box;
  }

  /** 按包围盒自动取景：先算距离，再用投影把内容居中 */
  _fit(name) {
    const a = ANGLE[name] || ANGLE.iso;
    if (!this.fitBox) {
      this.goal = { theta: a.theta, phi: a.phi, radius: 26 };
      this.goalTarget.set(0, 0, -0.7);
      return;
    }
    if (name === 'close') {
      this.goal = { theta: a.theta, phi: a.phi, radius: CLOSE_VIEW.radius };
      this.goalTarget.copy(CLOSE_VIEW.target);
      return;
    }

    const box = this.fitBox;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const corners = [];
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z])
          corners.push(new THREE.Vector3(x, y, z));

    // 粗算距离
    const hx = Math.abs(size.x * Math.cos(a.theta)) + Math.abs(size.z * Math.sin(a.theta));
    const vz = (Math.abs(size.x * Math.sin(a.theta)) + Math.abs(size.z * Math.cos(a.theta))) * Math.cos(a.phi) + size.y;
    const tanF = Math.tan((this.camera.fov * Math.PI) / 360);

    const savedCur = { ...this.cur };
    const savedTarget = this.target.clone();

    let radius = Math.max(hx / 2 / (tanF * this.camera.aspect), vz / 2 / tanF) * 1.15;
    let target = c.clone();

    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const q = new THREE.Vector3();

    for (let pass = 0; pass < 3; pass++) {
      this.cur = { theta: a.theta, phi: a.phi, radius };
      this.target.copy(target);
      this._applyCamera();
      this.camera.updateMatrixWorld(true);

      let minx = 9, maxx = -9, miny = 9, maxy = -9;
      for (const p of corners) {
        q.copy(p).project(this.camera);
        if (q.x < minx) minx = q.x; if (q.x > maxx) maxx = q.x;
        if (q.y < miny) miny = q.y; if (q.y > maxy) maxy = q.y;
      }
      const cx = (minx + maxx) / 2;
      const cy = (miny + maxy) / 2;
      const ex = (maxx - minx) / 2;
      const ey = (maxy - miny) / 2;

      // 超出留白就拉远
      const k = Math.max(ex / 0.84, ey / 0.80, 1);
      radius *= k;

      // 平移让内容居中（略偏上，给底部提示条留位置）
      const sc = radius * tanF;
      right.setFromMatrixColumn(this.camera.matrix, 0);
      up.setFromMatrixColumn(this.camera.matrix, 1);
      target.addScaledVector(right, cx * sc * this.camera.aspect);
      target.addScaledVector(up, cy * sc - 0.06 * sc);
    }

    this.cur = savedCur;
    this.target.copy(savedTarget);
    this._applyCamera();

    this.goal = { theta: a.theta, phi: a.phi, radius };
    this.goalTarget.copy(target);
  }

  _applyCamera() {
    const { theta, phi, radius } = this.cur;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    this.camera.position.set(
      this.target.x + radius * sp * Math.sin(theta),
      this.target.y + radius * cp,
      this.target.z + radius * sp * Math.cos(theta)
    );
    this.camera.lookAt(this.target);
  }

  setView(name) { this._fit(name); }

  /* ───── 输入 ───── */
  _initInput() {
    const el = this.canvas;
    let dragging = false, mode = 0, lx = 0, ly = 0, moved = 0;
    let touches = [];

    const down = (e) => {
      el.setPointerCapture?.(e.pointerId);
      dragging = true; moved = 0;
      mode = (e.button === 2 || e.button === 1 || e.shiftKey) ? 1 : 0;
      lx = e.clientX; ly = e.clientY;
    };

    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);

      if (mode === 0) {
        this.goal.theta -= dx * 0.0072;
        this.goal.phi = Math.min(1.50, Math.max(0.10, this.goal.phi - dy * 0.006));
      } else {
        const k = this.cur.radius * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        this.goalTarget.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      }
    };

    const up = (e) => {
      dragging = false;
      if (moved < 5) this._pick(e);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { dragging = false; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.goal.radius = Math.min(28, Math.max(6.5,
        this.goal.radius * Math.exp(e.deltaY * 0.0011)));
    }, { passive: false });

    // 触摸
    el.addEventListener('touchstart', (e) => {
      touches = [...e.touches];
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && touches.length === 2) {
        const d0 = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
        const d1 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (d0 > 0) this.goal.radius = Math.min(28, Math.max(6.5, this.goal.radius * (d0 / d1)));
        touches = [...e.touches];
        e.preventDefault();
      }
    }, { passive: false });
  }

  _pick(e) {
    if (!this.onPartClick) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.pickables, true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData.partId) o = o.parent;
      if (o) this.onPartClick(o.userData.partId);
    }
  }

  /* ───── 课程装载 ───── */
  loadLesson(lesson) {
    // 清空
    [...this.lessonGroup.children].forEach((c) => {
      this.lessonGroup.remove(c);
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    });
    this.wires = [];
    this.actors = {};
    this.actorStep = {};
    this.actorScale = {};
    this.stepIndex = 0;
    this.pickables = [];

    // 元件
    for (const spec of lesson.parts || []) {
      const g = buildPart(spec);
      if (spec.hole) {
        const a = resolve(spec.hole);
        g.position.set(a.x, a.y, a.z);
        if (spec.rot) g.rotation.y = spec.rot;
      } else if (spec.at) {
        g.position.set(spec.at[0], 0, spec.at[1]);
        if (spec.rot) g.rotation.y = spec.rot;
      }
      this.lessonGroup.add(g);
      this.actors[spec.id] = g;
      this.actorStep[spec.id] = spec.step || 0;
      this.actorScale[spec.id] = 0;
      this.pickables.push(g);
    }

    // 导线
    for (const w of lesson.wires || []) {
      const mesh = this._makeWire(w.from, w.to, w.color);
      this.lessonGroup.add(mesh);
      this.wires.push({ mesh, shown: 0, goal: 0 });
    }

    this._measure();
    for (const id in this.actors) {
      this.actors[id].scale.setScalar(0.001);
      this.actors[id].visible = false;
      this.actorScale[id] = 0;
    }
    this._refreshPin13();
  }

  _refreshPin13() {
    this.pin13 = null;
    this.hardware.traverse((o) => {
      if (o.name === 'pin13led') this.pin13 = o;
    });
  }

  /** 端点解析：'D13' | 'b8' | 'rail:top:-:5' | {part:'servo1', i:0} */
  _pt(ref) {
    if (typeof ref === 'object' && ref.part) {
      const actor = this.actors[ref.part];
      const local = actor?.userData.attach?.[ref.i];
      if (actor && local) {
        actor.updateWorldMatrix(true, false);
        return actor.localToWorld(local.clone());
      }
      return new THREE.Vector3(0, 0.5, 0);
    }
    const p = resolve(ref).clone();
    if (isPin(ref)) p.y += 0.02;
    return p;
  }

  _makeWire(from, to, color = 0x2aa9d8) {
    const p0 = this._pt(from);
    const p1 = this._pt(to);

    const dist = p0.distanceTo(p1);
    const lift = Math.max(0.42, Math.min(1.5, dist * 0.24));

    const a = p0.clone(); a.y += 0.26;
    const b = p1.clone(); b.y += 0.26;
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    mid.y = Math.max(p0.y, p1.y) + lift;
    // 让走线自然一点：中点稍微向板中央靠
    mid.x += (mid.x > 0 ? -0.18 : 0.18);

    const curve = new THREE.CatmullRomCurve3([p0, a, mid, b, p1], false, 'catmullrom', 0.42);
    const geo = new THREE.TubeGeometry(curve, 56, 0.042, 7, false);

    const mat = new THREE.MeshStandardMaterial({
      color, roughness: .42, metalness: .12,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.totalIdx = geo.index.count;
    geo.setDrawRange(0, 0);
    mesh.visible = false;
    return mesh;
  }

  /** 当前接线步骤：元件按 step 逐个出现 */
  setStep(i) { this.stepIndex = i; }

  /** 显示前 n 根导线 */
  setWireCount(n) {
    this.wires.forEach((w, i) => { w.goal = i < n ? 1 : 0; });
  }

  allWiresOn() { this.setWireCount(this.wires.length); }

  /* ───── 动画驱动 ───── */
  applyState(s, dt) {
    const leds = s.leds || {};
    for (const id in this.actors) {
      const g = this.actors[id];
      const v = leds[id] || 0;
      if (g.userData.led) {
        const { mat, light, base } = g.userData.led;
        const c = new THREE.Color(s.rgbColor && id === s.rgbId ? s.rgbColor : base);
        mat.color.copy(c).lerp(new THREE.Color(0xffffff), v * 0.55);
        mat.emissive.copy(c);
        mat.emissiveIntensity = v * 3.4;
        light.color.copy(c);
        light.intensity = v * 2.2;
      }
      if (g.userData.horn && s.servo !== undefined) {
        g.userData.horn.rotation.y = THREE.MathUtils.degToRad(90 - s.servo);
      }
      if (g.userData.prop && s.motor !== undefined) {
        g.userData.prop.rotation.y += s.motor * dt * 26;
      }
      if (g.userData.knob && s.pot !== undefined) {
        g.userData.knob.rotation.y = (s.pot / 1023 - 0.5) * 4.2;
      }
      if (g.userData.press && s.pressed !== undefined) {
        const cap = g.userData.press.cap;
        cap.position.y = g.userData.press.baseY + (s.pressed ? -0.055 : 0);
      }
    }
    // 板载 LED 13
    if (this.pin13) {
      const v = s.pin13 || 0;
      this.pin13.material.emissiveIntensity = 0.2 + v * 5;
    }
  }

  /* ───── 每帧 ───── */
  render(dt) {
    // 相机阻尼
    const k = 1 - Math.pow(0.001, dt * 1.1);
    this.cur.theta += (this.goal.theta - this.cur.theta) * k;
    this.cur.phi += (this.goal.phi - this.cur.phi) * k;
    this.cur.radius += (this.goal.radius - this.cur.radius) * k;
    this.target.lerp(this.goalTarget, k);
    this._applyCamera();

    // 元件登场
    const ks = 1 - Math.pow(0.0005, dt);
    for (const id in this.actors) {
      const want = this.actorStep[id] <= this.stepIndex ? 1 : 0;
      const c = this.actorScale[id];
      const nx = Math.abs(c - want) < 0.01 ? want : c + (want - c) * ks;
      this.actorScale[id] = nx;
      const g = this.actors[id];
      const s = 0.001 + nx * 0.999;
      g.scale.setScalar(s);
      g.visible = nx > 0.02;
    }

    // 导线生长
    for (const w of this.wires) {
      if (Math.abs(w.shown - w.goal) < 0.004) {
        w.shown = w.goal;
      } else {
        w.shown += (w.goal - w.shown) * Math.min(1, dt * 7);
      }
      const total = w.mesh.userData.totalIdx;
      const n = Math.floor(total * w.shown);
      w.mesh.geometry.setDrawRange(0, n);
      w.mesh.visible = n > 0;
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
