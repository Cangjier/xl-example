// xl:title 普通函数借 `call` / `apply` / `bind` 换 `this`
// xl:judge stdout
// xl:end

function who(this: any, suffix: string): string { return this.name + suffix; }
console.log(who.call({ name: "kim" }, "!"));
console.log(who.apply({ name: "lee" }, ["?"]));
const bound = who.bind({ name: "park" });
console.log(bound("."));
