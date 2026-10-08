// xl:title `slice` / `indexOf` / `includes` 的实参走 `ToIntegerOrInfinity`
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => [1, 2, 3].slice(undefined as any, undefined as any).join(",") + "|" + [1, 2, 3].slice("1" as any).join(",")));
console.log(t(() => [1, 2, 3].indexOf(2, 1.9) + "|" + [1, 2, 3].includes(2, "1" as any)));
