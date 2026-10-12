# dependencies
```xl
import { CommentConfig, Lexicon, RegexConfig } from "../core/lexicon.xl.md"
import { StringConfig } from "../core/string-config.xl.md"
```

# namespace cangjie

TypeScript 的词法表（设计 §1.1 那张表逐行落成值）。

**core 一格语言词都没有**，所以这门语言「哪些字符 / 哪些词」的全部答案都在这一页——
它是 core 与一棵真的语法树之间唯一的那一层数据。

表在这里是**一份模板**：每次装配（`TypeScriptToken.FillLexicon`）都新造一份，
再由 `CopyLexicon` 抄进那一次解析自己的表里——所以下面这些对象不会被哪一次解析改掉。

# class TypeScriptLexicon

## static method Create:()=>Lexicon

造一份 TypeScript 的词法表。

```ts
const lexicon = new Lexicon();
lexicon.SymbolChars = "(){}[]<>;,.?:+-*/%&|^!~=@#";
lexicon.WhitespaceChars = " \t\r\n";
lexicon.NewlineChars = "\r\n";
lexicon.DigitChars = "0123456789";
lexicon.PairTable = new Map([["(", ")"], ["{", "}"], ["[", "]"]]);
lexicon.AssignOperators = new Set(["="]);
lexicon.CompareOperators = new Set(["==", "===", "!=", "!==", "<", ">", "<=", ">="]);
lexicon.CompoundAssignOperators = new Set([
  "+=", "-=", "*=", "/=", "%=", "**=", "&=", "|=", "^=",
  "<<=", ">>=", ">>>=", "&&=", "||=", "??=",
]);
lexicon.MemberOperators = new Set(["."]);
lexicon.StatementEndOperators = new Set([";", ","]);
lexicon.PunctuationOperators = new Set(["=>", "...", "?.", "??"]);
lexicon.Keywords = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "default",
  "break", "continue", "return", "throw", "try", "catch", "finally",
  "new", "delete", "typeof", "instanceof", "in", "of", "this", "super",
  "null", "true", "false", "undefined", "void", "yield", "await", "as",
  "satisfies", "is", "keyof", "infer", "extends", "implements", "from", "require",
]);
lexicon.ModifierWords = new Set([
  "declare", "export", "default", "abstract", "static", "public", "private",
  "protected", "readonly", "override", "async", "accessor", "get", "set",
]);
lexicon.DeclarationWords = new Set([
  "const", "let", "var", "function", "class", "interface", "enum",
  "namespace", "module", "type", "import", "export",
]);
lexicon.String = TypeScriptLexicon.CreateString();
lexicon.Comment = TypeScriptLexicon.CreateComment();
lexicon.Regex = TypeScriptLexicon.CreateRegex();
return lexicon;
```

## static method CreateString:()=>StringConfig

字符串配置（§2 那张表逐行落成值）：引号、转义、原始 / 逐字、插值、模板、多行。

**多行按形态切分**：只有模板串那一种形态能跨行。

```ts
const config = new StringConfig();
config.QuotePairs = new Map([["'", "'"], ["\"", "\""], ["`", "`"]]);
config.Forms = new Map([["'", "Normal"], ["\"", "Normal"], ["`", "Interpolation"]]);
config.EscapeChar = "\\";
config.EscapeSequences = new Set([
  "n", "t", "r", "b", "f", "v", "0", "x", "u",
  "\n", "\r", "\"", "'", "`", "\\",
]);
config.UnknownEscapeKeepsChar = true;
config.InterpolationOpen = "${";
config.InterpolationClose = "}";
config.InterpolationNests = false;
config.MultilineForms = new Set(["Interpolation"]);
return config;
```

## static method CreateComment:()=>CommentConfig

注释标记（§1.1 之外补的那一行）：`//` 与 `/* */`。

```ts
const config = new CommentConfig();
config.LineStart = "//";
config.BlockOpen = "/*";
config.BlockClose = "*/";
return config;
```

## static method CreateRegex:()=>RegexConfig

正则配置：定界符、标志、转义、字符类的括号。

```ts
const config = new RegexConfig();
config.Delimiters = "/";
config.Flags = "gimsuy";
config.EscapeChar = "\\";
config.ClassOpen = "[";
config.ClassClose = "]";
return config;
```

# method CopyLexicon:(from:Lexicon, to:Lexicon)=>void

把一份表**逐格抄进**那一次解析自己的那一份（设计 §1.1：模板每次解析新建一份）。

抄的是值，不是同一个对象：这一趟之后两边各归各的。

```ts
to.SymbolChars = from.SymbolChars;
to.WhitespaceChars = from.WhitespaceChars;
to.NewlineChars = from.NewlineChars;
to.DigitChars = from.DigitChars;
to.PairTable = new Map(from.PairTable);
to.AssignOperators = new Set(from.AssignOperators);
to.CompareOperators = new Set(from.CompareOperators);
to.CompoundAssignOperators = new Set(from.CompoundAssignOperators);
to.MemberOperators = new Set(from.MemberOperators);
to.StatementEndOperators = new Set(from.StatementEndOperators);
to.PunctuationOperators = new Set(from.PunctuationOperators);
to.Keywords = new Set(from.Keywords);
to.ModifierWords = new Set(from.ModifierWords);
to.DeclarationWords = new Set(from.DeclarationWords);
to.String = from.String;
to.Comment = from.Comment;
to.Regex = from.Regex;
```
