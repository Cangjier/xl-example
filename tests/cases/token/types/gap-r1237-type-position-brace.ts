// xl:note 第 1237 轮**新登记**的一族（用户口径 1.1，换地形普查「某个词 + 花括号」那一层撞出来的）：
// **类型位的「词 + `{`」——`is` / `asserts` 与 `extends` 三档**。
//
// 第 1236 轮量的是 `IsStatementStart` 里那张 `Keyword` 名单（值位那一侧）；这一轮把
// **类型位那一侧**摊成 20 条（`tmp/r1237-probe.mjs`，`extends` / `keyof` / `as` / `satisfies` /
// `is` / `asserts` / `readonly` / `unique` / `infer` / `typeof` / `new` / `declare` /
// `abstract` / `get` / `set` / `override` / 索引签名 / `in` / 箭头返回类型 / 元组），
// 三条对不上、其余（含 `keyof { … }` / `as { … }` / `satisfies { … }` / `readonly { … }[]`
// 那几档**一直是好的**）一条没动：
//
//     interface I extends { a: 1 } { }                       缺 8 多 2
//     function f(x: any): x is { a: 1 } { return true; }     缺 4 漂 1 多 5
//     function f(x: any): asserts x is { a: 1 } { }          缺 6 漂 1 多 6
//
// **三档各自量到的现场**（都记在这一份里，都是「类型位里那个 `{` 的边界在哪」这一件事）：
//
// · `extends { … }`：产物的 token 树**一格不缺**（`Keyword(interface)` / `Identifier(I)` /
//   `Keyword(extends)` / `TypeLiteral`），缺的是**整条 `InterfaceDeclaration`** —— 接口头那一趟
//   没认下这一格。第 955 轮给同一处补过「括号化的实体名」（`extends (J)`），这一档是**类型字面量
//   当实体名**，与那一支同形不同类（`InterfaceBranch` 的实体名那一格走 `TakeDottedName`，
//   只认 `Identifier`）。**入手处**：照第 955 轮那一支的形状，再放开「这一格是已收好的
//   `TypeLiteral`」；判据要问「实体名那一格是什么」，不要问「`{` 是什么」。
// · `is` / `asserts`：谓词那个 `{` 是**类型字面量**，而它后面紧跟着**函数体那个 `{`** ——
//   两个 `{` 挨着。第 957 ~ 959 轮给谓词修过「括号化的类型」那一档（`x is (string)`），
//   这一档是**类型字面量**，落点仍在 `TypePredicateCloseRule`（谁先吃掉第一个 `{`）。
//   **入手处**：谓词的类型那一格走**与成员类型同一条**投影入口（第 956 轮那条结论的第二次应用）。
//
// （按本仓规矩**只登记、不收**：三档都不是第 1236 轮改的那一句判据；三档后来均已修复，
// 按规则撤掉 `known-gap` 指令。）
// xl:round 1237
// xl:end
interface I extends { a: 1 } { }

function f(x: any): x is { a: 1 } {
  return true;
}

function g(x: any): asserts x is { a: 1 } { }
