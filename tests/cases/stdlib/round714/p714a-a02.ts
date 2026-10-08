// xl:title `pop` 写回类数组：交出最后一格、删掉它、`length` 减一
// xl:round 714
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const t = (f: any) => { try { return show(f()); } catch (e: any) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };
const p: any = { length: 3, 0: "a", 1: "b", 2: "c" };
console.log("pop", t(() => Array.prototype.pop.call(p)), JSON.stringify(p));
const q: any = { length: 0 };
console.log("empty", t(() => Array.prototype.pop.call(q)), JSON.stringify(q));
const frozen: any = Object.freeze({ length: 0 });
console.log("frozen", t(() => Array.prototype.push.call(frozen, 1)));
