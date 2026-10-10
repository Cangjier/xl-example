// xl:note 映射类型的**值类型之后**还能再跟成员（第 934 轮收掉的 `gap-r933-mapped-value-newline`
// 那一族）：TypeScript 的 `parseMappedType` 在值类型之后照样 `parseTypeMembers()`，
// 而**同一行**写在值类型后面的方括号是**下标访问**（`parsePostfixTypeOrHigher` 的
// `while (!scanner.hasPrecedingLineBreak())`）。两档只差那个换行。
// 守卫四条：换行 + 计算名 / 换行 + 空方括号（TS 那边是**没有形参的** `IndexSignature`）/
// `;` 之后再跟一格 / 同一行（仍旧是下标访问，形状不能变）。
// xl:round 934
// xl:end
type A = { [K in keyof U]:U
[K] };
type B = { [K in keyof U]:U
[] };
type C = { [K in keyof U]:U;
[K] };
type D = { [K in keyof U]:U[K] };
type E = { [K in keyof U as `k${K}`]:U
[K] };
