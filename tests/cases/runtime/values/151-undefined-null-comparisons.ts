// xl:title null / undefined 的相等与排序口径
// xl:round 323
// xl:judge stdout
// xl:end

console.log(null == undefined, null === undefined, null == 0, undefined == 0);
console.log(null < 1, undefined < 1, null >= 0, [null].includes(null));
console.log(typeof null, typeof undefined, String(null), String(undefined));
