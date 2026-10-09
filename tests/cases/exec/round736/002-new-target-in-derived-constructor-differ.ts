// xl:title `new.target` 与派生构造里的 `this` 时机（账）
// xl:round 736
// xl:judge stdout
// xl:want differ
// xl:why **基类构造里经 `super()` 调用时 `new.target` 丢了**：Node 里 `new B()`（`B extends A`）
// xl:why 让 `A` 的构造体读到 `new.target === B`，本仓读到 `undefined`。
// xl:why 降级器把 `new.target` 折成一个作用域槽，而 `super(...)` 那一条路**没有把它带过去**
// xl:why （直接 `new A()` 那一档是对的——判据第 1 行两边一致）。
// xl:why **收它要让 `super()` 的调用点把当前帧的 `new.target` 一起递进去**，是降级层的一处接线。
// xl:end
// 第 802 轮改名（原 `p736c-c05`）：`xl:want` / `xl:why` 与正文一字未动。
function F(this: any) { return new.target === F ? "direct" : "sub"; }
class A { constructor() { console.log("A", new.target ? new.target.name : "none"); } }
class B extends A {}
console.log(new (F as any)() === undefined ? "no" : "obj");
console.log(new B() instanceof A, (F as any).call ? "callable" : "no");
