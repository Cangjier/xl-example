// xl:note 箭头函数的泛型参数表：`>` 之前夹一条注释（第 907 轮片段普查量出）：TS 那边只有一个 `TypeParameter`，产物多出一个**零宽的 `TypeParameter`**（尾随注释被当成了一格参数）
// xl:round 907
// 第 909 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `type-parameter.xl.md` 的 `AppendSegment` —— 它只把 `LineWrap` 滤掉，
// 于是「这一段是不是空的」看的是**单元个数**，`<T,/*c*/>` 里逗号后面那一段
// 只有一条注释也包出一个**零宽 `TypeParameter`**。现在先数一遍**非 trivia** 的单元，
// 一个都没有就把那些注释原样 push 回列表（注释照旧进树，只是不包进参数）。
// xl:expect GenericType:1,TypeParameter:1,Lamda:1,AreaAnnotation:1
// xl:end
const f = <T,/*c*/>(a: T) => a;
