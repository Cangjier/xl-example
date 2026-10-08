// xl:title shift.call(类数组) 交出第一格
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { length: 3, 0: "a", 1: "b", 2: "c" };
console.log(show(t(() => Array.prototype.shift.call(o))) + "|" + show(JSON.stringify(o)));
