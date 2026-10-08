// xl:title flat / flatMap：深度、Infinity、洞
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify([1, [2, [3, [4]]]].flat()));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(Infinity)));
console.log(JSON.stringify([1, [2, [3]]].flat(0)));
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
