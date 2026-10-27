# T8d — 从 B 类里选下一个最小可修 case（类型面提前落地）并做最小修复

分支 `feature/all-possible-1027-t8d`，基点 `feature/all-possible-1027` @ `34dfa716`（T8c 已合入）。
工作副本 `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-t8d`。

## 1. 起点与候选

`_reports/T8c.md` 的 B 类 20 个里，按任务书排除：`type-pred-arrow.ts`（箭头，留专门一轮）、
`lex-number-*` 与 `1..` / `1 .`（A3，见 `_reports/T8b.md`）、import-equals 家族（T8c 已修）。
剩下能碰的「收口格 / 根之外 / 未读完」候选（字节升序）：

| 字节 | 文件 | 首跳 | 选否 |
|---:|---|---|---|
| 195 | `declarations/decl-instantiation-line-end.ts` | 初始化器根之外还有代码 | ✗ 见 §2 |
| 235 | `expressions/expr-typeof-import-meta.ts` | 初始化器根之外还有代码 | ✗ 见 §2 |
| 400 | `lexical/lex-string-dollar-prefix-intact.ts` | 初始化器未读完 | ✗ 带 `xl:ts-invalid`，不可作验收 |
| 474 | `declarations/gap-instantiation-line-end.ts` | 初始化器根之外还有代码 | ✗ 与 195 同族（`a<b>` 类型实参 postfix） |
| 1148 | `statements/stmt-adversarial-shapes.ts` | 初始化器根之外还有代码 | ✗ 见 §2（箭头形参类型） |
| **1240** | **`expressions/expr-as-then-value-operator.ts`** | **初始化器根之外还有代码** | **✓ 本轮选中** |
| 1454 | `types/gap-r956-predicate-paren-type.ts` | 函数声明的返回类型没有读完 | ✗ 保留（谓词括号，另一族） |
| 161 | `lexical/lex-preprocessor-if.ts` | 表达式没有读完 | ✗ 带 `xl:ts-invalid` |
| 1929 | `expressions/gap-r1231-decl-newline-operator.ts` | 初始化器未读完 | ✗ 箭头体 + `/re/g`，不是本格 |

**为什么选 1240**：它是剩下候选里**唯一「一处判据就能收口」**的一条——同一个首跳在 §3 里被压成
一条「`=` 后面还是不是 `=`」的判据，且触发面是**类型面落地时机**，与箭头体、数字 postfix、import-equals
三条边界都不相交。其余候选的首跳都在**原子 / postfix 面**（类型实参 `a<b>`、`typeof` 的成员链），
按 T8b 的口径那是「类级」问题（同族 7 条一起 fallback），不属最小修复。

## 2. 首跳复核（先证明不是箭头 / 数字 postfix）

`node tmp/t8d-one.mjs <case>`（`ParseCore(shell=true)` + 默认路径）与
`tshape-judge ts <case>` 两口径一致：

| 文件 | 首跳 | 默认路径 |
|---|---|---|
| `expr-as-then-value-operator.ts` | `增量变量形状未支持：declaration 初始化器根之外还有代码` | `LastFileFallback=true`（judge: `incremental-error` step 421 @ line 13 `const eq = a as number === 1;`） |

`tshape-judge trace` 的逐字树（`tmp/t8d-trace-as/`）把成因钉在**类型面落地太早**：

```text
step 240 ... │  └─ BinaryExpressionShape            ← `a as number + 1` 在这里是完整的
final step   │  ├─ AsExpressionShape                ← 只盖 `a as number`
             │  ├─ Symbol  src=[24,27) text="==="   ← `===` 整段留在声明 raw 里
             │  └─ Common  src=[28,29) text="1"
```

同一处最小复现（`tmp/t8d-snippets.mjs`）：

| 源码 | 改前 | 改后 |
|---|---|---|
| `const eq = a as number === 1;` | FALLBACK 根之外还有代码 | **ok** |
| `const eq = a as number == 1;` | FALLBACK 根之外还有代码 | **ok** |
| `const a = (a as number) === 1;` | FALLBACK 根之外还有代码 | **ok** |
| `const a = { x: 1 } as T === 1;` | FALLBACK 根之外还有代码 | **ok** |
| `const a = b satisfies T === 1;` | FALLBACK 根之外还有代码 | **ok** |
| `const a = f() as number === 1;` | FALLBACK 根之外还有代码 | **ok** |
| `const ne = a as number !== 1;` | ok | ok（`!=` 不受影响） |
| `const p = a as number + 1;` | ok | ok |
| `const f = (x) => x;` / `(x: number) => x` | ok | ok（箭头不变） |

