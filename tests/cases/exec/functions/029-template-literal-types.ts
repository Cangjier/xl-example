// xl:title 模板字面量类型
// xl:round 291
// xl:judge stdout
// xl:end

type Greeting = `hello ${string}`;
const g: Greeting = "hello world";
console.log(g);
