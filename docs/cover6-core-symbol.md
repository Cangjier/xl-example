# cover6 core-symbol：E `?.` 前瞻（`?.` 后随十进制数字不合并）

> 工作区 `C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-core-symbol`，分支 `cover6-core-symbol`，
> 基线 `99f286d87fceaf1013592ec1a9b12f1ce79693ab`（prep）。TS 6.0.3。
> 目标（`docs/cover5-FINAL.md` §5 项 E）：`const x = a?.5:b;` 必须切分成 `?` 与 `.5`，
> 解析成 `a ? .5 : b`（TS diag=0）。

## 1. 结论与读数

| 项 | 修前 | 修后 |
|---|---|---|
| `const x = a?.5:b;`（tmp 探针） | **crash**「表达式没有读完」 | 与 TS 三栏一致（ConditionalExpression） |
| `a?.5:b;` / `x=a?.5:b` | crash「表达式语句没有读完」 | 一致 |
| `f(a?.5:b);` | crash「不支持的表达式起点」 | 一致 |
| `a?.{0,1,9}:b` / `a?.5e3:b` | 5 条全 crash | 一致 |
| 可选链 `a?.b` / `a?.[k]` / `a?.(y)` / `a?.<T>(y)` / `a?.b?.c` / `a?.[k]?.(y)` | 修前已全绿 | **仍全绿**（QuestionDotToken 不变） |
| `a ? .5 : b` / `a? .5 : b`（对照） | 修前已全绿 | 仍全绿 |
| `ast-json`（全量） | 5709 / cj-ok 5709 | **5724 / cj-ok 5724（47 构造）** |
| `ast-json-diff`（全量） | 5709/5709，0/0/0 | **5724/5724，结构 0 / 位置 0 / 字段 0** |
| `basic-token` 单 stem | 108 | **123（+15）** |
| `token-ast --quiet` | total 1704 / ok 1694 / crash 0 / diff 0 / known-gap 0 | **total 1706 / ok 1696 / crash 0 / diff 0 / known-gap 0** |
| `real-dts-ast` | 226/226 | **226/226** |
| `tsc -p tsconfig.json` | 0 | **0** |
| `xl_check`（core+typescript） | — | 863 files，**0 error**（2464 warning 为既有 W3102/W3103 噪音） |

## 2. 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-core-symbol
# tmp 探针（TS 真值 vs SourceFileRunner.Parse，三栏 + kind 逐节点）
node tmp/probe.mjs tmp/probe-cases.json
```

修前输出（`git stash` 掉 3 个 `.xl.md` 后重建实测）：

```text
### [crash] e-main      src: "const x = a?.5:b;"    cj-error: 表达式没有读完
### [crash] e-expr      src: "a?.5:b;"              cj-error: 表达式语句没有读完
### [crash] e-call      src: "f(a?.5:b);"           cj-error: 不支持的表达式起点
### [identical] opt-chain-*（6 条可选链）/ e-ternary-control / e-space-control / q-*（三元、??）
== total 30: {"crash":9,"identical":19,"ts-invalid":2} ==
```

修后：`== total 30: {"identical":28,"ts-invalid":2} ==`（两条 ts-invalid 是 TS 本身非法的
`a? .b : c` 与嵌套 `a?.5:b ? c?.7:d`，按口径不计）。

## 3. TS 真值（`const x = a?.5:b;`，`ts.createSourceFile` 语义 AST）

```text
VariableStatement [0,17]
  VariableDeclarationList [0,16]
    VariableDeclaration [5,16]
      Identifier [5,7] text="x"
      ConditionalExpression [9,16]
        Identifier [9,11] text="a"
        QuestionToken [11,12]          ← 单独的 `?`
        NumericLiteral [12,14]         ← `.5`（text "0.5"）
        ColonToken [14,15]
        Identifier [15,16] text="b"
```

对照：`const x = a?.b;` 是 `PropertyAccessExpression` + `QuestionDotToken [11,13]`
——**同一个 `?.`，跟随后一个字符不同，词法结果必须不同**。

修后本仓产物（`node tmp/dump-tree.cjs`，形状树 / Token 层）：

```text
#### const x = a?.5:b;
      ConditionalExpressionShape [10,16]
        IdentifierShape [10,11] text="a"
        QuestionTokenShape [11,12]
        NumericLiteralShape [12,14] text="0.5"
        ColonTokenShape [14,15]
        IdentifierShape [15,16] text="b"

#### const x = a?.b;
      PropertyAccessExpressionShape [10,14]
        IdentifierShape [10,11] text="a"
        QuestionDotTokenShape [11,13]
        IdentifierShape [13,14] text="b"
