// xl:note if 体里套 if：内层才是真正带两个分支的那个 if
// xl:expect IfSet,IfSegment,IfCondition,IfStatement
if (a) {
  if (b) {
    f()
  } else {
    g()
  }
}
