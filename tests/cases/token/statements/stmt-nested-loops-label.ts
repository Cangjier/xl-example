// xl:note 嵌套循环带标签：标签只标注外层，break/continue 指向不同层
// xl:expect Label,For,ForBody,While,WhileBody
outer: for (let i = 0; i < n; i++) {
  while (j > 0) {
    if (k) continue outer
    j--
  }
  break outer
}
