// xl:title undefined 显式传进 Date.UTC / Date 构造不能当成「没给」
// xl:round 702
// xl:judge stdout
// xl:want pass
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show(Number.isNaN(Date.UTC(2020, undefined as any))));
console.log(show(new Date(2020, undefined as any).getUTCMonth()));
console.log(show(Date.UTC(2020, 0, 2)));
