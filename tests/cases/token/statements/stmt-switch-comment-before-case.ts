// xl:note `case` 前面夹注释：段头照认，那条注释不进匹配表达式
// xl:expect Switch,SwitchSegment,SwitchCase,SwitchStatement
declare const a: number
switch (a) {
  /*before-case*/ case 1: break
  /*before-default*/ default: break
}
