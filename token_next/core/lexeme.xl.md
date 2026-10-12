# dependencies
```xl
import { CommonToken } from "./common-token.xl.md"
import { Source } from "./source.xl.md"
import { StringToken } from "./string-token.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { SyntaxContext } from "./context.xl.md"
import { Template } from "./template.xl.md"
import { Token } from "./token.xl.md"
import { WrapToken } from "./wrap-token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

**挂一个单元**这件事只有一处实现：挂载方（容器 shape 与 catalog guide）拿一个字符来问
「该挂谁」，这里按表与语言层答，然后**把字符直接喂给刚挂上去的那一格**。

**三档**：

1. **空白**（不是换行）：吃掉、不出单元——它是排版，不是语法。
2. **语言层说自己要一格**（`LanguageToken.CreateLexemeOf`：注释、正则那两种带标记的单元）：
   它先答，因为标记是语言词。
3. **表说它是什么**（`CreateLexeme`）：换行 / 引号 / 符号 / 名字或数字。
4. **语言层说这里开一个形状**（`LanguageToken.DeclareShape`，设计 §3 的 C2）：
   形状优先于词法单元——`(` 是先有形状、才有括号那一格。

形状那一条还有**交左邻**：调用与下标要把它左边那一格吃进去（`f(` 的 `f`、`a[` 的 `a`），
所以挂载方在挂 reader 之前把左邻那一格摘下来交给它——池怎么定、要不要交左邻，都由语言层答。

# method CreateLexeme:(template:Template, source:Source)=>Token | null

按**表**造一个词法单元；表说它什么都不算、且不是空白时给 `null`（调用方据此记账）。

```ts
const value = source.Value;
if (value === "") return null;
const lexicon = template.Lexicon;
if (lexicon.IsNewline(value)) return new WrapToken(template);
if (lexicon.IsWhitespace(value)) return null;
if (lexicon.String.HasQuote(value)) return new StringToken(template);
if (lexicon.IsSymbol(value)) return new SymbolToken(template);
const cls = lexicon.ClassOf(value);
if (cls === "text" || cls === "digit") return new CommonToken(template);
return null;
```

# method MountLexeme:(mounter:Token, context:SyntaxContext, source:Source)=>bool

**只走词法那一半**：空白吃掉、语言层的带标记单元（注释 / 正则）、表驱动的单元。

值那一族的向导要的就是它：它的内容是一段正文，不是一个形状——再问一次 `DeclareShape` 就会递归
（同一个字符又开一个「值」reader）。

```ts
const template = mounter.Template;
const lexicon = template.Lexicon;
const value = source.Value;
if (lexicon.IsWhitespace(value) && !lexicon.IsNewline(value)) return true;
const language = template.Language;
if (language !== null) {
  const marked = language.CreateLexemeOf(template, mounter, source);
  if (marked !== null) {
    mounter.Mount(marked);
    return marked.Process(context, source);
  }
}
const unit = CreateLexeme(template, source);
if (unit === null) return false;
mounter.Mount(unit);
return unit.Process(context, source);
```

# method CloseChain:(unit:Token, context:SyntaxContext, source:Source)=>void

**输入结束那一趟**：沿挂载链**从最里面往外**把还开着的词法单元关掉。

次序是要紧的：里面的正文先落地、先触发收敛，外面的括号与构造才轮得到——
反过来先关外面的括号，里面那段正文就永远没机会进产物（实测：`f(a` 那一档参数会整段丢掉）。

只关 `ClosesAtEnd` 答真的那些（词法单元）；形状与向导走 `Finish`。

```ts
for (let round = 0; round < 4; round++) {
  const chain: Token[] = [];
  let current: Token | null = unit;
  while (current !== null) {
    const mounted: Token | null = current.MountedUnit;
    if (mounted === null) break;
    chain.push(mounted);
    current = mounted;
  }
  if (chain.length === 0) break;
  let closed = false;
  for (let i = chain.length - 1; i >= 0; i--) {
    const item = chain[i];
    if (!item.Closed && item.ClosesAtEnd()) {
      item.TryToClose(context, source);
      closed = true;
    }
  }
  if (!closed) break;
}
```

# method MountFor:(mounter:Token, context:SyntaxContext, source:Source)=>bool

给挂载方用：这个字符归谁。

返回 `false` = **这一格吃不下它**（调用方自己去记账，不许悄悄丢字符）。

```ts
if (mounter.ClaimedByAncestor(source)) return false;
const language = mounter.Template.Language;
if (language !== null) {
  const declared = language.DeclareShape(mounter, source);
  if (declared !== null && declared.Reader !== null) {
    const reader = declared.Reader;
    if (declared.Adopt && mounter.Data.length > 0) {
      const left = mounter.Data[mounter.Data.length - 1];
      mounter.Data.pop();
      reader.TakeLeading(left);
    }
    mounter.Mount(reader);
    return reader.Process(context, source);
  }
}
return MountLexeme(mounter, context, source);
```
