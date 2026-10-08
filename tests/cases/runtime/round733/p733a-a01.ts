// xl:title 宿主引用那一族（`Math.max` / `__lookupGetter__`）的两格：`name` 与 `length`
// xl:round 733
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => (Math as any).max.name) + " " + t(() => (Math as any).max.length));
console.log(t(() => (Math as any).hypot.name) + " " + t(() => (Math as any).hypot.length));
console.log(t(() => (Math as any).random.name) + " " + t(() => (Math as any).random.length));
console.log(t(() => (Math as any).f16round.name) + " " + t(() => (Math as any).f16round.length));
console.log(t(() => (Object.prototype as any).__lookupGetter__.name)
  + " " + t(() => (Object.prototype as any).__lookupGetter__.length));
console.log(t(() => Object.prototype.toString.name) + " " + t(() => Object.prototype.toString.length));
console.log(t(() => (Reflect as any).get.name) + " " + t(() => (Reflect as any).get.length));
console.log(t(() => (Object as any).keys.name) + " " + t(() => (Object as any).keys.length));
