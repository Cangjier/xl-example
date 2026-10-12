// xl:title 集合的内部槽不出现在 Object.keys / JSON 里
// xl:judge stdout
// xl:end

const m = new Map([["a", 1]]);
console.log(Object.keys(m).length, JSON.stringify(m), Object.keys(new Set([1])).length);
