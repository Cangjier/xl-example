// xl:title Reflect.construct 造实例并带上原型
// xl:round 717
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

class A { x = 1; v: number; constructor(v: number) { this.v = v; } }
const made: any = Reflect.construct(A as any, [7]);
console.log(show(made.v) + "|" + show(made.x) + "|" + show(made instanceof A));
