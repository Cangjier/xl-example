// xl:note `case 1:` 与块之间夹一条注释（第 907 轮片段普查量出）：TS 那边块里的 `break;` 是一条 `BreakStatement`，产物把 `break` 落成 `Identifier`、`;` 落成 `SemicolonToken`
// xl:round 907
// xl:known-gap 「段头之后是块」那一支的判据紧跟 `:`（只跳软换行），注释挡住它 ⇒ 块没被认出来，里面的 `break;` 没了语句壳
// xl:end
switch (a) { case 1:/*c*/ {break;} }
