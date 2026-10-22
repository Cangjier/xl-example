# cover8-D：export 家族调用位 ASI 与 `as T` 后比较续接

> 工作区 `C:\Users\Admin\Documents\GitHub\xl-example-set\cover8-exportasi`，分支 `cover8-exportasi`，
> 基线 `3fcd2e3702bef76575aa3f78695d258f44e37fba`（cover8 prep）。TS 6.0.3。
> 口径：TS `parseDiagnostics.length === 0` 且（本仓 crash / AST 不一致）才算真红；TS diag≠0 不计。
> 修复前的「红」全部用 `git stash`（4 个 `.xl.md`）+ 重建实测过（35/35 基线红），修后 35/35 与 TS 三栏一致。

## 1. 结论与读数

| 项 | 基线 | 修后 |
|---|---|---|
| `export default a as T` ⏎ `(b)` | crash「export default 的表达式没有读完」 | 与 TS 三栏一致（ExportAssignment + ExpressionStatement） |
| `export = a as T` ⏎ `(b)` | crash「export = 声明的表达式没有读完」 | 一致 |
| `export const x = a as T` ⏎ `(b)` | crash「export 变量语句没有读完」 | 一致 |
| `export let x = a as T` ⏎ `(b)` / `export var …` | crash 同上 | 一致 |
| `export declare const x: A` ⏎ `export declare const y: B;` | crash「export declare 变量语句没有读完」 | 一致 |
| `export const x = 1` ⏎ `f();` | crash 同上 | 一致 |
| `export default () => {}` ⏎ `(b)` / `export = () => {}` ⏎ `(b)` | 静默错树（并成 `CallExpression`） | 一致（两条语句） |
| `const x = a as T` ⏎ `<b>c;` | crash「表达式没有读完」 | 一致（比较续接 `(a as T) < b > c`） |
| `f(a as T` ⏎ `<b>c);` | 静默错树（`AsExpression` 的类型被当成 `T<b>`） | 一致（比较表达式） |
| `ast-json`（全量） | 5797 / cj-ok 5797 | **5832 / cj-ok 5832（47 构造）** |
| `ast-json-diff`（全量） | 5797/5797，0/0/0 | **5832/5832，结构 0 / 位置 0 / 字段 0** |
| `possible-compute` 单 stem | 129 | **164（+35）** |
| `token-ast --quiet` | total 1714 / ok 1704 / crash 0 / diff 0 / known-gap 0 | **不变：1714 / 1704 / 0 / 0 / 0** |
| `tests/parse/validate.mjs`（cases:check） | 1718 条，0 不合格 | **1718 条，0 不合格**（无新夹具） |
| `real-dts-ast` | 226/226 | **226/226** |
| `tsc -p tsconfig.json` | 0 | **0** |
| `xl_check`（core+typescript） | — | 863 files，**0 error**（2464 warning 为既有 W3102/W3103 噪音） |
| `core/**` 改动 | — | **0**（全部改动在 `typescript/**`） |

## 2. 目标 1：export 家族调用位 ASI

### 2.1 复现与 TS 真值

```text
export default a as T ⏎ (b);
  TS: ExportAssignment[0,21] AsExpression[14,21] Identifier/TypeReference …
      ExpressionStatement[21,26] ParenthesizedExpression[21,25] Identifier[23,24]
  修前: crash「export default 的表达式没有读完」

export const x = a as T ⏎ (b);
  TS: VariableStatement[0,23] ExportKeyword[0,6] VariableDeclarationList[6,23]
      VariableDeclaration[12,23] Identifier[12,14] AsExpression[16,23] TypeReference[21,23]
      ExpressionStatement[23,28] ParenthesizedExpression[23,27] Identifier[25,26]
  修前: crash「export 变量语句没有读完」

export = a as T ⏎ (b);
  TS: ExportAssignment[0,15] AsExpression[8,15] … ExpressionStatement[15,20] …
  修前: crash「export = 声明的表达式没有读完」
```

**判定口径的修正（与任务文本的出入，已在 probe 里实测 TS）**：`export default a` ⏎ `(b)`、
`export default a` ⏎ `[b]`、`export default a` ⏎ `` `t` `` **不是**两条语句——`(b)` / `[b]` / 模板
能接在可调用尾巴上，TS 解析成 `a(b)` / `a[b]` / `` a`t` `` 一条语句（本仓修前修后都一致，故不入用例）。
真正需要 ASI 的是「上一条尾巴**当不了调用者**」的形态：`as` / `satisfies` 的类型之后、块体箭头 `=> {}` 之后、
后缀 `++` / `--` 之后——与 cover5 的调用位判据同一口径。

