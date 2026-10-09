// xl:note 第 869 轮普查量出的缺口（import-type-comment-2）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `import /*c*/ type { A }` 与 `import type /*c*/ { A }`：`type` 那一格与子句之间的注释没跨过去 ⇒ `typeOnly` 那一支判不出、`ImportClause` 与 `NamedImports.elements` 一起丢
import type /*c*/ { A } from "m";
