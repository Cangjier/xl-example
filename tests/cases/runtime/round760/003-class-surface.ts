// xl:title 类那一侧的形状：字段与静态块的次序 / 私有字段 / 访问器描述符 / 继承与 super
// xl:round 760
// xl:judge stdout
// xl:note 第 760 轮普查里**全过**的那一片，收进矩阵当守卫（含字段与构造函数的先后、
// xl:note `static {}` 的位置、私有字段的读、访问器描述符没有 `value`、
// xl:note 构造函数返回对象时 `new` 给什么、以及 `super` / 静态继承 / 原型的两个朝向）。
// xl:note **普查里另有两条 Node 自己跑不动**（`accessor y = 1` 与 `#p in o`——
// xl:note `node <文件>.ts` 的类型剥离不吃这两个写法），所以它们**不进语料**：
// xl:end
const show = (v: any) => JSON.stringify(v);
console.log("1", show([(function () { const order: string[] = []; class A { x = (order.push("field"), 1); constructor() { order.push("ctor"); } } new A(); return order; })()]));
console.log("2", show((function () { const order: string[] = []; class A { static { order.push("static"); } x = order.push("field"); } new A(); return order; })()));
console.log("3", show((function () { class A { #p = 1; get() { return this.#p; } } return [(new A() as any).get(), Object.getOwnPropertyNames(new A()).length]; })()));
console.log("4", show((function () { class A { get x() { return 1; } set x(v) {} } const d: any = Object.getOwnPropertyDescriptor(A.prototype, "x"); return [typeof d.get, typeof d.set, "value" in d]; })()));
console.log("5", show((function () { class A { static #s = 5; static read() { return this.#s; } } return A.read(); })()));
console.log("6", show((function () { class A { constructor() { return 1; } } return typeof new A(); })()));
console.log("7", show((function () { class A { constructor() { return {}; } } return typeof new A(); })()));
console.log("8", show((function () { class A { m() { return "a"; } } class B extends A { m() { return super.m() + "b"; } } return new B().m(); })()));
console.log("9", show((function () { class A {} class B extends A {} return [Object.getPrototypeOf(B) === A, Object.getPrototypeOf(B.prototype) === A.prototype]; })()));
console.log("10", show((function () { class A { x = 1; } class B extends A { x = 2; } return new B().x; })()));
console.log("11", show((function () { class A { get x() { return 1; } } class B extends A { x = 2; } return new B().x; })()));
console.log("12", show((function () { class A { static get x() { return 1; } } class B extends A {} return (B as any).x; })()));
