# 机械事实 — core/syntax

文件数 20；字节 37925；代码行 660。

| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `core/syntax/block-token.xl.md` | 2265 | 46 | BlockToken extends Token | | TempToString AppendAndSignOut AppendValueAndSignOut IsAppend Process Undo IsUndo Default SignOut AstText | 0 | Process×1 dropBasic:splice1 |
| `core/syntax/branch-states.xl.md` | 80 | 0 |  | |  | 0 | — |
| `core/syntax/branch-transiter.xl.md` | 367 | 0 |  | |  | 0 | — |
| `core/syntax/catalog-guide.xl.md` | 4245 | 66 | CatalogGuide | | ComputePossibleShapes ComputePossibleShapesByIndex Reset | 0 | ComputePossibleShapes×1 loop(possible)×1 |
| `core/syntax/close-states.xl.md` | 69 | 0 |  | |  | 0 | — |
| `core/syntax/compute-possible-shapes-states.xl.md` | 100 | 0 |  | |  | 0 | — |
| `core/syntax/document.xl.md` | 1185 | 10 | Document | | GetRangeString GetRangeLines GetLine GetLineOffset GetLineInfo GetRaw GetScriptPath | 0 | — |
| `core/syntax/guide-token.xl.md` | 1286 | 22 | GuideToken extends Token | | Close Default Navigate Process | 0 | Process×1 |
| `core/syntax/i-compute-possible-shapes.xl.md` | 735 | 0 |  | |  | 0 | — |
| `core/syntax/independent-token.xl.md` | 712 | 3 | IndependentToken extends Token | | Process Close Default | 0 | — |
| `core/syntax/message.xl.md` | 449 | 1 | Message | |  | 0 | — |
| `core/syntax/possible-shape-cache.xl.md` | 1272 | 22 | PossibleShapeCache | | GetState SetState GetShare SetShare ClearShare GetItemStart SetItemStart Clear | 0 | — |
| `core/syntax/possible-shape.xl.md` | 1808 | 15 | PossibleShape | | SlotOf Slot Compute ComputeByIndex Build IsBuildable ContinuationClaim BuildByIndex | 0 | — |
| `core/syntax/possible-source.xl.md` | 78 | 0 |  | |  | 0 | — |
| `core/syntax/shape-states.xl.md` | 86 | 0 |  | |  | 0 | — |
| `core/syntax/shape-token.xl.md` | 2312 | 49 | ShapeToken extends UnitToken | | Default TryToClose TrimEndToLastCode Close ExitOrPre AstPos AstText AstOperator | 0 | ExitOrPre×1 |
| `core/syntax/source-range.xl.md` | 5083 | 85 | SourceRange | | Of Whole At ValueAt Has Length IsEmpty IsInRange IsEof Clone Equals Same Different GetHashCode ToString GetRangeString GetRangLines GetRaw GetRawRange GetLineRange GetStartLine GetEndLine GetStartLineInfo GetEndLineInfo FromRanges | 0 | — |
| `core/syntax/syntax-context.xl.md` | 4163 | 85 | SyntaxContext | | GetDefault Get ContainsKey Set Process ProcessRange HandleMessage DrainMessages | 0 | Process×1 |
| `core/syntax/token.xl.md` | 7092 | 167 | Token | | Last Default Close TryToClose Reclose MoveDataTo Add AddRange Quit Process SignIn SignInToken SignOut TrySignOut SignOutToken Sign Undo IsUndo WhichUnitRangeContains Replace RemoveSelf ToAstLine AstLabel AstPos AstText AstOperator AstEscape ToString | 0 | Process×1 MountedUnit=×5 dropBasic:splice3/len=0 |
| `core/syntax/unit-token.xl.md` | 4538 | 89 | UnitToken extends Token | | ComputePossibleShapes ComputePossibleShapesByIndex OnBracketCreatedEvent ExitOrPre Process | 0 | ExitOrPre×1 ComputePossibleShapes×1 Process×1 |
