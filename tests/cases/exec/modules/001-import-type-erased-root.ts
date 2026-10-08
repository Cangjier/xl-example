// xl:title `import type` 与类型位限定名：一个运行期引用都不产生
// xl:judge stdout
// xl:end

type Local = { v: number };
const x: Local = { v: 1 };
type Key = keyof Local;
type Val = Local["v"];
const k: Key = "v";
const val: Val = 2;
console.log(x.v, k, val);
