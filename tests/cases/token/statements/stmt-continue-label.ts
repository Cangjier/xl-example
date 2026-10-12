// xl:note continue 带标签
// xl:expect Label,While,WhileBody,Statement
outer: while (x < 10) {
  x++
  continue outer
}
