// xl:note 返回类型里「括号 + 注释 + 箭头」：注释不该把函数类型拆开
// xl:round 926
// 第 926 轮收掉（第 923 轮普查登记的余量二的主半）：`on(): ()/*c*/ => void` 里那条块注释
// 原来把 `ParenthesizedTypeCloseRule.IsFunctionParameterList` 的第 1 条判据（括号后面紧跟 `=>`）
// 挡在门外——它只跳软换行 ⇒ `()` 先被收成 `ParenthesizedType` ⇒ `FunctionTypeCloseRule`
// 往左看到的不再是 `Bracket` ⇒ 整条函数类型不成形（缺 `FunctionType` / `VoidKeyword`、
// 多一个 `ParenthesizedType`）。修法：那一条也走 `SkipNextTrivia`（第 817 / 873 轮同一条口径：
// 夹一条注释与夹一个软换行是同一件事）。同一族的**体**那一半还开着，见
// `token/declarations/gap-return-type-fn-comment-body.ts`。
// xl:expect FunctionType:2,ReturnType:1,Interface:1,MethodDeclaration:1,TypeAssign:1
// xl:end
interface I { on(): ()/*c*/ => void; }
type T = ()/*c*/ => void;
