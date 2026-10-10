// xl:known-gap 第 975 轮普查量到：`a!()()() + 1`：漂 1（最外面那一格 `CallExpression` 的区间只到 `[0,6)`，TS 是 `[0,8)`）——**续格长在二元单元里面**那一档（`chainTailInOperator`）：摊平之后那格 `Method(name=""[Method(name=""[Bracket])])` 只折出两层调用，外面那一层没有节点。
// xl:round 975
// 第 975 轮清空清单之后换了一批更深的底样（48 条），这一条是其中之一。
// 量法：`node tests/parse/ts-ast.mjs --snippets tmp/r975/survey.mjs`。
// 单看 `a!()()()` 是对的（三格调用都在），所以差的不是 `graftCallee` 那一对，
// 而是**摊平那一趟**（`flattenChainTailInOperator`）交给链循环的形状少了一格；
// 入手处就在那一支：摊出来的 `Method` 格子要保住「外面还有一层」的区间。
// xl:end
a!()()() + 1;
