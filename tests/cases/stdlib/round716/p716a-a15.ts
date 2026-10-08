// xl:title `String(a)` 里 join 抛出去要能接住
// xl:round 716
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const a: any = [1, 2]; a.join = () => { throw new Error("boom"); };
console.log(show(t(() => String(a))));
