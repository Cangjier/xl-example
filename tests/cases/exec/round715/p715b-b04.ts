// xl:title Object.values / entries 的次序
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { b: "B", 2: "2", 1: "1" };
console.log(show(Object.values(o).join(",")) + "|" + show(JSON.stringify(Object.entries(o))));
