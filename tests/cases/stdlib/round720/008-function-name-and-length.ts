// xl:title 函数自己的 `name` / `length`（形参、缺省、剩余三档）
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

function f(a: any, b: any) { return 1; }
const g = (a: any, b = 1, ...c: any[]) => 1;
console.log(t(() => f.length + "|" + f.name + "|" + g.length));
console.log(t(() => ({ m() { return 1; } }).m.name));
