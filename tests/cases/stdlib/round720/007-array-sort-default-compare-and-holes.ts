// xl:title `sort` 把 `undefined` 与洞排到最后，且默认比较是**逐码元**
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => JSON.stringify([3, undefined, 1].sort())));
console.log(t(() => JSON.stringify([1, , 3].sort()) + "|" + [1, , 3].sort().length));
console.log(t(() => JSON.stringify([10, 1, 2].sort((x: any, y: any) => x - y))));
