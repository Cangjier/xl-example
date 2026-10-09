// xl:note `do` 的体是一条表达式语句（不是块），体与 `while` 之间夹一条块注释
// xl:expect AreaAnnotation,DoWhile,Identifier:2,Root,Statement:2,SymbolToken,UnaryOperator,WhileBody,WhileCompare
do x++; /*c*/ while (c);
