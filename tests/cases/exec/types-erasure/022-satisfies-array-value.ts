// xl:title satisfies 落在数组字面量上
// xl:round 304
// xl:judge stdout
// xl:end

const xs = [1, 2, 3] satisfies number[];
const ys = ["a", "b"] satisfies readonly string[];
console.log(xs.reduce((a, b) => a + b, 0), ys.join(""));
const nested = { list: [1, 2] } satisfies { list: number[] };
console.log(nested.list.length);
