// xl:title 条件 / 映射 / 模板字面量 / infer 类型一律擦除
// xl:round 371
// xl:judge stdout
// xl:end
type Cond<T> = T extends string ? "s" : "n";
type Mapped<T> = { [K in keyof T]?: T[K] };
type Ev<T> = { [K in keyof T as `get${string & K}`]: () => T[K] };
type Infer<T> = T extends Array<infer U> ? U : never;
type Tpl = `v-${number}`;
class Store { items: Mapped<{ a: number; b: string }> = { a: 1 }; }
const s = new Store();
console.log(s.items.a, typeof ({} as Cond<string>), typeof (null as unknown as Infer<number[]>));
