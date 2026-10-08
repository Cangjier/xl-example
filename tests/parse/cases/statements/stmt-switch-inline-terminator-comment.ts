// xl:note 一行写完 `case …: break;` 后面再跟注释：那一段的体仍然带着自己那个 `;`
// xl:expect Switch,SwitchSegment,SwitchStatement
declare const a: number
switch (a) { case 1: break; /*after*/ }
switch (a) { case 1: { break; } /*after*/ }
