// xl:note 第 880 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `declare global` 换行 `{ … }`：`declare` 是上下文关键字（不是保留字），「等着体的声明头」
// 那张词表里没有它 ⇒ 换行处收壳 ⇒ `declare global` 成一条 `ExpressionStatement`、
// `{ … }` 落成裸 `Block`（缺 `ModuleDeclaration` / `Identifier` / `ModuleBlock` 三处、多 2）。
// 修法：词表收 `declare`，但只认**这一段的段首**那一格（段首由 `SearchFrontIndexed` +
// `IsStatementBoundary` 划——`SkipNextTrivia(data, -1)` 会被语料里那几行 `// xl:` 注释头挡住）。
declare global 
 { interface W { a: number } }