### 2.2 根因（file:line）

1. `typescript/tokens/statements/expression-statement-possible-shape.xl.md` `IsStatementBoundaryAfterExpression`
   （原 ~666 行）：判据只有「换行 + `IsExpressionTail(prev)` + `!IsContinuation(current)`。
   `(` / `[` / 模板在 `IsContinuation` 里是**延续符**，所以 `as T` ⏎ `(b)` 永远等不到边界。
   这是 `export default`（stage 22）与 `export =`（stage 2）两个候选共用的唯一收口判据。
2. `typescript/tokens/declarations/export-declaration-possible-shape.xl.md` stage 13
   （`export const|let|var` 与 `export declare const|let|var` 的声明体）：只认 `;`；
   无分号时一路吃到下一句的 `;`，随后 kind 4/12 的 `BuildByIndex` 用 `slice(declIndex, tokenIndex + 1)`
   把下一条语句整段交给 `StatementBuilder` → 抛「export 变量语句没有读完」。
   另外 Build 没有 Asi 切片路径（kind 6 的 `export default` 有 `state.Asi`，变量形没有）。
3. `export-declaration-end-possible-shape.xl.md` / `export-assignment-possible-shape.xl.md`：
   终结候选与 `export =` 的 Asi 切片**本来就有**（`state.Asi` + `splice` 不含边界），缺的只是
   判据侧（第 1 条）。所以这两个文件**无需改动**——端到端行为由第 1 条修好。

### 2.3 修复

1. `IsStatementBoundaryAfterExpression`：在原有四条件之后补一条**窄判据**
   （复用已有的 `IsUncontinuableTailBoundary`，它内部就是 `HasLineBreakBefore` +
   调用位 + `IsNonCallableExpressionTail`/后缀自增）：
   ```ts
   if (ExpressionStatementPossibleShape.IsUncontinuableTailBoundary(units, tokenIndex)) {
     return true;
   }
   ```
   只影响调用它的两个 export 候选（`grep` 确认全仓只有这两处调用），不影响 `IsAsiBoundary`。
2. `typescript/tokens/statements/statement-scanner.xl.md`：新增 `static EndsAtLineBreakBefore(units, current)`
   ——直接拿 `host.Data`（带 trivia）判一次 `EndsAtLineBreak`（内含调用位与类型实参收尾 `>` 两条判据，
   与根变量语句同源）。**纯新增方法**，不动任何既有换行判据（cover8-A 同文件的冲突面最小）。
3. `typescript/tokens/declarations/export-declaration-possible-shape.xl.md`：
   - 新字段 `LastBodyCode`（stage 13 上一个已吃进的代码单元，复位时清空）；
   - stage 13（kind 4/12）在 `;` 处理之后加无分号收口：
     `LastBodyCode >= 0 && StatementScanner.EndsAtLineBreakBefore(units, index)` → `Done/DoneAt/Asi/Stage=4`；
   - kind 4 / kind 12 的 `BuildByIndex` 增加 Asi 切片：`endExclusive = Asi ? tokenIndex : tokenIndex + 1`，
     `slice(declIndex|keywordIndex, endExclusive)`、`splice(start, endExclusive - start, built)`
     ——边界单元（下一条语句首 token）留在根里。`End` 由 `StatementBuilder.Finish` 收到边界前的最后一个单元。

### 2.4 四问

- **正确何时 build**：`export default` / `export =` 在「调用位 + 不可调用尾」的换行格（终结候选同格必须
  Reject）；`export const|let|var` / `export declare …` 在「与根变量语句相同的 ASI 格」（`EndsAtLineBreak`）
  `Done`+`Asi`。`;` 与 EOF 两条老路不变。
- **build 提什么**：`export default` = `ExportAssignment(AsExpression/箭头 …)`；`export =` = 同款；
  变量形 = `VariableStatement` + `ExportKeyword` +（declare 时）`DeclareKeyword`，只切到边界前。
