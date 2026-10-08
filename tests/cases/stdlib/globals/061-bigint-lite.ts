// xl:title `BigInt` 那一族现在的样子（口径内该做）
// xl:round 691
// xl:judge stdout
// xl:want blocked
// xl:why `BigInt` 字面量还没实现（`unimplemented: expression BigIntLiteral`）。要做。
// xl:end
console.log(typeof 1n, (1n + 2n).toString());
console.log(BigInt(5) * 2n);
console.log(String(2n ** 64n));
