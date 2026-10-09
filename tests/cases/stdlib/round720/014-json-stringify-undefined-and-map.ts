// xl:title `JSON.stringify` 的 `undefined` / 函数 / 访问器三档
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => JSON.stringify(undefined) + "|" + JSON.stringify({ a: undefined })));
console.log(t(() => JSON.stringify({ a: 1 }, (k: any, v: any) => v, 0) + "|" + JSON.stringify(new Map([[1, 2]]))));
