// xl:note 第 1234 轮新立：**裸块之后那一行以 `/` 开头**那一格（第 1231 轮登记那一族的
// 倒数第二格，两轮之后的收尾）。
//
// `{ }` 换行 `/re/g;` 在 TS 里是**两条语句**（`Block` + `ExpressionStatement >
// RegularExpressionLiteral`），而解析期的续接表里 `/` 本来是「能续接」（`a` 换行 `/ b`
// 就是除法）⇒ 换行处不收壳 ⇒ 块与那条正则被收进**同一条**语句
//（实测：缺 `Block` 与那条表达式语句、多一条把两者都装进去的 `ExpressionStatement`）。
//
// 为什么以前没露出来：`NextLineContinuesExpression` 那段注释里写着「真的另起一条正则语句时
// （`foo();` 换行 `/re/.test(x);`），`IsStatementBoundary` 早就因为上一格是 `;` / `}` 而早退了」
// ——**对裸块不成立**：上一格是一个**收好的块**（`Bracket` 的 `startBracket === "{"`、
// `endBracket === "}"`），既不是 `;` 也不是裸 `}`。而 `{ }` 是一条语句，它后面不可能再挂运算符。
//
// 同一轮把「这一格体是不是一条语句的收尾」这一问**收归一份**：它原来长在
// `RegexTokenBranch` 上（第 1232 / 1233 轮），这一轮 `statement.xl.md` 成了第二个用户
// ⇒ 搬到 `text-common-util.xl.md` 的 `IsStatementBraceTail`，两处都问它
// （`IsObjectLiteralBrace` 第 556 轮就是这么搬下来的：两个用户问同一句，各写一份会漂）。
//
// 对照档（**必须仍然续接/除号**）：`const o = { a: 1 }` 换行 `/re/g`、
// `const v = function () { }` 换行 `/re/g`、`const v = () => { }` 换行 `/re/g`（后面那两档
// 是**体**，不是语句的收尾——`IsStatementBraceTail` 往回找到 `=` / `=>` 就答否）。
// xl:round 1234
// xl:end
declare const a: any, o: any, f: any;

{
  a;
}
/re/g;

const v1 = { p: 1 }
/re/g;

const v2 = function () { }
/re/g;

const v3 = o
/re/g;

// —— 对照：值位那个花括号仍然是**除号**
f({ p: 1 })
/re/g;
