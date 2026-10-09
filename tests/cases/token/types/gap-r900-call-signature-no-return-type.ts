// xl:note 类型字面量里的调用签名只有形参表、没有返回类型标注（第 900 轮片段普查量出）：`{ (a: string) }` 的括号没收成签名节点，散成裸 `Bracket`（署名标签本身在产物里一个都没有——这一格量的是「少了两格、多了一格」）；带 `: void` 的同一条是好的，说明判据挂在「返回类型那一格」上
// xl:round 900
// xl:known-gap `TypeLiteralBody` 里「`(` 起头且没有 `:`」那一支没有把括号收成签名——签名规则整个挂在返回类型那一格上
// xl:expect TypeLiteralBody:1,Bracket:1,TypeDefine:1
// xl:end
type T = { (a: string) };
