// xl:note 第 869 轮普查量出的缺口（import-type-comment-1）：这一条钉的是上面那条根因的一个落点
// 第 875 轮转绿（用例留着当守卫）：`type` 那一格与子句之间的注释现在跨得过去——判据换成
// `text-common-util.xl.md` 的 `IsImportExportTypeClauseBrace`（左右两侧都走 trivia 口径），
// `ImportClause` 的起点改读 `Import.TypeWordAt`（不再回原文跳空白，否则会先命中注释）。
import /*c*/ type { A } from "m";
