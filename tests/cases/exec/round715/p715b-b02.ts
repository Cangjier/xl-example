// xl:title for..in 与 Object.keys 同一次序
// xl:round 715
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const o: any = { b: 1, 2: 2, 1: 3, a: 4 };
const ks: string[] = []; for (const k in o) ks.push(k);
console.log(show(ks.join(",")));
