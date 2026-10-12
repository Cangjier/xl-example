// xl:note 第 1233 轮新立：**控制头之后那一行以 `/` 开头**那一族（第 1232 轮那一族的另一半）。
//
// 第 1232 轮收的是「体的花括号之后」那一半（`function` / `class` / `for (;;) { }` /
// `while (a) { }` / 裸块），这一轮收的是**头括号之后**那一半：
// `while (a)` 换行 `/re/g;` / `for (;;)` 换行 `/re/g;` / `if (a)` 换行 `/re/g;` /
// `do { }` 换行 `while (a)` 换行 `/re/g;`——紧挨着 `/` 的那一格是**控制头的 `)`**，
// 而上一版那一支只管花括号 ⇒ 全落回除号（各缺 `RegularExpressionLiteral`、各多一格 `SlashToken`）。
//
// 判据是位置：**一个控制头的 `)` 之后一定是新的一条语句**（体，或者 do-while 之后的下一条），
// 语句开头那个 `/` 只能是正则。新立的 `RegexTokenBranch.IsControlHeader` 问的就是
// 「这个 `(` 前面那一格是不是控制词」（`if` / `while` / `for` / `foreach` / `until` / `with`），
// 并把 `.while` / `?.while` 那一档排掉（成员名后面那个 `(` 是调用）。
//
// 同一轮还补了 `IsStatementBrace` 的一格：`try { }` 换行 `catch (e) { }` 换行 `/re/g;` 里
// 往回那一趟的头正是 `try` 的**体那个块**——一个已经收好的块也是站在语句位的头。
//
// 对照档（**必须仍是除号**）：`(a)` / `(a + 1)` / `[a][0]` / `o.m(a)` / `obj.while(a)` /
// `typeof (a)` / `a ? (a) : (a)` 后面那个 `/`。
// xl:round 1233
// xl:end
declare const a: any, o: any, e: any;
const obj: any = {};

while (a)
/re/g;

for (;;)
/re/g;

if (a)
/re/g;

do { }
while (a)
/re/g;

try { }
catch (e) { }
/re/g;

// —— 对照：这些 `/` 仍然是**除号**（表达式括号 / 成员名 / 调用）
const v1 = (a)
/re/g;

const v2 = (a + 1)
/re/g;

const v3 = [a][0]
/re/g;

const v4 = typeof (a)
/re/g;

const v5 = a ? (a) : (a)
/re/g;

o.m(a)
/re/g;

const v6 = obj.while(a)
/re/g;

const v7 = obj.if(a)
/re/g;

const v8 = o.for(a)
/re/g;
