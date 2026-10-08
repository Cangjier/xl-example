// xl:title 默认值与剩余：后面还能有普通参数、剩余收进真数组
// xl:round 7
// xl:judge stdout
// xl:end

function g(a = 1, ...mid: number[]) { return [a, mid.length, mid.join("-")].join(":"); }
console.log(g(), g(5), g(5, 6, 7));
function h(first: string, ...rest: string[]): number { return first.length + rest.length; }
console.log(h("ab"), h("ab", "c", "d"));
console.log([0, ...[1, 2], 3].join(","), [..."abc"].join(","));
