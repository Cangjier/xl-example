// xl:title `JSON.stringify`：对象里的函数整格丢掉、数组里的写 null
// xl:round 305
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: 1, f: () => 1, u: undefined }), JSON.stringify([1, () => 1, undefined]));