```

## 4. core 改动逐行（为什么默认 true / 为什么不 Ban）

### 4.1 `core/syntax/templates/symbol-template.xl.md`：新增前瞻钩子

```ts
## method IsCombineBlocked:(combined:string, following:string)=>bool
// 组合符号的**语言前瞻钩子**：combined 已在组合符号表里成立，following 是它后面紧跟的那一个字符
//（越界为空串）。返回 true = 这次不合并，两个字符各自成 token。
return false;
```

- **默认 `return false`（= 绝不阻断）**：`SymbolTemplate` 是 core 的语言无关基础表，
  `Symbol.IsAppend` 是**所有**语言（现在只有 ts，但模板层是共享的）共用的入口。
  默认阻断任何组合都会改变既有行为；默认不阻断则改动前/改动后对任何未覆写的模板**字节等价**。
- 为什么不是 `BanCombineSymbol(["?."])`：那是**整族静态禁用**——`?.` 永远合不成，
  `a?.b` / `a?.[k]` / `a?.(y)` / `a?.<T>(y)` 全废。E 项要的是**逐次、看后一个字符**的 lookahead，
  所以钩子的签名必须带 `following`。

### 4.2 `core/syntax/basic-tokens/symbol.xl.md`：接入钩子 + 前瞻字符

```ts
## method IsAppend:(Src:Source)=>bool
if (this.Temp.length === 0 && this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return true;                                  // 开头的符号直接收
}
if (!this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return false;                                 // 非符号字符不许吞（原判据保留）
}
const combined = this.Temp.join("") + Src.Value;
if (!this.Template.SymbolTemplate.IsCombinedSymbol(combined)) {
  return false;                                 // 组合符号表说「合起来不是标点」→ 原行为
}
return !this.Template.SymbolTemplate.IsCombineBlocked(combined, Symbol.NextCharAfter(Src));
```

新增静态方法（纯字符读取，语言无关）：

```ts
## static method NextCharAfter:(src:Source)=>string
const document = src.Document;
const count = document.GetCount();
const next = src.Index + 1;
if (next >= count) {
  return "";
}
return document.At(next).Value;
```

- core 只负责把「组合符号后面紧跟的那一个字符」递过去，**不写任何 TS 专用常量**；
- 「紧跟」不跳空白/注释：`a?. 5`、`a?\n.5` 的 `?.` 后一个字符不是数字，仍合成 `?.`（与 ECMAScript 一致）。

### 4.3 `typescript/run/typescript-symbol-template.xl.md`：ECMAScript 口径覆写

```ts
## method IsCombineBlocked:(combined:string, following:string)=>bool
if (combined === "?.") {
  return following >= "0" && following <= "9";
}
return super.IsCombineBlocked(combined, following);
```

- 对应规范：`OptionalChainingPunctuator :: ?. [lookahead ∉ DecimalDigit]`；
- 只否决 `?.`；`??`、`??=`、`? :` 等其它组合完全不受影响（见 §5 回归证据）；
- `super` 保持基类策略，将来 core 若再有默认阻断也自动继承。

## 5. 可选链回归证据（探针 + 形状树）

`tmp/probe-cases.json` 中与「不回归」直接相关的 19 条，修复前后都 `identical`：

| 用例 | 期望形态（TS 同款） |
|---|---|
| `const x = a?.b;` | PropertyAccessExpression + QuestionDotToken |
| `const x = a?.[k];` | ElementAccessExpression + QuestionDotToken |
| `const x = a?.(y);` | CallExpression + QuestionDotToken |
| `const x = a?.<T>(y);` | CallExpression + QuestionDotToken + TypeReference |
| `const x = a?.b?.c;` | 嵌套 PropertyAccessExpression（两个 QuestionDotToken） |
| `const x = a?.[k]?.(y);` | ElementAccess ⊆ Call + 两个 QuestionDotToken |
| `const x = a?.b?.[k]?.(y)?.c;` | 混合链，QuestionDotToken ×4 |
| `const x = a?.b!.c;` | NonNullExpression 在链中 |
| `const x = a?.b ?? c;` | QuestionQuestionToken 不受影响 |
| `const x = a?.b\`t\`;` | TaggedTemplate + QuestionDotToken |
| `a?.b;`（语句位） | ExpressionStatement |
| `const x = a ?? b;` / `a ??= b;` | `??` / `??=` 组合不变 |
| `const x = a ? .5 : b;` / `const x = a? .5 : b;` | 条件表达式（对照组） |
| `const x = a ? b : c;`（嵌套 2 条） | 三元不变 |

形状树抽查（§3 已列）：`a?.b` / `a?.[k]` / `a?.(y)` 仍产出 `QuestionDotTokenShape`。

