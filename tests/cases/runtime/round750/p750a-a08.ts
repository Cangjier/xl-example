// xl:title `Reflect` 与 `Object` 同名的两套口径
// xl:round 750
// xl:judge stdout
// xl:want differ
// xl:why **`Reflect.setPrototypeOf` 的口径反了**：`Reflect.setPrototypeOf(o, null)` 在 Node 里给
// xl:why **假**（那个对象已经**不可扩展**了——`Reflect.preventExtensions(o)` 之后），
// xl:why 本仓给**真**；紧接着 `Reflect.getPrototypeOf(o)` 在 Node 里还是 `Object.prototype`
// xl:why （没改）、本仓给 `null`（改了）。判据第 4 行两个值一起量到。
// xl:why **规范那一条**：`Reflect.setPrototypeOf` 在「目标不可扩展」时返回**假**、
// xl:why **不抛也不改**（抛的是 `Object.setPrototypeOf` 那一格）；而本仓这一格**照改不误**。
// xl:why 它与第 720 轮收掉的 `Object.setPrototypeOf` 那一族**不是同一句**（那一格要求抛），
// xl:why 所以修法要**分开**：`Reflect` 那一支先问可扩展性、答假就收手。
// xl:end
const o: any = { a: 1 };
console.log(Reflect.has(o, "a"), Reflect.get(o, "a"), Reflect.set(o, "b", 2), o.b);
console.log(Reflect.deleteProperty(o, "b"), "b" in o, Reflect.ownKeys(o).join(","));
console.log(Reflect.isExtensible(o), Reflect.preventExtensions(o), Reflect.isExtensible(o));
console.log(Reflect.getPrototypeOf(o) === Object.prototype, Reflect.setPrototypeOf(o, null), Reflect.getPrototypeOf(o));
console.log(Reflect.apply(Math.max, null, [1, 3, 2]), Reflect.construct(Array, [3]).length);
