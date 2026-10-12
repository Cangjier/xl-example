// xl:title 方法的接收者与实参校验：字符串那一族 + 数字 / 布尔 / 转换那一族（守卫）
// xl:round 771
// xl:judge stdout
// xl:end
// **第 809 轮把同判定点的两条并了进来**（原 `r771a-01` / `a-02`）：两条问的都是
// 「方法在原始值 / 空值接收者上取哪一格、实参不合法时抛什么」，只是被 `String` 与
// `Number` 两个族分开写了一遍——每段正文一字未改，各自裹一层块。
{
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
}
{
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
}
