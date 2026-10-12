// xl:title Array.forEach：顺序、下标、返回值是 undefined
// xl:judge stdout
// xl:end

const xs = ["a", "b"];
const seen: string[] = [];
console.log(xs.forEach((v, i) => { seen.push(i + v); }));
console.log(seen.join(","));
