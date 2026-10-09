// xl:note 换行后的 `++` 是前缀式：`a` 与 `++b` 是两条语句
// **合并**（第 784 轮）：token/statements/stmt-asi-prefix-increment.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
a
++b
