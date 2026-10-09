// xl:note 第 869 轮普查量出的缺口（import-type-comment-2）：这一条钉的是上面那条根因的一个落点
// 第 875 轮转绿（用例留着当守卫）：与 `-1` 同一个根——`import type /*c*/ { A }` 里
// `type` 右边那一格是注释，`IsImportExportTypeClauseBrace` 跨过去之后导入列表才成形。
import type /*c*/ { A } from "m";
