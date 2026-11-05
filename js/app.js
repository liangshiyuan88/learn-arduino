/* ═══════════════════════════════════════════════════════
   app.js — 界面控制、代码面板、串口、音频
   ═══════════════════════════════════════════════════════ */
import { LESSONS } from './lessons.js';
import { Lab } from './lab.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ───────── 状态 ───────── */
const state = {
  index: 0,
  running: false,
  t: 0,
  step: 0,
  params: {},
  serial: [],
  done: new Set(JSON.parse(localStorage.getItem('la-done') || '[]')),
  buzz: 0,
  lastLine: 0,
};

const cur = () => LESSONS[state.index];

/* ───────── 三维工作台 ───────── */
const lab = new Lab($('#scene'));
if (typeof window !== 'undefined') window.__lab = lab;

/* ───────── 音频 ───────── */
const audio = {
  ctx: null, osc: null, gain: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    this.osc.type = 'square';
    this.gain.gain.value = 0;
    this.osc.connect(this.gain).connect(this.ctx.destination);
    this.osc.start();
  },
  set(freq) {
    if (!this.ctx) { if (freq) this.init(); else return; }
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    if (freq > 0) {
      this.osc.frequency.setTargetAtTime(freq, now, 0.008);
      this.gain.gain.setTargetAtTime(0.045, now, 0.012);
    } else {
      this.gain.gain.setTargetAtTime(0, now, 0.02);
    }
  },
  mute() { if (this.gain) this.gain.gain.value = 0; },
};

/* ───────── 代码高亮 ───────── */
const RE = /(\/\/.*$)|(^\s*#\w+.*$)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b(?:void|int|long|const|if|else|for|while|return|true|false|HIGH|LOW|OUTPUT|INPUT|byte|float|char|unsigned)\b)|([A-Za-z_]\w*(?=\s*\())/g;

function hl(line) {
  const out = [];
  let last = 0, m;
  RE.lastIndex = 0;
  while ((m = RE.exec(line))) {
    if (m.index > last) out.push(esc(line.slice(last, m.index)));
    let cls = 'tk-kw';
    if (m[1]) cls = 'tk-cmt';
    else if (m[2]) cls = 'tk-pre';
    else if (m[3]) cls = 'tk-str';
    else if (m[4]) cls = 'tk-num';
    else if (m[5]) cls = 'tk-kw';
    else if (m[6]) cls = 'tk-fn';
    out.push(`<span class="${cls}">${esc(m[0])}</span>`);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(esc(line.slice(last)));
  return out.join('') || '&nbsp;';
}

/* ───────── 侧栏课程列表 ───────── */
function buildList() {
  const ol = $('#lessonList');
  ol.innerHTML = LESSONS.map((l, i) => `
    <li class="lesson-item${i === 0 ? ' active' : ''}${state.done.has(l.id) ? ' done' : ''}" data-i="${i}">
      <span class="num">${String(l.no).padStart(2, '0')}</span>
      <span class="lbody">
        <span class="ltitle">${l.title}</span>
        <span class="lsub">${l.sub}</span>
      </span>
    </li>`).join('');

  ol.addEventListener('click', (e) => {
    const li = e.target.closest('.lesson-item');
    if (!li) return;
    load(parseInt(li.dataset.i, 10));
    closeSidebar();
  });
}

function updateProgress() {
  const n = state.done.size;
  $('#progressBar').style.width = (n / LESSONS.length * 100) + '%';
  $('#progressText').textContent = `${n} / ${LESSONS.length} 已完成`;
  $('#lessonCount').textContent = `${LESSONS.length} 节`;
}

/* ───────── 装载课程 ───────── */
function load(i) {
  stop();
  state.index = i;
  state.step = 0;
  state.serial = [];
  const l = cur();

  state.params = {};
  (l.params || []).forEach((p) => { state.params[p.id] = p.value; });

  $$('.lesson-item').forEach((el) => el.classList.toggle('active', +el.dataset.i === i));

  $('#stageBadge').textContent = `第 ${l.no} 课`;
  $('#stageTitle').textContent = l.title;
  $('#stageSub').textContent = l.brief;
  $('#codeFile').textContent = l.file;

  // 3D
  lab.loadLesson(l);
  lab.setWireCount(0);
  lab.setView('iso');

  // 步骤
  renderSteps();
  renderParts();
  renderCode();
  renderParams();
  renderSerial(true);
  setStep(0);

  // 完成状态
  const btn = $('#btnDone');
  btn.classList.toggle('done', state.done.has(l.id));
  btn.textContent = state.done.has(l.id) ? '✓ 已完成' : '✓ 完成本课';

  $('#runLabel').textContent = '运行代码';
  $('#clock').textContent = '00:00';
  $('#serialPing').classList.remove('on');
  $('#stageTitle').animate?.(
    [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, easing: 'ease-out' }
  );
}

function renderSteps() {
  const l = cur();
  $('#stepList').innerHTML = l.steps.map((s, i) => `
    <li class="step" data-i="${i}">
      <span class="idx">${i + 1}</span>
      <span class="stxt">${s.text}${s.note ? `<i>${s.note}</i>` : ''}</span>
    </li>`).join('');
}

function renderParts() {
  $('#partList').innerHTML = (cur().partList || []).map((p) => `
    <li><span class="swatch" style="background:${p.color}"></span>${p.name}<span class="qty">×${p.qty}</span></li>
  `).join('');
}

function renderParams() {
  const l = cur();
  const box = $('#paramBox');
  if (!l.params || !l.params.length) { box.innerHTML = ''; return; }
  box.innerHTML = l.params.map((p) => `
    <div class="param">
      <label>${p.label}<b id="pv-${p.id}">${p.value}${p.unit}</b></label>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" data-id="${p.id}">
    </div>`).join('');

  box.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('input', () => {
      const id = inp.dataset.id;
      const v = parseFloat(inp.value);
      state.params[id] = v;
      const def = l.params.find((p) => p.id === id);
      $(`#pv-${id}`).textContent = v + def.unit;
      renderCode();
      state.serial = [];
      renderSerial(true);
    });
  });
}

