// xl:title `Math` 那一族的名字与长度（宿主引用那一档）
// xl:round 719
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => typeof Math.max + "|" + typeof Math.random + "|" + typeof Math.f16round));
console.log(t(() => (Math as any).max.length + "|" + (Math as any).random.name));
