# cover8-B：函数前缀后「装饰器 + 尾随声明」18+ 条（边界 ＋ FromUnits）

> 作者：end-build。工作区 `C:\Users\Admin\Documents\GitHub\xl-example-set\cover8-decortail`，
> 分支 `cover8-decortail`，基线 prep HEAD `3fcd2e37`（cover7-1 终验文档提交）。
> 只改本任务 scope 的两个 `.xl.md` + `typescript/cases/end-build.ts` + 本文档；**core 零改动**。
> 探针/日志在本目录 `tmp/`（不进 git）。

## 1. 结论

**DONE。** 函数类声明前缀（`declare function` / 重载签名 / `async` / 生成器 / 泛型）之后换行接
「装饰器 + 声明」的形态，从 **26 条真红**降到 **5 条**（本轮修 **21 条**；其中 **20 条**固化为
`end-build` 用例，全部修前红、修后绿）。剩余 5 条经定位属 `source-file-end-possible-shape` 的
装饰器分派面（非本任务 scope，见 §8），不塞进用例文件。

两半修复：

- **(a) 边界**：`function-declaration-possible-shape` 的 Stage 3 / Stage 4 ASI 边界判据只认
  `Common + IsStatementWord`；装饰器是 Symbol `@`，看不到 → 候选一路把下一条声明的 `{…}` 当函数体。
  新增静态助手 `IsDecoratedDeclarationStart`（换行后的 `@`），Stage 3 / Stage 4 与 statement word 同等 Reject。
- **(b) 建树**：`function-declaration-shape.FromUnits` 在返回类型被换行截断（tailIndex 回退）后
  仍保留 `bodyUnit`（指向被尾随声明带进来的 `{…}`）→ 函数凭空多一个 Block。截断后重判：`bodyUnit = null`。

## 2. 读数（基线 → 修后）

| 项 | 基线 `3fcd2e37` | 修后（本分支） |
| --- | --- | --- |
| `tmp/probe-cover8b.mjs`（33 条候选，TS 6.0.3 diag=0） | **7 绿 / 26 红**（crash 7 / diff 19） | **28 绿 / 5 红**（见 §8，全部 out-of-scope） |
| `end-build` 单 stem | 174 条 | **194 条（+20），194/194 完全一致，diff 0/0/0** |
| 全量 ast-json（47 构造） | 5797/5797 | **5817/5817 cj-ok**（+20） |
| ast-json-diff | 0/0/0 | **5817/5817；结构 0 / 位置 0 / 字段 0** |
| token-ast | 1714（ok1704/ts-invalid10） | **1714（ok1704/ts-invalid10/crash0/diff0/known-gap0）**（不变） |
| cases:check | 1718/0 | **1718/0**（无新夹具） |
| real-dts | 226/226 | **226/226**（crash 0 / diff 0） |
| tsc `-p` / `--noEmit` | 0 | **0** |
| xl_check（core+typescript） | 0 error | **863 文件 0 error**；2464 warning（既有 W3102/W3103 + 3 条既有 E2004，无新增） |
| core 改动 | — | **0**（`git diff 3fcd2e37..HEAD -- core` 空） |

red→green 证据：把两个 `.xl.md` 的改动 `git stash` 后重建（`xl_build` + `tsc`）再跑同一探针 =
**26 红**；`stash pop` 重建后 = **28 绿 / 5 out-of-scope 红**。§3 表里 20 条用例在 stash 态全部为
红（15 diff + 5 crash）。

## 3. 复现、TS 期望与两半根因

### 3.1 base 形态（TS AST 逐节点）

`declare function gf(): void` ⏎ `@dec class C {}`（`parseDiagnostics = 0`）：

```text
TS：FunctionDeclaration[pos 0,end 27]
      DeclareKeyword[0,7]  Identifier(gf)[16,19]  VoidKeyword[22,27]     ← 没有 body
    ClassDeclaration[pos 27,end 43]
      Decorator[27,32] > Identifier(dec)[29,32]   Identifier(C)[38,40]

修前 cj：FunctionDeclaration[pos 0, end 27]
      DeclareKeyword[0,7]  Identifier(gf)[16,19]  VoidKeyword[22,27]  Block[27,43]  ← 把 class 体当成函数体
    （ClassDeclaration / Decorator 整条丢失）
```

变体覆盖：`function f(): void` / `function f(a: A): B`（重载签名）、`declare function gf<T>(): T`（泛型）、
`declare async function ga(): void`、`function* g(): void`、多装饰器 `@a @b`、带调用 `@dec()` / `@dec(a)`、
具名 `@a.b`、`@dec abstract class`、`@dec export class`、`@dec export default class`、带成员/带继承的 class，
以及 trivia 叠加（空行、前缀行注释、前缀块注释、独立行块注释）。

### 3.2 根因 (a)：函数候选的 ASI 边界只认 statement word（`Common`）

`typescript/tokens/declarations/function-declaration-possible-shape.xl.md`

