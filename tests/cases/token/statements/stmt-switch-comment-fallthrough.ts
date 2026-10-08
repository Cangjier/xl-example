// xl:note `switch` 与它的判别括号之间夹一条注释 + `case` 落空
// xl:known-gap 判别括号认不出 ⇒ `case 1:` 那一格整条落空（缺 5 漂 1 多 3）
// xl:expect Switch,SwitchSegment,SwitchCase
switch /* c */ (a) { case 1: case 2: b(); break; default: c(); }
