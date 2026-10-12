// xl:note `do` 的体是一条表达式语句（不是块），体与 `while` 之间夹一条块注释
// xl:note 第 866 轮：`DoWhile` 进了 `Statement.IsStatementUnit` ⇒ 它**直接站在 `Root` 下**
// xl:note （与 `While` / `Try` 同款），不再被外面那层壳包住 ⇒ `Statement` 从 2 改成 1（只剩 `WhileBody` 里那一层）。
// xl:expect AreaAnnotation,DoWhile,Identifier:2,Root,Statement:1,SymbolToken,UnaryOperator,WhileBody,WhileCompare
do x++; /*c*/ while (c);
