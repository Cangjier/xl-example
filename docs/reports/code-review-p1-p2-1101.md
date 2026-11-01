# tts/success 类型层改动：P1 / P2 审查报告

- 日期：2026-11-01
- 分支 / 提交：`feature/all-possible-1101` / `46892c43`
- 规则来源：`docs/IMPORTANCE.md`（27 条，代码 26 / 文档 1）
- 审查工具：`cj-ts-code-review`（`code_review`，宿主默认模型 `deepseek-official / deepseek-flash`）
- 审查阶段：P1（约束）、P2（质量）

## 范围

审查的是本次提交改动的实现文件：

- `typescript/shapes/types/type-alias-declaration-shape.xl.md`
- `typescript/shapes/types/type-alias-possible-shape.xl.md`
- `typescript/shapes/types/type-function-incremental.xl.md`
- `typescript/shapes/types/type-node-shapes.xl.md`

**未覆盖**（超过 `maxFileBytes=24000`，被审查器跳过，不在本报告内）：

- `typescript/shapes/types/type-conditional-chain.xl.md`（49905 字节）
- `typescript/shapes/types/type-parser.xl.md`（60891 字节）

## 当前门禁状态

- `tts:cases`：182/182 PASS
- `case_fix verify dir=success`：`status=pass`，P0 0
- 本报告只记录 **P1 / P2**；P0 已清零

---

## P1 约束（8 条）

### 1. 未消费 basic token 被直接过滤

- 文件：`typescript/shapes/types/type-alias-declaration-shape.xl.md:40`
- 规则：`R2.5-2` 按照形状预期，应该收到 build 的 shape 下面，由后续 basic tokens 关闭时/EOF 触发消费
- 代码：`!item.IsBasicToken`
- 说明：增量收口时把未消费的 basic token 直接过滤掉，没有按规则挂到 build 的 shape 下面等待后续关闭/EOF 消费。
- 建议：将 basic token 挂载到对应 shape 并保留，等待消费。

### 2. 在 Close 里整段解析类型体

- 文件：`typescript/shapes/types/type-alias-declaration-shape.xl.md:49`
- 规则：`R4.2-1` 正确的应该什么时候 build
- 代码：`TypeParser.ParseAlias(this.Data, this.Data.length, this.Template)`
- 说明：在 Close 中整段解析类型体，相当于在 close 时才 build，违反应在正确时机 build 的约束。
- 建议：将类型体解析移至 build 阶段增量完成。

### 3. Close 后 Data 里仍有非形状 token

- 文件：`typescript/shapes/types/type-alias-declaration-shape.xl.md:99`
- 规则：`R2.7-3` 形状 `Close` 之后 `Data` 就等价于 AST 的 children——只剩子节点形状
- 代码：`data.push(parsed.Name);`
- 说明：Close 后 Data 应只剩子节点形状，但这里将 Name 作为 Token 压入 Data，不是形状。
- 建议：将 Name 转为对应形状节点再放入 Data。

