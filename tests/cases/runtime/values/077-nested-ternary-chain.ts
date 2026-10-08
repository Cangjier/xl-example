// xl:title 三元串成链：每个分支都带副作用
// xl:judge stdout
// xl:end

let mark = "";
const pick = (n: number): string => (n < 0 ? ((mark += "a"), "neg") : n === 0 ? ((mark += "b"), "zero") : ((mark += "c"), "pos"));
console.log(pick(-1), pick(0), pick(1), mark);
