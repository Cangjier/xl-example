// xl:title 符号键不序列化
// xl:round 692
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ [Symbol("s")]: 1, a: 2 }));