- **何时 close**：各 Build 路径签范围后 `TryToClose`；边界 token 不属于本条（splice 不含它）。
- **close 提什么**：`ExportKeyword` / `DeclareKeyword` 的 Pos、语句 `Pos`（前导 trivia 口径）、
  `SignOut` = 边界前最后一个代码单元的 End。

## 3. 目标 2：`as T` 后 `<` 是比较运算（不是类型实参）

### 3.1 复现与 TS 真值

```text
const x = a as T ⏎ <b>c;
  TS: VariableStatement > BinaryExpression[9,21]
        BinaryExpression[9,19] AsExpression[9,16] (Identifier a, TypeReference T)
        FirstBinaryOperator[16,18] Identifier[18,19] GreaterThanToken[19,20] Identifier[20,21]
  修前: crash「表达式没有读完」

f(a as T ⏎ <b>c);
  TS: CallExpression > BinaryExpression > AsExpression(a, T) < b > c
  修前(静默错树): AsExpression[2,12]，类型被读成 TypeReference `T<b>` → 结构差
```

### 3.2 根因（file:line）与 TS 源码依据

`typescript/tokens/types/type-builder.xl.md` `ParseTypeReference`（~1832 行）无条件
`const typeArguments = this.ParseTypeArguments();`。

TS 6.0.3 的对应实现（`node_modules/typescript/lib/typescript.js`）是：

```js
function parseTypeArgumentsOfTypeReference() {
  // 关键：类型实参必须与类型名同一行
  if (!scanner2.hasPrecedingLineBreak() && reScanLessThanToken() === 30 /* LessThanToken */) {
    return parseBracketedList(20 /* TypeArguments */, parseType, 30, 32);
  }
}
function parseTypeReference() {
  …
  factory2.createTypeReferenceNode(parseEntityNameOfTypeReference(), parseTypeArgumentsOfTypeReference())
}
```

即：**`<` 与类型名之间有换行时不吃类型实参**。`as` / `satisfies` 的类型走 `parseType`，而 `parseType`
最终到 `parseTypeReference`，所以 `a as T` ⏎ `<b>c` 的类型只有 `T`，`<` 回到二元层成为关系运算符。
本仓把这个前提丢了，才会把 `<b>` 当类型实参、把后续 `c` 剩在表达式外。

### 3.3 修复（3 行守卫，lead 批准的 scope 扩展）

`ParseTypeReference` 里：

```ts
let typeArguments:Array<Token> = [];
if (!this.HasLineBreakBeforeCurrent()) {
  typeArguments = this.ParseTypeArguments();
}
```

`HasLineBreakBeforeCurrent`（同文件已有）正是「当前 `At` 与上一个代码单元之间是否隔着换行」，
与 TS 的 `scanner.hasPrecedingLineBreak()` 同口径。只在这一处加守卫：
`ParseTypeQuery`（`typeof x.y<Z>`）的实参路径不变，`>>` / `>>>` 拆分与 `>>=` 等词法决策不变。

**guard 边界（lead 附加要求 ①，probe 实测全绿）**：

| 输入 | TS 行为 | 修后 |
|---|---|---|
| `const x = a as T` ⏎ `<b>c;` | 比较续接（一条语句） | 一致 |
| `const x = a as T<B>;` | 类型实参（同一行） | 一致（`AsExpression` + `TypeReference T<B>`） |
| `const x = a as T<` ⏎ `B>;` | 类型实参（换行在 `<` **之后**） | 一致 |
| `a as Map<string,` ⏎ `number>` | 类型实参 | 一致 |
| `f<B>(c)` / `new A<B>(c)` / `<T>a` 断言 / `function f<T>(x: T)` / `type F = <T>(x: T) => T` / `type F = <T>` ⏎ `(x: T) => T` | 不变 | 一致 |
| `a < b > c` / `a` ⏎ `< b > c` | 比较 / 比较续接 | 一致 |

## 4. 测试增量（`typescript/cases/possible-compute.ts`，129 → 164，+35）

末尾唯一标记段 `// ══ cover8（export 家族调用位 ASI / as 后比较）…`，按 §5 base 先行、trivia / 重复形在后：

1. **export default / export = 的调用位 ASI**（10 条）：`as T` ⏎ `(` / `[` / 模板；`as T` ⏎ `(b)` ⏎ `(c)`；
   块注释变体；块体箭头 ⏎ `(b)`（default 与 `=` 各一）。
