/* ═══════════════════════════════════════════════════════
   lessons.js — 11 节课程：接线 / 代码 / 仿真
   ═══════════════════════════════════════════════════════ */

const C = {
  red: 0xd8342c, black: 0x2a2f37, yellow: 0xe8b62b, green: 0x2fa85a,
  blue: 0x2f6fd0, orange: 0xe07a2a, purple: 0x8a5ac8, white: 0xd9dde2,
  teal: 0x2aa9d8,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const tri = (x) => { const m = x % 2; return m < 1 ? m : 2 - m; };

/* 行号定位：按代码片段里的特征串自动算出高亮行 */
function lineNo(code, needle, nth = 0) {
  const lines = code.split('\n');
  let c = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) {
      if (c === nth) return i + 1;
      c++;
    }
  }
  return 1;
}

/* ═════════════════ 课程数据 ═════════════════ */
export const LESSONS = [

/* ───────────── 01 ───────────── */
{
  id: 'blink',
  no: 1,
  title: '点亮第一颗 LED',
  sub: 'Blink · 数字输出',
  file: '01_blink.ino',
  brief: '一个引脚、一颗灯，Arduino 的「Hello World」。',
  params: [{ id: 'interval', label: '闪烁间隔', min: 150, max: 2000, step: 50, value: 800, unit: 'ms' }],
  parts: [
    { id: 'led1', kind: 'led', color: 'red', hole: 'b8' , step: 0 },
    { id: 'r1', kind: 'resistor', hole: 'd9', bands: [1, 1, 0] , step: 1 },
  ],
  partList: [
    { name: '红色 LED', qty: 1, color: '#ff3b30' },
    { name: '220Ω 电阻', qty: 1, color: '#d8b98c' },
    { name: '杜邦线', qty: 2, color: '#2aa9d8' },
  ],
  wires: [
    { from: 'D13', to: 'b8', color: C.teal },
    { from: 'GND', to: 'd12', color: C.black },
  ],
  steps: [
    { upTo: 0, text: '把红色 LED 插在 <b>b8</b> 和 <b>b9</b>：长脚（正极）在 b8，短脚（负极）在 b9。', note: '长脚 = 正极，短脚 = 负极，插反了灯不亮（但不会烧）。' },
    { upTo: 0, text: '220Ω 电阻横跨 <b>d9</b> → <b>d12</b>，用来限制电流。', note: '面包板同一竖列（a–e）是连通的，所以 b9 和 d9 已经是同一个点。' },
    { upTo: 1, text: '杜邦线连接 <b>D13</b> → <b>b8</b>：信号从引脚进来。', note: 'Uno 板上标着 13 的那个孔。' },
    { upTo: 2, text: '杜邦线连接 <b>GND</b> → <b>d12</b>：电流回到地。', note: 'GND 在电源排针那一侧，有两个孔，随便用一个。' },
  ],
  code: `// 01 · Blink —— 让 LED 闪起来
const int LED = 13;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  digitalWrite(LED, HIGH);   // 点亮
  delay(⟦interval⟧);
  digitalWrite(LED, LOW);    // 熄灭
  delay(⟦interval⟧);
}`,
  markers: { on: ['digitalWrite(LED, HIGH)'], off: ['digitalWrite(LED, LOW)'], dly: ['delay('] },
  sim(t, p) {
    const per = p.interval / 1000;
    const half = Math.floor(t / per) % 2;
    const frac = (t % per) / per;
    const on = half === 0;
    const L = this.lines;
    return {
      leds: { led1: on ? 1 : 0 },
      pin13: on ? 1 : 0,
      codeLine: frac < 0.32 ? (on ? L.on : L.off) : (on ? L.dly : L.dly),
    };
  },
},

/* ───────────── 02 ───────────── */
{
  id: 'traffic',
  no: 2,
  title: '红绿灯',
  sub: '三个 LED · 顺序控制',
  file: '02_traffic.ino',
  brief: '红、黄、绿三色轮转，学会一次管多个引脚。',
  params: [{ id: 'speed', label: '节奏倍速', min: 0.5, max: 2.5, step: 0.1, value: 1, unit: '×' }],
  parts: [
    { id: 'ledR', kind: 'led', color: 'red', hole: 'b4' , step: 0 },
    { id: 'ledY', kind: 'led', color: 'yellow', hole: 'b10' , step: 0 },
    { id: 'ledG', kind: 'led', color: 'green', hole: 'b16' , step: 0 },
    { id: 'rR', kind: 'resistor', hole: 'd5', bands: [1, 1, 0] , step: 1 },
    { id: 'rY', kind: 'resistor', hole: 'd11', bands: [1, 1, 0] , step: 1 },
    { id: 'rG', kind: 'resistor', hole: 'd17', bands: [1, 1, 0] , step: 1 },
  ],
  partList: [
    { name: '红色 LED', qty: 1, color: '#ff3b30' },
    { name: '黄色 LED', qty: 1, color: '#ffd21f' },
    { name: '绿色 LED', qty: 1, color: '#2fe07a' },
    { name: '220Ω 电阻', qty: 3, color: '#d8b98c' },
    { name: '杜邦线', qty: 7, color: '#2aa9d8' },
  ],
  wires: [
    { from: 'D8', to: 'b4', color: C.red },
    { from: 'D9', to: 'b10', color: C.yellow },
    { from: 'D10', to: 'b16', color: C.green },
    { from: 'GND', to: 'rail:top:-:12', color: C.black },
    { from: 'rail:top:-:5', to: 'd8', color: C.black },
    { from: 'rail:top:-:12', to: 'd14', color: C.black },
    { from: 'rail:top:-:19', to: 'd20', color: C.black },
  ],
  steps: [
    { upTo: 0, text: '三颗 LED 依次插好：<b>b4</b>、<b>b10</b>、<b>b16</b>（长脚在左）。', note: '三颗灯之间留 5 列空隙，后面走线才不会打架。' },
    { upTo: 0, text: '三只 220Ω 电阻：<b>d5→d8</b>、<b>d11→d14</b>、<b>d17→d20</b>。' },
    { upTo: 1, text: 'D8 → b4（红灯信号）。' },
    { upTo: 2, text: 'D9 → b10（黄灯信号）。' },
    { upTo: 3, text: 'D10 → b16（绿灯信号）。' },
    { upTo: 4, text: 'GND → 蓝色电源轨，把地线先接出来。', note: '一根线供三颗灯用，板子上会清爽很多。' },
    { upTo: 7, text: '再从电源轨引三根跳线到三个电阻末端。' },
  ],
  code: `// 02 · 红绿灯
const int RED = 8, YEL = 9, GRN = 10;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(YEL, OUTPUT);
  pinMode(GRN, OUTPUT);
}

void loop() {
  setLights(HIGH, LOW, LOW);    // 红灯 3 秒
  delay(3000 / ⟦speed⟧);
  setLights(LOW, LOW, HIGH);    // 绿灯 3 秒
  delay(3000 / ⟦speed⟧);
  setLights(LOW, HIGH, LOW);    // 黄灯 1 秒
  delay(1000 / ⟦speed⟧);
}

void setLights(int r, int y, int g) {
  digitalWrite(RED, r);
  digitalWrite(YEL, y);
  digitalWrite(GRN, g);
}`,
  markers: { red: ['setLights(HIGH, LOW, LOW)'], grn: ['setLights(LOW, LOW, HIGH)'], yel: ['setLights(LOW, HIGH, LOW)'] },
  sim(t, p) {
    const cycle = [3, 3, 1];
    const total = 7 / p.speed;
    const x = (t % total) * p.speed;
    const L = this.lines;
    let leds, line;
    if (x < cycle[0]) { leds = { ledR: 1, ledY: 0, ledG: 0 }; line = L.red; }
    else if (x < cycle[0] + cycle[1]) { leds = { ledR: 0, ledY: 0, ledG: 1 }; line = L.grn; }
    else { leds = { ledR: 0, ledY: 1, ledG: 0 }; line = L.yel; }
    return { leds, codeLine: line };
  },
},

/* ───────────── 03 ───────────── */
{
  id: 'button',
  no: 3,
  title: '按钮控制灯',
  sub: 'digitalRead · 输入与上拉',
  file: '03_button.ino',
  brief: '第一次让电路「听见」你的动作：按下就亮。',
  params: [],
  parts: [
    { id: 'btn1', kind: 'button', hole: 'c13' , step: 0 },
    { id: 'rPull', kind: 'resistor', hole: 'e16', bands: [0, 2, 2] , step: 3 },
    { id: 'led1', kind: 'led', color: 'green', hole: 'b22' , step: 4 },
    { id: 'r1', kind: 'resistor', hole: 'd23', bands: [1, 1, 0] , step: 4 },
  ],
  partList: [
    { name: '轻触按键', qty: 1, color: '#d8342c' },
    { name: '10kΩ 电阻', qty: 1, color: '#d8b98c' },
    { name: '绿色 LED', qty: 1, color: '#2fe07a' },
    { name: '220Ω 电阻', qty: 1, color: '#d8b98c' },
    { name: '杜邦线', qty: 5, color: '#2aa9d8' },
  ],
  wires: [
    { from: '5V', to: 'c13', color: C.red },
    { from: 'D2', to: 'c16', color: C.blue },
    { from: 'GND', to: 'e19', color: C.black },
    { from: 'D13', to: 'b22', color: C.teal },
    { from: 'GND', to: 'd26', color: C.black },
  ],
  steps: [
    { upTo: 0, text: '按键跨在 <b>c13</b> 与 <b>c16</b> 之间（四个脚分别落在 c13/c16/d13/d16）。', note: '按键对角的两个脚是常通的，中间隔着开关。' },
    { upTo: 1, text: '5V → c13：给按键一端供电。' },
    { upTo: 2, text: 'D2 → c16：把开关状态读进引脚 2。' },
    { upTo: 3, text: '10kΩ 电阻 <b>e16→e19</b>，再从 e19 接 GND。', note: '这叫下拉电阻：松开时把引脚稳稳拉到 0V，读数才不会乱跳。' },
    { upTo: 3, text: '照旧接一颗 LED：b22、电阻 d23→d26、D13 → b22。' },
    { upTo: 5, text: '最后补一根 GND → d26，LED 回路闭合。' },
  ],
  code: `// 03 · 按钮控制 LED
const int BTN = 2;
const int LED = 13;

void setup() {
  pinMode(BTN, INPUT);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int pressed = digitalRead(BTN);
  digitalWrite(LED, pressed);
  Serial.println(pressed ? "按下 → 灯亮" : "松开 → 灯灭");
  delay(200);
}`,
  markers: { read: ['digitalRead(BTN)'], write: ['digitalWrite(LED, pressed)'], print: ['Serial.println'] },
  sim(t, p) {
    const auto = (t % 6) > 2.4 && (t % 6) < 3.9;
    const pressed = auto || (this._manualUntil || 0) > t;
    const L = this.lines;
    const n = Math.floor(t / 0.5);
    const serial = [];
    for (let k = Math.max(0, n - 40); k <= n; k++) {
      const kt = k * 0.5;
      const a = (kt % 6) > 2.4 && (kt % 6) < 3.9;
      serial.push(a ? '1' : '0');
    }
    return {
      leds: { led1: pressed ? 1 : 0 },
      pin13: pressed ? 1 : 0,
      pressed: pressed ? 1 : 0,
      codeLine: pressed ? L.write : L.read,
      serial,
    };
  },
},

/* ───────────── 04 ───────────── */
{
  id: 'pot',
  no: 4,
  title: '电位器调光',
  sub: 'analogRead · PWM',
  file: '04_pot_dimmer.ino',
  brief: '旋钮转到哪，灯就亮到哪。第一次接触模拟量。',
  params: [{ id: 'pot', label: '旋钮位置', min: 0, max: 1023, step: 1, value: 480, unit: '' }],
  parts: [
    { id: 'pot1', kind: 'pot', hole: 'c20' , step: 0 },
    { id: 'led1', kind: 'led', color: 'orange', hole: 'b8' , step: 4 },
    { id: 'r1', kind: 'resistor', hole: 'd9', bands: [1, 1, 0] , step: 4 },
  ],
  partList: [
    { name: '10k 电位器', qty: 1, color: '#2e6fd0' },
    { name: '橙色 LED', qty: 1, color: '#ff8a1f' },
    { name: '220Ω 电阻', qty: 1, color: '#d8b98c' },
    { name: '杜邦线', qty: 5, color: '#2aa9d8' },
  ],
  wires: [
    { from: '5V', to: 'c20', color: C.red },
    { from: 'GND', to: 'c22', color: C.black },
    { from: 'A0', to: 'c21', color: C.yellow },
    { from: 'D9', to: 'b8', color: C.teal },
    { from: 'GND', to: 'd12', color: C.black },
  ],
  steps: [
    { upTo: 0, text: '电位器插在 <b>c20–c22</b>：三个脚分别接 5V、信号、GND。' },
    { upTo: 1, text: '5V → c20（一端）。' },
    { upTo: 2, text: 'GND → c22（另一端）。' },
    { upTo: 3, text: 'A0 → c21（中间的滑动端）。', note: '拧旋钮改变的是滑动端到两端的电阻比例，所以电压在 0–5V 之间变。' },
    { upTo: 4, text: 'D9 → b8 驱动 LED，电阻 d9→d12 到 GND。', note: 'D9 带 ~ 号，支持 PWM，能输出「一半亮」这种中间状态。' },
  ],
  code: `// 04 · 电位器调光
const int POT = A0;
const int LED = 9;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  int raw = analogRead(POT);                    // 0 ~ 1023
  int bright = map(raw, 0, 1023, 0, 255);       // 换成 PWM 值
  analogWrite(LED, bright);
  Serial.println(bright);
  delay(120);
}`,
  markers: { read: ['analogRead(POT)'], map: ['map(raw'], write: ['analogWrite(LED'] },
  sim(t, p) {
    const L = this.lines;
    const v = p.pot / 1023;
    const n = Math.floor(t / 0.12);
    const serial = [];
    for (let k = Math.max(0, n - 30); k <= n; k++) serial.push(String(Math.round(v * 255)));
    return { leds: { led1: v }, pot: p.pot, codeLine: L.write, serial };
  },
},

/* ───────────── 05 ───────────── */
{
  id: 'ldr',
  no: 5,
  title: '光敏夜灯',
  sub: '分压电路 · if 判断',
  file: '05_nightlight.ino',
  brief: '天黑了灯自己亮——第一个会「感知」世界的小装置。',
  params: [{ id: 'light', label: '环境光', min: 0, max: 1023, step: 1, value: 820, unit: '' }],
  parts: [
    { id: 'ldr1', kind: 'ldr', hole: 'b8' , step: 0 },
    { id: 'r1', kind: 'resistor', hole: 'd9', bands: [0, 2, 2] , step: 3 },
    { id: 'led1', kind: 'led', color: 'yellow', hole: 'b18' , step: 4 },
    { id: 'r2', kind: 'resistor', hole: 'd19', bands: [1, 1, 0] , step: 4 },
  ],
  partList: [
    { name: '光敏电阻 (LDR)', qty: 1, color: '#f6f2d8' },
    { name: '10kΩ 电阻', qty: 1, color: '#d8b98c' },
    { name: '黄色 LED', qty: 1, color: '#ffd21f' },
    { name: '220Ω 电阻', qty: 1, color: '#d8b98c' },
    { name: '杜邦线', qty: 5, color: '#2aa9d8' },
  ],
  wires: [
    { from: '5V', to: 'b8', color: C.red },
    { from: 'A0', to: 'b9', color: C.yellow },
    { from: 'GND', to: 'd12', color: C.black },
    { from: 'D9', to: 'b18', color: C.teal },
    { from: 'GND', to: 'd22', color: C.black },
  ],
  steps: [
    { upTo: 0, text: '光敏电阻插 <b>b8</b> / <b>b9</b>，一只脚朝 5V。' },
    { upTo: 1, text: '5V → b8：给 LDR 供电。' },
    { upTo: 2, text: 'A0 → b9：在 LDR 与电阻中间取一个「中点电压」。' },
    { upTo: 3, text: '10kΩ 电阻 <b>d9→d12</b>，再从 d12 接 GND，形成分压。', note: '光越强，LDR 阻值越小，中点电压越高——所以读数大 = 亮，读数小 = 暗。' },
    { upTo: 4, text: 'D9 → b18 接黄色 LED，电阻 d19→d22 到 GND。' },
  ],
  code: `// 05 · 光敏夜灯
const int LDR = A0;
const int LED = 9;
const int NIGHT = 400;          // 低于这个值就算天黑

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(LDR);
  if (light < NIGHT) {
    analogWrite(LED, 200);      // 天黑，亮灯
  } else {
    analogWrite(LED, 0);        // 天亮，关灯
  }
  delay(200);
}`,
  markers: { read: ['analogRead(LDR)'], if: ['if (light < NIGHT)'], on: ['analogWrite(LED, 200)'], off: ['analogWrite(LED, 0)'] },
  sim(t, p) {
    const L = this.lines;
    const dark = p.light < 400;
    const n = Math.floor(t / 0.2);
    const serial = [];
    for (let k = Math.max(0, n - 24); k <= n; k++) {
      serial.push(String(p.light + Math.round(Math.sin(k * 0.7) * 8)));
    }
    return {
      leds: { led1: dark ? 0.85 : 0 },
      codeLine: dark ? L.on : L.off,
      serial,
    };
  },
},

/* ───────────── 06 ───────────── */
{
  id: 'buzzer',
  no: 6,
  title: '蜂鸣器旋律',
  sub: 'tone() · 频率与节拍',
  file: '06_melody.ino',
  brief: '这一节课真的有声音——八个音符，一行数组。',
  params: [{ id: 'beat', label: '每拍时长', min: 150, max: 600, step: 10, value: 300, unit: 'ms' }],
  parts: [
    { id: 'buzz1', kind: 'buzzer', hole: 'c8' , step: 0 },
  ],
  partList: [
    { name: '有源蜂鸣器', qty: 1, color: '#14171c' },
    { name: '杜邦线', qty: 2, color: '#2aa9d8' },
  ],
  wires: [
    { from: 'D8', to: 'c8', color: C.teal },
    { from: 'GND', to: 'c10', color: C.black },
  ],
  steps: [
    { upTo: 0, text: '蜂鸣器长脚（+）插 <b>c8</b>，短脚插 <b>c10</b>。', note: '有源蜂鸣器只要通电就响；无源的才需要用 tone() 送频率——两种都能跑这节课。' },
    { upTo: 1, text: 'D8 → c8，信号进正极。' },
    { upTo: 2, text: 'GND → c10，回路闭合。' },
  ],
  code: `// 06 · 蜂鸣器旋律
const int BUZZER = 8;

int notes[] = { 262, 294, 330, 349, 392, 440, 494, 523 };
int beat = ⟦beat⟧;

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  for (int i = 0; i < 8; i++) {
    tone(BUZZER, notes[i], beat);
    delay(beat * 1.3);
  }
  delay(600);
}`,
  markers: { tone: ['tone(BUZZER'], delay: ['delay(beat'] },
  sim(t, p) {
    const L = this.lines;
    const win = (p.beat * 1.3) / 1000;
    const idx = Math.floor(t / win) % 9;
    const frac = (t % win) / win;
    const NOTES = [262, 294, 330, 349, 392, 440, 494, 523];
    if (idx >= 8) return { leds: {}, codeLine: L.delay, buzz: 0 };
    const sounding = frac < 0.8;
    return {
      leds: {},
      codeLine: sounding ? L.tone : L.delay,
      buzz: sounding ? NOTES[idx] : 0,
    };
  },
},

/* ───────────── 07 ───────────── */
{
  id: 'rgb',
  no: 7,
  title: 'RGB 混色灯',
  sub: '三路 PWM · 颜色叠加',
  file: '07_rgb.ino',
  brief: '三个通道调亮度，能凑出一千六百万种颜色。',
  params: [{ id: 'speed', label: '换色速度', min: 0.4, max: 2.5, step: 0.1, value: 1, unit: '×' }],
  parts: [
    { id: 'rgb1', kind: 'rgbLed', hole: 'c8' , step: 0 },
  ],
  partList: [
    { name: '共阴 RGB LED', qty: 1, color: '#f4f6f8' },
    { name: '杜邦线', qty: 4, color: '#2aa9d8' },
  ],
  wires: [
    { from: 'D9', to: 'c8', color: C.red },
    { from: 'GND', to: 'c9', color: C.black },
    { from: 'D10', to: 'c10', color: C.green },
    { from: 'D11', to: 'c11', color: C.blue },
  ],
  steps: [
    { upTo: 0, text: 'RGB LED 四个脚插 <b>c8–c11</b>：依次是 R、公共端、G、B。', note: '四根脚不等长，最长的那根是公共负极（GND）。' },
    { upTo: 1, text: 'D9 → c8（红通道）。' },
    { upTo: 2, text: 'GND → c9（公共负极）。' },
    { upTo: 3, text: 'D10 → c10（绿通道）。', note: '实战中每个通道都该串 220Ω 电阻，这里为了看清走线先省掉。' },
    { upTo: 4, text: 'D11 → c11（蓝通道）。' },
  ],
  code: `// 07 · RGB 混色灯
const int R = 9, G = 10, B = 11;

void setup() {
  pinMode(R, OUTPUT); pinMode(G, OUTPUT); pinMode(B, OUTPUT);
}

void loop() {
  setColor(255, 0, 0);     delay(600 / ⟦speed⟧);
  setColor(0, 255, 0);     delay(600 / ⟦speed⟧);
  setColor(0, 0, 255);     delay(600 / ⟦speed⟧);
  setColor(255, 255, 0);   delay(600 / ⟦speed⟧);
  setColor(255, 0, 255);   delay(600 / ⟦speed⟧);
  setColor(0, 255, 255);   delay(600 / ⟦speed⟧);
  setColor(255, 255, 255); delay(600 / ⟦speed⟧);
}

void setColor(int r, int g, int b) {
  analogWrite(R, r); analogWrite(G, g); analogWrite(B, b);
}`,
  markers: { c1: ['setColor(255, 0, 0)'], c2: ['setColor(0, 255, 0)'], c3: ['setColor(0, 0, 255)'], c4: ['setColor(255, 255, 0)'], c5: ['setColor(255, 0, 255)'], c6: ['setColor(0, 255, 255)'], c7: ['setColor(255, 255, 255)'] },
  sim(t, p) {
    const COLORS = [
      [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
      [255, 0, 255], [0, 255, 255], [255, 255, 255],
    ];
    const step = 0.85 / p.speed;
    const i = Math.floor(t / step) % 7;
    const [r, g, b] = COLORS[i];
    const hex = (r << 16) | (g << 8) | b;
    const L = this.lines;
    return {
      leds: { rgb1: 0.95 },
      rgbColor: hex,
      rgbId: 'rgb1',
      codeLine: [L.c1, L.c2, L.c3, L.c4, L.c5, L.c6, L.c7][i],
    };
  },
},

/* ───────────── 08 ───────────── */
{
  id: 'servo',
  no: 8,
  title: '舵机扫描',
  sub: 'Servo 库 · 0–180°',
  file: '08_sweep.ino',
  brief: '能精确控制角度的马达，机器人关节的起点。',
  params: [{ id: 'speed', label: '扫描速度', min: 0.4, max: 2.5, step: 0.1, value: 1, unit: '×' }],
  parts: [
    { id: 'servo1', kind: 'servo', at: [-6.05, 2.35] , step: 0 },
  ],
  partList: [
    { name: 'SG90 舵机', qty: 1, color: '#2e6fd0' },
    { name: '杜邦线', qty: 3, color: '#2aa9d8' },
  ],
  wires: [
    { from: 'D9', to: { part: 'servo1', i: 0 }, color: C.orange },
    { from: '5V', to: { part: 'servo1', i: 1 }, color: C.red },
    { from: 'GND', to: { part: 'servo1', i: 2 }, color: C.black },
  ],
  steps: [
    { upTo: 0, text: '舵机放在板子左侧，三根线：橙=信号、红=电源、棕=地。', note: '舵机吃电很凶，多个舵机要单独供电，别从 Uno 的 5V 抠。' },
    { upTo: 1, text: '橙色信号线 → D9。' },
    { upTo: 2, text: '红色电源线 → 5V。' },
    { upTo: 3, text: '棕色地线 → GND。' },
  ],
  code: `// 08 · 舵机扫描
#include <Servo.h>
Servo myservo;

void setup() {
  myservo.attach(9);          // 信号线接 9 号脚
}

void loop() {
  for (int a = 0; a <= 180; a += 2) {
    myservo.write(a);
    delay(15 / ⟦speed⟧);
  }
  for (int a = 180; a >= 0; a -= 2) {
    myservo.write(a);
    delay(15 / ⟦speed⟧);
  }
}`,
  markers: { fwd: ['for (int a = 0;'], back: ['for (int a = 180;'], write: ['myservo.write(a)'] },
  sim(t, p) {
    const L = this.lines;
    const period = 2.8 / p.speed;
    const k = tri((t / period) * 1.0);
    const angle = k * 180;
    return {
      leds: {},
      servo: angle,
      codeLine: k < 0.5 ? L.fwd : L.back,
    };
  },
},

/* ───────────── 09 ───────────── */
{
  id: 'sonar',
  no: 9,
  title: '超声波测距',
  sub: 'pulseIn · 声速换算',
  file: '09_sonar.ino',
  brief: '发出「嘀」一声，等回音——用声音测量距离。',
  params: [{ id: 'dist', label: '障碍物距离', min: 3, max: 200, step: 1, value: 42, unit: 'cm' }],
  parts: [
    { id: 'sr04', kind: 'hcsr04', hole: 'c8' , step: 0 },
  ],
  partList: [
    { name: 'HC-SR04 超声波', qty: 1, color: '#1f6fbf' },
    { name: '杜邦线', qty: 4, color: '#2aa9d8' },
  ],
  wires: [
    { from: '5V', to: 'c8', color: C.red },
    { from: 'D7', to: 'c9', color: C.teal },
    { from: 'D6', to: 'c10', color: C.purple },
    { from: 'GND', to: 'c11', color: C.black },
  ],
  steps: [
    { upTo: 0, text: 'HC-SR04 插在 <b>c8–c11</b>：VCC、Trig、Echo、GND。', note: '两个银色圆筒，一个是喇叭（发），一个是麦克风（收）。' },
    { upTo: 1, text: '5V → c8（VCC）。' },
    { upTo: 2, text: 'D7 → c9（Trig，负责「喊一声」）。' },
    { upTo: 3, text: 'D6 → c10（Echo，负责「听回音」）。' },
    { upTo: 4, text: 'GND → c11。' },
  ],
  code: `// 09 · 超声波测距
const int TRIG = 7, ECHO = 6;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long dur = pulseIn(ECHO, HIGH);     // 回波高电平时长(μs)
  long cm = dur / 58;                 // 声速换算
  Serial.print(cm); Serial.println(" cm");
  delay(500);
}`,
  markers: { pulse: ['pulseIn(ECHO'], calc: ['dur / 58'], print: ['Serial.print(cm)'] },
  sim(t, p) {
    const L = this.lines;
    const n = Math.floor(t / 0.5);
    const serial = [];
    for (let k = Math.max(0, n - 20); k <= n; k++) {
      const d = Math.round(p.dist + Math.sin(k * 1.3) * 1.2);
      serial.push(d + ' cm');
    }
    return { leds: {}, codeLine: L.print, serial };
  },
},

/* ───────────── 10 ───────────── */
{
  id: 'motor',
  no: 10,
  title: '电机调速',
  sub: '三极管 · PWM 驱动',
  file: '10_motor.ino',
  brief: '引脚只有几十毫安，怎么带得动几百毫安的电机？',
  params: [{ id: 'pot', label: '旋钮位置', min: 0, max: 1023, step: 1, value: 700, unit: '' }],
  parts: [
    { id: 'q1', kind: 'transistor', hole: 'c8' , step: 0 },
    { id: 'pot1', kind: 'pot', hole: 'c16' , step: 5 },
    { id: 'motor1', kind: 'motor', at: [5.55, 2.9] , step: 4 },
  ],
  partList: [
    { name: '直流小电机', qty: 1, color: '#c8ced4' },
    { name: 'NPN 三极管 2N3904', qty: 1, color: '#14171c' },
    { name: '10k 电位器', qty: 1, color: '#2e6fd0' },
    { name: '杜邦线', qty: 7, color: '#2aa9d8' },
  ],
  wires: [
    { from: 'GND', to: 'c8', color: C.black },
    { from: 'D9', to: 'c9', color: C.teal },
    { from: 'c10', to: { part: 'motor1', i: 1 }, color: C.white },
    { from: '5V', to: { part: 'motor1', i: 0 }, color: C.red },
    { from: '5V', to: 'c16', color: C.red },
    { from: 'GND', to: 'c18', color: C.black },
    { from: 'A0', to: 'c17', color: C.yellow },
  ],
  steps: [
    { upTo: 0, text: '三极管插 <b>c8–c10</b>：E、B、C 三只脚。', note: '引脚只有 20mA，电机要 200mA 以上，所以用三极管当「电闸」。' },
    { upTo: 1, text: 'GND → c8（发射极 E）。' },
    { upTo: 2, text: 'D9 → c9（基极 B），用 PWM 控制开合程度。' },
    { upTo: 3, text: 'c10（集电极 C）→ 电机负极。' },
    { upTo: 4, text: '5V → 电机正极。', note: '真实电路里电机两端还要反接一只续流二极管，吸收断电瞬间的反向电压。' },
    { upTo: 5, text: '电位器 c16–c18：5V / GND / A0，用来旋速度。' },
  ],
  code: `// 10 · 电机调速
const int POT = A0;
const int MOTOR = 9;

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  int raw = analogRead(POT);            // 0 ~ 1023
  int speed = map(raw, 0, 1023, 0, 255);
  analogWrite(MOTOR, speed);
  delay(50);
}`,
  markers: { read: ['analogRead(POT)'], map: ['map(raw'], write: ['analogWrite(MOTOR'] },
  sim(t, p) {
    const L = this.lines;
    const v = p.pot / 1023;
    return { leds: {}, pot: p.pot, motor: v, codeLine: L.write };
  },
},

/* ───────────── 11 ───────────── */
{
  id: 'parking',
  no: 11,
  title: '停车场距离提示器',
  sub: '结课项目 · 综合实战',
  file: '11_parking.ino',
  brief: '前面 10 课学的全用上：测距 + 三色灯 + 蜂鸣器。',
  params: [{ id: 'dist', label: '车辆距离', min: 3, max: 200, step: 1, value: 120, unit: 'cm' }],
  parts: [
    { id: 'sr04', kind: 'hcsr04', hole: 'c8' , step: 0 },
    { id: 'buzz1', kind: 'buzzer', hole: 'c13' , step: 0 },
    { id: 'ledG', kind: 'led', color: 'green', hole: 'b16' , step: 1 },
    { id: 'ledY', kind: 'led', color: 'yellow', hole: 'b20' , step: 1 },
    { id: 'ledR', kind: 'led', color: 'red', hole: 'b24' , step: 1 },
    { id: 'rG', kind: 'resistor', hole: 'd17', bands: [1, 1, 0] , step: 1 },
    { id: 'rY', kind: 'resistor', hole: 'd21', bands: [1, 1, 0] , step: 1 },
    { id: 'rR', kind: 'resistor', hole: 'd25', bands: [1, 1, 0] , step: 1 },
  ],
  partList: [
    { name: 'HC-SR04 超声波', qty: 1, color: '#1f6fbf' },
    { name: '有源蜂鸣器', qty: 1, color: '#14171c' },
    { name: '红/黄/绿 LED', qty: 3, color: '#ff3b30' },
    { name: '220Ω 电阻', qty: 3, color: '#d8b98c' },
    { name: '杜邦线', qty: 11, color: '#2aa9d8' },
  ],
  wires: [
    { from: '5V', to: 'c8', color: C.red },
    { from: 'D7', to: 'c9', color: C.teal },
    { from: 'D6', to: 'c10', color: C.purple },
    { from: 'GND', to: 'rail:top:-:2', color: C.black },
    { from: 'rail:top:-:6', to: 'c11', color: C.black },
    { from: 'rail:top:-:10', to: 'd20', color: C.black },
    { from: 'rail:top:-:14', to: 'd24', color: C.black },
    { from: 'rail:top:-:18', to: 'd28', color: C.black },
    { from: 'rail:top:-:22', to: 'c15', color: C.black },
    { from: 'D4', to: 'b16', color: C.green },
    { from: 'D5', to: 'b20', color: C.yellow },
    { from: 'D3', to: 'b24', color: C.red },
  ],
  steps: [
    { upTo: 0, text: '超声波插 <b>c8–c11</b>，蜂鸣器插 <b>c13 / c15</b>。' },
    { upTo: 0, text: '红、黄、绿三颗 LED 插 <b>b16 / b20 / b24</b>，电阻 d17→d20、d21→d24、d25→d28。' },
    { upTo: 4, text: '5V → c8，D7 → c9，D6 → c10。' },
    { upTo: 5, text: 'GND → 蓝色电源轨，再把地线分给超声波。' },
    { upTo: 9, text: '从电源轨分出四根地线：三个 LED 电阻 + 蜂鸣器。', note: '全都汇到一条地轨，这是真实项目里最常见的做法。' },
    { upTo: 12, text: 'D4/D5/D3 → 绿/黄/红灯，三个信号脚。' },
  ],
  code: `// 11 · 停车场距离提示器
const int TRIG = 7, ECHO = 6;
const int GRN = 4, YEL = 5, RED = 3, BUZ = 8;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(GRN, OUTPUT);
  pinMode(YEL, OUTPUT);
  pinMode(RED, OUTPUT);
  pinMode(BUZ, OUTPUT);
  Serial.begin(9600);
}

long measure() {
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58;
}

void loop() {
  long cm = measure();

  if (cm > 100) {                       // 远：绿灯
    setLights(HIGH, LOW, LOW); noTone(BUZ);
  } else if (cm > 50) {                 // 中：黄灯 + 慢响
    setLights(LOW, HIGH, LOW);
    if (millis() % 800 < 200) tone(BUZ, 1200);
    else noTone(BUZ);
  } else {                              // 近：红灯 + 急响
    setLights(LOW, LOW, HIGH);
    tone(BUZ, 2000);
  }
  Serial.print(cm); Serial.println(" cm");
  delay(80);
}`,
  markers: { far: ['if (cm > 100)'], mid: ['else if (cm > 50)'], near: ['} else {'] },
  sim(t, p) {
    const L = this.lines;
    const d = p.dist;
    const n = Math.floor(t / 0.5);
    const serial = [];
    for (let k = Math.max(0, n - 18); k <= n; k++) {
      serial.push(Math.round(d + Math.sin(k * 0.9) * 1.5) + ' cm');
    }
    if (d > 100) {
      return { leds: { ledG: 1, ledY: 0, ledR: 0 }, codeLine: L.far, serial, buzz: 0 };
    }
    if (d > 50) {
      const on = (t % 0.8) < 0.2;
      return { leds: { ledG: 0, ledY: 1, ledR: 0 }, codeLine: L.mid, serial, buzz: on ? 1200 : 0 };
    }
    const on = (t % 0.24) < 0.14;
    return { leds: { ledG: 0, ledY: 0, ledR: 1 }, codeLine: L.near, serial, buzz: on ? 2000 : 0 };
  },
},

];

/* ── 预计算高亮行号 ── */
for (const l of LESSONS) {
  l.lines = {};
  for (const k in l.markers || {}) {
    const [needle, nth] = l.markers[k];
    l.lines[k] = lineNo(l.code, needle, nth || 0);
  }
}
