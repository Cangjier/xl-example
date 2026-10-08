// xl:title 派生键（10 与 9）按数值而不是字典序
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {}; o[10] = "x"; o[9] = "y"; o["z"] = "w";
console.log(show(Object.keys(o).join(",")));
