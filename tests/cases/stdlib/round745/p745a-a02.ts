// xl:title `flat` 的深度走 `ToNumber`：字符串与对象那一档
// xl:round 745
// xl:judge stdout
// xl:end
const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat("2")));
console.log(JSON.stringify(a.flat({ valueOf: () => 2 } as any)));
console.log(JSON.stringify(a.flat({ valueOf: () => 0 } as any)));
console.log(JSON.stringify(a.flat({ toString: () => "2" } as any)));
console.log(JSON.stringify(a.flat(null as any)), JSON.stringify(a.flat(true as any)));
console.log(JSON.stringify(a.flat(0)));
