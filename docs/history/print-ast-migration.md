# 把 `ts-ast.xl.md` 落到 `PrintAst` 上——结果与搬迁手册

**诉求**：「将 `ts-ast.xl.md` 的功能全部落地在 `PrintAst` 上，移除 `ts-ast.xl.md`，
由 `PrintAst` 完全承接。」（第 134 轮评估，第 181–198 轮执行）

**结果**：

| 证据 | 值 |
| --- | --- |
| `typescript/ts-ast.xl.md` | **已不存在**（`git mv` 到 `typescript/print-ast-common.xl.md`） |
| `projectNode` 里那个按 `v.type` 分派的中央 `switch` | **整段删除**（原来 60 个 `case`，现在 0 个） |
| 逐标签投影块 | **49 块全部搬进各 token 的 `PrintAst`** |
| 全量对拍 | 逐文件完全一致，四方向全 0（当前的绝对值见根 [README](../../README.md) 的「当前状态」） |

`projectNode` 现在的三步：

1. `v = view(node)`；
2. **问这个节点自己**：`owner.PrintAst(ctx, v)`——覆写了就由它出这一格
   （`ctx.Nothing` 表示「这一格故意不出节点」）；
3. 没覆写（或返回 `undefined`）才落到 `print-ast-common.xl.md` 的**通用支**（三张表 + `structuralProps`）。

## 什么能搬、什么必须留下

判据：**能搬 = 所有调用点都能改写成「把某个单元交给 `projectNode`」**；
不能搬 = 调用方拿到的是「已经取出来的一串单元」或「外层递进来的起点」。

按这条判据，`TypeDefine` / `TypeAssign` / `Statement` 这些原本判为「必须留」的都搬走了
（前者把直调点改成 `ctx.Project`，后者把外层起点经 `ctx.baseStart` 递进去）。
留下来的**不是「投影逻辑」，而是 `PrintAst` 的地基**：

- `ctx`（递给 `PrintAst` 的出口集合）——搬迁层不许 import 本文件（会成环），横切工具只能经它过去；
- 通用支的三张表（`KIND_BY_TAG` / `WRAPPER_FIELDS` / `FIELD_BY_KIND`）；
- **被共享层自己调用、且调用方拿不到「单元」这个入口**的函数（表达式重写器
  `projectExpression` / `projectTypeExpression`、`projectLetFrom`、`memberNameOf`、`addModifiers`…）。

所以「移除 `ts-ast.xl.md`」的准确含义是**移除中央分派表 + 给共享实现换名字**，
而不是把每一行都挪走；行数不减少，只重新分布。

## 搬迁手册（踩过的七个坑，按类型归并）

1. **搬之前先 grep 这个函数名**：除 `case` 之外常有内部直调点；有就改成通用分派
   （`ctx.Project(那个单元)`），别把实现留在原地（`projectFunctionType`、`projectTypeDefine`）。
2. **`PrintAst` 收到的 `v` 是视图，不是原始 Map**；凡是从 `ctx` 出去、要吃一棵（子）树的出口，
   一律先 `node instanceof Map ? view(node) : node` 再转调。
3. **kind 字面量逐字照抄**：本工程多处用短名（`IndexSignature` / `DoStatement` /
   `NonNullExpression`），顺手改成 TS 枚举名会让整类算「缺 + 多」。
4. **宽松判定逐字照抄**：`String(x ?? "false") === "true"` 这类是刻意的，产物里那个属性
   可能是**布尔**（`typeOnly` 那一格：全量对拍掉到 1400/1407 才抓到）。
5. **同名遮蔽**：token 文件里可能有与全局同名的 `String` / `Number` 类，
   从共享层搬过去的裸全局调用会静默换语义。
6. **同标签多 `case`、空标签 fallthrough** 在逐节点出口就位后都是死代码，
   但删除顺序错了会让死代码复活。
7. **`undefined` 有两种含义**：token 出口的 `undefined` ＝「没覆写，请走通用支」；
   而有些出口是**故意**不出节点的——用 `ctx.Nothing` 分开。

搬迁的机械规则（照抄即可）：

| 原写法 | 搬迁后 |
| --- | --- |
| `projectableKids(v)` | `ctx.Kids(v)` |
| `projectExpression(list, ctx)` | `ctx.Expression(list)` |
| `projectTypeExpression(list, ctx)` | `ctx.TypeExpression(list)` |
| `projectNode(x, ctx[, kind])` | `ctx.Project(x[, kind])` |
| `textOfNode(x, ctx)` | `ctx.TextOf(x)` |
| `stringText(v, ctx)` | `ctx.StringText(v)` |
| `startOf / endOf` | `ctx.StartOf / ctx.EndOf` |
| `stmtEndOf(v, ctx)` | `ctx.StmtEndOf(v)` |
| `splitTopLevel(list, ctx, sep)` | `ctx.Split(list, sep)` |
| `{ kind, pos: v.start, end: stmtEndOf(v, ctx), ...props }` | `ctx.Node(kind, props, v)` |
| `INVISIBLE` / `nameOf` / `isDot` / `isSymbol` | `ctx.Invisible` / `ctx.NameOf` / `ctx.IsDot` / `ctx.IsSymbol` |

**验收判据**：`cjcli <文件> --ts-ast` 与 `ts.createSourceFile` 逐文件比较，
完全一致即认为搬迁没有改变行为——`npm run cases:tsast` 就是这条判据的实现。
