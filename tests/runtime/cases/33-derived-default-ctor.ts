// 语料 33：派生类的默认构造函数 · `super(...xs)`（第 141 轮）
// ——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 140 轮让 `super(m)` 落在内建构造函数上通了 ✓，
// 收尾时留的头一条是 **`class E extends Error {}`（不写构造函数）** ✗——
// 降级层要求派生类自己写构造函数并调用 `super(...)` ✓，本仓**不合成**那一个 ✓。
//
//   ① **`super(...xs)`**（第 141 轮 ✓）：`CallArray` **本来就带 `this` 操作数** ✓
//      （`EmitCallArray(callee, argsArray, self)` ✓，第 133 轮加算子时留出来的 ✓）——
//      所以「拿当前实例当 `this`、按数组铺参数」**一个新算子都不用加** ✓，
//      缺的只是把它与 `super` 接起来 ✓。第 133 轮那一处「响亮地抛」于是撤掉了 ✓。
//   ② **合成的默认构造函数** ✓：父类带构造函数而派生类没写时，合成 JS 那一个 ——
//      `constructor(...args) { super(...args); }` ✓（第 133 轮的剩余参数 + ①的 `super(...xs)` ✓，
//      两样都在了才敢合成 ✓）。
//   ③ **「父类有没有构造函数」要递归问** ✗：`class A { constructor(v) {…} } class B extends A {}
//      class C extends B {}` 里，`B` 的构造函数是**合成出来的、不在 `members` 里** ✓——
//      只看 `members` 的话 `C` 会拿到一个**空的**默认构造函数 ✓，
//      `new C(7).v` 就是 `undefined` ✓（**静默错值** ✓，判据现场就是这么红的 ✓）。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `super.m(...xs)` ✗：这一支本来就用不了 `call_method` ✓（「在谁身上找」与「谁是 `this`」
//     要分开 ✓），要另配一条形状 ✓；
//   · `new C(...xs)` ✗：`Op.New` 那条路没有「按数组铺参数」✓；
//   · **不调 `super(...)`** 的派生类构造函数仍然**响亮地抛** ✓（父类带构造函数时 ✓）——
//     那条判据保持不变 ✓（静默少跑父类初始化比不能用更坏 ✓）。

class Base {
  constructor(a, b) {
    this.sum = a + b;
  }
}

class Plain extends Base {
}

class WithField extends Base {
  tag = "f";
}

class Forwarding extends Base {
  constructor(xs) {
    super(...xs);
    this.forwarded = true;
  }
}

class Mixed extends Base {
  constructor(xs) {
    super(1, ...xs);
  }
}

class Middle extends Base {
}

class Leaf extends Middle {
}

class AppError extends Error {
}

class CodedError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

console.log("default-ctor", new Plain(1, 2).sum, new Plain(1, 2) instanceof Base,
  new WithField(2, 3).sum, new WithField(2, 3).tag);
console.log("super-spread", new Forwarding([3, 4]).sum, new Forwarding([3, 4]).forwarded,
  new Mixed([5]).sum);
console.log("chain", new Leaf(6, 7).sum, new Leaf(6, 7) instanceof Base,
  new Leaf(6, 7) instanceof Middle);
console.log("error-subclass", (() => {
  try {
    throw new AppError("plain");
  } catch (error) {
    return [error.message, error.name, error instanceof AppError, error instanceof Error].join(",");
  }
})());
console.log("coded-error", (() => {
  const error = new CodedError("bad", 42);
  return [error.message, error.code, error instanceof CodedError, error instanceof Error].join(",");
})());
console.log("after", 1 + 1);
