// xl:note 柯里化的函数类型：返回类型那一段自己也是函数类型，要投成里层那个 `FunctionType`
// xl:round 927
// 第 927 轮（三）转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：token 层按设计把
// `() => () => void` 整段收进**同一个** `FunctionType` 节点，于是返回类型那一格交给类型投影的
// 是平铺的 `Bracket` / `=>` / 类型 三格——`projectTypeExpression` 补了「平铺的 `( … ) => T` 段」
// 那一支（`functionTypeProps` 与 `FunctionType.PrintAst` 共用同一份），
// 且必须排在联合 / 交叉那一支**前面**（`() => A | B` 是 `FunctionType(type = UnionType)`）。
// xl:expect TypeAssign,FunctionType,Keyword,Bracket,SymbolToken
// xl:end
type T = () => () => void;
