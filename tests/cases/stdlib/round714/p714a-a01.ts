// xl:title `push` 写回类数组：元素落在 `n` 那一格、`length` 跟着走
// xl:round 714
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const t = (f: any) => { try { return show(f()); } catch (e: any) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };
const o: any = { length: 0 };
console.log("push", t(() => Array.prototype.push.call(o, 1)), JSON.stringify(o));
console.log("push2", t(() => Array.prototype.push.call(o, 2, 3)), JSON.stringify(o));
const p: any = { length: 2, 0: "a", 1: "b" };
console.log("mixed", t(() => Array.prototype.push.call(p, "c")), JSON.stringify(p));