另外全量 `ast-json` 5724 条与 `real-dts` 226 文件（其中大量 `?.` 用法）全绿，是无回归的最强证据。

## 6. 测试增量

1. `typescript/cases/basic-token.ts` 末尾唯一标记段
   `// ══ cover6 core（E \`?.\` 前瞻）：... ══`：**+15 条**
   - base：`const x = a?.5:b;`、`a?.5:b;`
   - 数字变体：`a?.0:b` / `a?.1:b` / `a?.9:b` / `a?.5e3:b`
   - 位置变体：`const c1 = f(a?.5:b);`
   - 对照：`const t1 = a ? .5 : b;`、`const t2 = a? .5 : b;`
   - 可选链回归：`a?.b` / `a?.[k]` / `a?.(y)` / `a?.<T>(y)` / `a?.b?.c` / `a?.[k]?.(y)`
   - 快照 `basic-token.cj-ast.json` / `basic-token.ts-ast.json` 已随分支重写（123 条）。
2. token 语料夹具（`tests/cases/token/lexical/`，头注释含 `xl:note` 证据与 `xl:expect`）：
   - `lex-optional-chain-digit-lookahead.ts`：`?.5` 条件表达式 + `?.b` 可选链对照；
   - `lx-optional-chain-digit.ts`：`?.{5,1,9,5e3}` 四个数字档 + `?.b` / `?.[k]` / `?.(y)` 回归。
   修前这两个文件在 `token-ast` 是 `crash 2`（「表达式没有读完」），修后 ok；
   `token-ast` 总数 1704 → **1706**（ok 1694 → **1696**）。
3. `tmp/` 探针：`probe.mjs` + `probe-cases.json`（30 条）、`dump-tree.cjs`（形状树证据）、
   `cover6-symbol-log.md`（轮次日志）—— 按约定不入 git。

## 7. 门禁读数（本分支口径）

```text
xl_build(core+typescript): 3 written, 0 error(s)     （增量；改动 3 个 .xl.md）
tsc -p tsconfig.json:      exit 0，无输出
ast-json:                  total cases=5724 cj-ok=5724 cj-fail=0（47 个构造）
ast-json-diff:             合计 5724 条：完全一致 5724/5724；结构 0、位置 0、字段 0
token-ast --quiet:         total=1706 ok=1696 crash=0 diff=0 ts-invalid=10 gap-now-passing=0
                           known-gap: 0 file(s)
real-dts-ast:              文件 226、解析成功 226、崩溃 0、AST 完全一致 226
xl_check(core+typescript): 863 file(s), 0 error(s), 2464 warning(s)（W3102/W3103 既有噪音）
git status:                仅预期文件（3 个 .xl.md、basic-token.ts 及两份快照、2 个夹具、docs）
```

## 8. 遗留 / 需裁定

1. **`a?.5`（后面没有 `:`）**：TS 自身 `parseDiagnostics ≠ 0`（`':' expected`），按本轮口径属 ts-invalid，
   不作为用例；本仓行为是 `?.` 不合并后按条件表达式恢复，与 TS 的恢复形一致但不再细究。
2. `?.` 后随数字的其它上下文（如模板插值、类型位）没有额外规则：ECMAScript 的 lookahead 只作用于
   `? .` 这两个字符的相邻性，与上下文无关，本实现同样只用紧邻字符。
3. `IsCombineBlocked` 是**逐次**钩子，不缓存；`Symbol.IsAppend` 原来就是逐字符判定，
   每字符 O(1) 多一次 `document.At(next)` 读取，不改变词法扫描的复杂度。
4. 本轮不动 `BanCombineSymbol` / `AllowedCombinedSymbol` 语义；其它 core 分支（A/B/C/D/F/G）
   若也需要前瞻，可直接复用同一钩子（默认不阻断，互不干扰）。

## 9. 复现 / 验证命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-core-symbol
# 重建（DSH 工具）：
#   xl_build(cwd=上面, paths=["core","typescript"], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node tmp/probe.mjs tmp/probe-cases.json            # 30 条：28 identical + 2 ts-invalid
node tmp/dump-tree.cjs                             # `a?.5:b` = ? + .5；`a?.b` = QuestionDot
node typescript/cases/ast-json.mjs basic-token     # 123
node typescript/cases/ast-json.mjs                 # 5724 / cj-ok 5724
node typescript/cases/ast-json-diff.mjs            # 5724/5724，0/0/0
node typescript/cases/token-ast.mjs --quiet        # 1706 / ok 1696 / crash 0 / diff 0
node typescript/cases/real-dts-ast.mjs             # 226/226
```
