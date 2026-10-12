// xl:title 稀疏数组：洞在每一种方法下的命运
// xl:round 371
// xl:judge stdout
// xl:end
const xs: any[] = [1, , 3];
console.log(xs.length, 1 in xs, xs[1], JSON.stringify(xs));
console.log(xs.map((v) => v * 2).length, 1 in xs.map((v) => v * 2));
console.log(xs.filter(() => true).length, [...xs].length, Array.from(xs).length);
console.log(xs.join("-"), xs.indexOf(undefined), xs.includes(undefined));
console.log(Object.keys(xs).join(","), xs.every((v) => v !== undefined), xs.some((v) => v === undefined));
