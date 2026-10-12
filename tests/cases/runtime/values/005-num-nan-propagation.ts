// xl:title NaN 会传染，但 === 永远不成立
// xl:judge stdout
// xl:end

const n = 0 / 0;
console.log(n + 1, n * 0, n === n, n !== n);
