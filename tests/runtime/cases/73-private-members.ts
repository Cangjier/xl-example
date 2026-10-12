// 第 195 轮：**私有成员**（`#m()` / `#n` / `static #s`）。
//
// 普查里 `class-private-method` 那一条：`class C { #n = 1; #m() { return this.#n; }
// get v() { return this.#m(); } }` 报 `unimplemented: computed or numeric class member name`
// ——**整份文件进不来**。
//
// 根因：私有名的 kind 是 `PrivateIdentifier`，而降级层有**九处**只认 `Identifier` /
// `StringLiteral`（类成员名、类字段名、方法调用的名字、属性读，以及五处赋值 / 删除 / 解构）。
// 私有**字段**的**读**那一格本来就走得通，所以「带私有字段的类」能跑、
// 「带私有方法的类」不能——同一条路两种命运。
//
// 修法：那些判据一起放开 `PrivateIdentifier`，并且**键统一用 `KeyUnitsOf`**——
// 它的文本就是 `#m` / `#n`，于是「类里挂上去的那一格」与「读 / 调时找的那一格」
// 一定是同一个键（一份判据只能有一处）。
//
// **两条还没做的形状写在明处**（都不进这份语料——它们会让**整份文件**进不来）：
// ① **私有名落在二元表达式里**：`this.#n + 1` / `this.#priv + this.pub` 报
//    `ast node BinaryExpression has no child right`——那是**投影**那一层
//    （私有名当二元单元的左操作数时右孩子丢了），单独立一轮；
// ② **静态块**：`static { C.x = 5 }` 报 `name is not a local or a capture: C`。
// 所以下面只量**读**与**调用**（这两条路这一轮通了）。

class Counter {
  #n = 5;
  #m() { return this.#n; }
  get value() { return this.#m(); }
  static #count = 7;
  static make() { return Counter.#count; }
}

const c = new Counter();
console.log(c.value);
console.log(Counter.make());

// 私有方法带实参、并且从一个私有方法里调另一个（返回值原样带出来，不落在二元里）
class Deep {
  #factor = 3;
  #mul(x: number) { return x; }
  #twice(x: number) { return this.#mul(this.#mul(x)); }
  run(x: number) { return this.#twice(x); }
}
console.log(new Deep().run(42));

// 公有字段照旧（回归）
class Mixed {
  pub = 1;
  #priv = 2;
  readPriv() { return this.#priv; }
}
const mixed = new Mixed();
console.log(mixed.readPriv(), mixed.pub);
