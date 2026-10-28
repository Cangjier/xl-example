# 机械事实 — core/syntax/basic-tokens

文件数 9；字节 44287；代码行 979。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `core/syntax/basic-tokens/area-annotation.xl.md` | 4497 | 99 | AreaAnnotation extends UnitToken | | Process Undo IsUndo Close Default ExitOrPre AstText Transit | 0 | ExitOrPre×1 Process×1 MountedUnit=×1 |
| `core/syntax/basic-tokens/bom.xl.md` | 2249 | 30 | Bom extends UnitToken | | Default ExitOrPre Close CanStart Transit | 0 | ExitOrPre×1 |
| `core/syntax/basic-tokens/bracket.xl.md` | 7363 | 100 | BracketChildCreatedHook<br>BracketRoleHook<br>Bracket extends UnitToken | | OnChildBracketCreated OnBracketCreated Is Use Close Default ExitOrPre OnBracketCreatedEvent Transit | 0 | ExitOrPre×1 MountedUnit=×1 |
| `core/syntax/basic-tokens/common.xl.md` | 13801 | 413 | Common extends BlockToken | | IsAppend MaxUnicodeCodePoint IsUnicodeEscapeStart UnicodeBraceEscapeDigits UnicodeBraceEscapeValue IsInUnicodeBraceEscape Close IsNumberWithoutDecimal CanStartNumber IsExponentPrefix IsNumber IsBigInt NumberBody BigIntBody IsDigitRun IsDecimalInteger IsDecimalPrefix IsDecimalNumber IsRadixDigit IsRadixRun IsNumberBody IsBigIntBody IsBool Is IsAny Transit | 0 | — |
| `core/syntax/basic-tokens/line-annotation.xl.md` | 3484 | 70 | LineAnnotation extends UnitToken | | AstText Undo IsUndo Close Default ExitOrPre Transit | 0 | ExitOrPre×1 MountedUnit=×1 |
| `core/syntax/basic-tokens/regex-token.xl.md` | 4210 | 105 | RegexToken extends UnitToken | | Close ToText AstText Consume ExitOrPre Transit | 0 | ExitOrPre×1 MountedUnit=×1 |
| `core/syntax/basic-tokens/shebang.xl.md` | 2693 | 50 | Shebang extends UnitToken | | Default ExitOrPre Close Transit | 0 | ExitOrPre×1 MountedUnit=×1 |
| `core/syntax/basic-tokens/symbol.xl.md` | 3937 | 79 | Symbol extends BlockToken | | IsAppend NextCharAfter Is IsAny Close Transit | 0 | — |
| `core/syntax/basic-tokens/wrap-symbol.xl.md` | 2053 | 33 | WrapSymbol extends BlockToken | | IsAppend Close Transit | 0 | — |
