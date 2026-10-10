// xl:note 映射类型的**值那一格**：冒号与值之间夹一条注释再换行（第 948 轮片段普查量出）。
// `type T = { [K in T]: //c` 换行 ` X };` 里那条行注释把 `:` 与 `X` 隔开——
// `SkipPreviousTrivia` 跳回的是冒号自己，而 `HasLineBreakBetween` 在 `:` 与 `X` 之间
// 量得到那个换行（注释把它夹在中间）⇒ 判成「值类型之后的成员」⇒ `X` 被收成一条
// **没有类型的成员**（`<Field>`，投影成 `PropertyDeclaration`），而 TS 的 `parseMappedType`
// 里 `:` 之后那一段**只可能是值类型**（`TypeReference`）。
// 修在 `field.xl.md` 的成员判据上：上一格是冒号（或与冒号并成一格的 `?:`、单独一格的 `?`）
// 时，这一格不是成员名；值类型**收完之后**才轮到「得有换行或 `;`」那一条。
// 同一个构造的其它排版（注释不换行、只换行不夹注释、已认领的 `-?`）本来就对，一起钉这里当守卫。
// xl:expect MappedType:4,TypeDefine:4,LineAnnotation
// xl:absent Field
type T = { [K in T]: //c
 X };
type U = { [K in T]: /*c*/ X };
type V = { [K in T]:
 X };
type W = { [K in T]-?: //c
 X };
