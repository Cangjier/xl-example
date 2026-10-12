// xl:title `Array.prototype`：不是数组的接收者与空洞口径
// xl:round 748
// xl:judge stdout
// xl:end
console.log(JSON.stringify([1, 2, 3].slice(1)), JSON.stringify([1, 2, 3].slice(-1)), JSON.stringify([1, 2, 3].slice(5)));
console.log([1, 2, 3].indexOf(2), [1, 2, 3].lastIndexOf(3), [1, 2, 3].includes(2));
console.log(JSON.stringify([1, , 3].map((v) => v * 2)), [1, , 3].filter(() => true).length);
console.log([3, 1, 2].sort().join(","), JSON.stringify([1, 2, 3].concat([4], 5)));
console.log([1, 2, 3].join("-"), [].join(","), JSON.stringify([1, [2]].flat()), JSON.stringify([1, [2, [3]]].flat(2)));
console.log([1, 2, 3].at(-1), [1, 2, 3].find((v) => v > 1), [1, 2, 3].findIndex((v) => v > 5));