function renderCode() {
  const l = cur();
  const box = $('#codeBox');
  box.innerHTML = l.code.split('\n').map((line, i) => {
    const filled = line.replace(/⟦(\w+)⟧/g, (m, id) => (state.params[id] ?? m));
    return `<div class="cl" data-i="${i + 1}"><span class="ln">${i + 1}</span><code>${hl(filled)}</code></div>`;
  }).join('');
  state.lastLine = 0;
}

function setActiveLine(n) {
  if (!n || n === state.lastLine) return;
  const box = $('#codeBox');
  box.querySelector('.cl.active')?.classList.remove('active');
  const el = box.querySelector(`.cl[data-i="${n}"]`);
  if (el) {
    el.classList.add('active');
    const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight;
    if (top > 0 || el.offsetTop < box.scrollTop) box.scrollTop = Math.max(0, top);
  }
  state.lastLine = n;
}

/* ───────── 串口 ───────── */
function renderSerial(reset) {
  const box = $('#serialLines');
  if (reset) {
    box.innerHTML = '';
    return;
  }
  if (!state.serial.length) return;
  const frag = document.createDocumentFragment();
  state.serial.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'sline';
    d.textContent = s;
    frag.appendChild(d);
  });
  box.innerHTML = '';
  box.appendChild(frag);
  box.scrollTop = box.scrollHeight;
}

/* ───────── 步骤 ───────── */
function setStep(i) {
  const l = cur();
  state.step = Math.max(0, Math.min(l.steps.length - 1, i));
  const s = l.steps[state.step];
  lab.setStep(state.step);
  lab.setWireCount(s.upTo);

  $$('#stepList .step').forEach((el, k) => {
    el.classList.toggle('current', k === state.step);
    el.classList.toggle('done', k < state.step);
  });
  const current = $(`#stepList .step[data-i="${state.step}"]`);
  current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  $('#stepHint .stepbadge').textContent = `${state.step + 1} / ${l.steps.length}`;
  $('#stepHint .steptext').innerHTML = s.text;

  const btn = $('#btnNextStep');
  const last = state.step === l.steps.length - 1;
  btn.textContent = last ? '运行代码 ▶' : '下一步 →';
  btn.disabled = false;
  btn.dataset.last = last ? '1' : '0';
}

$('#stepList').addEventListener('click', (e) => {
  const li = e.target.closest('.step');
  if (li) setStep(+li.dataset.i);
});

$('#btnNextStep').addEventListener('click', () => {
  const l = cur();
  if (state.step >= l.steps.length - 1) {
    switchTab('code');
    run();
    return;
  }
  setStep(state.step + 1);
});

$('#btnWireAll').addEventListener('click', () => {
  const l = cur();
  setStep(l.steps.length - 1);
});

/* ───────── 标签页 ───────── */
function switchTab(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + name));
  if (name === 'serial') $('#serialPing').classList.remove('on');
}
$$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

/* ───────── 运行 / 停止 ───────── */
function run() {
  audio.init();
  state.running = true;
  state.t = 0;
  state.serial = [];
  renderSerial(true);
  $('#btnRun').classList.add('running');
  $('#runLabel').textContent = '暂停';
  $('#runIcon').setAttribute('d', 'M7 5h4v14H7zM13 5h4v14h-4z');
  switchTab('code');
}

function stop() {
  state.running = false;
  audio.mute();
  state.buzz = 0;
  $('#btnRun')?.classList.remove('running');
  if ($('#runLabel')) $('#runLabel').textContent = '运行代码';
  $('#runIcon')?.setAttribute('d', 'M8 5l11 7-11 7z');
}

