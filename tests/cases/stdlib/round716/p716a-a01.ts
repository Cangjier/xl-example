// xl:title 数组 toString 的三种基线形状
// xl:round 716
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const a: any = [1, 2];
console.log(show(String(a)) + "|" + show(a + "") + "|" + show(a.toString()) + "|" + show([].toString()));
