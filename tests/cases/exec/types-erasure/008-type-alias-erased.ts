// xl:title type 别名整族擦除：联合 / 交叉 / 数组 / 元组 / 对象类型
// xl:judge stdout
// xl:end

type Id = number;
type Pair = [string, number];
type Union = "a" | "b" | 1 | null;
type Inter = { a: number } & { b: string };
type Fn = (x: number) => string;
const id: Id = 7;
const pair: Pair = ["x", 1];
const u: Union = "b";
const f: Fn = (x) => String(x);
console.log(id, pair.join(":"), u, f(3));
