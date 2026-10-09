// xl:title 类字段：值的落点、初始化次序、声明而不初始化、覆盖与枚举
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 21 条原子探针——
//   probe693b-k06、k24、k25 · probe694-k08、k09、k10 · probe695-k12 · probe696-k14
//   probe699-k-e01…e04、e10、e11、e12、e18、e19、e30、e31、e32、e48、e49 · probe2-k13
//   · probe693-c14、c22 · probe695-k20 · p-class-field-order
// （`e01` 与 `k06`、`k12` 与 `e02` 是同一个断言的两种排版，只留一份；
//  `probe699-k-t04` 的初始化次序那一句已经在 `008-class-field-init-order` 里，也不搬。）
// 判据一行一条（`probe(f)` 与原子探针同壳）⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

// 字段的值落在实例自己那一格
probe(() => { class A { x = 1; } return new A().x; });
probe(() => { class A { "y" = 2 } return (new A().y); });
probe(() => { class A { constructor(v) { this.v = v; } } return (new A(3).v); });
probe(() => { class A { constructor(a) { this.a = a; } } return new A(1).a; });
// 枚举：只在实例上、不在原型上
probe(() => { class A { x = 1 } return (Object.keys(new A()).join()); });
probe(() => { class A { x = 1 } return (Object.getOwnPropertyNames(new A()).join()); });
probe(() => { class A { } const a = new A(); a.x = 1; return a.x + "," + Object.keys(a).join(","); });
probe(() => { class A { m() { return 1; } } const a = new A(); return Object.keys(a).length; });
// 字段的初始化式看得见 this、也看得见同类的其他字段与方法
probe(() => { class A { x = 1; m() { return this.x; } } return new A().m(); });
probe(() => { class A { x = this.f(); f() { return 3; } } return new A().x; });
probe(() => { class A { m = () => this.x; x = 4; } return new A().m(); });
probe(() => { class A { x = 1; y = this.x + 1; } const a = new A(); return a.y; });
probe(() => { class A { x = 1; y = this.x + 1; } const a = new A(); return a.x + a.y; });
// 派生类里字段的次序与覆盖
probe(() => { class A { x = 1 } class B extends A { y = this.x + 1 } return (new B().y); });
probe(() => { class A { x = 1 } class B extends A { y = this.init(); init() { return 4; } } return (new B().y); });
probe(() => { class A { x = 1 } class B extends A { x = 2 } return (new B().x); });
probe(() => { class A { get x() { return 1; } } class B extends A { x = 2 } return (new B().x); });
// 声明而不初始化：那一格存在但值是 undefined，删得掉，自有名表里也在
probe(() => { class A { x } return ('x' in new A()); });
probe(() => { class A { x } return (new A().x); });
probe(() => { class A { x = 1 } const a = new A(); delete a.x; return ('x' in a); });
probe(() => { class A { x = 1 } const a = new A(); return (a.hasOwnProperty('x')); });
// 构造函数把实参写进实例那一格
probe(() => { class A { constructor() { this.x = 1; } } return new A().x; });
probe(() => { class A { constructor(a = 1) { this.a = a; } } return new A().a; });
// 同类里字段按声明次序求值（`x` 先、`y` 才看得见它）
probe(() => { class A { x = 1; y = this.x + 1; } return new A().y; });
// 字段初始化在构造体之前（构造体里读到的已经是初始值）
(() => {
  class A {
    x = 1;
    constructor() {
      console.log(this.x);
      this.x = 2;
    }
  }
  console.log(new A().x);
})();
