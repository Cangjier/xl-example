# HANDOFF — impl-wp3-5（WP-3 第五波：只做 C，接线失败已摘回）

STATUS: PARTIAL（C 摘回，分支恢复全绿；阻塞点在 B 的两个文件，需要一笔小改）
BRANCH: impl-wp3-5 @ <见 git log>
BASE: impl-wp3-4 @ 51e81930

## 做了什么

1. 从 `impl-wp3-4` 建 clone，全量构建基线：`xl_build(core,typescript)` = **885 written / 0 error / 2429 warning**；
   `tsc` exit 0、885 个 `.js`。
2. **C 按 HANDOFF/spec §4.1/§4.2 完整实现过一次**（`typescript/tokens/files/source-file-shape.xl.md`）：
   `AdapterRoot` 字段 + 构造器接线 + `FinishBody` + `Process` 的 EOF 分支改调 `FinishBody` + 删 `CatalogGuide`。
   `xl_build` 0 error、`tsc` exit 0，但 **AST 全量立刻大红**（见下），按 §4.2 的降级路线 **摘回**：
   `git checkout -- typescript/tokens/files/source-file-shape.xl.md`。
3. 摘回后复测：`ast-json.mjs` **6167/6167**、`ast-json-diff.mjs` **6167/6167 完全一致 / 结构 0 / 位置 0 / 字段 0**
   —— 工作树干净，本分支回到 wp3-4 的水平（A/B/D 的绿保持不变）。
4. 定位到**两个真实阻塞点**（都在 B 的文件里，不在我的写范围），并把 C 的最后版本补丁完整写在下面「可直接复用的补丁」。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build 全量 | `xl_build(cwd=clone, paths=["core","typescript"], out="dist")` | 885 written / 0 error / 2429 warning | 绿 |
| tsc（接线前基线） | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 / 885 `.js` | 绿 |
| **C 接线后 AST 全量** | `ast-json.mjs` → `ast-json-diff.mjs` | 6167 条里**只有 688 条一致**；结构差 **4978**、位置差 **715**、字段差 0 | **红（已摘回）** |
| C 接线后 tsc | `tsc -p tsconfig.json`（先有一次 TS2304，改掉后） | exit 0 | 绿（编译绿但语义红） |
| 摘回后 AST 全量 | 同命令 | **6167/6167**，结构 0 / 位置 0 / 字段 0 | 绿 |
| real-dts / full / batch-split / xl_check | —— | **未跑**（AST 一红就按降级路线停手，不浪费轮次） | 未测 |

接线后的差异样例（`ast-json-diff.mjs` 头部，`angle` 构造 0/19）：

```
# 1 "a < b;"
  结构  ExpressionStatement -1  BinaryExpression -1  Identifier -2  FirstBinaryOperator -1  Common +2  Symbol +2
#17 "type X = A<B<C>>;"
  结构  TypeAliasDeclaration -1  Identifier -4  TypeReference -3  Common +5  Symbol +5
```

`SourceFileRunner.Parse` 的直接观测（接线后，根 `Data` 只剩裸 basic token，一个形状都没建）：

```
"const x = 1;"        -> 5 units: Common,Common,Symbol,Common,Symbol
"class C {}"          -> 3 units: Common,Common,Bracket
"import a from \"m\";" -> 5 units: Common,Common,Common,String,Symbol
```

## 未完成项 / 阻塞点（**两个，都在 B 的文件里，必须一起改**）

### 阻塞 1（致命）：`RootItemRule.Analyze` 到 EOF 都不 Complete，引擎一条 item 都不建

`typescript/tokens/items/root-item-rule.xl.md` 的 `Analyze`（127–173 行）只在
`Alive.size === 1 && shape.IsBuildable(code, at, cache, this.Context)` 时收口；
`Alive.size === 0` 才 `Complete` + raw。实测对 `const x = 1;`：

