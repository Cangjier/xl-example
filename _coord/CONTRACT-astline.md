# CONTRACT-astline：`Token.ToAstLine(indent)` 的输出契约

本文件冻结 `Token.ToAstLine(indent: int) => string` 的**输出形态**。它取代 `Token.ToXmlString()`：
树不再产出 XML，而是产出「一个节点一行」的 AST 行文本。落点：`core/syntax/token.xl.md`。

目标形态的逐字样本在 `docs/expected-token-time-shapes.md`；14 节（char 0–12 + EOF）是验收口径。

## 1. 方法语义

- 返回**本节点及全部后代的整棵子树**的行文本。
- 行间分隔符是 `"\n"`，**末尾不带换行**。
- `indent` 是 0 基深度，**每层缩进 3 列**——正好是连接线 `├─ ` / `└─ ` / `│  ` 的宽度。
- `indent < 0` 按 `0` 处理（先钳再算，钳后的值贯穿整趟递归）。

设 `depth = max(indent, 0)`、`pad = " ".repeat(depth * 3)`、`cut = (depth + 1) * 3`：

1. 自己的行：`pad + AstLabel()`。
2. 依次遍历 `this.Data`（**顺序不变**）：对第 `i` 个子单元，
   `block = child.ToAstLine(depth + 1).split("\n")`；
   第一行拼成 `pad + (是否最后一个 ? "└─ " : "├─ ") + block[0].slice(cut)`；
   其余行（`j >= 1`）拼成 `pad + (是否最后一个 ? "   " : "│  ") + block[j].slice(cut)`；
   全部用 `"\n"` 连接后返回。

`slice(cut)` 是整个口径的关键：子串自带的那 `cut` 列缩进被父级**换成**连接线前缀，所以整棵树只有一套缩进口径，
不会出现「父级缩进 + 子级缩进」叠加。

## 2. `AstLabel()`：一行的字段

`AstLabel()` 由**运行时类名** `this.constructor.name` 起头，随后按**固定顺序**追加字段，**字段之间两个空格**：

| 字段 | 何时出现 | 形态 | 说明 |
| --- | --- | --- | --- |
| a. `pos` | `AstPos()` 返回非 `null` | `pos=<v>` | `v < 0` 打印成 `pos=-` |
| b. `src` | 总是出现 | `src=[<start>,<end>)` | 取 `this.SourceRange.Start` / `.End`；`start < 0` 打印 `-`，`end < 0` 打印 `未封` |
| c. `text` | `AstText()` 非空 | `text="<escaped>"` | 空串＝不出现 |
| d. `op` | `AstOperator()` 非空 | `op="<escaped>"` | 空串＝不出现 |

逐字样例（与文档一致）：

```text
NumericLiteralShape  pos=7  src=[8,9)  text="2"
AsteriskTokenShape  pos=9  src=[9,10)  op="*"
Common  src=[0,3)  text="let"
SourceFileShape  pos=-  src=[0,未封)
```

## 3. 虚钩子（运行时多态，写成普通方法）

| 钩子 | `Token` 默认 | 覆写 |
| --- | --- | --- |
| `AstPos:()=>int \| null` | `return null;` | `ShapeToken` → `return this.Pos;`（`Pos` 默认 `-1`，所以 `SourceFileShape` 印 `pos=-`） |
| `AstText:()=>string` | `return "";` | `BlockToken` → `this.Temp`；`AreaAnnotation` / `LineAnnotation` → `this.Tmp`；`ConstString` → `this.Temp`；`RegexToken` → `this.ToText()`；`ShapeToken` → `(this as any).Text` 是 string 就取它、否则 `""`；`IdentifierShape` → `this.EscapedText`（盖掉上一条） |
| `AstOperator:()=>string` | `return "";` | `ShapeToken` → `(this as any).Op` 是 string 就取它、否则 `""`（约七十个 `*TokenShape` 都声明了 `Op`，不必逐个改） |

`BlockToken` 的 `Temp` 覆写刻意放在 `ShapeToken` 之外：块 token 不是形状，两者互不覆盖。
`ShapeToken` 用**字段探测**而不是逐类覆写，是为了让 `NumericLiteralShape` / `StringLiteralShape` / `BigIntLiteralShape` /
模板串三段这些「有 `Text` 字段」的形状自动带上 `text`。

## 4. 转义（`text` 与 `op` 共用一套）

`Token` 的私有方法 `AstEscape(value)`：`\` → `\\`、`"` → `\"`、CR → `\r`、LF → `\n`、TAB → `\t`，其余字符原样。
按字符逐个 switch，**先判反斜杠**，不存在「换两遍」的问题。

与老 XML 口径的差别（有意为之）：不再有 `\a` `\b` `\f` `\v` `\'`，也不再有 `&gt;` `&lt;` `&amp;` 实体——
行文本只需要能被放进双引号。

## 5. 入口

`Token.ToString()` 固定为 `return this.ToAstLine(0);`。`Root.ToString()` 就是整棵树的 AST 行文本。

## 6. 被删除的成员（重构后不存在）

- `Token.ToXmlString`、`BlockToken.ToXmlString`、`Bracket.ToXmlString`、`AreaAnnotation.ToXmlString`、
  `LineAnnotation.ToXmlString`、`String.ToXmlString`、`ConstString.ToXmlString`。
- `CommonUtil.XmlDecode` **保留不删**（可能仍有引用），解析路径已不再调用它。

## 7. 验收口径（本次）

1. `xl_build`（paths = `core` + `typescript`，targets = `ts`）0 error，3 个既有 E1107 warning 不变。
2. `tsc -p .` exit 0。
3. 增量模式下逐字符驱动 `let x = 2*3+1`，`root.ToAstLine(0)` 与 `docs/expected-token-time-shapes.md`
   的 14 节逐行一致（char 11 允许期望侧行尾 `← …` 注解），**EOF 段逐字节一致**。
4. 解析行为零回归：`npm run tts` 仍 6/8/14（legacy 既有基线）、`--diff --incremental` 仍 14/14。
