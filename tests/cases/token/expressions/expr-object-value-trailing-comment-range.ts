// xl:note 对象字面量属性值里含尾随注释时，PropertyAssignment 的终点
// xl:round 923
// 第 923 轮收掉（变异体普查量出的）：`{ f: () => ({ v: 1 })/*c*/ }` 里那条注释落在箭头的
// 体里（`LamdaBody > Statement`），而属性终点原来取的是「最后一格的终点」⇒ 盖到注释末尾
// （实测 TS `PropertyAssignment[12,31)` vs 产物 `[12,36)`：漂 1 多 1）。
// 修法：终点取**值那一格投影出来的 `end`**（它已经过 `stmtEndOf` 剪掉尾部 trivia，
// 与第 132 / 853 轮在语句族与 `Let` 上用过的同一条口径）。
// 注释本身仍然留在产物里，只是不算进属性的区间。
// xl:expect PropertyAssignment,Lamda,ObjectLiteral
// xl:end
const o = { f: () => ({ v: 1 })/*c*/ };
