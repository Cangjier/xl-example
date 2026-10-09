// xl:note 元组元素位的花括号：`type T = [{ a: 1 }]` 里那个 `{` 是类型字面量
// xl:expect ObjectLiteral
// xl:known-gap 元组元素位上的 `{ … }` 被当成值位的对象字面量（TS 是 `TypeLiteral`）：`[` 与 `(` 是同一问（括号自己那一格是不是类型位），而 `IsTypePosition` 里「括号里的第一个 `{`」这一支这一轮只放宽到 `(`——放宽到 `[` 会把值位的数组字面量成片收成 `TypeLiteral`（第 849 轮实测：coverage 3989 → 3970、六条 e2e 报 `unimplemented: expression TypeLiteral`），要等「括号自己的 Context」那条线启用
type T = [/* c */{ a: 1 }];
