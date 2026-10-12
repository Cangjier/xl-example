// xl:note 第 1231 轮新立：**对象字面量当标签模板的标签**那一族（`{ p: 1 }`t`` 以及后面接
// `.d` / `()` / `!` / 下标 / 又一个模板的续写）。
// 根因与第 1228 ~ 1230 轮那几处**同一条口径**：`tagIsPostfixChain`（第 0b 支的入口）那张
// 「这一格能不能当标签」的名单里**少一格**（`ObjectLiteral` 那一页第 1025 轮就显式声明了
// `## field IsObjectLiteralUnit:bool = true`，本页另外两处链名单早就读它）⇒ 入口判否 ⇒
// 标签与模板在产物里是平级两格、通用支只投得出一格 `ObjectLiteralExpression`，模板整格丢。
// 实测 `tmp/r1231-obj.mjs`：`const v = { p: 1 }`t`` 缺 2、加四种续写各缺 3~4；
// 而**带括号那一档本来就是对上的**（`const v = ({ p: 1 })`t`` 缺 0——那一格是 `Bracket`，
// 早由 `IsBracketUnit` 认下），差的只有没有括号的那一条写法。
// xl:round 1231
// xl:end
declare const f: any, o: any, a: any;

const v1 = { p: 1 }`t`;
const v2 = { }`t`;
const v3 = { p: a }`t`;
const v4 = { m() { return 1; } }`t`;
const v5 = { ...o }`t`;
const v6 = { p: 1 }`t`.d;
const v7 = { p: 1 }`t`();
const v8 = { p: 1 }`t`!;
const v9 = { p: 1 }`t`[0];
const v10 = { p: 1 }`t``u`;
const v11 = { p: 1 }`t` as any;
f({ p: 1 }`t`);
o.m({ p: 1 }`t`);
const v12 = ({ p: 1 })`t`;
function w() { return { p: 1 }`t`; }
class Z { q = { p: 1 }`t`; }
