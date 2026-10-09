// xl:note `instanceof` 右边那个 `<…>` 后面紧跟 `+` / `-` 时该退回比较式（已知缺口）
// 第 894 轮量出来的那一格：TS 那边 `b instanceof C<D> + e` 不是实例化表达式——
// `canFollowTypeArgumentsInExpression` 明写「配对 `>` 后面是 `<` / `>` / `+` / `-` 就判否」，
// 于是 `C<D>` 退回比较运算符，整条读成 `((b instanceof C) < D) > (+e)`。
// 本仓现在把它收成 `(b instanceof C<D>) + e`（漂 2 / 多 2）——**根因是接线没接上**：
// `generic-type.xl.md` 的 `IsInstanceOfTypeArgument`（这一轮新加的）判据写对了，
// 可它拿到的 `source` 是 null（`IsAllowedFollower` 里那次 `IsTypePosition(unit)`
// 没把 source 带下来），第一句就答否、这一支够不着。
// 收它要先把 `Source` 送到那一格（改动点是 `IsAllowedFollower` 里那次调用补第 4 个实参），
// 而那一趟的真实数据流这一轮没量清 ⇒ 按规矩登记成缺口，不猜。
// xl:known-gap 产物把 `<D> + e` 收成一个 GenericType 式的错折（`+` 与被断言的操作数一起被吞）
// xl:round 894
// xl:end
const a = b instanceof C<D> + e;
