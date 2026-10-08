// xl:title Array.of / Array.isArray / new Array 的三种构造
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify(Array.of(1, 2)), JSON.stringify(Array.of(3)), JSON.stringify(Array.of()));
console.log(JSON.stringify(new Array(3)), new Array(3).length, JSON.stringify(new Array(1, 2)));
console.log(Array.isArray([]), Array.isArray("ab" as any), Array.isArray(new Array(0)));
console.log(Array.isArray(Array.prototype), JSON.stringify([...new Array(3)]));
