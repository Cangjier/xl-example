// xl:title `new.target`：函数里的两种调用、类与派生类里的取值
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 3 条用例——
//   · 063-new-target · exec/classes/probe699-k-e36、e37
// 判据一段一条（吸收进来的多语句正文逐字保留在自己的 IIFE 里，输出逐行不变）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

(() => {
  function F(this: any) { return String(new.target === F); }
  class C { tag: string; constructor() { this.tag = new.target === C ? 'C' : 'sub'; } }
  class D extends C { constructor() { super(); this.tag += '+D'; } }
  try { console.log("plain-call", String((() => { const f: any = F; return String(f()); })())); } catch (e) { console.log("plain-call", "ERR", String(e && e.name)); }
  try { console.log("new-call", String(String(new (F as any)()))); } catch (e) { console.log("new-call", "ERR", String(e && e.name)); }
  try { console.log("class", String(new C().tag)); } catch (e) { console.log("class", "ERR", String(e && e.name)); }
  try { console.log("subclass", String(new D().tag)); } catch (e) { console.log("subclass", "ERR", String(e && e.name)); }
})();
probe(() => (function () { class A { constructor() { this.z = new.target === A; } } return (new A().z); })());
probe(() => (function () { class A {} class B extends A { constructor() { super(); this.ok = new.target === B; } } return (new B().ok); })());
