// xl:title 解构：嵌套数组 / 嵌套对象 / 混着默认值与改名
// xl:round 7
// xl:judge stdout
// xl:end

const [[a, b], [c = 9, d = 8] = []] = [[1, 2]];
const { p: { q, r = 5 } = { q: 6 }, s: [t, u] = [7, 8] } = { p: { q: 1 }, s: [2, 3] };
console.log(a, b, c, d, q, r, t, u);
const [x, ...rest] = [1, 2, 3, 4];
const { m, ...others } = { m: 1, n: 2, o: 3 };
console.log(x, rest.join(","), m, JSON.stringify(others));
