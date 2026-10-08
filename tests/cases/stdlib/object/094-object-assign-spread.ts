// xl:title Object.assign 与对象展开的覆盖序
// xl:round 623
// xl:judge stdout
// xl:end

const a = Object.assign({ x: 1 }, { x: 2 }, { y: 3 });
console.log(JSON.stringify(a));
console.log(JSON.stringify({ ...a, z: 4, ...{ y: 9 } }));
