// xl:note 非空断言 `!`：规范里 NotNull 是空壳类、`!` 被 NotNullReorganization 直接删掉
//（见 dawn/text/tokens/not-null.xl.md），所以产物里看不出 `a!` 与 `a` 的差别——
// 这是一处信息丢失，但当前没有可用的标签，故本条只断言「必须不抛异常」
const a = b!.c
const d = e!.f!.g
const h = (i as J)!.k
