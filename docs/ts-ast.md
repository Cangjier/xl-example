# TS 形状直出口（第三个出口）

> 本文是 **token 树的第三个出口**（TS 形状）的规格：形状、API、验收，以及它与 XML / AST JSON
> 两个出口的关系。实现在 [`typescript/ts-ast.xl.md`](../typescript/ts-ast.xl.md)，
> 命令行侧在 [`cjcli.xl.md`](../cjcli.xl.md) 的 `CjcliParseTsAst`。
> 第二个出口（AST JSON）见 [ast-json.md](ast-json.md)。

---

## 1. 是什么

同一个 token 树，投成 **`ts.createSourceFile` 的形状**：一个 `SourceFile` 节点，每个节点
`{ kind, pos, end, …字段 }`。三个约定：

| 约定 | 规则 |
| --- | --- |
| `kind` 用**名字** | `"VariableStatement"` / `"BinaryExpression"` / `"EndOfFileToken"`…**不是数字** |
| 坐标是 `pos` / `end` | 半开区间；来源是产物树每个节点上的 `range`（闭区间 `[起, 止]`），投影自己不发明位置 |
| 字段名按 TS | `statements` / `members` / `parameters` / `declarationList`…；产物里分段本来就叫 `initial` / `compare` / `body` 的那套名字照用 |

**为什么 kind 用名字**：名字是规范的一部分（可读、可改、可 `diff`），而数字要内建一张
300 条的 `SyntaxKind` 枚举表，那张表会跟着 TypeScript 版本漂。查数字是**使用方**的事
（`tests/parse/ts-ast.mjs` 从 `ts.SyntaxKind` 查），投影不必知道。

**不重新解析**：产物树是唯一事实来源，投影只做三件事——换名（`Let` → `VariableDeclaration`）、
补壳 / 提层（补 `VariableStatement` / `VariableDeclarationList`，摊平 `ClassBody` / `ReturnType`）、
按 kind 给 TS 的字段名。

**不猜**：没覆盖的产物标签**原样透传**（`kind` 保留产物标签名）并记进 `unmapped`——
猜出来的节点会让对拍报出假成绩。

---

## 2. 怎么用

命令行（`cjcli`）：

```bash
node build/ts/cjcli.js samples/hello.ts --ts-ast            # 形状本身 → 标准输出（紧凑单行）
node build/ts/cjcli.js samples/hello.ts --ts-ast -o out.json
node build/ts/cjcli.js samples/hello.ts --ts-ast | ...      # 直接喂给对拍 / diff 脚本
```

**标准输出里只有形状本身**：`projectRoot` 的返回值是 `{ ast, unmapped, count }`，
`cjcli` 打的是 `ast`；`unmapped`（投影没覆盖、原样透传的产物标签名单）走**标准错误**，
与解析失败那条诊断通道同一口径。这样下游 `diff` 不用先取 `.ast`。

库 API：

```ts
const context = new TextContext(new Template());
context.Process(new TextDocument(source));
const projected = projectRoot(context.Root.ToList(), source);  // { ast, unmapped, count }
const text = ToJsonText(projected);                            // 紧凑单行 JSON
```

`ToJsonText` 是 `cjcli --ts-ast` 与 [`samples/check.mjs`](../samples/check.mjs) **共用**的
同一个序列化函数（`Map` → 普通对象那一层仍然只有 `Token.ToPlain` 一个出处：
`JSON.stringify` 对 `Map` 一律给 `{}`，这是必须显式处理的一步）。

---

## 3. 验收

| 判据 | 命令 | 口径 |
| --- | --- | --- |
| 与 TS 原生 AST 对拍 | `npm run cases:tsast` | 逐节点比 **kind、区间、字段名**三样；缺（没投出来）与漂移（位置差一点）分开报 |
| 逐字节确定性 | `npm run samples` | `samples/*.expected.tsast.json` 逐字节比对，**不做归一化**（紧凑单行、键序与 `pos` / `end` 都是确定性的） |
| 「命令行 = 库 API」 | `npm run samples` | `ENTRY` 一行：同一份源码，`cjcli` 进程与库 API 的输出必须逐字节相同 |
| 投影表结构 | `npm run cases:shapelint` | 扫规范源码找 `new Map([...])` 的**重复键**（重复键会静默覆盖）；表一张都找不到也算失败 |
| 搬家等价性（一次性） | —— | 第 75 轮用一把一次性脚本在全语料上逐字节对拍过：**1399 个文件、0 处不一致**（旧实现 2464 行 JS vs xl 产物）；结论记在 README 台账，脚本随即删除 |

`cases:tsast` **是红的**（`process.exitCode` 在「仍然缺 / 仍然漂移」时为 1）：
它是一把量成绩的尺子，不是「绿了才算过」的闸门——红着的一栏就是下一步的缺口榜。

---

## 4. 改这个出口时要动的地方

1. **加/改一个标签的投影**：改 [`typescript/ts-ast.xl.md`](../typescript/ts-ast.xl.md) 里
   对应的表（`KIND_BY_TAG` / `FIELD_BY_KIND` / `WRAPPER_FIELDS` / `BODY_FIELDS`…）或那个
   `project*` 函数；表的**重复键**有尺子（`cases:shapelint`）盯着。
2. **改完跑**：`xl check` → `npm run build` → `npm run samples` → `npm run cases:tsast`
   （数字要动，且只按预期动）→ 其余七把尺子。
3. **不要在这里「顺手」改函数体**：这份实现是**逐字搬家**（上一版是 `tests/parse/ts-shape.mjs`
   里的 2464 行 JS），搬家时一个字符都没改；要重构它，先把 `cases:tsast` 的数记下来当基线。

---

## 5. 如实记下的取舍

- **产物带 `// @ts-nocheck`**：逐字搬来的函数体是 JS 写法（`const props = {}` 之后再挂字段、
  内层箭头函数不带参数类型…），在 `strict` 的 TS 里要报一百多处；改掉它们就是**改写**，
  不是搬家。类型标注仍然写全——它们是文档，也是将来真要开检查时的起点。
  判据放在下一层：`cases:tsast` 的成绩 + 一次性逐字节对拍。
- **`NUMERIC_LITERAL` 标 `RegExp`、投影整体跑在 `any` 上**：TS 目标准确；
  C++ 目标是同一笔账（与 AST JSON 出口一样，要么 `std::any`，要么「另一个目标的活儿」）。
- **死代码照原样留着**：`stmtLike`（没有调用点）、`projectLogical`（两个 `case` 都够不着）、
  `matchBrace` / `matchingBrace`（一对重复实现）。搬家这一轮不夹带清理——
  要动它们，另开一轮，用尺子量。
- **一个真缺口是这一轮修掉的**（不是绕着它写规范）：对象字面量属性值里
  `f(x) ? { … } : g` 曾被收成「方法声明 + 返回类型 + 方法体」，修在
  [`method-declaration.xl.md`](../typescript/tokens/function/method-declaration.xl.md)：
  形参表后面接**运算符**（`ValueOperators`）、**下标括号** `[`、或**值位关键字**
  （`ValueKeywordTexts`：`in` / `instanceof` / `as` / `satisfies`）⇒ 都是表达式，不是声明。
  最小复现：

  ```ts
  const p = { name: e(z) ? { k: 1 } : g };
  const p = { name: e(z)[0] ? { k: 1 } : g };
  const p = { name: e(z) in o ? { k: 1 } : g };
  ```
