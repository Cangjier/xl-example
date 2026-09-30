// xl:note 空 case 落到下一个 case（fallthrough）不能被折成一条语句
// xl:expect Switch,SwitchCompare,SwitchSegment,SwitchCase,SwitchStatement
switch (x) {
  case 1:
  case 2:
    f()
    break
}
