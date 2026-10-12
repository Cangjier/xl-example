// 语料 32：`super(m)` 落在内建构造函数上（第 140 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 137 轮把 `Error` / `TypeError` / `RangeError` 做成了真构造函数 ✓，
// 但 `class MyErr extends Error` 当场**响亮地抛** ✓（「unimplemented: super(...) on a builtin
// constructor」✓）——因为那一族是「**自己造一个新对象返回**」那一款 ✓：
// `super(m)` 造出来的新对象被丢掉 ✓、`this` 上一个属性都没写 ✗
// （**症状是 `e.message` 空着**，而 `e.name` 被派生类自己写了、看着一切正常 ✓）。
// **抛比静默错值好** ✓，所以先抛了一轮 ✓。
//
//   ① **这一轮把它改成真的办到** ✓：内建错误构造函数拿到**接收者**（`self` ✓）时，
//      往**那个对象**上写 `message` / `name` ✓，并**返回它** ✓——
//      「谁是真的 `this`」只有一个答案 ✓（JS 的规矩就是「父类构造函数改的就是那一个 `this`」✓）。
//   ② **`this` 是降级层递过来的** ✗：`super(...)` 用 `Op.Call` 的 `D` 操作数把当前帧的
//      `this` 交给被调方 ✓（`lowering.xl.md` 那一支 ✓）——所以这一条**一行降级层改动都没有** ✓。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · **不写构造函数的派生类** ✗（`class E extends Error {}`）：降级层要求派生类
//     **自己写构造函数并调用 `super(...)`** ✓（父类带构造函数时 ✓）——JS 那边默认构造函数
//     会 `constructor(...args) { super(...args) }` ✓，本仓不合成那一个 ✓。
//     这是**响亮地抛** ✓（不是静默少跑父类初始化 ✓）；
//   · `extends Map` / `extends Set` ✗：`super(...)` 现在只对**错误那一族**做了 ✓——
//     其余内建构造函数仍然是「自己造一个新对象返回」✓，它们各自的「往 `this` 上初始化」
//     要**逐个来** ✓（`Map` 还得先把内部格铺到 `this` 上 ✓）；
//   · `e.stack` ✗（更早就记着的一条 ✓）。

class MyError extends Error {
  constructor(message) {
    super(message);
    this.name = "MyError";
  }
}

class TaggedError extends TypeError {
  constructor(message, tag) {
    super(message + ":" + tag);
  }
}

class PlainError extends RangeError {
  constructor(message) {
    super(message);
  }
}

console.log("extends-error", (() => {
  try {
    throw new MyError("custom");
  } catch (error) {
    return [error.name, error.message, error instanceof MyError, error instanceof Error].join(",");
  }
})());
console.log("extends-typeerror", (() => {
  const error = new TaggedError("bad", "tag");
  return [error.name, error.message, error instanceof TypeError, error instanceof Error,
    error instanceof RangeError].join(",");
})());
console.log("extends-rangeerror", (() => {
  const error = new PlainError("range");
  return [error.name, error.message, error instanceof RangeError].join(",");
})());
console.log("caught-by-kind", (() => {
  const seen = [];
  for (const item of [new MyError("a"), new TaggedError("b", "t"), new PlainError("c")]) {
    if (item instanceof TypeError) {
      seen.push("type");
    } else if (item instanceof RangeError) {
      seen.push("range");
    } else if (item instanceof Error) {
      seen.push("generic");
    } else {
      seen.push("unknown");
    }
  }
  return seen.join(",");
})());
console.log("after", 1 + 1);
