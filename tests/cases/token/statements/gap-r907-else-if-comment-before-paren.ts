// xl:note `else if` 的 `if` 与 `(` 之间夹一条注释（第 907 轮片段普查量出）：TS 那边整条是一条 `IfStatement`（`elseStatement` 是里层那条），产物的 `IfStatement` 停在第一个块上、`else` 成了 `Identifier`
// xl:round 907
// xl:known-gap `else` 那一支接里层 `if` 时，判据只看紧跟 `else` 的词、再看 `if` 后面**紧跟**的 `(`；注释让第二跳落空（`SkipNextWrapSymbol` 只跳软换行）
// xl:end
if (a) {} else if/*c*/ (b) {}
