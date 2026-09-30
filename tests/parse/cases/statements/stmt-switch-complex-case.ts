// xl:note case 后跟复杂表达式（成员访问 + 调用）
// xl:expect Switch,SwitchCompare,SwitchSegment,SwitchCase,SwitchStatement
switch (x) {
  case obj.kind():
    f()
    break
  case a + b:
    g()
}
