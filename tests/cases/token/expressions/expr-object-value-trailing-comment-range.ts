// xl:note 对象字面量属性值里含尾随注释时，TS 那边 `PropertyAssignment` 的终点
// xl:round 923
// 第 923 轮收掉（变异体普查量出的）：`{ f: () => ({ v: 1 })/*c*/ }` 里那条注释落在箭头的
// 体里（`LamdaBody > Statement`），而属性终点原来取的是「最后一格的终点」⇒ 盖到注释末尾
// （实测 TS `PropertyAssignment[12,31)` vs 产物 `[12,36)`：漂 1 多 1）。
// 修法：终点取**值那一格投影出来的 `end`**（它已经过 `stmtEndOf` 剪掉尾部 trivia，
// 与第 132 / 853 轮在语句族与 `Let` 上用过的同一条口径）。
// 注释本身仍然留在产物里，只是不算进属性的区间。
// **`PropertyAssignment` 是投影层的 kind、不是产物标签**（产物里属性就是平级的
// `Identifier` + `:` + 值这三格，没有包装类），所以 `xl:expect` 只能钉产物真有的那几格；
// 区间那一半由 `cases:tsast` 拿 TS 的 AST 对拍（见 `validate.mjs` 的 `GHOST_TAGS`）。
// xl:expect ObjectLiteral:2,Lamda:1,LamdaBody:1,LamdaParameters:1,Bracket:1,AreaAnnotation:1
// xl:end
const o = { f: () => ({ v: 1 })/*c*/ };
