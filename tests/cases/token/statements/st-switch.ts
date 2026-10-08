// xl:expect Switch,SwitchCompare,SwitchSegment,SwitchCase,SwitchStatement
// xl:note 基线用例（来自缺口审计语料）
switch (x) {
  case 1:
  case 2:
    y()
    break
  default:
    z()
}
