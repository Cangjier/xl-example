// xl:title 短路求值：&& / || / ?? 的返回值与副作用是否发生
// xl:round 7
// xl:judge stdout
// xl:end

let n = 0;
const bump = () => { n++; return "bumped"; };
console.log(0 && bump(), 1 || bump(), undefined ?? bump(), n);
console.log(null ?? "d", 0 ?? "d", "" || "e", "0" && "f");
