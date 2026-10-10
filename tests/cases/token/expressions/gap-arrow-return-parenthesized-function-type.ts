// xl:note 箭头的返回类型是**带括号**的函数类型（`(): (() => void) => …`）：外层那个括号该收成 `ParenthesizedType`
// xl:round 927
// xl:known-gap 括号里那段函数类型的 `(` 被 `FunctionTypeCloseRule` 当成外层箭头的形参表（`IsFunctionParameterList` 第 1 条只看「括号后面紧跟 `=>`」）⇒ 整条吞掉箭头与体（缺 `ArrowFunction` / `ParenthesizedType` / `Block` / `ReturnStatement` 六格、多 `FunctionType` / `Parameter` / `TypeLiteral` 六格）
// xl:end
const k = (): (() => void) => { return; };
