// xl:note 箭头的返回类型是**带括号**的函数类型（`(): (() => void) => …`）：外层那个括号该收成 `ParenthesizedType`
// xl:round 927
// 第 928 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：分开「返回类型那个括号」与
// 「形参表那个括号」的判据只有一格——括号里装的是**类型**还是**形参**（空括号 / 顶层 `TypeDefine`
// ⇒ 形参表）——住在 `text-common-util.xl.md` 的 `IsArrowReturnTypeBracket`，由
// `LamdaCloseRule.FindParameters`（`=>` 左边是不是形参表）、`IsFunctionTypeArrow`
//（`=>` 后面那个 `{` 是块还是类型字面量）、`TypeLiteral.IsTypePosition`（从体回扫、跨箭头时那一格）
// 三处共用；根因与推演见 tests/parse/typescript-parsing-gaps.md 第 928 轮那一节。
// xl:expect Let,Lamda,LamdaParameters,ReturnType,TypeDefine,ParenthesizedType,FunctionType,Keyword,LamdaBody
// xl:end
const k = (): (() => void) => { return; };
