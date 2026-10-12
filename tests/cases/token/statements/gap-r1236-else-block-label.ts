// xl:note 第 1236 轮**新登记**的一格（用户口径 1.1，摊「引出一个值的词 + 花括号」时撞出来的）：
// **`else` 的体里那条标签——而且只有「末尾没有分号」那一档**。
//
// `if (a) { } else { b: 1 }` 在 TS 里是 `else` + 一个 `Block`，块里是一条**标签语句**
// （`LabeledStatement(b)` 套 `ExpressionStatement(1)`）；产物那一列是**缺 3 多 1**——
// 体那个花括号**认对了**（`<IfBody>` 当场成形），坏在体里面：「名字 + 冒号」被
// `TypeDefine` 收成了**类型标注**（`<TypeDefine><LiteralType>1</LiteralType></TypeDefine>`），
// 于是既没有 `LabeledStatement`、也没有那条表达式语句。
//
// **分界线是「一行写完 + 末尾没有分号」**（同一轮实测）：`else { b: 1; }`（带分号）
// 与**换行写**的同一形状都**逐节点一致**，只有这一份（一行、末尾无分号）坏 ——
// 所以这一格不是「`else` 的体里认不出标签」，而是「标签体什么时候算写完」那一问
// 在**同一行就到体末尾**时答错了。
//
// （按本仓规矩**只登记、不收**：根因在 `LabelCloseRule` 的收尾与 `TypeDefineCloseRule`
// 谁先伸手，与这一轮改的 `IsStatementStart` 不是同一处。）
// xl:known-gap `else` 的体里那条裸标签（一行写完、末尾没有分号）被收成类型标注
// xl:round 1236
// xl:end
declare const a: any, b: any;

if (a) { } else { b: 1 }
