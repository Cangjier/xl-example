# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

本目录（`core/syntax/`）是整个解析器的骨架。

# enum PendingStates

暂存单元的终止判定结果——`PendingUnit` 每收到一个字符就问一次「我到此为止了吗」。

与 `BranchStates` 的差别是这里多了一档：一个单元「结束」有两种，区别只在**把当前这个字符算不算进自己的范围**。

- case Continue
继续：当前字符还没有让本单元结束，本单元继续吃它。
- case EndExclusive
不含地结束：本单元到此为止，但**当前这个字符不属于本单元**——它要交回给外面的处理者重新处理一遍。
  `if (a) g(); else …` 里那个 `else` 就是这一档：`;` 之后的那条语句已经写完了，而 `else` 是下一个单元的开头。
- case EndInclusive
含地结束：本单元到此为止，且**当前这个字符属于本单元**——它就是这个单元的收尾。
  带括号的收尾（`}`）与语句终结符（`;`）都是这一档。
