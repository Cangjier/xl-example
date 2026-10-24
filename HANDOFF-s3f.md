# HANDOFF — Stage 3 / S3f：字面量叶子 + 成员/调用/索引链

分支 `feature/possible-statement-s3f`，基线 `feature/possible-statement` @ `0f2e8982`。
本文只记本片新增的东西；S3a–S3d 的口径见 `HANDOFF-s3-ops.md` / `HANDOFF-s3c-r2.md` / `HANDOFF-s3d.md`。

## 1. 新增支持（形状层 + AST 层）

| 构造 | 形状层节点 | AST 工厂（与 legacy 同一批） | 取证用例 |
| --- | --- | --- | --- |
| `"abc"` | `KindString`（`Raw` = `String` 单元） | `StringLiteralShape.FromBasicToken` | `str-leaf` / `str-add` / `str-plus-ident` |
| `` `abc` ``（无内插） | `KindTemplate` | `NoSubstitutionTemplateLiteralShape.FromBasicToken`（= `ParseTemplateToken` 的 `interps.length===0` 分支） | `template-leaf` |
| `/a+/g` | `KindRegex`（`Raw` = `RegexToken`） | `RegularExpressionLiteralShape.FromBasicToken` | `regex-leaf` |
| `[1,2]` | `KindArray`（`Raw` = `[` 括号单元） | `ExpressionBuilder.ParseArrayLiteral` | `array-leaf` / `array-index` |
| `a.b` | `KindMember`，`Data=[对象,成员名]`，`Raw` = `.` 单元 | `PropertyAccessExpressionShape`（点号**不**入 AST） | `member` / `member-deep` / `paren-member` |
| `a[b]` | `KindIndex`，`Data=[对象,下标]`，`Raw` = `[` 括号 | `ElementAccessExpressionShape`；下标走**嵌套体**（与括号同一套） | `index` / `index-expr` |
| `f(x)` | `KindCall`，`Data=[被调用者]`，`Raw` = 实参括号 | `CallExpressionShape` + `ParseBracketArguments` | `call-no-arg` / `call-two-args` / `method-call` |

关键设计点：

- **状态机多了一个状态**：`ExpectName`（成员名不能被前缀包住，所以不复用 `ExpectOperand`）。
- **`InsertionPoint` 穿过前缀节点**：`-a.b` 在 legacy 里是 `-(a.b)`（`ParseUnary` 先递归到 `ParsePostfix`），
  所以后缀节点要插在前缀的**操作数**上、由前缀包住整条链。这是本片最容易做错的一处。
- **实参/数组元素不进形状树**：它们在括号单元自己的 `Data` 里，AST 侧直接用 legacy 的
  `ParseBracketArguments` / `ParseArrayLiteral` 整段建，所以只有「调用/数组接在谁身上」由形状树证明。
- **覆盖判据不变**：`covered` 必须恰好是 `0..Units.length-1`。`a.b` 的 `.` 不入 AST，但**必须计入覆盖**
  （第一版漏了它，5 条成员用例全被 `Decline("形状树没有覆盖整段表达式单元")` 打回）。

## 2. 未覆盖清单（本片新增，全部安全回退）

| 构造 | 行为 | 为什么 |
| --- | --- | --- |
| 带内插的模板 `` `a${b}c` `` | `BuildOperand` → `null` → `Fail` → legacy | 要拆 `TemplateHead`+`TemplateSpan`，形状层无对应节点 |
| 对象字面量 `{a:1}` | `null` → `Fail` | 语句首 `{` 与块二义，本片按建议不做 |
| `new X()` | `null` → `Fail` | `ParseNew` 的树（含实参、类型实参）本片不接 |
| 可选链 `a?.b` / `a?.()` / `a?.[b]` | `Fail` | 需要「悬而未决的点号」再分派，风险高于收益，本片不做 |
| postfix `a!` / `a++` / `a--` | `Fail` | 同 S3d：`++/--` 的 operator 不入节点，口径未定 |
| `import.meta` / `import("m")` | `StartMember`/`StartCall` 里 `IsBareImport` → `Fail` | legacy 是 `MetaProperty` / `ImportKeyword`+调用，不是「标识符+成员/调用」 |
| `f<T>\`t\``（标签模板带类型实参） | `AmbiguousTypeArguments` 把「深度归零的 `>` 紧跟模板/字符串单元」判为类型实参 → `Fail` | 否则 `>` 会被当大于号、模板被当右操作数（**实证的错树**，见 §4） |
| `f<T>(x)`、`a < b > "s"` | 同上判为类型实参 → `Fail` | 判错的代价不对称：少接管一条是安全的 |

## 3. op 组逐条（`tests/statement-possible/s3f-cases.json`，组 `s3f-leaves-and-chains`）

23 条，**23 PASS / 0 FAIL**（形状树接管计数 23 条、TS 逐节点 23 条）。

- 字面量：`str-leaf`、`str-add`、`regex-leaf`、`template-leaf`
- 后缀：`member`、`member-deep`、`index`、`index-expr`、`call-no-arg`、`call-two-args`、`array-leaf`、`array-index`
- 组合：`chain-mix`（`f(x)[0].y + 1` → `+(member(index(call(f),0),y),1)`）、`members-mul`、`str-plus-ident`、
  `calls-add`、`paren-member`（`(a + b).c`）、`method-call`（`o.m(x)`）
