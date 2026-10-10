// xl:note 行注释（`//c`）贴在类型位那对方括号附近：与块注释那一族同形，只是落在 `LineAnnotation` 上
// xl:round 919
// 第 921 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：与
// `gap-r917-comment-before-type-bracket` **同一个根、同一个落点**，差的只是插入物是行注释
// 还是块注释（`LineAnnotation` vs `AreaAnnotation`）——链规则在内层空方括号上先把它折成
// `PropertyAccess`。第 921 轮那一支判据对两种注释一视同仁，于是两条一起收掉。
// xl:expect TupleType:2,RestType:2,ArrayType:2
// xl:end
type X //c
= [A, B?, ...C[]];
type X2 = //c
[A, B?, ...C[]];
