// xl:title Array.prototype.flat / flatMap：深度与只铺一层
// xl:round 9
// xl:judge stdout
// xl:end

console.log([1, [2, [3, [4]]]].flat().length);
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, 2, 3].flatMap((x) => [x, x * 2])));
console.log(JSON.stringify([1, 2].flatMap((x) => [[x]])));
