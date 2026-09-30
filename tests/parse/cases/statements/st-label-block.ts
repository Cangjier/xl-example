// xl:expect Label,Statement,Keyword
// xl:absent TypeLiteral,TypeLiteralBody
// xl:note 块语句上的标签（基线用例）：`Label` 与块平级，块里的 `break outer` 收成一条语句
outer: {
  break outer
}
