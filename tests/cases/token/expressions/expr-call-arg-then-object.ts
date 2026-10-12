// xl:note 形参表后面紧贴逗号 ⇒ 那是**实参表**，不是方法声明（第 76 轮）：`mk(f(text), { text })` 里 `BodyIndex` 原来会一路扫到后面那个 `{`，把这次调用收成 `MethodDeclaration`（`ReturnType` 是那个逗号、`MethodBody` 是 `{ text }`），连带把简写属性读成标签、把里面的东西读成参数与字面量类型。
// xl:expect Method,ObjectLiteral,Identifier
// xl:absent MethodDeclaration,ReturnType,MethodBody,LiteralType
const p = mk(leafKindOfText(text), { text });
