// xl:title 模板字面量类型：`hello ${string}`
// xl:judge stdout
// xl:end

type Greet = `hello ${string}`;
const g: Greet = "hello world";
console.log(g);