即：**只有 `as` / `satisfies` 初始化器后面紧跟 `==` / `===`** 会落这条错；判据不在箭头、不在数字原子。

## 3. 根因

`typescript/tokens/types/type-catalog-factory.xl.md` 的 `CanEndInitializer` 决定类型面**什么时候提前落地**
（`VariableDeclarationShape.TryBuildTypedInitializer` 的唯一闸门）。它的结束字符集是

```ts
static field InitializerEnd:string = ";,)]}="
```

`=` 在里面——而 `==` / `===` 的首字符也是 `=`，于是：

1. `a as number` 的 `number` 格之后第一个非空白字符是 `=` ⇒ `CanEndInitializer` 判「初始化器已经完整」；
2. `TryBuildTypedInitializer` 用 `ParseInitializer` 把**当时那段 raw**（`a as number`）建成 `AsExpressionShape` 并落地
   （`InitializerDone = true`）；
3. 之后 `===` / `1` 再进来就没有人接了，收口格 `FinishIncremental` 看到「唯一根 + 根之外还有代码」
   ⇒ C10 显式抛错 ⇒ 整文件回退 legacy。

`(a as number) === 1` 是同一处：`(a as number)` 在 `)` 格落地（`CanEndInitializer` 对 `)` 本来就返回 true 没错，
错的是**后面还有 `===`**），`===` 只能留在外面。

## 4. 改动（1 个文件、2 处）

`typescript/tokens/types/type-catalog-factory.xl.md`：

1. 新增 `NextSignificantText(unit, take)`：把原 `NextSignificantChar` 的扫描体推广成「前 `take` 个非空白 /
   非注释字符」，`take === 1` 与原实现逐字节同源；`NextSignificantChar` 改成调它（唯一调用方
   `CanEndType` 因此一个字不变）。
2. `CanEndInitializer` 加一条判据：**`=` 后面还是 `=` 就不是终点**（`==` / `===` 是二元比较符）。

```ts
const pair = TypeCatalogFactory.NextSignificantText(unit, 2);
if (pair === "") {
  return true;
}
if (pair.length >= 2 && pair[0] === "=" && pair[1] === "=") {
  return false;
}
return TypeCatalogFactory.InitializerEnd.indexOf(pair[0]) >= 0;
```

于是 `a as T === 1` 会一直等到 `;` / 输入结束那一格，把**整条** raw 交 `ParseInitializer`
（legacy 同一个 `ExpressionBuilder`）——建出来的树与 legacy 同源，不是第二套表达式机。

**没做什么**：不新增 guide、不碰 `ContainerCloseGuide`、不删 `StatementShape`、不动任何箭头/数字 postfix 判据、
不改 30 target 行为、不跑 gates。`=>`（第二字符 `>`）与单个 `=` 的旧行为逐字节不变。

