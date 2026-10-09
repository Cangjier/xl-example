// xl:title 算术 / 取模 / 幂与位运算（32 位有符号）
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/164-numeric-bitwise · 169-exponent-operator · 170-bitwise-32
//   · exec/expressions/200-modulo-5-3 · 201-modulo-neg5-3 · 211-2-3-2 · 215-bitwise-and-5-3
//   · exec/expressions/216-bitwise-or-5-3 · 217-bitwise-xor-5-3
//   · exec/expressions/p-op-bit-shift · p-op-exponent
//   · exec/expressions/probe-o31 · o37 · o38 · o39 · o40
//   · exec/expressions/probe699-c-e15 · e16
//   · exec/expressions/probe704-x-b39 · b40 · b41 · b42
//   · exec/expressions/probe693b-e07 · e31 · e32 · e33（第二批）
// 判据只有一条：数值运算符那一层——`%` 的符号跟着被除数、`**` 右结合且一元负号要括号、
// 位运算一律过 32 位有符号（`>>>` 是无符号），除零给出 `Infinity` / `NaN`。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 取模
probe(() => 5 % 3);
probe(() => -5 % 3);
probe(() => 5 % -3);
probe(() => 5.5 % 2);

// 幂
probe(() => 2 ** 3 ** 2);
probe(() => (-2) ** 2);
probe(() => 2 ** -1);
probe(() => 2 ** 0.5);

// 除零与浮点
probe(() => 0 / 0);
probe(() => 1 / 0);
probe(() => -1 / 0);
probe(() => Infinity - Infinity);
probe(() => 0.1 + 0.2);
probe(() => Number.EPSILON > 0);
probe(() => 5 / 2);

// 位运算：32 位有符号
probe(() => 5 & 3);
probe(() => 5 | 3);
probe(() => 5 ^ 3);
probe(() => ~5);
probe(() => ~0);
probe(() => 1 << 31);
probe(() => -1 >> 1);
probe(() => -1 >>> 0);
probe(() => -1 >>> 1);
probe(() => -8 >>> 28);
probe(() => (1 << 31) >> 31);
probe(() => 2147483647 | 0);
probe(() => 2147483648 | 0);
probe(() => 1.9 | 0);
probe(() => (-1.9) | 0);

// 字符串混进算术：只有 `+` 会拼接
probe(() => 1 - "2");
probe(() => "5" * "2");
probe(() => 2 + "2" - 1);

// 第 787 轮并进来的四条（`probe693b-e07` / `e31` / `e32` / `e33`）
probe(() => (2 ** 3) ** 2);
probe(() => 1 << 3);
probe(() => -8 >> 1);
probe(() => -8 >>> 28);
