// xl:title 实例上换掉 join，三条路一起跟着动
// xl:round 716
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const a: any = [1, 2];
a.join = () => "J";
console.log(show(String(a)) + "|" + show(a + "") + "|" + show(a.toString()));
