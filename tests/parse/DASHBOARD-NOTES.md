# 差值仪表的已知口径（tests/parse/gap-dashboard.mjs）

仪表把「TS 侧的构造集合」与「产物侧的标签集合」逐文件对账，并把**正向差额（真缺）**与
**负向差额（真多）**分开统计。用它可以避免「净额互相抵消」造成的"差额全为 0"假象
（`differential.mjs` 是净额口径，两者互补：净额看趋势，仪表看真相）。

但仪表本身也有口径，下面这些**已经在源码里注明或刻意保留**，读数字时要知道：

## 一、已从账上剔除（不是缺口）

| 项 | 为什么剔除 |
| --- | --- |
| 多声明符 `const a = 1, b = 2` | 一个 `VariableStatement` 的多个声明符只对应一个 `Let` 节点（与 `differential.mjs` 同口径） |
| `for` / `for-in` / `for-of` 的声明 | 它们属于 `ForInitial` / `ForeachDefine`，不是 `Let` |
| 字面量类型里的负号 `-1 \| 0 \| 1` | TS 的 AST 记成字面量类型里的 `PrefixUnaryExpression`；本工程按类型收进 `TypeDefine`，口径不同 |
| 赋值族 `=` 与复合赋值 | 本工程不做赋值节点（`CompoundAssignmentOperator` 单独一套） |
| `&&` / `||` | 走 `LogicalOperator` |
| `<` / `>` | 与泛型实参同形，`GenericTypeBranch` 在词法阶段就要靠它们配对 |
| 映射类型的成员 `{ [K in keyof T]: V }` | 在 TS 里是 `MappedTypeNode`，`K` 是**类型参数**而不是 `PropertySignature`；产物那边是正确的（一个 `Field`） |
| catch 子句的绑定 | 对应 `CatchDefine`，不是 `Let` |
| 构造签名被 `<New>` 包住 | 按**后代**计数，不是只看直系（`Signature Kind="construct"` 里有 `<New>`） |

## 二、真缺里混着的「口径差」——不是解析器的问题

这些会在「真缺」里占位，但它们反映的是**标签表的选择**，不是节点丢失：

| 形状 | 实际情况 |
| --- | --- |
| **逗号表达式** `a, b` / `a++, b++` | 标签表里没有 Sequence 标签，产物是平铺单元（设计如此） |
| **值位位运算** `a & b` / `a \| b` / `a ^ b` | `binary-operator.xl.md` 刻意排除（`\|` / `&` 在类型位另有含义），要收得先有值位/类型位判别 |
| **复合赋值** `a &&= b` / `a ??= b` 等 | 本工程只把 `+= -= *= /=` 折成 `左值 = 左值 op 右值`，产物因此多一个二元节点而 TS 侧被剔除——**两侧口径不同**，不是缺节点 |
| **常量枚举成员** `const enum E { A = 1 << 2 }` | TS 把 `<<` 记成 BinaryExpression；枚举成员初始化式在本工程里是成员值文本 |
| **类 `static {}` 初始化块** | TS 里是 `ClassStaticBlockDeclaration`（内含 `Block`）；标签表里没有 Block/静态块标签，产物把内容收在 `<Statement><Keyword>static</Keyword><Bracket>{…}</Bracket></Statement>` 里（内容没丢） |
| **空类型字面量** `() => {}` | 产物是 `<Bracket>{}</Bracket>`（空括号），TS 记成空 `TypeLiteral`——是否该出空 `TypeLiteral` 是设计选择 |

**判据**：要判断「某个真缺是不是解析器的问题」，先看它在不在上表里；不在，再按
「最小片段 → 产物对比 → 逐判据插桩」三步定位（`tests/parse/probe.mjs` 提供前两步）。

## 三、负向差额（真多）大多是**故意的**

`<JsonArray>` / `<Lamda>` / `<New>` 的「真多」动辄上千，原因是**同一批语法在两侧的归类口径不同**：

- `a[0]` 的下标括号在 TS 里是 `ElementAccessExpression`，本工程里那个 `[` 是一个 `Bracket`
  （或 `JsonArray`）——仪表按 `ArrayLiteralExpression` 计 TS 侧，于是产物侧"多"；
- 类型位的函数类型 / 元组也一样：TS 有 `FunctionTypeNode` / `TupleTypeNode`，本工程把括号原样收着。

所以**判断进展只看「真缺」**；「真多」只在同一组的两个方向同时异常时才值得看
（例如某个标签既真缺又真多，通常说明标签被非对应构造占用了）。

## 四、用法

```bash
node tests/parse/gap-dashboard.mjs --top 6      # 每个构造组列 6 个样本
node tests/parse/gap-dashboard.mjs cases        # 只看用例语料
node tests/parse/gap-dashboard.mjs --json out.json
```

退出码：真缺为 0 时 0，否则 1——可以直接当 CI 判据用。
