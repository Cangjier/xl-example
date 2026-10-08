// xl:title 映射类型只在类型位（运行期一个指令都不产生）
// xl:round 305
// xl:judge stdout
// xl:end

type Flags<T> = { [K in keyof T]: boolean };
type Person = { name: string; age: number };
const f: Flags<Person> = { name: true, age: false };
console.log(JSON.stringify(f));
