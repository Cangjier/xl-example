// xl:title `this` 的绑法与装箱：call / apply / bind 的原始值接收者、严格与松散、箭头与类方法
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round710` 里逐条一问的 15 条探针
// （`p710a-a01` … `p710a-a15`）。每条的正文逐字搬进自己的 `probe(f)` 小壳
// （前置声明留在同一个箭头体内）⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => (function (this: any) { "use strict"; return typeof this; }).call(1));
probe(() => (function (this: any) { return this instanceof Number; }).call(1));
probe(() => (function (this: any) { return Object.prototype.toString.call(this); }).call(1));
probe(() => (function (this: any) { return this.valueOf(); }).call(7));
probe(() => (function (this: any) { return String(this); }).call(true));
probe(() => (function (this: any) { return typeof this; }).apply("x", []));
probe(() => (function (this: any) { return typeof this; }).bind(1)());
probe(() => (function (this: any) { return this === 1 ? "one" : typeof this; }).call(null));
probe(() => { class A { m(this: any) { return typeof this; } } return A.prototype.m.call(1); });
probe(() => { const outer = { v: "o", f() { const g = () => typeof (this as any); return g.call(1); } }; return outer.f(); });
probe(() => (function (this: any) { return this.constructor.name; }).call(1));
probe(() => (function (this: any) { return this.length; }).call("abc"));
probe(() => (function (this: any) { return this === null ? "null" : typeof this; }).call());
probe(() => (function (this: any) { return this === null ? "no" : (this as any).tag; }).call({ tag: "t" }));
probe(() => { function F(this: any, v: any) { this.v = v; } const B: any = F.bind({ v: "bound" }); return new B(3).v; });
