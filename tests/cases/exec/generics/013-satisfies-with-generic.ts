// xl:title satisfies 配上泛型调用
// xl:round 304
// xl:judge stdout
// xl:end

type Handler<T> = (v: T) => string;
const h = ((v: number) => "n" + v) satisfies Handler<number>;
console.log(h(3));
const table = { a: 1, b: 2 } satisfies Record<string, number>;
console.log(Object.keys(table).join(","), table.a + table.b);
