// xl:note else 分支里再嵌一个完整 if（dangling-else 的显式形式）
// xl:expect IfSet,IfSegment,IfCondition,IfStatement
if (a) {
  f()
} else {
  if (b) {
    g()
  }
}
