# dependencies
```xl
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

WP-D0 的**初始化器尾巴判据**：一个初始化器「到这里算长完」的唯一口径。

三个 composite 法官（`CompositeInitializerJudge` / `-FormsJudge` / `-TailJudge`）原来各自写了一份
「最后一个代码单元之后只剩输入结束」（`NextSignificantChar === ""`）。这份口径把 `;` 判成「还没长完」，
于是所有带分号的声明初始化器都在括号关闭那一格失配：

```text
let x = (1)        → ParenthesizedExpressionShape（正常）
let x = (1);       → 在 char 10 ")" 抛 `declaration 括号`（A1 报告 §1 第 3 条）
let x = [1, 2];    → 在 char 13 "]" 抛 `declaration 括号`
```

`;` 本身不进初始化器（`VariableDeclarationShape.FinishIncremental` 在收口时已经把它过滤掉，
legacy 的 `VariableDeclarationShape.Data` 里也没有它），所以「之后只剩输入结束」的正确口径是
**跳过 trivia、允许一个或多个 `;`、然后必须输入结束**。本判据是这一条口径的唯一实现，三个法官都转调它。

**为什么在字符流上判（而不是只看 `units`）**：括号关闭那一格，`;` 往往**还没流进**宿主的 `Data`
（`let x = [1, 2];` 在 `]` 关闭这一格时 `Data` 只到 `]`）。只看单元数组会把「后面还有 `;`」当成
「后面还有代码」而继续等，`;` 到达那一格又已经没有人再问——所以必须读文档里 `unit` 之后的字符流。
这也与 A1b / A5c 的 `NextSignificantChar` 同一套（`ComputeByIndex` 拿不到 `context`，只能读
`SourceRange.CurrentDocument`）。

# class InitializerTailJudge

## static method IsInitializerEnd:(units:Array<Token>, from:int)=>bool

从 `units[from]` 之后开始看：跳过空白 / 换行 / `//` 行注释 / `/* */` 块注释；允许**一个或多个** `;`
（每个 `;` 之后同样继续跳过 trivia）；之后必须已经是输入结束 ⇒ `true`。中途遇到任何其它字符 ⇒ `false`。

`from` 越界、或文档不可用（`SourceRange.Document` 与 `SourceRange.CurrentDocument` 都是 `null`）⇒ `false`
（保守：判不出「长完了」就不建，宿主保持原来的等待 / 显式抛错）。

```ts
if (from < 0 || from >= units.length) {
  return false;
}
const range = units[from].SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetValue(at) === "*" && document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
    return false;
  }
  // 语句分号：`;` 不属于初始化器（`FinishIncremental` 收口时把它丢掉），可以有一个或多个。
  if (ch === ";") {
    at += 1;
    continue;
  }
  return false;
}
return true;
```
