# dependencies
```xl
import { CommentToken } from "../core/comment-token.xl.md"
import { ConvergenceException } from "../core/convergence-exception.xl.md"
import { LanguageShapeToken } from "../core/language-shape-token.xl.md"
import { LanguageToken, ShapeDeclaration } from "../core/language-token.xl.md"
import { Lexicon } from "../core/lexicon.xl.md"
import { RegexToken } from "../core/regex-token.xl.md"
import { Source } from "../core/source.xl.md"
import { Template } from "../core/template.xl.md"
import { Token } from "../core/token.xl.md"
import { ArrayLiteralShape, BracketShape, IndexShape } from "./shapes/bracket-shape.xl.md"
import { BlockShape, BraceShape, ObjectLiteralShape } from "./shapes/brace-shape.xl.md"
import { ArrowParamsShape, CallShape, GroupShape, ParenShape } from "./shapes/paren-shape.xl.md"
import { HoleShape, HoleValueShape } from "./shapes/string-shape.xl.md"
import { NameShape, NumberShape, ValueShape } from "./shapes/value-shape.xl.md"
import { CopyLexicon, TypeScriptLexicon } from "./typescript-lexicon.xl.md"
```

# namespace cangjie

TypeScript 的那一层（设计 §1 第 3 条）：**词法表、语言词表、身份判据的实现、装配入口**。

core 一格语言词都不认识；这门语言「哪些字符是符号」「`//` 起头的是注释」「`/` 是除号还是正则」
「`(` 前面是什么才叫调用」——全部在这一个类里答。

**池的声明也在这里**（§3 的 C2）：`DeclareShape` 是「挂载方声明我下面可能有哪些子形状」那句话的实现。
判据用的是挂载方自己手上的事实（它的 `Data` 里左邻那一格），不是全局表。

# class TypeScriptToken extends LanguageToken

## field Own:Lexicon = new Lexicon()

这一门语言自己那一份表（装配时填好）。

## constructor:()=>void

装配之前这一份是空的；`FillLexicon` 才把它填满。

```ts
super();
```

## method LexiconOf:()=>Lexicon

身份判据读的那一份表。

```ts
return this.Own;
```

## method FillLexicon:(lexicon:Lexicon)=>void

把 TypeScript 的表写进这一次解析的模板。

**新造一份再抄**（`TypeScriptLexicon.Create` + `CopyLexicon`）：§1.1 那句
「模板每次解析新建一份」落在这里——两次解析之间没有共享的可变表。

```ts
CopyLexicon(TypeScriptLexicon.Create(), lexicon);
this.Own = lexicon;
```

## method StartsUnit:(ch:string)=>bool

引号、配对符号、符号字符——这三类都会**开一个新单元**，所以正在攒正文的词法单元不许吃它们。

`$` 与 `_` 与字母一样落在「三张表都没认领」的那一堆（`text`），所以它们照旧是名字的一部分。

```ts
const lx = this.Own;
if (ch === "") return false;
if (lx.String.HasQuote(ch)) return true;
if (lx.Partner(ch) !== "") return true;
return lx.IsSymbol(ch);
```

## method ExtendsLexeme:(text:string, ch:string, cls:string)=>bool

**TypeScript 的数字字面量写法**：跨类的那几格由这里放行——
`0x1F` 里的 `x` 与十六进制位、`1_000` 里的 `_`、`1e5` 里的 `e`、`1.5` 里的 `.`。

它是「表说这个字符不算数字，可它确实是这一格数字的一部分」的唯一出口。

```ts
if (cls !== "digit") return false;
if (ch === "_") return true;
if (ch === ".") {
  return text.indexOf(".") < 0 && text.indexOf("x") < 0 && text.indexOf("X") < 0
    && text.indexOf("e") < 0 && text.indexOf("E") < 0;
}
if (ch === "e" || ch === "E") return text.indexOf("e") < 0 && text.indexOf("E") < 0;
if (ch === "x" || ch === "X" || ch === "o" || ch === "O" || ch === "b" || ch === "B") return text === "0";
if ("abcdefABCDEF".indexOf(ch) >= 0) return text.startsWith("0x") || text.startsWith("0X");
if (ch >= "0" && ch <= "9") return true;
return false;
```

## method CreateLexemeOf:(template:Template, parent:Token, source:Source)=>Token | null

**带标记的词法单元**：注释与正则。

`//` 与 `/*` 要看下一格；`/` 是不是正则的开头要看**左邻那一格**（值后面是除号，别处是正则）——
两件都是语言判断，所以走的是 `CreateLexemeOf` 而不是 core 的表。

```ts
const ch = source.Value;
if (ch !== "/") return null;
const comment = this.Own.Comment;
const next = source.At(source.Index + 1);
if (comment.LineStart !== "" && ch + next === comment.LineStart) {
  return new CommentToken(template).Use(comment.LineStart);
}
if (comment.BlockOpen !== "" && ch + next === comment.BlockOpen) {
  return new CommentToken(template).Use(comment.BlockOpen);
}
if (!this.RegexAllowed(parent)) return null;
return new RegexToken(template).Use(ch);
```