- Stage 3（参数表之后、返回类型冒号之前，基线 `:186-212`）与 Stage 4（返回类型里，基线 `:213-275`）：
  边界 Reject 只有一条判据 `unit instanceof Common && LineBreakBefore && IsStatementWord(text)`。
- 装饰器是 **Symbol `@`**：不走该分支，落到 Stage 4 的「返回类型内容」兜底 `continue`（基线 `:271-272`）；
  随后下一条声明的类体 `{` 到达时 `TypeBuilder.IsBodyBrace(...)` 为真 → `Done = true; DoneAt = at`
  （基线 `:221-229`）→ 候选在 `{` 这一格 Accept → `BuildByIndex` 把 tokenIndex 定在类体括号上。
- 结果就是 3.1 的「函数多 Block、下一条声明整条丢失」（diff 形态）或返回类型读到 `@` 抛
  「函数声明的返回类型没有读完」（crash 形态，非 `declare` 前缀）。

### 3.3 根因 (b)：FromUnits 截断返回类型后没有重判 body

`typescript/tokens/declarations/function-declaration-shape.xl.md`

- 基线 `:164-172`：`last` 是类体 `{…}` 时 `bodyIsLast = TypeBuilder.IsBodyBrace(...)` 为真 →
  `bodyUnit = last`、`signOutUnit = last`、`tailIndex = code.length - 1`。
- 基线 `:199-211`：返回类型解析到 `void` 后还有剩余单元（`@ dec class C`）→
  「已收类型末单元与剩余段首之间有换行」→ 截断 `tailIndex = afterParams + 1 + typeBuilder.At`，
  `signOutUnit = code[tailIndex - 1]`（= `void`）。**但 `bodyUnit` 仍指向 `code[code.length-1]` 的
  类体括号**，后面 `:268-277` 直接把它交给 `StatementBuilder` 建出 `Block` 并 `shape.Add(body)`。
- 所以即使候选走到了正确的 `FromUnits` 调用（例如 EOF/ASI 收口分段、ambient 无体函数路径），
  函数仍会凭空持有下一条声明的 Block；只修 (a) 时这是一颗定时炸弹（其它调用方/以后的分段路径会踩到），
  两半必须同时修。

### 3.4 四问

- **正确的应该什么时候 build**：函数候选在「换行后的 `@`」处就应 **Reject**（与换行后的 statement word
  同一条 ASI 边界）；无体函数声明在返回类型最后一个单元完成，**不能**把下一条声明的 `{…}` 收进来。
- **build 时应该提取哪些信息**：`Body = null`；`ReturnType` 只到截断点（`signOutUnit`）；`End = signOutUnit.End.Index + 1`；
  修饰词 / 名字 / 参数 / 返回类型照旧。下一条声明是独立的 ClassDeclaration（含 Decorator）。
- **什么时候 close**：本类不改 close 时机——候选 Reject 后由根 ASI/EOF 收口建函数，装饰器声明由
  主仓已合入的 `source-file-end-possible-shape` 装饰器分支建出（该分支 `type T = A` ⏎ `@dec` 已绿）。
- **close 时应该提取哪些信息**：函数 `Data` 只剩声明子节点（Keyword/Identifier/Parameter/ReturnType），
  **没有 Block**；装饰器声明的 Decorator 是其 children 的第一个。

## 4. 修复说明（2 个 xl 页，+33 行）

### 4.1 `function-declaration-possible-shape.xl.md`（+29）

| 位置（修后行号） | 改动 |
| --- | --- |
| `:357` 新 `static IsDecoratedDeclarationStart` | `units[at]` 是 Symbol `@` 且 `LineBreakBefore` 为真；只认「换行后的 `@`」，同一行内不算（TS 本身非法） |
| `:188` Stage 3 边界 | 新增 `if (IsDecoratedDeclarationStart(...)) { state.Rejected = true; continue; }`（在 Common+statement word 判据之前） |
| `:220` Stage 4 边界 | 同上（返回类型里也认这条 ASI 边界，避免把下一条声明的体当函数体） |

只加这一种边界，**没有**动 A 分支负责的 LineTerminator/换行字符判据，也没有改 `IsStatementWord`；
与 `source-file-end-possible-shape` 已合入的 `LeadingDeclarationKeyword`（跳过修饰词找声明词）同口径。

### 4.2 `function-declaration-shape.xl.md`（+4）

| 位置（修后行号） | 改动 |
| --- | --- |
| `:199-213` FromUnits 返回类型截断分支 | 截断 `tailIndex`/`signOutUnit` 之后补 `bodyUnit = null;`（附注释）：截断后重判 body，函数不再持有尾随声明的 `{…}` |

## 5. 测试增量

`typescript/cases/end-build.ts` 末尾追加唯一标记段
`// ══ cover8（装饰器尾随声明）…`（行 264 起，active 用例行 274–293，共 **20 条**）：

