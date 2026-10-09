// xl:note 没有表达式的 `throw` 后面换行（第 900 轮片段普查记在「待登记」那一栏的第 H 格、第 902 轮登记）：`throw` 换行 `}` 里 `ThrowStatement` 的 `expression` 字段本仓给 `[]`（TS 那边**有一个零宽 `Identifier`**——那是它坏了以后的报错恢复），缺 1 格、字段名不符 1 处
// xl:round 902
// xl:known-gap 非法 TS 的报错恢复形状：TS 在 `throw` 后面补一个零宽 `Identifier`，本仓只给空字段——根因尚未量清，如实登记、不猜
// xl:end
function f(): never { throw
}
