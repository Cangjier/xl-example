// xl:title `Object.assign` / 展开：访问器被求值、`null` 目标要抛
// xl:round 748
// xl:judge stdout
// xl:end
const src: any = { get g() { console.log("getter"); return 5; } };
const t: any = {};
console.log(JSON.stringify(Object.assign(t, src, { b: 2 })), t.g);
console.log(JSON.stringify({ ...src }));
try { Object.assign(null as any, {}); } catch (e) { console.log("null target", (e as Error).constructor.name); }
console.log(JSON.stringify(Object.assign({ a: 1 }, null as any, undefined as any)));
const arr = Object.assign([1, 2], { 0: "z" });
console.log(JSON.stringify(arr), arr.length);
