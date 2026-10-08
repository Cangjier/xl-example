// xl:title split：limit、空分隔串、capture-free 形态
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split("")));
console.log(JSON.stringify("".split(",")), JSON.stringify("".split("")));
console.log(JSON.stringify("a,,b".split(",")));
console.log(JSON.stringify("abc".split(undefined as any)));
