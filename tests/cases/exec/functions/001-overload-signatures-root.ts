// xl:title 函数重载：只有实现那一份产生代码
// xl:judge stdout
// xl:end

function pick(n: number): string;
function pick(s: string): string;
function pick(v: any): string { return typeof v === "number" ? "n" + v : "s" + v; }
console.log(pick(1), pick("a"));
