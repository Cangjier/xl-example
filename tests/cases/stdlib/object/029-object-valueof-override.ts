// xl:title valueOf / toString 参与隐式转换的优先顺序
// xl:judge stdout
// xl:end

const a = { valueOf: () => 5, toString: () => "T" };
const b = { toString: () => "T" };
console.log(a as any as number + 1, String(a), `${a}`);
console.log(b + "", `${b}`, String(b));
