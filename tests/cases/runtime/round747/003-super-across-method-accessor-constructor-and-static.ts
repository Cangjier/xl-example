// xl:title `super` 的四条路：方法 / 访问器 / 构造 / 静态（含隐式构造器）
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a02
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a02.ts · `super` 的四条路：方法 / 访问器 / 构造 / 静态 =====
await (async () => {
class A {
  v() { return "A.v"; }
  static sv() { return "A.sv"; }
  get g() { return "A.g"; }
}
class B extends A {
  v() { return super.v() + "/B.v"; }
  static sv() { return super.sv() + "/B.sv"; }
  get g() { return super.g + "/B.g"; }
}
console.log(new B().v(), B.sv(), new B().g);
class C extends A {}
console.log(new C().v(), C.sv(), new C().g);
class D extends A { constructor() { super(); console.log("ctor", this.v()); } }
new D();
})();
}
main();
