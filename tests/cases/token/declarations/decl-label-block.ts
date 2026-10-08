// xl:expect Label,Statement,Method
// xl:absent TypeLiteral,TypeLiteralBody
// xl:note 块语句上的标签 `outer: { … }`：`Label` 与被标的**块**平级，块里是语句。
// 这条用例原来的期望写的是 `TypeLiteral`——那是把标签冒号当成了类型标注、把块当成了对象类型；
// 语句位置的 `{` 是**块**，不是类型字面量
outer: {
  doWork()
}
