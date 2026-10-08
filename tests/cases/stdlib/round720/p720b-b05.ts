// xl:title `Array.from` / 展开 / `concat` 的三档
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Array.from({ length: 3 }, (v: any, i: any) => i).join(",")));
console.log(t(() => [..."ab"].join(",") + "|" + Array.from("ab").join(",")));
console.log(t(() => JSON.stringify([1, 2].concat([3], 4 as any))));