```
Analyze code=1 alive=2 win=-1 complete=false ctx=true
Analyze code=2 alive=1 win=-1 complete=false   ← 只剩一个候选，但 IsBuildable 恒 false
Analyze code=3 alive=1 win=-1 complete=false
Analyze code=4 alive=1 win=-1 complete=false
（EOF）Analyze code=1 alive=1 complete=false  end=-1
Feed cursor=8 to=8 atEof=true built=0 complete=false
```

即：**唯一候选 `IsBuildable` 永远不成立**（`class C {}` 同样如此），于是 `Engine.Built` 始终 0、`state.Complete`
始终 false，`Flush` 的「能建就建」分支与 raw 分支都进不去（raw 分支要求 `State.Start >= 0 && Checked > Start`，
EOF 那次 Flush 是 `start=7 checked=8`，**本来能进**，但被阻塞 2 抢跑掉了）。

需要的改法（建议）：`Analyze` 在 `state.AtEof` 为真且已有 `Code` 时**无条件收口**：
`Complete = true; End = state.CodeAt[state.Code.length - 1]; Winner = -1;`
（收益：EOF 时 `Flush` 走「建不出 → raw 回退」，`FinishBody` 就能用 `BuildTrailingItems` 把尾巴整段建对。
`const` / 裸块 / ASI 尾巴这些本来就该由 tail builder 兜底，legacy 里也正是「终结候选」在干这件事。）

### 阻塞 2（致命）：`SourceFileBodyItemHost.CloseBatch` 把 raw 口袋当场擦掉，容器读不到

`typescript/tokens/items/root-item-rule.xl.md` 487–499 行：

```ts
this.Engine.Flush(host, context, this.Fallback);
this.Fallback.Reset();          // ← 容器还没来得及读就清零
return BatchStates.Done;
```

实测 `FinishBody` 里 `adapter.RawRange()` 永远是 `{From:-1,To:-1,Reason:""}`（插桩打印 `fallback={"From":-1,"To":-1,"Reason":""}`）。
`Reset()` 要挪到**容器读完并 splice 之后**（`SourceFileShape.FinishBody` 里已经有一句 `raw.Reset()`），
`CloseBatch` 只保留 `Engine.Flush(...)`。

## 可直接复用的补丁（`typescript/tokens/files/source-file-shape.xl.md`，摘回前已验证到编译绿）

```diff
 # dependencies
-import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
 import { CloseStates } from "../../../core/syntax/close-states.xl.md"
 ...
+import { SourceFileBodyItemHost } from "../items/root-item-rule.xl.md"
 import { SourceFileTailBuilder } from "../items/source-file-tail-builder.xl.md"
```

```md
## field AdapterRoot:SourceFileBodyItemHost | null = null

根 item 表的宿主，与 `BatchAdapter` 指向同一个对象。`BatchAdapter` 的静态类型只有 `IBatchHost` 接口，
而收口时要读 `RawRange()` 拿 raw 区间，所以这里留一份具体类型的引用。
```

构造器（替换原来那行 `this.CatalogGuide = new CatalogGuide(...)`）：

```ts
this.AdapterRoot = new SourceFileBodyItemHost(this, SourceFileBodyItemHost.CreateRules(SourceFileShape.CreatePossibleShapes()));
this.BatchAdapter = this.AdapterRoot;
```

`Close` 之前新增（**注意 `raw.To` 是排他的，这里已修正 spec §4.1 的 off-by-one**）：

```ts
## private method FinishBody:(context:SyntaxContext)=>CloseStates

this.FlushBatch(context);
const adapter = this.AdapterRoot;
if (adapter !== null) {
  const raw = adapter.RawRange();
  if (raw.IsArmed()) {
    const from = raw.From;
    // RawFallback 的 `To` 是**不含**的终点（`[From, To)`），而 BuildTrailingItems 的 `at` 是含的末下标。
    const to = raw.To - 1;
    if (from >= 0 && to >= from && to < this.Data.length) {
      const replaced = SourceFileTailBuilder.BuildTrailingItems(this, from, to, context);
      this.Data.splice(from, to - from + 1, ...replaced);
    }
    raw.Reset();
  }
}
const last = this.Last();
if (last !== null && !last.Closed) {
  last.TryToClose(context);
}
if (this.SourceRange.EndIndex < 0 && last !== null) {
  const end = last.SourceRange.EndIndex;
  if (end >= 0) {
    this.SignOut(end);
  }
}
this.TryToClose(context);
return CloseStates.Nothing;
```