## method RegexAllowed:(parent:Token)=>bool

**`/` 这一格算不算正则的开头**：左邻不是一个值就算（行首、运算符后面、逗号后面）。

```ts
const data = parent.Data;
if (data.length === 0) return true;
return !this.IsValueShape(data[data.length - 1]);
```

## method DeclareShape:(mounter:Token, source:Source)=>ShapeDeclaration | null

**声明池**（§3 的 C2）——这一页最要紧的一格。

三对括号各有自己的池，判据只看**挂载方自己的左邻那一格**：

| 字符 | 左邻是一个值 | 左邻不是值 | 交左邻 |
| --- | --- | --- | --- |
| `(` | `CallShape`（`f(` 是调用） | `GroupShape` / `ArrowParamsShape`（分组还是箭头形参，要看括号后面那一格） | 是 |
| `{` | `ObjectLiteralShape`（值位的花括号） | `BlockShape`（语句位的花括号） | 否 |
| `[` | `IndexShape`（`a[` 是下标） | `ArrayLiteralShape`（值位的方括号） | 是 |

**交左邻**是这一格的另一半：调用与被下标的那一格（`f` / `a`）是**形状自己的**第一个子单元，
不是父容器的兄弟——所以挂载方在挂之前把它摘下来交给 reader（`ShapeDeclaration.Adopt`）。

名字与数字进的是同一族（`ValueShape`），池里两格由第一段关上的正文收成一格。

```ts
const ch = source.Value;
const lx = this.Own;
const data = mounter.Data;
const left = data.length > 0 ? data[data.length - 1] : null;
const hasLeft = left !== null && this.IsValueShape(left);
if (lx.Partner(ch) !== "") {
  if (ch === "(") {
    const pool = hasLeft ? ["CallShape"] : ["GroupShape", "ArrowParamsShape"];
    return new ShapeDeclaration(new ParenShape(mounter.Template, pool).Use("(", ")"), hasLeft);
  }
  if (ch === "{") {
    const pool = hasLeft ? ["ObjectLiteralShape"] : ["BlockShape"];
    return new ShapeDeclaration(new BraceShape(mounter.Template, pool).Use("{", "}"), false);
  }
  if (ch === "[") {
    const pool = hasLeft ? ["IndexShape"] : ["ArrayLiteralShape"];
    return new ShapeDeclaration(new BracketShape(mounter.Template, pool).Use("[", "]"), hasLeft);
  }
  return null;
}
if (lx.String.HasQuote(ch)) return null;
if (lx.IsSymbol(ch)) return null;
const cls = lx.ClassOf(ch);
if (cls === "text" || cls === "digit") {
  return new ShapeDeclaration(new ValueShape(mounter.Template, ["NameShape", "NumberShape"]).Use("", ""), false);
}
return null;
```

## method CreateHole:(parent:Token, source:Source)=>Token | null

**插值洞**（§2.1 的唯一接点）：字符串那一格把它挂上去，洞里的内容由子单元自己啃。

洞自己也是一对定界符（`${` … `}`），所以它走的是同一套形状机制。

```ts
const config = this.Own.String;
return new HoleShape(parent.Template, ["HoleValueShape"]).Use(config.InterpolationOpen, config.InterpolationClose);
```

## method BuildShape:(name:string, template:Template)=>LanguageShapeToken

按池里的名字造出那一格形状（§4 的 resolve 问的就是它）。

**表与实现漂了的报错也在这里**：池里有一个建不出来的名字 = 收敛表写了一个没有实现的格子。

```ts
if (name === "NameShape") return new NameShape(template);
if (name === "NumberShape") return new NumberShape(template);
if (name === "GroupShape") return new GroupShape(template);
if (name === "CallShape") return new CallShape(template);
if (name === "ArrowParamsShape") return new ArrowParamsShape(template);
if (name === "ObjectLiteralShape") return new ObjectLiteralShape(template);
if (name === "BlockShape") return new BlockShape(template);
if (name === "ArrayLiteralShape") return new ArrayLiteralShape(template);
if (name === "IndexShape") return new IndexShape(template);
if (name === "HoleValueShape") return new HoleValueShape(template);
throw new ConvergenceException("池里有一个没有实现的形状名：" + name + "（表与实现漂了）");
```

## method IsValueShape:(unit:Token)=>bool

**左邻这一格算不算一个值**：C2 那三行判据全靠它。

判据是**形状名**（`Tag`），不是「有没有子单元」：一个括号分组是值、一行注释不是。

```ts
const tag = unit.Tag;
return tag === "NameShape" || tag === "NumberShape" || tag === "CommonToken"
  || tag === "StringToken" || tag === "RegexToken" || tag === "HoleValueShape"
  || tag === "GroupShape" || tag === "CallShape" || tag === "ArrowParamsShape"
  || tag === "ObjectLiteralShape" || tag === "ArrayLiteralShape" || tag === "IndexShape";
```
