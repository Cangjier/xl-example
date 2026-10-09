// xl:title `arguments` 与剩余形参在同一函数里的形状
// xl:round 749
// xl:judge stdout
// xl:want differ
// xl:why 松散模式下**形参与 `arguments` 是同一格**（`function h(a) { a = 99; return arguments[0] }`
// xl:why 在 Node 里给 `99`），本仓给 `1`——`arguments[0]` 还是实参进来时的那个值。
// xl:why **反方向也一样**（`arguments[0] = 42; return a` 该给 `42`，本仓给 `1`）。
// xl:why 根在**值模型**：形参住在**帧的槽**里，而 `arguments` 是 `vm.xl.md` 的
// xl:why `SetupArguments` 在开帧时**另造的一个数组**（全部实参 `Push` 进去）——
// xl:why 两份存储，写一份看不见另一份。这不是修一处笔误：要么让 `arguments` 的下标
// xl:why 读写成**转发**（每一格都回到帧槽），要么在形参赋值那一趟顺手写回 `arguments`
// xl:why （而「哪些形参被别名」还要按**松散 / 严格**分档——严格模式与箭头函数**不**别名）。
// xl:why 同一族的另一处（`arguments` 是数组而不是异质对象、`Array.isArray` 为真）
// xl:why 第 702 轮已经登记在 `stdlib/object/138-object-tostring-arguments-gap`。
// xl:end
// 本文件是 `p749a-a12` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

function f(a: any, ...rest: any[]) { return [arguments.length, a, rest.length, rest.join("|")].join(","); }
console.log(f(1), f(1, 2, 3));
function g() { return arguments[0] + "|" + arguments.length + "|" + Array.from(arguments).join("+"); }
console.log(g(1, 2, 3));
function h(a: any) { a = 99; return arguments[0]; }
console.log(h(1));
const arrow = (...xs: number[]) => xs.length;
console.log(arrow(1, 2), arrow());
