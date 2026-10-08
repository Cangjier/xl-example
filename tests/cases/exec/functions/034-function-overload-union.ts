// xl:title 函数重载签名 + 联合实现
// xl:round 304
// xl:judge stdout
// xl:end

function fmt(v: number): string;
function fmt(v: string): string;
function fmt(v: boolean): string;
function fmt(v: number | string | boolean): string {
  return typeof v + ":" + String(v);
}
console.log(fmt(1), fmt("a"), fmt(true));
