// xl:note `typeof import("m")` 的限定名尾巴：点号与名字之间夹一条注释（第 907 轮片段普查量出）：与「注释在 `)` 与 `.` 之间」同一条根（同一跳的第二处），TS 那边 `qualifier` 照收
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：同一跳的第二处——
// `IsNameTailAt` 认下 `.` 之后又用 `SkipNextWrapSymbol` 去找名字 ⇒ 注释让它落空。
// 与第一处一起改成 `SkipNextTrivia`（判据与搬运两处同一跳）。
// xl:expect ImportType:1,Keyword:1,Identifier:1,AreaAnnotation:1
// xl:end
type T = typeof import("m")./*c*/A;
