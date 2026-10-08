// xl:title 计算成员：`o[k]`、`o[k]()`、动态拼键
// xl:judge stdout
// xl:end

const o: any = { a1: 10, a2: 20, m() { return this.a1 + this.a2; } };
const k = "a";
console.log(o[k + "1"], o[k + "2"], o["m"]());
const keys = ["a1", "a2"];
console.log(keys.map((key) => o[key]).join(","));
