// xl:note `const f = async ():` 换行 `Promise<void> => {}` 是一条 async 箭头（返回类型那一格没写完）
// xl:round 928
// `Statement.IsValueArrowReturnColon` 原来要求形参表左边那一格是 `=`，而这里夹着 `async`
// ⇒ 换行处收壳 ⇒ 整条箭头分家（缺 ArrowFunction / AsyncKeyword / TypeReference，多一条
// ExpressionStatement 与一个 BinaryExpression）。跨过 `async` 之后两条判据照旧；
// 「空形参表」那一格由 `async` 自己撑着（没有 `async` 时仍要求括号里有实义内容）。
// xl:expect Lamda,LamdaParameters,ReturnType,TypeDefine,GenericType,Keyword,LamdaBody,Identifier,Let,SymbolToken
// xl:end
const f = async ():
Promise<void> => {};
