// xl:note `new` 与它的类型实参表之间换行（第 900 轮片段普查记在「待登记」那一栏的第 F 格、第 902 轮登记）：`new A` 换行 `<B>()` 被 ASI 在换行处断句 ⇒ `new A` 一条语句、`<B>()` 另起一条（落成 `TypeAssertionExpression`），四个区间各漂一格、多出 7 格
// xl:round 902
// xl:known-gap `new` 后面紧跟类型实参段时，那个 `<` 跨行不在解析期的续接表里——根因尚未量清，如实登记、不猜
// xl:end
const a = new A
<B>();
