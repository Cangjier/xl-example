// `as` 的类型在**值位二元运算符**处收尾：`a as T + 1` 是 `(a as T) + 1`
declare const a: any;
declare const b: any;

const plus = a as number + 1;
const minus = a as number - 1;
const times = a as number * 2;
const div = a as number / 2;
const mod = a as number % 2;
const pow = a as number ** 2;
const eq = a as number === 1;
const ne = a as number !== 1;
const and = a as boolean && b;
const or = (a as boolean) || b;
const nullish = a as string ?? "x";
const bitxor = a as number ^ 1;

// 类型续接符**不受影响**：联合、下标、泛型
const union = a as number | string;
const indexed = a as Record<string, number>;
const generic = a as Array<number>;

// 串起来的 `as` 仍然一路折到底
const chain = a as any as number + 1;

// 括号里的 `as` 反过来不会碰到外面的运算符
const wrapped = (a as number) + 1;

// 值位运算符在**左边**时类型照旧收得住
const leading = 1 + (a as number);

export { plus, minus, times, div, mod, pow, eq, ne, and, or, nullish, bitxor };
export { union, indexed, generic, chain, wrapped, leading };
