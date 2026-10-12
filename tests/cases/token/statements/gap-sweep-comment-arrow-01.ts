// xl:note SWEEP-comment/arrow 落点（657 审计语料）
// xl:expect Statement:9,LineAnnotation:7,Identifier:3,Parameter:2,AreaAnnotation,Lamda,LamdaBody,LamdaParameters,Let,Root,SymbolToken
// 第 853 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「`const f = (a, b) => a/*c*/;` 的 `VariableDeclarationList` 区间多出一截
// （TS `[0,21)`、产物 `[0,26)`，漂 2 多 2）」——那条尾随注释被收进了
// `LamdaBody > Statement` 里，`Lamda` 自己的区间就盖到了注释末尾（`[10,26)`），
// 而 `projectLetFrom` 取的正是**最后一个单元的原始终点**。
// 修法：两处（列表与声明）改走 `stmtEndOf`——投影层「节点终点不含尾部 trivia」的
// 那一份既有实现（第 132 轮），见 `print-ast-common.xl.md`。
const f = (a, b) => a/*c*/;
