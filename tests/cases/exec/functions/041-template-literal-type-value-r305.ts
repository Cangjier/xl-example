// xl:title 模板字面量类型（类型位）+ 同形的一个运行期模板串
// xl:round 305
// xl:judge stdout
// xl:end

type Greeting = `hello ${string}`;
const g = "hello world";
const t: Greeting = g;
console.log(t, t.length);
