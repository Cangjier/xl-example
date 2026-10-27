// xl:note 除号左边那一格（第 931 轮片段普查量出的那一族）：`x/*c*/ / 2 / 3` 里那个 `/`
// 是**除号**——判据只看「`/` 之前最后一个实义单元能不能结束表达式」（`CanEndOperand`），
// 注释与软换行只是被跳过的 trivia，`x` 是操作数 ⇒ 不是正则开头。
// 原来 `RegexTemplate.CanStart` 把「不是 basic token 的最后一个单元」当语句边界，
// 于是一旦操作数已经建成本地形状（`NumericLiteralShape` / `CallExpressionShape` /
// `BinaryExpressionShape` / 关键字叶子），除号就被读成正则的开头：`/ 2` 连同第二个 `/`
// 一起被吞进 `<RegexToken>`（`const z = 1 / 2 / 3` 缺两条 `BinaryExpression`，
// `0b1010/*c*/ / 1_000 / 10n` 整条初始化器消失）。
// 这一份把「左边那一格」钉住：
//   - 六种基本写法：标识符 / 二进制数字字面量 / 字符串 / 模板串 / 正则字面量 / 后缀 `++`；
//   - 已建形状：数字前缀链 `1 / 2 / 3`、BigInt `10n`、调用 `f()`、`this` / `null` 关键字叶子；
//   - 各类 trivia：块注释 `/*c*/`、行注释 `//`、换行（软换行）——都走同一个 `PreviousCodeIndex`；
//   - 括号 / 成员调用：`[1, 2]` 与 `obj.if(a)`（后者那个 `)` 是调用，不是控制头）。
// xl:expect BinaryOperator:29
const a = x/*c*/ / 2 / 3;
const b = 0b1010/*c*/ / 1_000 / 10n;
const c = "s"/*c*/ / f()/*c*/ / g;
const d = `t` / 2 / 3;
const e = /re/ / 2 / 3;
const f2 = f() / 2 / 3;
let i = 0;
const g = i++ / 2 / 3;
class A { m() { return this / 2 / 3; } }
const h = 1 / 2 / 3;
const j = this / 2 / 3;
const k = 0b1010 / 1_000 / 10n;
const m = x // 行注释之后换行，`/` 仍接上一条表达式
  / 2 / 3;
const n = x
  /* 块注释在下一行 */ / 2 / 3;
const o = null / 2;
const p = obj.if(a) / 2;
const q = [1, 2] / 2;
