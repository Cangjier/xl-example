// xl:expect Label,Statement,Keyword
// xl:absent TypeLiteral,TypeLiteralBody
// xl:note 块语句上的标签 `outer: { break outer }`：标签 + 块，块里是 `break` 语句
outer: {
  break outer
}
