// xl:note 值位对象字面量里名叫 `new` 的**不带体**成员（第 949 轮登记、第 950 轮收掉）。
// `const v = { new (a: number): I };` 在 TS 那边是一条 `MethodDeclaration`——名字就是 `new`、
// `(a: number)` 是形参表、`: I` 是返回类型（与类 / 接口里的成员签名同款）；产物这边原来
// `MethodDeclarationCloseRule` 的无体成员白名单里没有 `ObjectLiteral`，于是这一格落到
// `NewCloseRule` 手里（缺 `MethodDeclaration` / `Identifier(new)` / `TypeReference` 各 1、
// 多 `NewExpression` / `ParenthesizedExpression` / `PropertyAssignment` 各 1）。
// **第 949 轮试过、退回来的那一版**：把 `ObjectLiteral` **整档**加进那份白名单，片段探针当场
// 0 条对不上，可 `coverage 4192 → 4155`、`blocked 27 → 56`、`differ 138 → 147`、e2e 六条挂
//（`unimplemented: expression MethodDeclaration`）——放开的范围比要修的那一格大得多。
// **收法（第 950 轮）**：只认一条缝，两条都要成立——①形参表之后**紧跟 `:`**（真的写了返回类型）；
// ②这一格在**成员位**（父单元里它前面那个实义单元是开头、`;` 或 `,`）。
// 于是 `{ a: b(c) }`（前面是属性冒号）与 `{ f(x) }`（没写返回类型）都保持原样。
// 类 / 接口 / 类型字面量那三档不加这两条：那里本来就是成员位置。
// xl:expect MethodDeclaration:1,Parameter:1,Identifier:3
// xl:absent New,PropertyAssignment
const v = { new (a: number): I };
