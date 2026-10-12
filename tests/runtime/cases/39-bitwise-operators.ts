// 第 147 轮：**位运算七条**（`& | ^ ~ << >> >>>`）与复合赋值。
//
// 引擎的算子表里这七格**一直都在**（`BitAnd` / `BitOr` / `BitXor` / `Shl` / `Shr` 是设计期
// 就留好的号 ✓，`BitNot` / `UShr` 是这一轮追加的 ✓），缺的是**实现与接线**：
// `rt.xl.md` 里没有它们、`RunRtOp` 里没有分派、`BinaryOpOf` 里也没有那几个文字——
// 于是一行 `flags |= 4` 会在**降级期**就报 `unimplemented: binary operator |=`。
//
// 语义照 JS 的三条硬规矩（都在 `rt.xl.md` 的 `ToInt32Of` 那一段里）：
//   ① 两边都先 `ToInt32`（`NaN` / `±Infinity` → `0`、小数向零截断、按 2³² 取模再折回有符号）；
//   ② 移位那个数取**低 5 位**（`1 << 33` 就是 `1 << 1`）；
//   ③ `>>>` 的结果**无符号**（`-1 >>> 0` 是 `4294967295`，**超出 int32**，所以它落在浮点上）。
//
// 另外修了一条让它「在日常写法里真的能用」的 token 层缺口：箭头函数的**体**紧跟在 `=>` 后面，
// 而 `IsTypeBracketPosition` 把那个括号判成了类型位，于是 `(n) => (n | 0)` 会被折成 `UnionType`。
//
// 这一份量的是端到端：`tsrun` 的 stdout 与 `node` 逐字节相同。

// ① 七条算子本身
console.log(6 & 3, 6 | 3, 6 ^ 3, ~6, ~0, ~-1);
console.log(1 << 4, 256 >> 2, -8 >> 1, -1 >>> 0, -1 >>> 28, 8 >> 33);

// ② `ToInt32` 那一层：小数截断、超 32 位取模、NaN 给 0
console.log(1.9 | 0, -1.9 | 0, 4294967296 | 0, 2147483648 | 0, 4294967297 | 0);
console.log(3.5 & 2.5, 1 << 31, 2147483647 << 1, 0 / 0 | 0);

// ③ 复合赋值六条
let flags = 0;
flags |= 4;
flags |= 1;
flags &= 5;
flags ^= 1;
flags <<= 2;
flags >>= 1;
flags >>>= 0;
console.log("flags", flags);

// ④ 日常形状：掩码判断、位计数、字符串哈希
const xs = [1, 2, 3, 4, 5];
console.log("odd", xs.filter((n) => (n & 1) === 1).join(","));
function hash(s: string): number {
  let h = 0;
  for (const c of s) {
    h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  }
  return h;
}
console.log("hash", hash("abc"), hash(""));
// **掩码那一句不写成「带括号的实参」** ✗：`console.log("mask", (0xff & 0x0f))` 会踩到
// 另一处**与这一轮无关**的 token 层缺口（括号前面是 `,` ⇒ 被判成类型位 ✓，
// 实测插桩：`owner=Bracket at=2 before=SymbolToken/,` ✓）——那一条记在台账里 ✓，
// 不混进这一份语料 ✓。
const masked = 0xff & 0x0f;
console.log("mask", masked, 0xf0 | masked);

// ⑤ 括号里的位运算在箭头体的位置（token 层那一格）
const toInt = (n) => (n | 0);
const inBlock = (n) => { return (n & 3) === 2; };
console.log("arrow", toInt(3.9), inBlock(6), inBlock(5));

// ⑥ `~` 与 `-1` 那两条「取反」的差别：`~x` 是 `-x - 1`
console.log("invert", ~5, ~-5, -5 - 1, -(5) - 1);
