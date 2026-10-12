// xl:note 第 979 轮收掉：同一条根的第三面——模板**带插值**时丢的不只是模板那一格，整棵
//        `TemplateExpression`（`TemplateHead` / `TemplateSpan` / `TemplateTail` / 里面那个
//        `NumericLiteral`）一起丢（缺 6 多 1）。0a 那一档合成的是 `TaggedTemplateExpression`，
//        它的 `template` 走的就是原来 0b 那条路（`projectNode(模板单元)`），所以插值那一整棵
//        自然跟着回来——三面同轮全绿。
// xl:round 977
// 原来登记的那一句：`f<T>`${1}``：同一条根的第三面。三面一起登记，是因为「合成那一刻的入口判据」
//        把三者一起挡在门外——收的时候应当**一次全绿**。
// xl:end
const a = f<T>`${1}`;
