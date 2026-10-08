// xl:title ASI 歧义：一条语句之后以 `(` 开头的新语句
// xl:round 7
// xl:judge stdout
// xl:end

const f = (n: number) => n * 2;
const log: string[] = [];
const g = (s: string) => { log.push(s); };
g("a")
g("b")
console.log(log.join(","), f(3));
