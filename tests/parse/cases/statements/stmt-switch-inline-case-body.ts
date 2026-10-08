// xl:note switch 的 case 体写在同一行时，体的语句也要含那个 `;`
// xl:expect Switch,SwitchSegment,SwitchCase,SwitchStatement
const a = 1;
switch (a) {
  case 1: console.log("a"); break;
  case 2:
  case 3: break;
  default: console.log("d");
}
switch (a) {
  case 1:
    console.log("x");
    break;
}
