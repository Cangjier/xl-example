// xl:title BigInt：字面量、运算、typeof、转换
// xl:judge stdout
// xl:want blocked
// xl:why `BigInt` 字面量（`3n`）与 `BigInt` 全局名都还没有：降级层报 `unimplemented: expression BigIntLiteral` / `name is not a local or a capture: BigInt`。**要做**（用户口径，§15 的旧表已按此改写）
// xl:end

console.log(1n + 2n, typeof 1n, BigInt(5), (10n).toString());
