// xl:title unshift.call(类数组) 写回开头
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { length: 2, 0: "a", 1: "b" };
console.log(show(t(() => Array.prototype.unshift.call(o, "z"))) + "|" + show(JSON.stringify(o)));