$('#btnRun').addEventListener('click', () => {
  if (state.running) {
    state.running = false;
    audio.mute();
    $('#btnRun').classList.remove('running');
    $('#runLabel').textContent = '继续运行';
    $('#runIcon').setAttribute('d', 'M8 5l11 7-11 7z');
  } else {
    if (state.t === 0) run();
    else {
      state.running = true;
      audio.init();
      $('#btnRun').classList.add('running');
      $('#runLabel').textContent = '暂停';
      $('#runIcon').setAttribute('d', 'M7 5h4v14H7zM13 5h4v14h-4z');
    }
  }
});

$('#btnStop').addEventListener('click', () => {
  state.running = false;
  state.t = 0;
  audio.mute();
  state.buzz = 0;
  $('#btnRun').classList.remove('running');
  $('#runLabel').textContent = '运行代码';
  $('#runIcon').setAttribute('d', 'M8 5l11 7-11 7z');
  $('#clock').textContent = '00:00';
  lab.applyState({ leds: {} }, 0);
  state.serial = [];
  renderSerial(true);
  setActiveLine(0);
});

/* ───────── 主循环 ───────── */
let prev = performance.now();
let serialCount = 0;
let clockTick = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;

  const l = cur();
  if (state.running && l.sim) {
    state.t += dt;
    const s = l.sim.call(l, state.t, state.params) || {};

    lab.applyState(s, dt);
    setActiveLine(s.codeLine);

    // 串口
    if (s.serial && s.serial.length !== state.serial.length) {
      state.serial = s.serial;
      renderSerial(false);
      $('#serialPing').classList.add('on');
    }

    // 声音
    const b = s.buzz || 0;
    if (b !== state.buzz) {
      state.buzz = b;
      audio.set(b);
    }

    // 计时
    clockTick += dt;
    if (clockTick > 0.2) {
      clockTick = 0;
      const m = Math.floor(state.t / 60), sec = Math.floor(state.t % 60);
      $('#clock').textContent = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
  }

  lab.render(dt);
  requestAnimationFrame(loop);
}

/* ───────── 其它交互 ───────── */
$('#btnViewReset').addEventListener('click', () => {
  lab.setView('iso');
  setActiveTool('iso');
});
$('#btnViewTop').addEventListener('click', () => {
  lab.setView('top');
  setActiveTool('top');
});

function setActiveTool(name) {
  $$('.stage-tools .tool[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
$$('.stage-tools .tool[data-view]').forEach((b) => {
  b.addEventListener('click', () => {
    lab.setView(b.dataset.view);
    setActiveTool(b.dataset.view);
  });
});

$('#btnDone').addEventListener('click', () => {
  const id = cur().id;
  if (state.done.has(id)) state.done.delete(id);
  else state.done.add(id);
  localStorage.setItem('la-done', JSON.stringify([...state.done]));
  const btn = $('#btnDone');
  btn.classList.toggle('done', state.done.has(id));
  btn.textContent = state.done.has(id) ? '✓ 已完成' : '✓ 完成本课';
  $(`.lesson-item[data-i="${state.index}"]`)?.classList.toggle('done', state.done.has(id));
  updateProgress();
});

$('#btnCopy').addEventListener('click', async (e) => {
  const text = cur().code.replace(/⟦(\w+)⟧/g, (m, id) => state.params[id]);
  try {
    await navigator.clipboard.writeText(text);
    e.target.textContent = '已复制';
    e.target.classList.add('ok');
    setTimeout(() => { e.target.textContent = '复制'; e.target.classList.remove('ok'); }, 1400);
  } catch { /* 剪贴板不可用时忽略 */ }
});

$('#btnClearSerial').addEventListener('click', () => {
  state.serial = [];
  renderSerial(true);
});

/* 点击 3D 按键 */
lab.onPartClick = (id) => {
  if (cur().id === 'button' && id === 'btn1') {
    cur()._manualUntil = state.t + 0.7;
    if (!state.running) run();
  }
};

/* 侧栏抽屉 */
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('on');
}
$('#btnSidebar').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  $('#scrim').classList.toggle('on');
});
$('#scrim').addEventListener('click', closeSidebar);

/* 键盘 */
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); $('#btnRun').click(); }
  if (e.key === 'r' || e.key === 'R') { lab.setView('iso'); setActiveTool('iso'); }
  if (e.key === 't' || e.key === 'T') { lab.setView('top'); setActiveTool('top'); }
  if (e.key === 'ArrowRight') { $('#btnNextStep').click(); }
  if (e.key === 'ArrowLeft') setStep(state.step - 1);
});

/* 尺寸 */
const ro = new ResizeObserver(() => lab.resize());
ro.observe($('#stage'));
addEventListener('orientationchange', () => setTimeout(() => lab.resize(), 200));

/* ───────── 启动 ───────── */
buildList();
updateProgress();
load(0);
requestAnimationFrame(loop);
setTimeout(() => $('#loading').classList.add('hide'), 420);

// 调试接口（便于自动化检查，也可在控制台里玩）
window.__app = { load, setStep, run, stop, state, lab, LESSONS };
