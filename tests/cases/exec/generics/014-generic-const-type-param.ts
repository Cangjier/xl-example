// xl:title const 类型形参（TS 5.0）
// xl:round 304
// xl:judge stdout
// xl:end

function tuple<const T extends readonly unknown[]>(xs: T): T { return xs; }
const t = tuple([1, "a", true]);
console.log(t.length, t[0], t[2]);
const lit = <const T,>(v: T) => v;
console.log(lit("x"));
