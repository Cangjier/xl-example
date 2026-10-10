// xl:note 第 975 轮收掉：`a!()()() + 1`：原来漂 1（最外面那一格 `CallExpression` 的区间只到 `[0,6)`）——**续格长在二元单元里面**那一档（`chainTailInOperator`）把那一格 `Method` **摊成了它的孩子**，而那一格自己说的是三次调用 ⇒ 少一层；现在整格 `Method` 不摊开（留给链循环按「最里面那一格」折），`PropertyAccess` 那一档照旧摊开。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 单看 `a!()()()` 是对的（三格调用都在），所以差的不是 `graftCallee` 那一对，
// 而是**摊平那一趟**（`flattenChainTailInOperator`）交给链循环的形状少了一格；
// 入手处就在那一支：摊出来的 `Method` 格子要保住「外面还有一层」的区间。
// xl:end
a!()()() + 1;
