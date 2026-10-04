// 第 196 轮：**静态块**（`static { … }`）。
//
// 普查里 `static-block` 那一条：`class C { static x: number; static { C.x = 5; } }` 报
// `name is not a local or a capture: C` ——**整份文件进不来**。
//
// 根因与第 128 轮那条**一字不差**：降级层把 `static { … }` 落成
// 「造一个无参函数、用构造函数当 `this` 立刻调一次」——所以它**真的**是一层函数；
// 而**作用域分析**（`scope.xl.md` 的 `IsFunctionNode`）那张「自带一层作用域」的名单里
// **没有它**（那时有七种：三种函数字面量、方法、构造函数、两种访问器）。
// 于是模块那一层不为 `C` 留格子，块里那个合成函数读不到它。
//
// **这是同一个根因的第四次**（第 96 轮漏 `MethodDeclaration`、第 99 轮漏访问器、
// 第 128 轮漏 `Constructor`，这一次漏静态块）——那张名单的注释里写着「宁可多列」：
// 漏一个不是「少开一格」，而是**整层不开环境**，症状永远离现场很远。
//
// 修法：名单里补一格（一处）。补充之后**顺序、`this`、闭包**三种形状一起对。

class Ordered {
  static log: string[] = [];
  static { Ordered.log.push("block-1"); }
  static { Ordered.log.push("block-2"); }
  static { Ordered.log.push("block-3"); }
}
console.log(Ordered.log.join(","));

// `this` 在静态块里就是那个类（与静态字段初始化式同一条口径）
class WithThis {
  static v = 1;
  static { this.v = 2; }
}
console.log(WithThis.v);

// 静态块里造出来的闭包也看得见类名（捕获分析补上之后自然成立）
class Nested {
  static fns: Array<() => number> = [];
  static x = 5;
  static { Nested.fns.push(() => Nested.x); }
}
console.log(Nested.fns[0]());

// 静态字段与静态块按源码顺序求值
class MixedOrder {
  static seen: string[] = [];
  static a = MixedOrder.seen.push("field");
  static { MixedOrder.seen.push("block"); }
}
console.log(MixedOrder.seen.join(","));
