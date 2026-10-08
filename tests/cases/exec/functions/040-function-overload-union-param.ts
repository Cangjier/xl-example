// xl:title 重载声明的实参联合类型
// xl:round 305
// xl:judge stdout
// xl:end

function fmt(v: string): string;
function fmt(v: number): string;
function fmt(v: any): string { return typeof v === "string" ? "s:" + v : "n:" + v; }
console.log(fmt("a"), fmt(1));
