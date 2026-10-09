// xl:note `export default 1/*c*/;` 的尾随注释（第 907 轮片段普查量出）：TS 那边 `ExportAssignment` 的区间是 `[0,22)`（到下一格实义单元的 full start，注释算在里面），产物停在 `1` 之后（`[0,16)`）
// xl:round 907
// xl:known-gap 这一格的区间取的是「表达式最后一个单元」的末尾，而 TS 的 `finishNode` 取的是**下一格 token 的 full start**（注释也在内）——本仓别处那些「收尾期把尾随 trivia 收进节点」的做法没铺到 `export default` 这一支
// xl:end
export default 1/*c*/;
