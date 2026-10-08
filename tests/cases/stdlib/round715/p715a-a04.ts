// xl:title fill.call(类数组)
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { length: 3, 0: 1, 1: 2, 2: 3 };
console.log(show(t(() => Array.prototype.fill.call(o, 9))) + "|" + show(JSON.stringify(o)));
