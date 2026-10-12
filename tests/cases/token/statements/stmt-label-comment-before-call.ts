// xl:note 多层标签后面、调用前面夹一条注释
// xl:expect Label:3,Method
// 第 778 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「最后一层标签的名字没接上被标的语句（缺 1）」——第 778 轮把 `Statement` 壳那一支
// 的标签体改成「按一条语句投」（`typescript/print-ast-common.xl.md`），
// `d/* c */ ()` 那一串于是整段成形，不再只投第一个单元。
a: b: c: d/* c */ ();
