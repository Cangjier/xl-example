# namespace cangjie

分支条件的返回值：是否成立，外加一个给分支自定义的消息号。

# class BranchConditionResult

分支条件的结果。

**这一格从第 1205 轮起不再每次现造**：`Branch.Condition` 写的是**那一条 `Branch` 实例自己的
草稿纸**（`Branch.Result`，见 `branch.xl.md` 那一格）——所以这个类型今天只有
`Success` / `Message` 两格数据，**没有构造点、也没有值语义**：
`FromBool` / `FromInt` / `Clone` 三个出口随这一轮删掉（全仓读者 **0**，
按「没有读者的格子不留」——第 1197 轮删 `Method.CoreKind` 是同一条口径）。

## field Success:bool = false

条件是否成立。

## field Message:int = 0

分支自定义的消息号。约定：`0` 表示「新建一个单元」，`1` 表示「追加到上一个单元」——具体含义由各 `Branch.Condition` 与 `Branch.Success` 共同解释。
