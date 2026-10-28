# 机械事实 — core/syntax/templates

文件数 10；字节 31993；代码行 567。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `core/syntax/templates/basic-dispatch.xl.md` | 15447 | 259 | BasicDispatch | | Transit Fallback BatchPlain BuildClassTable IsPlainCode | 0 | — |
| `core/syntax/templates/keyword-template.xl.md` | 518 | 8 | KeywordTemplate | | Ban Allow IsKeyword | 0 | — |
| `core/syntax/templates/method-name-template.xl.md` | 615 | 11 | MethodNameTemplate | | Ban Allow IsMethodName | 0 | — |
| `core/syntax/templates/number-template.xl.md` | 1178 | 26 | NumberTemplate | | AddPlainSuffixes MatchPlainSuffix MatchBigIntSuffix | 0 | — |
| `core/syntax/templates/regex-template.xl.md` | 2068 | 48 | RegexTemplate | | IsFlag IsOperandEnd CanStart CanStartAt | 0 | — |
| `core/syntax/templates/sequence-template.xl.md` | 1962 | 28 | SequenceTemplate | | Get Set Ban AddModifyItem Initialize | 0 | — |
| `core/syntax/templates/sequence.xl.md` | 1642 | 36 | Sequence | | Add Contains Remove Removed Added InsertedBefore InsertedBeforeWhere InsertedAfter | 0 | dropBasic:splice4 |
| `core/syntax/templates/string-template.xl.md` | 590 | 0 | StringTemplate | |  | 0 | — |
| `core/syntax/templates/symbol-template.xl.md` | 5386 | 141 | SymbolTemplate | | Ban Allow IsSymbol IsCombinedSymbol IsCombineBlocked AllowCombineSymbol BanCombineSymbol IsNumberWithoutDecimal IsNumberContainsDecimal IsNumber IsHexDigit IsWhiteSpace IsLetter IsLetterOrNumber IsAssignmentSymbol AddAssignmentSymbol RemoveAssignmentSymbol IsCompoundAssignmentSymbol AddCompoundAssignmentSymbol RemoveCompoundAssignmentSymbol IsMemberSymbol AddMemberSymbol RemoveMemberSymbol IsStatementSymbol AddStatementSymbol RemoveStatementSymbol IsCompareSymbol AddCompareSymbol RemoveCompareSymbol | 0 | — |
| `core/syntax/templates/template.xl.md` | 2587 | 10 | Template | | IsLineTerminator BasicBranchQueue Initialize | 0 | — |