2. **export const|let|var / export declare 的无分号收口**（15 条）：`as T` ⏎ `(` / `[` / 模板；块注释 /
   行注释 / 多空格 trivia 变体；多声明符 `… as T` ⏎ `(b), y = 2;`；后接另一条 export；`export let` / `export var`
   重复形；`export declare` 两条并排；`export const x = 1` ⏎ `f();`；箭头体 ⏎ 模板。
3. **`as T` ⏎ `<` 比较续接**（10 条）：const / 赋值表达式 / 嵌套实参 `<b<C>>d` / 条件表达式 / `satisfies` /
   调用实参 / `return` 操作数 / `export const` / `export default` / `export =`。

全部 35 条：`git stash` 回基线实测 **35/35 红**（31 crash + 4 ast-diff），修后 35/35 一致。
`possible-compute` 单 stem 129 → 164；两份快照已同步重写。
**无新 token 夹具**：这两个缺口都是 AST 层（export 收口 / 类型实参判定），token 语料 `token-ast` 1714 不变。

## 5. 门禁（本分支口径）

```text
xl_build(改动 4 个 .xl.md): 4 written, 0 error(s)
tsc -p tsconfig.json:      exit 0
ast-json:                  total cases=5832 cj-ok=5832 cj-fail=0（47 个构造）
ast-json-diff:             合计 5832 条：完全一致 5832/5832；结构 0、位置 0、字段 0
possible-compute stem:     164/164
token-ast --quiet:         total=1714 ok=1704 crash=0 diff=0 ts-invalid=10 gap-now-passing=0
tests/parse/validate.mjs:  1718 条用例，0 条不合格
real-dts-ast:              226 解析成功 / 0 崩溃 / 226 完全一致
xl_check(core+typescript): 863 file(s), 0 error(s), 2464 warning(s)（既有噪音）
core 改动:                 0
```

## 6. 改动文件

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `IsStatementBoundaryAfterExpression` 加 `IsUncontinuableTailBoundary` 窄判据（10 行，含注释） |
| `typescript/tokens/statements/statement-scanner.xl.md` | 新增 `static EndsAtLineBreakBefore(units, current)`（21 行，纯新增；不动既有换行判据） |
| `typescript/tokens/declarations/export-declaration-possible-shape.xl.md` | `LastBodyCode` 字段 + stage 13 无分号收口 + kind 4/12 的 Asi 切片（37 行） |
| `typescript/tokens/types/type-builder.xl.md` | `ParseTypeReference` 的类型实参同一行守卫（9 行；lead 批准扩 scope） |
| `typescript/cases/possible-compute.ts` + 2 快照 | +35 用例，164 条 |
| `docs/cover8-exportasi.md` | 本文件 |

## 7. 合并注意（与 cover8-A 同文件）

- `expression-statement-possible-shape.xl.md`：本分支只改了 `IsStatementBoundaryAfterExpression` 的
  **函数体尾部**（加一条 return true 的窄判据）。A 若改 `IsAsiBoundary` / 换行判据，两处 hunk 不相邻。
- `statement-scanner.xl.md`：本分支是**纯新增** `EndsAtLineBreakBefore`（放在 `ScanReturnOrThrow` 之前），
  不改 `EndsAtLineBreak` / `ContinuesAcrossLine` / `ScanToSemicolon`；A 的换行判据改动可整段保留。
- `type-builder.xl.md` 不在 COVER8 §3 冲突表（A/B/C 都不动它）。

## 8. 遗留 / 需裁定

1. **任务文本里「`export default a` ⏎ `[b]` 是两条语句」与 TS 不符**（实测 TS 是 `a[b]` 一条，
   本仓修前也已是继续），已按 TS 口径处理并写进 §2.1；未把这类输入当 red 用例。
2. `export type T = A` ⏎ `(b)` / `export type T = A` ⏎ `export const y = 1;` 在**基线就是绿的**
   （type alias 侧已有自己的收口），本分支未改动、也未加用例。
3. `export default (a as T)` ⏎ `(b)`（括号化的 as）在 probe 里是 identical（合法调用续接）——
   与 TS 一致，属于「能当调用者」的对照，不入 red。
4. 若后续要把「同一行类型实参」判据也用到 `import("m").X` / `typeof x.y<Z>` 的实参路径，
   按 TS 源码这两处同样可加同一守卫；本轮按 scope 最小化只改 `ParseTypeReference`。
