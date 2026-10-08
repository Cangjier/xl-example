// xl:note 单行写完一个块，后面再跟 `default`
// xl:known-gap 语句层把 `default:` 并进了同一个壳，而分段只在顶层单元上找 `case` / `default` ⇒ 只有一段（缺 2 漂 1 多 3）
// xl:expect Switch,SwitchSegment,SwitchStatement
switch (a) { case 1: { break; } default: break; }
