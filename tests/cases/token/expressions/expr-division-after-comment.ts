// xl:note 除号左边那一格（第 931 轮片段普查量出的那一族）：`x/*c*/ / 2 / 3` 里那个 `/`
// 是**除号**——往回找「上一个实义单元」时注释与软换行是同一件事，`x` 是操作数 ⇒ 不是正则开头。
// 而 `RegexTokenBranch.Condition` 原来只看**倒数第二格**（那格正是注释），
// 且「不是 Identifier 也不是 Bracket」的单元一律答正则 ⇒ 除号被读成正则的开头，
// 整条 `x / 2` 连同第二个 `/` 一起被吞进 `<RegexToken>`（四族各缺两条 `BinaryExpression`）。
// 这一份把「左边那一格」的六种写法钉住：标识符 / 二进制数字字面量 / 字符串 / 模板串 /
// 正则字面量 / 后缀 `++` / 关键字 `this`。
// xl:expect BinaryOperator:16
const a = x/*c*/ / 2 / 3;
const b = 0b1010/*c*/ / 1_000 / 10n;
const c = "s"/*c*/ / f()/*c*/ / g;
const d = `t` / 2 / 3;
const e = /re/ / 2 / 3;
const f2 = f() / 2 / 3;
let i = 0;
const g = i++ / 2 / 3;
class A { m() { return this / 2 / 3; } }
