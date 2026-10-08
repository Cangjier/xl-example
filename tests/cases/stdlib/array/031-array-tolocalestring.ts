// xl:title Array.toLocaleString 与 toString 的差别
// xl:judge stdout
// xl:end

console.log([1, 2, 3].toLocaleString(), [].toLocaleString(), [1, [2, 3]].toLocaleString());
