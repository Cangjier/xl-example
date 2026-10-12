// xl:note 第 1236 轮**新登记**的一格（用户口径 1.1）：**`new` 后面那个花括号**。
//
// `new { a: 1 }()` 在 TS 里是一个 `NewExpression`，被 new 的是一个**对象字面量**；
// 产物那一列是**缺 5 多 1**（整条 `NewExpression` 不见，只剩一格 `Keyword(new)`）。
//
// **根因与同族那几格不同**（不是 `IsStatementStart` 里「引出一个值的词」那张名单的事）：
// 实测 `const v = new { a: 1 }();` 的产物里，那个 `{` 被收成了
// `<TypeLiteral><TypeLiteralBody><Field name="a">…` —— **`TypeLiteralCloseRule` 先把
// 那个 `{` 认成了类型字面量**（`new` 在 TS 里确实能引出一个类型：`new () => T` /
// 构造签名的 `new (…)` 那一族），于是它在这一格答了「类型位」。
//
// **要分开的是**「`new` 是一个**运算符**（后面跟值）」与「`new` 是一个**类型修饰词**
// （后面跟构造签名）」。同一轮量到的排版全在这份用例里（语句位 / 变量位 / 调用实参 /
// 带实参 / 不带圆括号 / 空对象），六条**全对不上**。
//
// 第 1244 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：根因**不是**那一句判据答错了，
// 而是**它一次都没被问到** —— 回扫撞上的那格 `new` 在收尾期已经是 `Keyword`
// （`KeywordCloseRule` 排在 `TypeLiteralCloseRule` 之前），而 `IsTypePosition` 的 `new`
// 那一支只认 `Identifier` ⇒ 整个分支从不进入、一路落到循环末尾的「没有边界 ⇒ 值位」。
// 两处各补一格之后：`IsTypePosition` 认下 `Keyword(new)` 两态（同一个词两态都要认），
// `NewCloseRule` 认下「`new` 后面紧跟一个 `{` 括号」的被构造者（与匿名 `class` / `function`
// 同一支），六条全对。
//
// （按本仓规矩**先登记、后收**：第 1236 轮只登记不收，第 1244 轮收掉。）
// xl:expect Statement:5
new { a: 1 }();

const v1 = new { a: 1 }();

f(new { a: 1 }());

const v2 = new { a: 1 }(b);

const v3 = new { a: 1 };

const v4 = new {}();
