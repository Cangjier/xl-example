// xl:title `Object` 静态方法的接收者：原始值装箱、空值抛 `TypeError`
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
console.log('01 Object.getOwnPropertyDescriptor(1 as a', show(() => Object.getOwnPropertyDescriptor(1 as any, 'x')));
console.log('02 Object.getOwnPropertyDescriptor(\'ab\' a', show(() => Object.getOwnPropertyDescriptor('ab' as any, 'length')));
console.log('03 Object.getOwnPropertyDescriptor(true a', show(() => Object.getOwnPropertyDescriptor(true as any, 'x')));
console.log('04 Object.getOwnPropertyDescriptor(null a', show(() => Object.getOwnPropertyDescriptor(null as any, 'x')));
console.log('05 Object.getOwnPropertyDescriptors(null ', show(() => Object.getOwnPropertyDescriptors(null as any)));
console.log('06 Object.getOwnPropertyDescriptors(1 as ', show(() => Object.getOwnPropertyDescriptors(1 as any)));
console.log('07 Object.getOwnPropertyDescriptors(\'ab\' ', show(() => Object.getOwnPropertyDescriptors('ab' as any)));
console.log('08 Object.getOwnPropertyNames(1 as any)', show(() => Object.getOwnPropertyNames(1 as any)));
console.log('09 Object.getOwnPropertyNames(null as any', show(() => Object.getOwnPropertyNames(null as any)));
console.log('10 Object.getOwnPropertySymbols(1 as any)', show(() => Object.getOwnPropertySymbols(1 as any)));
console.log('11 Object.keys(1 as any)', show(() => Object.keys(1 as any)));
console.log('12 Object.keys(null as any)', show(() => Object.keys(null as any)));
console.log('13 Object.values(\'ab\' as any)', show(() => Object.values('ab' as any)));
console.log('14 Object.entries(1 as any)', show(() => Object.entries(1 as any)));
console.log('15 Object.assign(null as any, { a: 1 })', show(() => Object.assign(null as any, { a: 1 })));
console.log('16 Object.assign(1 as any, { a: 1 })', show(() => Object.assign(1 as any, { a: 1 })));
console.log('17 Object.setPrototypeOf(null as any, nul', show(() => Object.setPrototypeOf(null as any, null)));
console.log('18 Object.getPrototypeOf(1 as any)', show(() => Object.getPrototypeOf(1 as any)));
console.log('19 Object.getPrototypeOf(null as any)', show(() => Object.getPrototypeOf(null as any)));
console.log('20 Object.isFrozen(null as any)', show(() => Object.isFrozen(null as any)));
console.log('21 Object.isSealed(1 as any)', show(() => Object.isSealed(1 as any)));
console.log('22 Object.isExtensible(\'a\' as any)', show(() => Object.isExtensible('a' as any)));
console.log('23 Object.preventExtensions(1 as any)', show(() => Object.preventExtensions(1 as any)));
console.log('24 Object.seal(null as any)', show(() => Object.seal(null as any)));
console.log('25 Object.freeze(null as any)', show(() => Object.freeze(null as any)));
console.log('26 Object.defineProperty(1 as any, \'x\', {', show(() => Object.defineProperty(1 as any, 'x', { value: 1 })));
console.log('27 Object.defineProperty(null as any, \'x\'', show(() => Object.defineProperty(null as any, 'x', { value: 1 })));
console.log('28 Object.defineProperties(1 as any, { x:', show(() => Object.defineProperties(1 as any, { x: { value: 1 } })));
console.log('29 Object.create(1 as any)', show(() => Object.create(1 as any)));
console.log('30 Object.create(null, { x: { value: 1 } ', show(() => Object.create(null, { x: { value: 1 } })));
console.log('31 Object.hasOwn(1 as any, \'x\')', show(() => Object.hasOwn(1 as any, 'x')));
console.log('32 Object.prototype.hasOwnProperty.call(n', show(() => Object.prototype.hasOwnProperty.call(null, 'x')));
console.log('33 Object.prototype.propertyIsEnumerable.', show(() => Object.prototype.propertyIsEnumerable.call(1, 'x')));