### 4. 越界时返回 Uncertain 而非 Nothing

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:90`
- 规则：`R2.11-1` 越界：`host.Data[tokenIndex]` 不存在 → 返回 `Nothing`（调用方可能按旧长度遍历）
- 代码：`if (tokenIndex < 0 || tokenIndex >= units.length) {`
- 说明：`host.Data[tokenIndex]` 不存在时返回了 `ShapeStates.Uncertain`，规则要求 `Nothing`；调用方按旧长度遍历时会误判候选状态。
- 建议：越界分支改为返回 `ShapeStates.Nothing`。

### 5. 函数类型 build 时丢弃 `=` / `=>` 未标记消费

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:197`
- 规则：`R2.5-1` 应该被消费没有消费，这个是 build 的错误
- 代码：`units.splice(equals, tokenIndex - equals + 1, functionType);`
- 说明：`splice` 把 `=` 到 `=>` 之间的单元替换成 functionType，但 `=` 和 `=>` 被丢弃后没有分别 `StampCreated`，属于未消费 basic token。
- 建议：在替换前对 `equals`、`arrow` 等被丢弃的 basic token 标记消费，或按 `R2.5-2/3` 处理。

### 6. 谓词 `name..is` 段被 splice 后未标记消费

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:432`
- 规则：`R2.5-1` 应该被消费没有消费，这个是 build 的错误
- 代码：`const tail = units.splice(nameIndex, tokenIndex - nameIndex + 1);`
- 说明：`splice` 把 name 到 `is` 之间的单元全部移出 Data，其中 `is` 被丢弃但只记录了 `TypeStart`，没有对 `is` 调用 `StampCreated`。
- 建议：对 tail 中的 `is` 等 basic token 标记消费，或按 `R2.5-2/3` 挂到 build 后的 shape 下并 Reclose。

### 7. `is` 直接删除但未标记消费

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:518`
- 规则：`R2.5-1` 应该被消费没有消费，这个是 build 的错误
- 代码：`predicate.Data.splice(tokenIndex, 1);`
- 说明：直接删除了 `is` basic token，方法返回 `predicate` 而不是 `StampCreated`，`is` 没有被标记消费。
- 建议：对 `unit` 调用 `StampCreated` 并保留 predicate 状态，或按未消费 basic token 的规则挂载/Reclose。

### 8. Quit 前未清理 tokenIndex 之后的 trivia/basic token

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:601`
- 规则：`R2.7-3` 形状 `Close` 之后 `Data` 就等价于 AST 的 children——只剩子节点形状
- 代码：`for (let at = tokenIndex - 1; at >= 0; at--) {`
- 说明：这里只回看并清理 tokenIndex 之前的 trivia/basic token，tokenIndex 之后的单元仍留在 `predicate.Data` 中；`predicate.Quit()` 后 Data 不完全等价于 AST children。
- 建议：在 Quit 前同样清理 tokenIndex 之后的 trivia/basic token，确保 Close 后 Data 只剩子节点形状。

---

## P2 质量（7 条）

### 1. 可增量却整段 ParseAlias

- 文件：`typescript/shapes/types/type-alias-declaration-shape.xl.md:49`
- 规则：`R2.8-2` 如果可以增量创建形状，但使用全量创建形状，则质量等级为差
- 代码：`const parsed = TypeParser.ParseAlias(this.Data, this.Data.length, this.Template);`
- 说明：没有走增量路径的类型体直接对整段 Data 调用 ParseAlias，一次性把别名头部与正文全部重新解析；别名头部、首个 TypeReference 等本可沿用已有的增量形状。
- 建议：沿用已增量长出的 Name、TypeParameters 和首个 TypeReference，只用 TypeParser 补齐尚未增量的后缀（`[]`、`|`、索引等）。

### 2. HasBuiltType 每轮全量遍历

- 文件：`typescript/shapes/types/type-alias-declaration-shape.xl.md:82`
- 规则：`R2.8-1` compute/build 如果每轮都进行寻找/遍历，则质量等级为差
- 代码：`for (const item of this.Data) {`
- 说明：HasBuiltType 每次 Close 都重新完整遍历 `this.Data`，逐项 `instanceof` 寻找「已增量长出的类型体」，没有缓存结果。
- 建议：在增量长出类型体时把 `hasBuiltType` 标记写入节点缓存，HasBuiltType 直接读取。

### 3. 返回类型整段 ParseCompleteReturnType

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:55`
- 规则：`R2.8-2` 如果可以增量创建形状，但使用全量创建形状，则质量等级为差
- 代码：`TypeParser.ParseCompleteReturnType(this.Data, this.Data.length, this.Template)`
- 说明：返回类型本可以像谓词分支那样通过 PossibleShape 候选增量长出节点，这里一次性全量创建。
- 建议：在 ReturnTypeContextShape 的 CatalogGuide 上挂返回类型候选，逐单元增量建形状。

### 4. TypePredicateStartPossibleShape 每轮从头扫描

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:298`
- 规则：`R2.8-1` compute/build 每轮寻找/遍历
- 代码：`for (let at = 0; at < tokenIndex; at++) {`
- 说明：每轮从 0 重新扫描到 tokenIndex 判断前面是否全是 trivia，`cache` 参数未使用。
- 建议：把「第一个非 trivia 单元的位置」记录进 `PossibleShapeCache`。

### 5. TypePredicateBarePossibleShape 每轮从头统计

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:357`
- 规则：`R2.8-1` compute/build 每轮寻找/遍历
- 代码：`for (let at = 0; at < tokenIndex; at++) {`
- 说明：每轮从 0 遍历到 tokenIndex 统计 prior 非 trivia 单元，`cache` 未使用。
- 建议：将已见过的非 trivia 单元位置缓存到 `PossibleShapeCache`。

### 6. TypePredicateNamePossibleShape 每轮扫描 IdentifierShape

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:453`
- 规则：`R2.8-1` compute/build 每轮寻找/遍历
- 代码：`for (let at = 0; at < tokenIndex && at < units.length; at++) {`
- 说明：每轮从头扫描 Data 查找是否已有 `IdentifierShape`，`cache` 闲置。
- 建议：把「Data 中是否已出现 IdentifierShape」记录进 cache，每轮 O(1) 判断。

### 7. TypePredicateTypePossibleShape 每轮扫描 TypeShape

- 文件：`typescript/shapes/types/type-function-incremental.xl.md:533`
- 规则：`R2.8-1` compute/build 每轮寻找/遍历
- 代码：`for (let at = 0; at < tokenIndex && at < units.length; at++) {`
- 说明：每轮从 0 遍历 Data 查找是否已有 `TypeShape`，`cache` 未被使用。
- 建议：将「Data 中是否已出现 TypeShape」缓存，避免每轮重新遍历。

---

## 备注

- P1 / P2 的 finding 由模型逐轮判定，同一批文件重跑可能出现条目差异；本报告是 2026-11-01 这一次审查的原始结论。
- 两条大文件（`type-conditional-chain.xl.md`、`type-parser.xl.md`）因超过审查器的 `maxFileBytes` 限制未被覆盖，若要完整审查需先调大该配置。
