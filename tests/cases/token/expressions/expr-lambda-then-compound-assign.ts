// xl:note 箭头函数在语句末尾时，它的源码范围必须已经签入签出
// 真缺口：`LamdaReorganization.Process` 造出 `Lamda` 之后只给参数段签了范围，
// 本体两头的范围一直是 `null`；而 `Lamda.Clone` 第一句是 `Sign(this)`，
// 于是任何克隆这个 lambda 的动作都会抛 `SourceException: SourceRange.Start == null`。
// 触发路径很短：复合赋值规则要把等号左边那一段逐个克隆，
// 它的起点搜索会把上一行那个 `Lamda` 一起圈进来。
// xl:expect Lamda,BinaryOperator,Let
// xl:absent Class,Interface,Enum
const f = x => x
let a = 1
a += 1
