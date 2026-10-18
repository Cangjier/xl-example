# IMPORTANCE

1. 本文档只能由用户编辑——AI 与其它工具不得改动。

2. `typescript/tokens/` 下的 `*.xl.md`：禁止散文

3. basic token 构建 shape 时：把 shape 需要的数据**全部提取到字段上**，让 shape 的信息在构建那一刻就完整；basic token 用完即**丢弃**——不得把它挂进 shape 的 `Data` 留给 `Close` 再反向提取。

   `Data` 只承载**子节点形状**（与 AST 的 children 对齐）；词法 token 不是节点，不进 `Data`。
   做法：shape 提供 `FromBasicToken(basicToken)` 之类的入口，在入口里签范围、取字段、关闭；候选形状的
   `BuildByIndex` 调它，然后丢掉 token。