// xl:title type 别名：联合 / 交叉 / 字面量 / 泛型 / 映射
// xl:judge stdout
// xl:end

type Id = string | number;
type Pair = { a: number } & { b: number };
type Dir = "up" | "down";
type Box<T> = { value: T };
type Keys = { [K in "x" | "y"]: number };
const id: Id = 1;
const pair: Pair = { a: 1, b: 2 };
const dir: Dir = "up";
const box: Box<string> = { value: "v" };
const keys: Keys = { x: 1, y: 2 };
console.log(id, pair.a + pair.b, dir, box.value, keys.x + keys.y);
