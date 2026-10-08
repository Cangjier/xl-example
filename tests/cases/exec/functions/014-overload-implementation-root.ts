// xl:title 重载签名 + 一条实现：前面的签名一个指令都不产生
// xl:judge stdout
// xl:end

function pick(n: number): string;
function pick(s: string): number;
function pick(v: any): any { return typeof v === "number" ? String(v) : v.length; }
console.log(pick(7), pick("abcd"));
