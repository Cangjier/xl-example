// xl:title 索引访问类型 T[K] 与实际下标读并存
// xl:round 304
// xl:judge stdout
// xl:end

type Person = { name: string; age: number };
type NameType = Person["name"];
const key: keyof Person = "age";
const p: Person = { name: "a", age: 2 };
const v: NameType = "b";
const n: Person["age"] = p[key] as number;
console.log(v, n);
