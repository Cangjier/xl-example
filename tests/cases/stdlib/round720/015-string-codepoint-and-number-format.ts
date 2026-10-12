// xl:title `String.fromCharCode` / `fromCodePoint` 与代理对
// xl:round 720
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => String.fromCharCode(65, 66) + "|" + String.fromCodePoint(0x1F600).length));
console.log(t(() => (255).toString(16) + "|" + (1.005).toFixed(2)));
