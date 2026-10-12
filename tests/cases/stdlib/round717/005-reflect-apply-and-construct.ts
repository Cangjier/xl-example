// xl:title Reflect.apply 与 Reflect.construct
// xl:round 717
// xl:judge stdout
// xl:want pass
// xl:end
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

function f(this: any, a: number, b: number) { return this.k + a + b; }
console.log(show(Reflect.apply(f, { k: 10 }, [1, 2])));
console.log(show(Reflect.apply((x: number) => x * 2, null, [21])));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

function f(a: number, b: number) { return a + b; }
console.log(show(Reflect.apply(f, null, { length: 2, 0: 1, 1: 2 } as any)));
})();

(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

class A { x = 1; v: number; constructor(v: number) { this.v = v; } }
const made: any = Reflect.construct(A as any, [7]);
console.log(show(made.v) + "|" + show(made.x) + "|" + show(made instanceof A));
})();
