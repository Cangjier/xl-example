// xl:note 箭头函数的泛型参数表：`>` 之前夹一条注释（第 907 轮片段普查量出）：TS 那边只有一个 `TypeParameter`，产物多出一个**零宽的 `TypeParameter`**（尾随注释被当成了一格参数）
// xl:round 907
// xl:known-gap 泛型段收尾时按逗号切段投参数：段里只剩注释时也切出一段（`Split` 的段非空判据看的是单元个数，不看是不是 trivia）
// xl:end
const f = <T,/*c*/>(a: T) => a;
