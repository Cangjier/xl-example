// xl:note `f<T>`${1}``：同一条根的第三面——模板**带插值**时丢的不只是模板那一格，
//        整棵 `TemplateExpression`（`TemplateHead` / `TemplateSpan` / `TemplateTail` /
//        里面那个 `NumericLiteral`）一起丢（实测缺 6 多 1）。三面一起登记，是因为
//        「合成那一刻的入口判据」把三者一起挡在门外——收的时候应当**一次全绿**。
// xl:round 977
// xl:known-gap 带插值的模板串与实例化表达式没合成 `TaggedTemplateExpression`（整棵 TemplateExpression 都丢）
// xl:end
const a = f<T>`${1}`;
