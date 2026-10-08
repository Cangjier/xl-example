// xl:title `as const` 元组与展开
// xl:round 304
// xl:judge stdout
// xl:end

const pair = [1, "two"] as const;
const [n, s] = pair;
console.log(n, s, pair.length);
const spread = [...pair] as const;
console.log(spread[0], spread[1]);
