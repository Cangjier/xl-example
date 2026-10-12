// xl:title Number / Boolean / 转换那一族的实参校验（守卫）
// xl:round 771
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
console.log('01 (Number.prototype.toFixed as any).call', show(() => (Number.prototype.toFixed as any).call('1', 2)));
console.log('02 (Number.prototype.toFixed as any).call', show(() => (Number.prototype.toFixed as any).call(1, 101)));
console.log('03 (Number.prototype.toFixed as any).call', show(() => (Number.prototype.toFixed as any).call(1, -1)));
console.log('04 (Number.prototype.toPrecision as any).', show(() => (Number.prototype.toPrecision as any).call(1, 0)));
console.log('05 (Number.prototype.toString as any).cal', show(() => (Number.prototype.toString as any).call(255, 1)));
console.log('06 (Number.prototype.toString as any).cal', show(() => (Number.prototype.toString as any).call(255, 37)));
console.log('07 (Number.prototype.valueOf as any).call', show(() => (Number.prototype.valueOf as any).call('1')));
console.log('08 (Boolean.prototype.valueOf as any).cal', show(() => (Boolean.prototype.valueOf as any).call(1)));
console.log('09 parseInt(Symbol(\'s\') as any)', show(() => parseInt(Symbol('s') as any)));
console.log('10 parseFloat(Symbol(\'s\') as any)', show(() => parseFloat(Symbol('s') as any)));
console.log('11 Number(Symbol(\'s\') as any)', show(() => Number(Symbol('s') as any)));
console.log('12 String(Symbol(\'s\'))', show(() => String(Symbol('s'))));
console.log('13 Math.max(Symbol(\'s\') as any)', show(() => Math.max(Symbol('s') as any)));
console.log('14 Math.round(Symbol(\'s\') as any)', show(() => Math.round(Symbol('s') as any)));
console.log('15 Number.isInteger(Symbol(\'s\') as any)', show(() => Number.isInteger(Symbol('s') as any)));