- declined：`decline-template-interp`、`decline-object-literal`、`decline-new`、`decline-optional`、
  `decline-tagged-template-angle`（均 `shapeAst=0` 且 `declined>0`）

每条仍断言五件事：①壳路径 XML == 同源码 legacy XML 逐字节；②`TotalShapeAst` 达到期望（不接受静默回退）；
③形状结构 == `ts.createSourceFile` 逐节点渲染；④未覆盖必须 `declined` 而不是静默；⑤形状节点不泄漏进 XML。

**字面量的值怎么钉住**：结构文本里字面量只记种类（`string` / `template` / `regex` / `array`），
值由断言①钉住——壳建的 AST 若与 legacy 文本不同，XML 必然不同。`import.meta` / 动态 import 的拒绝
则由 `ast-json` 的 `import-meta.cj` fixture 钉住（见 §4），这两条**不在** s3f 组里：它们在**壳层**
就 `Incomplete`，不会走到 `StatementShapeAst.Decline`，所以 `declined` 计数为 0，不满足该组的断言④口径。

## 4. 集成收敛（四步 ast-json 起全绿）

| 门 | 读数 |
| --- | --- |
| `xl_build`（core+typescript） | 886 written / 0 error |
| `xl_check` | 886 file / 0 error（2505 warning，存量 W3102/W3103） |
| `tsc -p tsconfig.json` | 0 |
| `op-ast-proof`（`ast-from-shapes`） | 47/47（接管计数 47、TS 逐节点 47、数字叶子 8） |
| `op-ast-proof`（`s3f-leaves-and-chains`） | **23/23** |
| `op-proof`（`operators-live`） | 36/36（结构文本 36、InsertBetween 33） |
| `harness --group=operators-live` | 36/36，fallback 0 |
| `harness --group=dev` | 22/22（含既有 fallback 情形） |
| `harness --all` | 72 pass / 0 fail / known 1（存量） |
| `harness --double-accept` | 冲突 0，cases 91 failed 0 |
| `harness --lint` | PASS（ASI 唯一、优先级数字只在 operator-table） |
| `validate.mjs` | 1720 条 / 0 不合格 |
| `ast-json.mjs` | 6167 条 cj-ok 6167 |
| `git status --short typescript/cases` | **空** |
| `ast-json-diff.mjs` | **0 / 0 / 0**（6167 条完全一致） |
| `token-ast.mjs` | total 1716 / ok 1706 / crash 0 / diff 0 / ts-invalid 10（存量） |
| `real-dts-ast.mjs` | 226/226 AST 完全一致 |
| `feas-operator/harness` | 6/6 |
| `insert-between.test` | 9/9 |

**第一轮 ast-json 曾经红**（`angle.cj` / `import-meta.cj` 两个 fixture 结构差 2 条），原因是本片新增的
后缀/模板支持把两条构造接成了错树：`import.meta` 被建成 `PropertyAccess`、`f<T>\`t\`` 被建成
`>(f,T)` 且模板当右操作数。修法就是 §2 里的两条保守拒绝；修完 status 空、diff 0/0/0。
**这两条是本片唯一的真实回退证据**，也是「未覆盖就 Decline」纪律的直接收益。

perf（`tests/statement-possible/perf.mjs`，reps=5）：

```
long n=300 median=12.50ms tokens=599 candidateCalls=30
many statements=2000 median=30.51ms tokens=2000 candidateCalls=30015
scale n=100/200/400 median=1.54 / 4.97 / 16.55ms
ratio(200/100)=3.23 ratio(400/200)=3.33  → WARN（存量，不判失败）
```

`ratio` 告警是**存量**：S3d 记 2.83/3.40、S3c-r2 记 2.90/3.32，本轮同量级，本片未加重。

## 5. 风险与后续

1. **`!` 与 `++/--` 仍是 Fail**：`a!.b`、`a++` 这类一条语句里混着未覆盖构造时会整条回 legacy——
   正确但少接管；若后续要做 `!`，`InsertionPoint` 已经能直接复用。
2. **可选链未做**：需要「先记下 `?.`、等下一个单元再分派」的两段式，本片为了控制风险留空；
   `ParsePostfixSuffix` 的三条 `?.` 分支（成员/调用/索引）就是将来的对照物。
3. **`f<T>\`t\`` 现在整条放弃**（含 `f<T>(x)`）：这是保守方向，代价是接管率，换来的是不会建错树。
   若将来要接管类型实参调用，`AmbiguousTypeArguments` 的判据必须与 `CanStartTypeArgumentCall` 对齐。
4. **实参/数组元素/下标外的括号内容不在形状树里**：`f(x)` 的 `x`、`[1,2]` 的元素、`import` 的拒绝
   都由 legacy 例程整段建。XML 逐字节仍然钉住正确性，但「形状树覆盖了实参内部」这件事**没有**被证明。
5. **提交顺序**：`095c6f58`（feat）单独 checkout 时 `op-ast`/`op-proof` 会红——旧期望还写着
   「call/member/element/string 未覆盖」。`a0d43c62`（test）才是把期望改对的那一半，两者是一对。
