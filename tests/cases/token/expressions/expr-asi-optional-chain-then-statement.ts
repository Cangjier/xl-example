// xl:note `a?.b` 换行 `c?.d` 是两条语句：空条件运算符的扫描不能跨过语句边界
// **合并**（第 784 轮）：token/statements/stmt-asi-optional-chain.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
a?.b
c?.d
