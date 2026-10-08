// xl:note 用块把 case 体括起来，里面 let 是块级声明
// xl:expect Switch,SwitchSegment,SwitchCase,Statement,Let
switch (x) {
  case 1: {
    let a = 1
    f(a)
    break
  }
}
