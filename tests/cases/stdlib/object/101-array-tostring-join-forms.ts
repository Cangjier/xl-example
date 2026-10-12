// xl:title Array.join / toString：null 与 undefined 都变空、嵌套走 toString
// xl:judge stdout
// xl:end

const xs: any[] = [1, null, undefined, [2, 3], { toString() { return "o"; } }];
console.log(xs.join("-"), xs.toString(), String(xs));
console.log([].join("-") === "", [undefined].join("-") === "", [null, null].join("-"));
