// xl:title 函数体里 `class … extends` 一个内建：`heap object is not an environment`
// xl:round 778
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 778 轮第二普查当场红的那一行）：`class M extends Error { }`
// xl:why 写在**函数体**里、再 `new M("x")` ⇒ 整份文件进不来：
// xl:why `heap object is not an environment`。
// xl:why **第 697 轮登过同一句**（`stdlib/error/probe697-e16`，`xl:want blocked`），
// xl:why 这一条把**分界**缩到最小：同一个 `extends Error` 写在**顶层**是对的，
// xl:why `class L extends B {}`（基类是**用户类**）写在函数里也**是对的**——
// xl:why 三档的差别只剩「**函数体 + 内建基类**」这一格（本用例的 01…05 行就是那几档对照，
// xl:why 05 是用户基类、06 是内建基类）。
// xl:why **根在降级层与运行期之间那一处 `env_get`**：帧的 `Env` 拿到的是那个内建构造函数
// xl:why **对象**，不是环境（`probe697-e16` 的 `xl:why` 已经写下这句）。
// xl:why **为什么不顺手收**：`heap object is not an environment` 是**帧栈与环境链**那一层的
// xl:why 判据，要先把「类声明在函数体里怎么占环境、内建基类走的是哪一条」量清楚——
// xl:why 与 `probe697-e16` 同一条根，收它是一次独立的改动。**先如实登记，不猜。**
// xl:end
// 01…05 是**对照**（这几档全对），06 是缺口那一档——两半写在同一条用例里，
// 收掉缺口之后把这一行 `xl:want blocked` 撤掉即可。
function withField(): number { class L { x = 1; } return new L().x; }
console.log('01 函数体里的类字段', withField());
function withMethod(): number { class L { m() { return 2; } } return new L().m(); }
console.log('02 函数体里的类方法', withMethod());
function withCtor(): number { class L { constructor() { this.y = 3; } } return new L().y; }
console.log('03 函数体里的构造器', withCtor());
function withStatic(): number { class L { static s = 4; } return L.s; }
console.log('04 函数体里的静态字段', withStatic());
function extendsUser(): boolean { class B { } class L extends B { } return new L() instanceof B; }
console.log('05 函数体里 extends 用户类', extendsUser());
function extendsBuiltin(): string { class L extends Error { } return new L("m").message; }
console.log('06 函数体里 extends 内建', extendsBuiltin());
