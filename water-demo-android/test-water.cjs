const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('public/water-demo.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
let frame, paintCount = 0;
const events = {}, nodes = {};
const ctx = new Proxy({}, {
  get: (_, name) => (...args) => {
    if (name === 'clearRect') paintCount++;
    assert(args.every(x => typeof x !== 'number' || Number.isFinite(x)));
  },
  set: () => true,
});
for (const s of ['#entryDisk', 'main', '#water', '#count', '#caption', '#status', '#motion', '#reset', '#tilt']) {
  nodes[s] = { handlers: {}, style: {}, textContent: '', classList: {add(){},remove(){}}, getContext: () => ctx,
    getBoundingClientRect: () => ({left: 10, top: 20, width: 195, height: 422}),
    addEventListener(n, f) { this.handlers[n] = f; }, setAttribute() {} };
}
const env = {
  document: { hidden: false, querySelector: s => nodes[s], querySelectorAll:()=>[], addEventListener() {} },
  matchMedia: () => ({ matches: false }), innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
  requestAnimationFrame: f => frame = f, addEventListener: (n, f) => events[n] = f,
  removeEventListener: n => delete events[n], setTimeout: () => 1, clearTimeout() {},
  WaterSensors: { isAvailable: () => true, setEnabled(value) { this.enabled = value; } },
};
env.window = env;
vm.runInNewContext(source.replace('  requestAnimationFrame(frame);\n})();',
  '  requestAnimationFrame(frame);\n globalThis.spawn=addDrop; globalThis.probe=()=>({tilt,normal:waterNormal,polygon:clippedPool(waterOffset),area:width*(height-base),radii:[1,100,1000,1000000].map(dropRadius),entry:{...entry},cover:coverRadius(),wave:Array.from(displacement),speeds:Array.from(velocity),drops:drops.map(d=>({...d})),count});\n})();'), env);
function spawn(event) {
  if (!event || event.detail === 0) env.spawn();
  else env.spawn((event.clientX - 10) * 2, (event.clientY - 20) * 2);
}
(async () => {
  assert(env.WaterSensors.enabled === true, 'Gravity must start automatically');
  let now = 0, maxCurvature = 0, maxAmplitude = 0, residualAtTwoSeconds = 0;
  events.watergravity({ detail: { x: .35, y: .9 } });
  for (let i = 0; i < 180; i++) {
    frame(now += 1000 / 60);
    const a = env.probe().wave;
    if (i === 1) {
      const speeds = env.probe().speeds.map(Math.abs);
      const peak = Math.max(...speeds);
      assert(peak > 0, 'Tilting should launch a ripple promptly');
      const activeNodes = speeds.filter(v => v > peak * .2).length;
      assert(activeNodes < speeds.length * .35, 'Tilt impulse must be narrow, not span the pool');
    }
    maxAmplitude = Math.max(maxAmplitude, ...a.map(Math.abs));
    const start = Math.ceil(a.length * .4), end = a.length - 1;
    for (let j = start; j <= end; j++) {
      const line = a[start] + (a[end] - a[start]) * (j - start) / (end - start);
      maxCurvature = Math.max(maxCurvature, Math.abs(a[j] - line));
    }
    if (i === 120) residualAtTwoSeconds = Math.max(...a.map(Math.abs));
  }
  for (let i = 0; i < 720; i++) {
    events.watergravity({ detail: { x: .55 * Math.sin(i / 30), y: .8 } });
    frame(now += 1000 / 60);
    maxAmplitude = Math.max(maxAmplitude, ...env.probe().wave.map(Math.abs));
  }
  console.log({ maxCurvature, residualAtTwoSeconds, maxAmplitude });
  assert(maxCurvature > 2, 'Gentle curved waves expected');
  assert(residualAtTwoSeconds > 1, 'Residual waves should remain after tilt');
  assert(maxAmplitude < 22, 'Repeated tilts should stay light rather than build large swells');
  events.watergravity({ detail: { x: 0, y: 1 } });
  for (let i = 0; i < 1800; i++) frame(now += 1000 / 60);
  assert(Math.max(...env.probe().wave.map(Math.abs)) < .1, 'Water must settle');
  spawn();
  for (let i = 0; i < 120; i++) frame(now += 1000 / 60);
  assert(env.probe().count === 1);
  nodes['#reset'].handlers.click();
  assert(env.probe().wave.every(v => v === 0));
  spawn({detail: 1, clientX: 70, clientY: 70});
  let bead = env.probe().drops[0];
  assert(bead.x === 120 && bead.y === 100, 'Drop must start at transformed touch coordinates');
  events.watergravity({detail: {x: .6, y: .8}});
  for (let i = 0; i < 18; i++) frame(now += 1000 / 60);
  bead = env.probe().drops[0];
  assert(bead.x > 120 && bead.y > 100 && bead.vx > 0, 'Tilt must accelerate drop right and down');
  const rightSpeed = bead.vx;
  events.watergravity({detail: {x: -.8, y: .6}});
  for (let i = 0; i < 12; i++) frame(now += 1000 / 60);
  bead = env.probe().drops[0];
  assert(bead.vx < rightSpeed, 'Direction changes must affect a drop already in flight');
  for (let i = 0; i < 240; i++) frame(now += 1000 / 60);
  assert(env.probe().count === 1 && env.probe().drops.length === 0, 'Tilted drop must land exactly once');
  nodes['#reset'].handlers.click();
  events.watergravity({detail: {x: 0, y: 1}});
  for (let i = 0; i < 120; i++) frame(now += 1000 / 60);
  spawn({detail: 1, clientX: 100, clientY: 441});
  assert(env.probe().count === 1 && env.probe().drops.length === 0, 'Tap inside water must produce an immediate ripple');
  spawn({detail: 0});
  assert(env.probe().drops[0].x === 195, 'Keyboard activation must retain a centered drop');
  for (const direction of [-1, 1]) {
    nodes['#reset'].handlers.click();
    events.watergravity({detail: {x: direction * .9, y: .3}});
    for (let i = 0; i < 90; i++) frame(now += 1000 / 60);
    spawn({detail: 1, clientX: direction < 0 ? 20 : 195, clientY: 70});
    assert(env.probe().drops.length === 1);
    for (let i = 0; i < 24; i++) frame(now += 1000 / 60);
    let film = env.probe().drops[0];
    assert(film && film.wall === direction && env.probe().count === 0,
      'Dry wall contact must create visible film without increasing pool volume');
    const firstFront = film.wallFront;
    for (let i = 0; i < 12; i++) frame(now += 1000 / 60);
    film = env.probe().drops[0];
    assert(film && film.wallFront > firstFront && film.wallFront > film.wallTail,
      'Film must visibly lengthen and flow down the wall');
    for (let i = 0; i < 300; i++) frame(now += 1000 / 60);
    assert(env.probe().count === 1 && env.probe().drops.length === 0,
      'Wall film must join the pool exactly once and finish draining');
  }
  nodes['#reset'].handlers.click();
  events.watergravity({detail:{x:0,y:1}});
  const tap = nodes['#water'].handlers.click;
  tap({detail:1,clientX:70,clientY:70});
  assert(env.probe().entry.state === 'expanding' && env.probe().drops.length === 0);
  assert(env.probe().entry.x === 120 && env.probe().entry.y === 100);
  tap({detail:1,clientX:150,clientY:150});
  for(let i=0;i<50;i++) frame(now+=1000/60);
  assert(env.probe().entry.state === 'black' && env.probe().count === 0);
  assert(env.probe().cover > Math.hypot(390-120,844-100), 'Black circle must cover farthest corner');
  for(let i=0;i<60;i++) frame(now+=1000/60);
  assert(env.probe().entry.state === 'black', 'Black screen waits for second tap');
  tap({detail:1,clientX:180,clientY:250});
  assert(env.probe().entry.state === 'shrinking');
  tap({detail:1,clientX:180,clientY:250});
  for(let i=0;i<35;i++) frame(now+=1000/60);
  assert(env.probe().entry.state === 'water' && env.probe().drops.length === 1);
  assert(Math.abs(env.probe().drops[0].x-120)<1, 'Collapse returns to original touch');
  assert(env.probe().drops[0].age >= .12, 'No size reset at circle-to-drop handoff');
  for(let i=0;i<180;i++) frame(now+=1000/60);
  assert(env.probe().count === 1 && env.probe().drops.length === 0);
  console.log('PASS: expand, full black hold, shrink, touch origin, single seamless drop');
  nodes['#reset'].handlers.click();
  let compositorAnimation;
  nodes['#entryDisk'].animate = (keyframes, options) => {
    assert(keyframes.every(k => Object.keys(k).length === 1 && k.transform));
    assert(options.duration === 200 || Math.abs(options.duration - 560) < 1);
    compositorAnimation = { cancel() {}, currentTime: 0 };
    return compositorAnimation;
  };
  tap({detail:1,clientX:70,clientY:70});
  const paintsBefore = paintCount;
  const tiltBeforeExpand=env.probe().tilt;
  events.watergravity({detail:{x:.6,y:.8}});
  for(let i=0;i<30;i++) frame(now+=1000/60);
  assert(paintCount > paintsBefore, 'Water must redraw during expansion');
  assert(Math.abs(env.probe().tilt-tiltBeforeExpand)>.1,'Gravity must continue during expansion');
  compositorAnimation.onfinish();
  assert(env.probe().entry.state === 'black');
  tap({detail:0});
  const running = compositorAnimation;
  tap({detail:0});
  assert(compositorAnimation === running, 'Repeated taps must not restart animation');
  const paintsBeforeShrink=paintCount,tiltBeforeShrink=env.probe().tilt;
  events.watergravity({detail:{x:-.6,y:.8}});
  for(let i=0;i<15;i++) frame(now+=1000/60);
  assert(paintCount>paintsBeforeShrink && Math.abs(env.probe().tilt-tiltBeforeShrink)>.1,'Water and gravity must continue during shrinking');
  compositorAnimation.onfinish();
  assert(env.probe().entry.state === 'water' && env.probe().drops.length === 1);
  assert(nodes['#entryDisk'].hidden);
  console.log('PASS: transform layer, live water/gravity during expansion and shrinking, repeated taps, drop handoff');
  console.log('PASS: dry side contact forms visible draining film before joining pool');
  console.log('PASS: touch coordinates, gravity trajectory, mid-flight reversal, wall/landing, submerged tap, keyboard');
  console.log('PASS: tilt waves, residual motion, repeated rocking, settling, drop and reset');
  events.watergravity({detail:{x:.9,y:.2}});
  for(let i=0;i<180;i++)frame(now+=1000/60);
  assert(Math.abs(env.probe().tilt)>1.3, 'Water must tilt beyond 45 degrees');
  events.watergravity({detail:{x:.99,y:.01}});
  for(let i=0;i<180;i++)frame(now+=1000/60);
  assert(Math.abs(env.probe().tilt)>1.55, 'Water must approach vertical without the old slope cap');
  for(const degree of [90,100,135,180,225,270,359,0,180]) {
    const a=degree*Math.PI/180,x=Math.sin(a),y=Math.cos(a);
    events.watergravity({detail:{x,y}});
    for(let i=0;i<240;i++)frame(now+=1000/60);
    const state=env.probe();
    assert(state.normal.x*x+state.normal.y*y>.9999,`Gravity mismatch at ${degree} degrees`);
    const p=state.polygon;let area=0;
    for(let j=0;j<p.length;j++){const b=p[(j+1)%p.length];area+=p[j].x*b.y-b.x*p[j].y;}
    assert(Math.abs(Math.abs(area)/2-state.area)<1,`Water volume changed at ${degree} degrees`);
  }
  const beforeInverted=env.probe().count;
  env.spawn(195,700);
  for(let i=0;i<240;i++)frame(now+=1000/60);
  assert(env.probe().count===beforeInverted+1,'Inverted drop must rise into upper pool');
  const radii=env.probe().radii;
  assert(radii[0]<radii[1]&&radii[1]<radii[2]&&radii[3]<=32,'Drop size must grow with amount within bounds');
  console.log('PASS: full rotation volume conservation, inverted drop and amount-based radius');
  console.log('PASS: 77-degree and near-vertical gravity angles');
})().catch(e => { console.error(e); process.exitCode = 1; });
