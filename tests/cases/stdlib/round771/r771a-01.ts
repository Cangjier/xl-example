// xl:title String 方法的接收者与实参（守卫）
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
console.log('01 (String.prototype.charAt as any).call(', show(() => (String.prototype.charAt as any).call(1, 0)));
console.log('02 (String.prototype.charAt as any).call(', show(() => (String.prototype.charAt as any).call(null, 0)));
console.log('03 (String.prototype.slice as any).call(1', show(() => (String.prototype.slice as any).call(123, 1)));
console.log('04 (String.prototype.toUpperCase as any).', show(() => (String.prototype.toUpperCase as any).call(true)));
console.log('05 (String.prototype.indexOf as any).call', show(() => (String.prototype.indexOf as any).call(1, '1')));
console.log('06 (String.prototype.padStart as any).cal', show(() => (String.prototype.padStart as any).call(1, 3, '0')));
console.log('07 (String.prototype.repeat as any).call(', show(() => (String.prototype.repeat as any).call('ab', -1)));
console.log('08 (String.prototype.repeat as any).call(', show(() => (String.prototype.repeat as any).call('ab', Infinity)));
console.log('09 (String.prototype.repeat as any).call(', show(() => (String.prototype.repeat as any).call('ab', 'x')));
console.log('10 (String.prototype.at as any).call(\'ab\'', show(() => (String.prototype.at as any).call('ab', 1.9)));
console.log('11 (\'ab\' as any).charAt(Symbol(\'s\'))', show(() => ('ab' as any).charAt(Symbol('s'))));
console.log('12 (\'ab\' as any).includes(Symbol(\'s\'))', show(() => ('ab' as any).includes(Symbol('s'))));
console.log('13 (String.prototype.normalize as any).ca', show(() => (String.prototype.normalize as any).call('a')));
console.log('14 (String.prototype.localeCompare as any', show(() => (String.prototype.localeCompare as any).call('a', 'b')));
