// xl:title `o[k](...)` / 计算结果键的方法
// xl:judge stdout
// xl:end

const k = "run";
const o: any = { run(n: number) { return n + 1; }, "x-y"() { return 2; } };
console.log(o[k](1), o["x-y"](), o[k]);
const key = "dyn";
const made: any = { [key]() { return 3; } };
console.log(made.dyn());
