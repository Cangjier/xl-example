// xl:title 类：字段 / 静态块 / 私有字段与品牌检查 / `instanceof` / 继承初始化次序
// xl:round 747
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round747 里同判定点的
// 1 条原子探针并成这一条：p747a-a01
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round747/p747a-a01.ts · 类：字段 / 静态块 / 私有字段 / `instanceof` / 继承初始化次序 =====
await (async () => {
class A {
  a = 1;
  static s = 2;
  static { A.s = 5; }
  #p = 3;
  constructor() { (this as any).b = 4; }
  getP() { return this.#p; }
  has(o: any) { return #p in o; }
}
const x = new A();
console.log(x.a, (x as any).b, A.s, x.getP(), x.has(x), x.has({}));
console.log(x instanceof A, Object.keys(x).join(","));
class B extends A { c = 9; constructor() { super(); (this as any).d = 10; } }
const y = new B();
console.log(y.a, (y as any).b, (y as any).c, (y as any).d, y instanceof A, y instanceof B);
})();
}
main();
