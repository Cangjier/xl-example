// xl:title `Reflect` 十三格的名字与形参个数
// xl:round 736
// xl:judge stdout
// xl:end
const names = ["apply", "construct", "defineProperty", "deleteProperty", "get", "getOwnPropertyDescriptor", "getPrototypeOf", "has", "isExtensible", "ownKeys", "preventExtensions", "set", "setPrototypeOf"];
for (const n of names) console.log(n, typeof (Reflect as any)[n], (Reflect as any)[n] ? (Reflect as any)[n].length : "-");
