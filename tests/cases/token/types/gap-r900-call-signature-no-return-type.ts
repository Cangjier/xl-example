// xl:note 类型字面量里的调用签名只有形参表、没有返回类型标注（第 900 轮片段普查量出、第 901 轮转绿）：原来括号没收成签名节点，散成裸 `Bracket`（署名标签本身在产物里一个都没有）；带 `: void` 的同一条一直是好的，说明判据原来整个挂在「返回类型那一格」上
// xl:round 900
// 第 901 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `TypeLiteralBody` 里「`(` 起头且没有 `:`」那一支没有把括号收成签名。现在
// `SignatureCloseRule.HasSignatureTail` 多认一格 `IsBareParameters`（形参表之后是列表末尾
// 或一个软换行 ⇒ 裸形参表签名）。
// xl:expect TypeLiteralBody:1,Bracket:1,TypeDefine:1
// xl:end
type T = { (a: string) };