## 5. 结果

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **0 written / 637 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| 选中 case `tshape-judge ts` | status=ok | **`{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 选中 case 默认路径 | `LastFileFallback=false` | **false，`FileFallbackCount=0`，首跳不抛** |
| 全语料 fallback | 下降 ≥1 | **65 → 63**（`tmp/t8d-fallback.json`；对比 `t8c-fallback2.json`：**FIXED=2 / REGRESSED=0**） |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0、diff=0、error=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变（`BB07DA2201FC5087`） | **5 份全 `BB07DA2201FC5087`** |
| 全语料 AST 逐文件哈希（1716 条） | 无漂移 | **1714 条逐字节相同；2 条变化 = 就是被修好的那 2 条**（其改前树是 fallback 的 legacy 产物） |

`pin-miss=1` 是既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

### 5.1 顺带清掉的第 2 条：`type-pred-arrow.ts`

`FIXED=2` 的另一条是 T8c §3 明确留待专门一轮的 `types/type-pred-arrow.ts`（168 B）。**没有动箭头代码**：
它的真实成因与本 case 同一处——`const isStr = (x: unknown): x is string => typeof x === "string"` 里，
类型面在 `typeof x` 的 `x` 格看到后面是 `=`（其实是 `===`）就提前落地，落地出来的箭头只盖到 `typeof x`，
`=== "string"` 落在根之外。T8c 描述的「箭头收口太早」是**症状**，闸门是 `CanEndInitializer`。

- 改后 `tshape-judge ts`：**ok**；默认路径 `LastFileFallback=false`、`FileFallbackCount=0`。

T8c §3 里量出来的那组「形参带类型标注 + `===`」变体现在都走同一条整条 `ParseInitializer` 的路，
`(x) => a === b` 这类不带类型的形态一个字节没变（见 §2 表末两行）。

## 6. 复现

```powershell
$id = "all-possible-1027-t8d"
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\$id
# xl_build(cwd=$PWD, paths=["core","typescript"], targets=["ts"])
node node_modules/typescript/bin/tsc -p .
node tmp/t8d-one.mjs tests/cases/token/expressions/expr-as-then-value-operator.ts   # 首跳 + 默认路径 + 树
node tmp/t8d-snippets.mjs tmp/t8d-snips3.txt                                       # as/== 变体表
node tmp/t8d-snippets.mjs tmp/t8d-snips4.txt                                       # as/箭头边界
node tmp/t8c-probe.mjs tmp/t8d-fallback.json                                       # 全语料 fallback（63）
node tmp/t8d-corpus-hash.mjs <repoRoot> <out.tsv>                                  # 逐文件 AST 哈希（对拍用）
node tmp/target-cases.mjs                                                          # 30 target
node typescript/cases/tts/tools/tshape-judge.mjs ts tests/cases/token/expressions/expr-as-then-value-operator.ts --out tmp/t8d-judge-as
node typescript/cases/tts/tools/tshape-judge.mjs trace tests/cases/token/expressions/expr-as-then-value-operator.ts --out tmp/t8d-trace-as
```

`tmp/` 被 gitignore；本轮新增 `tmp/t8d-one.mjs`、`tmp/t8d-snippets.mjs`、`tmp/t8d-corpus-hash.mjs`、
`tmp/t8d-snips{1,2,3,4}.txt`、`tmp/t8d-fallback.json`、`tmp/t8d-{before,after}.tsv` 只在本地。

## 7. 剩下的 B 类（给下一轮）

改后全语料 63 条 fallback。仍属「收口格」的只剩 6 条，且都有明确的**类级**阻塞：

| 字节 | 文件 | 首跳 | 阻塞 |
|---:|---|---|---|
| 195 / 474 | `decl-instantiation-line-end` / `gap-instantiation-line-end` | 根之外还有代码 | `a<b>` 结尾：shell 先建了 `a < b` 比较，`>` 留在外面 ⇒ **类型实参 postfix**（A3 面） |
| 235 | `expr-typeof-import-meta` | 根之外还有代码 | `typeof foo.bar` 同族：前缀一元在操作数格提前收口，`.bar` 没人接；且 `import.meta` 要走 `MetaProperty`，不是 `PropertyAccess` |
| 400 | `lex-string-dollar-prefix-intact` | 未读完 | 带 `xl:ts-invalid`，不可作验收 |
| 1148 | `stmt-adversarial-shapes` | 根之外还有代码 | 箭头的**泛型返回类型** `<T>(x: T) => T`（箭头体 + 类型面同时在场） |
| 1929 | `gap-r1231-decl-newline-operator` | 未读完 | `() => { }` 换行 `/re/g`：箭头体之后的 `/` 是**新正则语句**，属箭头体收口 |

另：`lex-preprocessor-if`（表达式没有读完）带 `xl:ts-invalid`；
`gap-r956-predicate-paren-type`（返回类型没有读完）是谓词括号 + `MethodCloseRule` 一族，未动。

## 8. 结论

B 类里选 1240 B 的 `expr-as-then-value-operator.ts`，把「类型面提前落地」的结束判据收窄成
**「`=` 后面还是 `=` 不算终点」**，一处判据清掉 2 个 fallback（65 → 63），其中一条是 T8c 判定
「需专门一轮」的 `type-pred-arrow.ts`——它的真实闸门就是这一处，箭头代码一个字没动。
30 target、5 smoke、1714/1716 条语料 AST 读数逐位不变。
