// xl:title 数组的类数组接收者：`push` 会写回那个对象
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { length: 0 };
const r: any = Array.prototype.push.call(o, "x", "y");
console.log(t(() => r + "|" + o.length + "|" + o[0] + o[1]));
