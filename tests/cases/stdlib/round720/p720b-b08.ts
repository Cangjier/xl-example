// xl:title `Map` / `Set` 的成员面与遍历
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const m = new Map([[1, 2], [3, 4]]);
let s = "";
m.forEach((v: any, k: any) => { s += k + ":" + v + ","; });
const st = new Set([1, 2]);
console.log(t(() => s + "|" + m.size));
console.log(t(() => st.size + "|" + st.has(1) + "|" + JSON.stringify([...st.entries()])));
