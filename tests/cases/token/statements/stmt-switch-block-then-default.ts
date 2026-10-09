// xl:note 单行写完一个块，后面再跟 `default`
// 第 841 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「语句层把 `default:` 并进了同一个壳，而分段只在顶层单元上找 `case` / `default` ⇒ 只有一段」
// —— 段头前面紧挨着的是**块括号**而不是 `:`，切壳那一支问 `:` 时找不到切点
//（`statement.xl.md` 的 `LastClauseHeadIndex`，第 841 轮把 `{` 那一档补进判据）。
// xl:expect Switch,SwitchSegment,SwitchStatement
switch (a) { case 1: { break; } default: break; }
