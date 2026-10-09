// xl:title 静态访问器与静态方法里的 `super` / `this`
// xl:round 767
// xl:judge stdout
// xl:note 静态那一侧的访问器（`static get` / `static set`）住在**构造函数自己的属性表**上，
// xl:note 与实例访问器（住原型上）是两件事；子类用 `super.v` 读的是父类那一格。
// xl:note `this` 在静态方法里是**被调的那个构造函数**（`this.name` 于是给子类的名字），
// xl:note `super.make()` 调的是父类那一个、接收者仍是子类。
// xl:note 私有静态字段（`static #n`）与描述符那三问一起钉住。
// xl:end
class A {
  static #n = 1;
  static get v(): number { return A.#n; }
  static set v(x: number) { A.#n = x * 2; }
  static make(): string { return "A:" + this.name; }
}
class B extends A {
  static get double(): number { return super.v * 2; }
  static make(): string { return "B<" + super.make() + ">"; }
}
console.log("01", A.v, B.v, B.double);
B.v = 5;
console.log("02", A.v, B.v, B.double);
console.log("03", A.make(), B.make());
const d = Object.getOwnPropertyDescriptor(A, "v");
console.log("04", typeof d!.get, typeof d!.set, d!.enumerable, d!.configurable);
console.log("05", Object.getOwnPropertyNames(B).join(","));
console.log("06", Object.getOwnPropertyDescriptor(A.prototype, "v") === undefined);
