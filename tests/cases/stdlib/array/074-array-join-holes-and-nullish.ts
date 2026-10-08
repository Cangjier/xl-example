// xl:title join：洞与 undefined / null 都当空串，分隔串默认逗号
// xl:round 371
// xl:judge stdout
// xl:end
const xs: any[] = [1, , 3, undefined, null];
console.log(JSON.stringify(xs.join()));
console.log(JSON.stringify(xs.join("-")));
console.log(JSON.stringify(xs.toString()));
console.log(JSON.stringify([].join("-")), JSON.stringify([1].join()));
