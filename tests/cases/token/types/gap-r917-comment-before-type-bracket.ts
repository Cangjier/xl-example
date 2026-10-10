// xl:note 注释夹在 `type` 与名字、或者名字与 `=` 之间时，元组里 `...C[]` 的数组后缀落成值位的下标访问
// xl:round 917
// 第 921 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：与
// `gap-r917-comment-after-assign-before-tuple` 同一个根——链规则在内层空方括号上先动手，
// 而它的父亲那一刻还是裸 `Bracket`。两条（`type /*c*/X = …` 与 `type Y /*c*/= …`）一起收掉：
// 注释在 `DecideBracketContext` 的回扫里本来就是 trivia，外层 `[` 的 `Context` 一直是对的，
// 缺的只是链规则在「容器是类型位方括号」处让路。
// xl:expect TupleType:2,RestType:2,ArrayType:2
// xl:end
type /*c*/X = [A, B?, ...C[]];
type Y /*c*/= [A, B?, ...C[]];
