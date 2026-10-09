// xl:note `switch` 与它的判别括号之间夹一条注释 + `case` 落空
// 第 841 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「判别括号认不出 ⇒ `case 1:` 那一格整条落空」—— `switch` 与 `(` 之间那条注释
// 让 `IsSwitchBodyBracket` 往回看到的是注释（原先只跨软换行）⇒ 体括号认不出 ⇒
// 切壳那一支一次都不响（`statement.xl.md`，第 841 轮改成跨 trivia）。
// xl:expect Switch,SwitchSegment,SwitchCase
switch /* c */ (a) { case 1: case 2: b(); break; default: c(); }
