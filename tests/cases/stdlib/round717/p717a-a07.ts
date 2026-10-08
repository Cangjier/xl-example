// xl:title Reflect.defineProperty 写一格出来
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = {};
console.log(show(Reflect.defineProperty(o, "a", { value: 1 })) + "|" + show(JSON.stringify(Object.keys(o))) + "|" + show(o.a));
