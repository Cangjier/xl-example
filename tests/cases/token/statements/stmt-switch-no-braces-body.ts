// xl:note case 里不写块：case 体本身就是一条条语句
// xl:expect Switch,SwitchSegment,SwitchCase,SwitchStatement
switch (x) {
  case 1:
    f()
    break
  default:
    g()
}
