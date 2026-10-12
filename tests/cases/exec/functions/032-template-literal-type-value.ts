// xl:title 模板字面量类型与运行期模板串同时出现
// xl:round 304
// xl:judge stdout
// xl:end

type Greeting = `hello ${string}`;
function greet(who: Greeting): string { return who + "!"; }
const name = "world";
console.log(greet(`hello ${name}`));
console.log(`n=${1 + 2}`);
