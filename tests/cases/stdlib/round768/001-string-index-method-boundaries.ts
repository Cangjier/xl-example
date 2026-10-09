// xl:title 数字字面量的各种形态：二进制 / 八进制 / 十六进制 / 分隔符 / 指数 / 幂
// xl:round 768
// xl:judge stdout
// xl:note 六种写法一次钉住（`0b` / `0o` / `0x` / `_` 分隔符 / 指数 / 省略整数位或小数位）。
// xl:note `Number("0b1010")` 与 `parseInt("0b1010")` **不是一件事**：前者按二进制、后者只认 `0x`
// xl:note （`parseInt("0b1010")` 给 `0`）。`parseInt("1010", 2)` 那一档才是按进制解析。
// xl:note 顺带钉住三个非有限值与幂那一档（`(-2) ** 2` 要加括号才是 4）。
// xl:end
console.log("01", 0b1010, 0o17, 0x1f, 1_000_000, 1e3, 0.5, .5, 5., 1e-3);
console.log("02", 0b1010 + 1, 0o17 * 2, 0x1f - 1);
console.log("03", Number("0b1010"), Number("0o17"), parseInt("0b1010"), parseInt("1010", 2));
console.log("04", 1 / 0, -1 / 0, 0 / 0);
console.log("05", 2 ** 10, 2 ** -1, (-2) ** 2, 7 % 3, -7 % 3);
console.log("06", (255).toString(16), (0.1).toFixed(1), (1.005).toFixed(2));
