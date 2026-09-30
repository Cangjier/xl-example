// xl:note switch 套 switch：内外两层都要成形
// xl:expect Switch,SwitchSegment,SwitchCase,SwitchStatement
switch (x) {
  case 1:
    switch (y) {
      case 2:
        f()
    }
    break
}
