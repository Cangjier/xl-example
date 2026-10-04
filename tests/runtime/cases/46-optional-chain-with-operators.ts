// 第 155 轮：可选链后面跟**运算符**（`o?.k + 1`）——这一条原来让**整份文件**进不来。
//
// **症状**：`o?.k + 1` 报 `unimplemented: private or computed property name`。
// 根因在 token 层：`NullConditionalOperator` 的断点名单里**只有** `?. ?? && || ; ,`
// 与比较符号 —— **算术 / 位运算 / 移位都不在里面**，于是 `+` 连同右边一起被收进 NCO，
// 接着二元运算符重组在**里面**折成一个 `BinaryOperator`，投影只好把它当成**成员名**。
//
// **修法**：链上**该出现的符号只有两个** —— `.`（成员访问）与 `!`（非空断言，它被折在
// NCO 里面）——所以规矩反过来写：**不是那两个就是断点**。将来多出新的运算符也不必回来改。
//
// `o?.k + 1` / `s?.length * 2` / `arr?.[0] + arr?.[1]` 这种写法遍地都是，
// 所以这一条修掉的是**一整类**日常写法。

const box: any = { k: 1, b: { c: 2 }, f: () => 5, s: "ab" };
const arr: any = [1, 2, 3];

// ① 算术四则 + 调用的结果
console.log(box?.k + 1, box?.k - 1, box?.k * 2, box?.f?.() + 1);

// ② 成员 / 下标 / 调用 / 比较
console.log(box?.b.c, box?.b?.c, box?.["k"], box?.f?.());
console.log(box?.s.length * 2, box?.s.length === 2, arr?.[0] + arr?.[1]);
console.log(arr?.length - 1, box?.k > 0, box?.k <= 1, box?.k !== 2);

// ③ 链本身没被切坏（这几条改前就是对的，当回归）
console.log(box?.k ?? 9, box?.b?.c, box?.f?.(), box?.b.c);

// ④ 复合赋值与运算符混在一起
const m: any = { v: 2 };
m.v += 1;
console.log(m.v, m?.v * 3);
