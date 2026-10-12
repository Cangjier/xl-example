// xl:note `typeof import("m")` 的限定名尾巴：右括号与 `.` 之间夹一条注释（第 907 轮片段普查量出）：TS 那边整段仍是一个 `ImportType`（区间到 `A`），产物的 `ImportType` 停在 `)`，`.A` 留在外面
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `ImportTypeCloseRule.IsNameTailAt` 的两跳都走 `SkipNextWrapSymbol`（只跳软换行）——
// 注释挡在 `)` 与 `.` 之间时判据给否；`Process` 的搬运循环也从 `endIndex` 起跨同一跳。
// 两处一起改成 `SkipNextTrivia` 之后限定名整段收进 `ImportType`（区间到 `A`）。
// xl:expect ImportType:1,Keyword:1,Identifier:1,AreaAnnotation:1
// xl:end
type T = typeof import("m")/*c*/.A;
