// xl:note break 带标签：标签是标记节点，与被标的循环平级
// xl:expect Label,For,ForBody,Statement
outer: for (;;) {
  break outer
}
