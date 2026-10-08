// xl:title 数组遍历中改长度：`forEach` 跟着当下的长度走、`map` 不跟
// xl:round 687
// xl:judge stdout
// xl:end

// `forEach`：回调里改短了长度，后面的下标**不再访问**
const shortened = [1, 2, 3];
const shortSeen: number[] = [];
shortened.forEach((v) => {
  shortSeen.push(v);
  if (v === 1) shortened.pop();
});
console.log("foreach-shrink", shortSeen.join(","), shortened.length);

// `forEach`：回调里加长也一样**看得见**（JS 的 `forEach` 每一步读一次 `length`）
const grown = [1, 2];
const growSeen: number[] = [];
grown.forEach((v) => {
  growSeen.push(v);
  if (v === 1) grown.push(3);
});
console.log("foreach-grow", growSeen.join(","), grown.length);

// `map` **不比**：它按**进入时**的长度走（新加的那一格不进结果、长度也不变）
const mapped = [1, 2];
const mappedOut = mapped.map((v) => {
  if (v === 1) mapped.push(3);
  return v * 10;
});
console.log("map-grow", mappedOut.join(","), mapped.length);
