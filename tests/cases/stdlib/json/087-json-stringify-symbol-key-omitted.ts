// xl:title JSON.stringify 不序列化符号键：对象里以 Symbol 为键的那一格整格丢掉
// xl:round 692
// xl:judge stdout
// xl:want pass
// xl:end

console.log(JSON.stringify({ [Symbol("s")]: 1, a: 2 }));
