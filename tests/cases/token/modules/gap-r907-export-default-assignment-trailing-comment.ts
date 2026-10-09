// xl:note `export default 1/*c*/;` 的尾随注释（第 907 轮片段普查量出）：TS 那边 `ExportAssignment` 的区间是 `[0,22)`（到下一格实义单元的 full start，注释算在里面），产物停在 `1` 之后（`[0,16)`）
// xl:round 907
// 第 909 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `print-ast-common.xl.md` 投 `ExportAssignment` 那一格——尾分号那一问看的是
// 「`end` 那一格是不是 `;`」，而 `export default 1/*c*/;` 的 `end` 后面紧挨着的是
// **注释的开头** ⇒ 区间停在 `1` 之后（产物 `[0,16)`、TS `[0,22)`）。
// 现在先把空白与注释跳过（换行也跳：`export default 1` 换行 `;` 在 TS 那边同样含 `;`）
// 再问一次，跳过去是 `;` 就把区间伸到它后面。
// xl:expect Export:1,Keyword:2,Identifier:1,AreaAnnotation:1
// xl:end
export default 1/*c*/;
