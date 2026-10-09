// xl:title 回调不是函数：抛的是 `TypeError` 而不是笼统的 `Error`
// xl:round 770
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 ([1, 2] as any).findLast(undefined)', show(() => ([1, 2] as any).findLast(undefined)));
console.log('02 ([1, 2] as any).findLastIndex(undefine', show(() => ([1, 2] as any).findLastIndex(undefined)));
console.log('03 ([1, 2] as any).findLast(1)', show(() => ([1, 2] as any).findLast(1)));
console.log('04 ([1, 2] as any).map(1)', show(() => ([1, 2] as any).map(1)));
console.log('05 ([1, 2] as any).filter(\'x\')', show(() => ([1, 2] as any).filter('x')));
console.log('06 ([1, 2] as any).forEach(null)', show(() => ([1, 2] as any).forEach(null)));
console.log('07 ([1, 2] as any).some({})', show(() => ([1, 2] as any).some({})));
console.log('08 ([1, 2] as any).every(true)', show(() => ([1, 2] as any).every(true)));
console.log('09 ([1, 2] as any).reduce(1)', show(() => ([1, 2] as any).reduce(1)));
console.log('10 ([1, 2] as any).reduceRight(1)', show(() => ([1, 2] as any).reduceRight(1)));
console.log('11 ([1, 2] as any).flatMap(1)', show(() => ([1, 2] as any).flatMap(1)));
console.log('12 ([1, 2] as any).find(1)', show(() => ([1, 2] as any).find(1)));
console.log('13 ([1, 2] as any).findIndex(1)', show(() => ([1, 2] as any).findIndex(1)));
console.log('14 ([1, 2] as any).map()', show(() => ([1, 2] as any).map()));
console.log('15 ([1, 2] as any).reduce((a: any, b: any', show(() => ([1, 2] as any).reduce((a: any, b: any) => a, 0, 'x')));
