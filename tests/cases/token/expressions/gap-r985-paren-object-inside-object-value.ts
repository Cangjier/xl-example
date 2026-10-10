// xl:known-gap 第 985 轮第十批底样（嵌套宿主）量出：**对象字面量里那个 `(` 分组、组内第一个实义单元是 `{`** 时，`TypeLiteralCloseRule` 那一支（`type-literal.xl.md` 的「括号里的第一个 `{`」）拿 `IsTypePosition(外层列表, 括号那一格)` 判，而括号前面那个 `:` 是**对象字面量的属性分隔冒号** ⇒ 判成类型位（实测 `const v = { k: ({ a: 1 }) };` 缺 2 漂 0 多 3、`{ k: ({ ...o }) }` 缺 2 漂 0 多 2）。同一族的「上级是 `DecideBracketContext` 的冒号那一支」早就用 `EnclosingBraceContext` 修过（第 76 轮），这一处还没接上。入手处：`type-literal.xl.md` 第 307 行那一支加一句「外层花括号是值位 ⇒ 值位」。
// xl:note 对象字面量的属性值里那个 `({ … })` 分组：里面是**对象字面量**，不是类型字面量
const v = { k: ({ a: 1 }) };
const w = { k: ({ ...o }) };
const u = { k: ({ a: 1 } as any) };
