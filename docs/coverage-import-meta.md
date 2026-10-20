# import.meta / new.target（cover-import-meta-1）

依据 `docs/expression-ast-analysis.md` §4.4 / §4.5 与本块任务描述；本块不动 `core/**`。

## 1. 落地内容

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/declarations/import-declaration-possible-shape.xl.md` | Stage 1 白名单：`Common` / `Symbol *` / `Symbol ,` / `String` 放行；其余（`.` 等）→ `Stage = 3`（候选退出）。补 `String` token 的 import（此前 `instanceof String` 命中的是全局 `String`，副作用导入因此错误退出）。**壳晚建**时补一次 `built.ComputePossibleShapes(context)`：`import` 之后才轮到的单元是已关闭的 basic token，不会再触发壳自己的候选重算，不补这一下，子句/模块说明符建不出来 |
| `typescript/tokens/declarations/import-declaration-shape.xl.md` | `Close` 先按**白名单**自检（`IsTriviaToken`、`Common{import,from,type,as}`、`Symbol{;, ,, *}`），白名单外当场抛错；过滤后再要求 `ModuleSpecifier` 非空 |
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `CanStart` 放行 `import`；`ExpressionStatementScan.ImportStage` 累积状态：admit `import` 后下一个代码单元必须是 `Symbol "."`，否则 Reject。`import x from "m"` 里表达式候选在 `x` 处退出、import 声明候选保持唯一 |
| `typescript/tokens/expressions/expression-builder.xl.md` | `ParsePrimary` 认 `import . meta` → `MetaProperty`（children 只有 `Identifier "meta"`）；`ParseNew` 认 `. target` → `MetaProperty`（`Identifier "target"`）；`<`/泛型箭头等既有分支未动 |
| `typescript/cases/import-meta.ts`（新 stem，30 条） | `import.meta;` / `import.meta.x;` / `import.meta["x"];` / `new.target;` + 点两侧 trivia（空白/注释/换行）+ 与其它表达式组合 + 重复形 + 合法 import 声明回归 |

`MetaProperty` 的区间：`import.meta` → `[0,11)`，`meta` `[7,11)`；`new.target` → `[0,10)`，`target` `[4,10)`；`import . meta` / `new . target` 的 `Pos` 与 TS 同口径（前面 token 的 `End+1`）。

## 2. 读数（本分支）

```text
ast-json  全量 1745/1745 cj-ok（19 构造）
ast-json-diff 全量 1745/1745 完全一致（结构/位置/字段差 0）
import-meta 30/30；import 54/54；module-declarations 23/23
xl check（paths core+typescript）0 error
```

## 3. 未收 / 已知边界

- `import.meta` 的候选放行只有「admit import 后下一格必须是 `.`」一条判据：`import\n.meta` 这类换行写法
  与 TS 一致（换行本来就是 trivia），但 `import` 后隔着注释的写法没有额外判据（trivia 一律跳过）。
- `new.target` 只在表达式 builder 里认；`new.target` 的合法性检查（只能在函数体内）不属于语法层。
- 泛型箭头/尖括号断言已在 `cover-type-assert-1` 落地，本块未改其代码。
- `import.meta` 与 `import-equals`（`import x = require(...)`）共存已由 import 候选的 `Stage 1 "=" → Reject` 保证，
  `import.ts` 54/54 与 module-declarations 23/23 全绿。