| 组 | 条数 | 形态 |
| --- | --- | --- |
| base ＋ 前缀族 | 6 | `declare function gf(): void` / `function f(): void` / `function f(a: A): B` / 泛型 / `declare async function` / `function*` |
| 多装饰器 | 2 | `@a @b`（declare / 非 declare 前缀各一） |
| 装饰器表达式 | 3 | `@dec()` / `@dec(a)` / `@a.b` |
| 修饰词组合 | 3 | `@dec abstract class` / `@dec export class` / `@dec export default class` |
| class 体变体 | 2 | 带方法 / 带继承 |
| trivia 叠加 | 4 | 空行 / 前缀行注释 / 前缀块注释 / 独立行块注释 |

端到端：`node typescript/cases/ast-json.mjs end-build` → **194/194**；快照
`end-build.cj-ast.json` / `end-build.ts-ast.json` 重新生成并随分支提交（不手工合并）。

## 6. 门禁（本分支实测，与 §2 表一致）

```text
node typescript/cases/ast-json.mjs            → total cases=5817 cj-ok=5817 cj-fail=0（47 构造）
node typescript/cases/ast-json-diff.mjs       → 5817/5817 完全一致；结构 0 / 位置 0 / 字段 0
node typescript/cases/ast-json.mjs end-build  → 194/194
node typescript/cases/ast-json-diff.mjs end-build → 194/194，0/0/0
node typescript/cases/token-ast.mjs --quiet   → total=1714 ok=1704 crash=0 diff=0 ts-invalid=10 known-gap=0
node tests/parse/validate.mjs                 → 1718 条用例，0 条不合格
node typescript/cases/real-dts-ast.mjs        → 226/226
tsc -p / --noEmit                             → 0 / 0
xl_check(core+typescript)                     → 863 文件 0 error（2464 warning，无新增）
git diff 3fcd2e37..HEAD -- core               → 空（core 零改动）
```

## 7. 改动文件

```text
typescript/tokens/declarations/function-declaration-possible-shape.xl.md   +29
typescript/tokens/declarations/function-declaration-shape.xl.md            +4
typescript/cases/end-build.ts                                             +31（20 条用例 + 段说明）
typescript/cases/end-build.cj-ast.json / .ts-ast.json                     重新生成
docs/cover8-decortail.md                                                  新增（本文档）
```

未新增夹具（cases:check / token-ast 数量不变）；tmp/ 不提交。

## 8. 遗留（5 条 out-of-scope 真红，未塞进用例文件）

以下形态 TS 6.0.3 `diag=0`，修后仍红，但根因在**本任务 write scope 之外**（`source-file-end-possible-shape`
的装饰器分派面 / 非 class 声明形状的装饰器支持），按要求不改、只记录：

| 形态 | 修后症状 | 根因（定位） |
| --- | --- | --- |
| `declare function gf(): void` ⏎ `@dec` ⏎ `class C {}` | crash「不支持的表达式起点」 | `source-file-end` 多声明边界循环把 boundary 从 `@` 覆盖到下一行的 `class`，前缀段以 `@dec` 结尾、装饰器分支只接受「整段以 `{` 收尾」→ 兜底 ExpressionStatement |
| `…` ⏎ `@dec interface I {}` | 同上（短前缀路径为「函数多 Block」） | `source-file-end` 装饰器分支只调 `ClassDeclarationShape.FromUnits`；interface 自己的候选支持装饰器（单独 `@dec interface I {}` 已绿），但作为尾随段时没有候选从 `@` 起扫 |
| `…` ⏎ `@dec enum E { A }` | 同上 | 同上；另外 `@dec enum` **单独出现也红**（EnumDeclaration 形状不支持装饰器前缀），属另一类别 |
| `…` ⏎ `@dec type T = number` | 同上 | 同上；`@dec type` 单独也红（TypeAliasDeclaration 不支持装饰器前缀） |
| `…` ⏎ `@dec namespace N {}` | 同上 | `source-file-end` 装饰器分支 class-only；`@dec namespace` 单独已绿（候选支持） |

若后续要把这 5 条收口，建议另开任务改 `source-file-end-possible-shape`（装饰器后缀按声明词分派到
interface / module / enum / type 的 `FromUnits`），并补 enum/type 形状的装饰器支持；不在本分支扩大改动。

另一个已知边界：`@dec` 与 `class` 之间换行的形态（`@dec` ⏎ `class`）需要 source-file-end 的边界
「不覆盖」规则，同上表。

## 9. 合并注意（与 cover8-A 同文件）

- `function-declaration-possible-shape.xl.md` 与 **cover8-A** 同文件：A 改的是换行**字符**判据
  （LineTerminator），B 加的是 Stage3/4 的「`@` 边界」+ 新助手 `IsDecoratedDeclarationStart`（:188/:220/:357）。
  两处 hunk 不重叠，合并时**两边都保留**；合并后需同时验证：A 的换行用例全绿 + 本分支 `end-build`
  194/194（含新增 20 条）。
- 快照 JSON 冲突：取任一侧后重新 `node typescript/cases/ast-json.mjs end-build` 生成，不手工合并。

## 10. 回滚点

基线 `3fcd2e37`；本分支提交在 `cover8-decortail` 上，整体回滚 = `git reset --hard 3fcd2e37`，
单项回滚 = revert 本分支提交（只动上述 5 文件）。
