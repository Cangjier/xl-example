# dependencies
```xl
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { BasicKind } from "./basic-kind.xl.md"
```

# namespace cangjie

软边界策略：哪些 token 关闭后值得立刻把批次交给宿主。硬边界（窗口结束、`Reload` 前、
`Quit` 前、`MountedUnit` 变化前、文件末尾）由驱动强制 flush，不在这里判。

# class BatchPolicy

## field FlushOnSemicolon:bool = false

遇到 `;` 关闭就 flush。

## field FlushOnComma:bool = false

遇到 `,` 关闭就 flush。

## field FlushOnBracketClose:bool = false

遇到闭括号 `)` `]` `}` 关闭就 flush。

## field FlushOnBracketOpen:bool = false

遇到开括号 `(` `[` `{` 关闭就 flush。

## field FlushOnLineBreak:bool = false

批内出现换行就 flush。

## field FlushOnKeyword:bool = false

遇到关键字就 flush（关键字表由调用方注入，本层不出现语言关键字）。

## field FlushOnEof:bool = true

到达文件末尾就 flush。

## field MaxTokens:int = 64

批内单元数上限（`<= 0` 表示不限）。

## field MaxChars:int = 512

批内代码字符数上限（`<= 0` 表示不限）。

## method ShouldFlush:(host:Token, token:Token, context:SyntaxContext)=>bool

软边界判定：只看已闭合 token 的文本与批元信息，不读未 token 化文档。

```ts
if (!token.Closed) {
  return false;
}
const text = BasicKind.TextOf(token);
if (text.length === 0) {
  return this.FlushOnEof && !this.HasMoreChars(host, token);
}
const first = text.substring(0, 1);
if (this.FlushOnSemicolon && first === ";") {
  return true;
}
if (this.FlushOnComma && first === ",") {
  return true;
}
if (this.FlushOnBracketClose && (first === ")" || first === "]" || first === "}")) {
  return true;
}
if (this.FlushOnBracketOpen && (first === "(" || first === "[" || first === "{")) {
  return true;
}
if (this.MaxChars > 0 && text.length >= this.MaxChars) {
  return true;
}
if (this.FlushOnEof && !this.HasMoreChars(host, token)) {
  return true;
}
return false;
```

## private method HasMoreChars:(host:Token, token:Token)=>bool

token 之后文档里还有没有字符。

```ts
const document = host.SourceRange.Document;
if (document === null) {
  return false;
}
const end = token.SourceRange.End;
if (end < 0) {
  return false;
}
return end < document.GetCount();
```