`Process` 的 EOF 分支（删掉 `const last = ...` 与 `EndOfFileTokenShape` 那 6 行，换成一句）：

```ts
  if (this.MountedUnit !== null) {
    const mounted = this.MountedUnit;
    mounted.TryToClose(context);
    mounted.Quit();
  }
  this.FinishBody(context);
  return;
```

`EndOfFileTokenShape` 的 import **保留**：`Close` 末尾的 `filter` 还在判断它（现在永远不成立，无害）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-6 -From impl-wp3-5 -Base impl-wp3-5
cd impl-wp3-6
xl_build(cwd="C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp3-6", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json

# 1) 先修阻塞 2（一行）：typescript\tokens\items\root-item-rule.xl.md 的 CloseBatch 删掉 this.Fallback.Reset();
# 2) 再修阻塞 1（3 行）：同文件 Analyze 里 Alive.size===1 之后加
#      if (state.AtEof) { state.Complete = true; state.End = state.CodeAt[state.Code.length - 1]; this.Winner = -1; this.Watermark = state.Code.length; return; }
# 3) 照上面「可直接复用的补丁」改 typescript\tokens\files\source-file-shape.xl.md
# 4) xl_build(paths=["typescript/tokens/items","typescript/tokens/files"]) ; tsc
# 5) node .\typescript\cases\ast-json.mjs ; node .\typescript\cases\ast-json-diff.mjs ; git checkout -- typescript\cases
#    判据：6167/6167、结构 0 / 位置 0 / 字段 0
# 6) node .\typescript\cases\real-dts-ast.mjs                      判据：226/226
# 7) node .\tests\body-drive\batch-split.mjs --family root          判据：PASS
# 8) ..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build   判据：PASS、buffer xml 4504 / 0 / 同错 52
# 红了仍然 git checkout -- typescript\tokens\files\source-file-shape.xl.md，别带病提交
```

## 踩过的坑（省下一轮的东西）

1. **`RawFallback.To` 是排他的**（`core/syntax/batch/raw-fallback.xl.md:18-20`：「终点（宿主 `Data` 下标，**不含**）」）。
   spec §4.1 写的 `to < this.Data.length` / `splice(from, to - from + 1, ...)` 是**按含算的**，直接照抄会
   在「raw 区间正好到末尾」（EOF 的常态）时整段跳过，现象就是 `Data` 一个形状都不换。正确写法见上面补丁。
2. **ts 代码块里不能出现没 import 的类型名**：`const replaced: Array<Token> = ...` 在本文件报
   `TS2304: Cannot find name 'Token'`（本文件没 import `Token`）。要么去掉类型注解，要么加 `import { Token }`。
3. **`batch-split.mjs --family root` 用空格**（`--family=root` 报未知参数）。
4. `ast-json.mjs` 会重写 `typescript/cases/*.cj-ast.json`（红线时是 47 个文件的脏工作树）：
   每次跑完 `git checkout -- typescript/cases`，否则 `git diff` 有 23 MB。
5. 插桩不必改源码：在临时脚本里 require `build/ts/.../item-list.js` / `root-item-rule.js` /
   `source-file-shape.js` 后直接替换 `prototype.Feed` / `Analyze` / `Build` / `FinishBody` / `Process` 打日志，
   一条命令就能看清「引擎建了几条、Analyze 卡在哪」。模块路径是 `build/ts/core/...`（不是 `build/ts/typescript/core/...`）。

## 阻塞点

无外部阻塞（xl_build / tsc / 门禁脚本都可用）。真正的阻塞是上面两个 **B 侧缺陷**，各改 1–3 行即可。
未改 `core/**`、`statements/**`、`declarations/**`、`members/**`、`typescript/run/**`、其它 `items/` 文件、
`TEAM.md`、`tools/**`；没有 merge、没有 push。
