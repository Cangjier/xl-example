// xl:note `import` 与 `.meta` 之间夹一条注释（第 907 轮片段普查量出）：TS 那边是一个 `MetaProperty`（外面套 `PropertyAccessExpression`），产物把整段收成了一条假导入声明（缺 `MetaProperty` / `PropertyAccessExpression` / `Identifier`，多出 `ImportDeclaration` / `ImportClause`）
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `ImportCloseRule.Previous` 的两道护栏（「紧跟 `(`」= 动态导入、「紧跟 `.`」= 元属性）
// 都走 `SkipNextWrapSymbol` ⇒ 注释一夹两道都不响。改成 `SkipNextTrivia` 之后
// `import` 不再被当成声明头，`import.meta.url` 的形状是
// `[Keyword(import), ., PropertyAccess(meta . url)]` —— 正是投影那一支要的三格。
// xl:expect Keyword:1,PropertyAccess:1,Identifier:2,AreaAnnotation:1
// xl:absent Import
// xl:end
const u = import/*c*/.meta.url;
