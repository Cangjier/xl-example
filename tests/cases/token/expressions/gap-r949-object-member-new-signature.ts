// xl:note 值位对象字面量里名叫 `new` 的**不带体**成员（第 949 轮登记）。
// `const v = { new (a: number): I };` 在 TS 那边是一条 `MethodDeclaration`——名字就是 `new`、
// `(a: number)` 是形参表、`: I` 是返回类型（与类 / 接口里的成员签名同款）；产物这边
// `MethodDeclarationCloseRule` 的无体成员白名单里**没有** `ObjectLiteral`，于是这一格落到
// `NewCloseRule` 手里：`new (a: number)` 收成新表达式、尾巴那个 `:` 与 `I` 收成属性赋值
//（缺 `MethodDeclaration` / `Identifier(new)` / `TypeReference` 各 1、多 `NewExpression` /
// `ParenthesizedExpression` / `PropertyAssignment` 各 1）。
// **试过、退回来的那一版**（如实记）：把 `ObjectLiteral` 加进那份白名单，片段探针当场 0 条对不上
// ——可那是**整档放开**（对象字面量里任何 `name(...)` 形状都成了成员签名）⇒
// `coverage 4192 → 4155`、`blocked 27 → 56`、`differ 138 → 147`、e2e 六条挂
//（`unimplemented: expression MethodDeclaration`），所以按规矩撤回。
// **带体那一档本来就对**（`{ new (a) { … } }` 走的是方法体那一条路），坏的只有不带体这一格。
// 下一轮要的是**窄判据**：只认「名字是 `new`、且在成员位（前一个是 `{` / `,` / `;`）」这一格。
// xl:known-gap 值位对象字面量里 `new (a: number): I` 该是一条成员签名（缺 3 多 3）
// xl:end
const v = { new (a: number): I };
