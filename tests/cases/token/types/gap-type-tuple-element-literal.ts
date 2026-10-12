// xl:note 元组元素位的花括号：`type T = [{ a: 1 }]` 里那个 `{` 是类型字面量
// xl:expect TypeLiteral,TupleType,Field
// 第 868 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `IsTypePosition` 里「括号里的第一个 `{`」那一支只认 `(`——`[` 一问就退回「问外层列表」那套递归，
// 而按前文判恰好给反（`f([{…}])` 里 `[` 前面是 `(`、`const o = { b: [{…}] }` 里前面是 `:`）
// ⇒ `type T = [{ a: 1 }]` 里那个 `{` 落成 `ObjectLiteral`（TS 是 `TypeLiteral`，缺 3 多 2）。
// 现在 `[` 那一档**直接读 `Bracket.Context`**（开括号那一刻算好的），并把两个会给错答案的入口挡住：
// `DecideBracketContext` 的冒号那一支（跨过 `=` 之后撞上的冒号不是本括号的标注 ⇒ 值位）、
// 绑定模式里的 `[`（`IsBindingPatternBrace`，沿括号链往上问）、`typeof` 后面的 `[`（继续往前扫）。
// 实测那一族探针全绿，`cases:tsast` 全语料缺 0 漂 0 多 0、已知缺口 1 → 0。
type T = [/* c */{ a: 1 }];
