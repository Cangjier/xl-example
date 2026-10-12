// xl:note switch 语句上的标签
// xl:expect Label,Switch,SwitchStatement
outer: switch (v()) {
  case 1:
    break outer
  default:
    break
}
