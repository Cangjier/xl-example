// EOF 处普通候选与终结候选的收口（§6 B 组回归用例，8/8 已修）
// 每行一个用例；行内 `\n` 是两字符转义，由用例生成器还原成真实换行。
// 共同点：文件最后一条**无分号**语句本身已经完整，但旧的 `StatementScanner.AtEOF` 要等宿主签出
// 才认「本层到头」，于是 `StatementPossibleShape` 在 EOF 哨兵那一格仍活着，撞上
// `SourceFileEndPossibleShape` 的 Accept（CatalogGuide「终结候选与其它候选同时成立」）。
// 修法（statement-possible-shape.xl.md）：AtEOF 增第二条证据——`NextChar` 跳过空白与注释后为空串
// （当前单元之后文档里已经没有内容），让最后一条语句在它自己的最后一个代码单元上收口。
debugger\n
throw new Error("x")\n
throw new Error("bad")\n
throw 1\n
if (a) f()\n
for (const v of xs) f(v)\n
for (let i = 0; i < 3; i++) g(i)\n
while (x < 10) x++\n
done: f()\n
// 对照组：有分号、或文档后面没有别的语句时，旧路径不变（不得因新判据提前收口）
if (a) f();
throw new Error("x");
debugger
