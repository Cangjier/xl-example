// types 家族（chunk 1）：一行一个用例；行内 \n 由 ast-json.mjs 还原成真换行。
// 每个构造先给 base，再叠加 trivia（前导注释 / 前导换行 / 词间注释 / 词间多空格 / 换行 / 行尾注释）与重复形。
// measurement 载体是 TypeAliasDeclaration：root 候选只放行 `type T = <type>;`。
// 暂不能做的构造统一写在文件末尾的 // 注释目标里（generate 时被跳过，不会把全量门打红）。

// ===== T1 原始类型关键字 =====
type T = any;
type T = unknown;
type T = never;
type T = void;
type T = undefined;
type T = boolean;
type T = number;
type T = string;
type T = bigint;
type T = symbol;
type T = object;
type T = this;
// + trivia 叠加
type  T  =  number ;
type  T\n=  string ;
type T\n= boolean;
type T = /* c */ object;
type /* c */ T = this;
\ntype T = any;
type T = any; // c

// ===== T2 类型引用 =====
type T = A;
type T = A<B>;
type T = A<B, C>;
// + trivia 叠加
type  T  =  A ;
type T = /* c */ A;
type /* c */ T = A;
type T /* c */ = A;
\ntype T = A;
type T = A; // c
type T = A<B>; // c
type T = A<\n  B,\n  C\n>;
type T = A < B >;
type T = A <B , C >;
// + 重复形：同文件多条
type T = A; type U = B;

// ===== T3 union =====
type T = A | B;
type T = A | B | C;
type T = A\n| B;
type T = A |\nB;
type T = A | /* c */ B;
type T = A | B | C | D | E;
type T = any | number | string;
type T = (A | B) | C;

// ===== T4 intersection =====
type T = A & B;
type T = A & B & C;
type T = A | B & C;
type T = A & B | C;
type T = A &\nB;
type T = A & /* c */ B;

// ===== T5 括号类型 =====
type T = (A);
type T = (A | B);
type T = ((A));
type T = (A) | B;
type T = (A | B)[];
type T = ( A );

// ===== T6 数组类型 =====
type T = A[];
type T = A[][];
type T = A[] | B;
type T = string[];
type T = (A & B)[];
type T = [A, B][];

// ===== T7 tuple 类型 =====
type T = [];
type T = [A];
type T = [A, B];
type T = [A, B,];
type T = [[A, B], C];
type T = [A | B, C & D];
type T = [\n  A,\n  B,\n];
type T = [ /* c */ A, B ];
type T = [ A , B ];

// ===== T8 字面量类型 =====
type T = "a";
type T = 1;
type T = 1.5;
type T = true;
type T = false;
type T = 1n;
type T = null;
type T = "a" | "b";
type T = 1 | 2 | 3;
type T = true | false;
type T = null | undefined;
type T = 0x1f;
// + trivia 叠加
type T = /* c */ "a";
type T = /* c */ 1n;
type T = /* c */ 1;
type T = "a" |\n"b";
type T = "a"; // c

// ===== T9 空对象类型 =====
type T = {};
type T = {}[];
type T = {} | A;
type T = { };

// ===== T10 重复语句（同一文件多条 type） =====
type T = A; type U = B; type V = C;
type T = A;\ntype U = B; type V = C;
type T = A; type U = B; // c
type T = A; type U = {}; type V = [A, B];

// ===== T11 函数类型 =====
type T = () => B;
type T = (a: A) => B;
type T = (a: A, b: B) => C;
type T = ( a : A ) => B;
type T = (a?: A) => B;
type T = (a: A,) => B;
type T = (/* c */ a: A) => B;
type T = (a: A) => B[];
type T = () => void;
type T = (a: A) =>\nB;
type T = (a: A)\n=> B;
type T = /* c */ (a: A) => B;
type T = (a: A) => (b: B) => C;
type T = (a: A, b: B) => C; // c
type T = () => B; type U = () => C;

// ===== T12 类型字面量成员 =====
type T = {};
type T = { a: A };
type T = { a?: A };
type T = { readonly a: A };
type T = { a(): B };
type T = { [k: string]: A };
type T = { (a: A): B };
type T = { a: A; b: B };
type T = { a: A, b: B };
type T = { readonly a?: A };
type T = { m(a: A, b: B): C };
type T = { a: A }[];
type T = { a: A }; type U = { b: B };
type T = {  a : A  };
type T = {\n  a: A;\n  b: B;\n};
type T = { /* c */ a: A };
type T = { a: /* c */ A };
type T = { a: A; b: B; c: C };
type T = { a(): B; b: C };

// ===== T13 条件类型 =====
type T = A extends B ? C : D;
type T = A extends B ? C : D extends E ? F : G;
type T = A extends B ? C | D : E;
type T = A extends B & C ? D : E;
type T = (A extends B ? C : D)[];
type T = A extends (B | C) ? D : E;
type T = A extends B ? C : D; // c
type T = A extends B ? C : D; type U = E extends F ? G : H;
type T = A /* c */ extends B ? C : D;
type T = A extends /* c */ B ? C : D;
type T = A extends B\n? C : D;
type T = A extends B ?\nC : D;
type T = A extends B ? C :\nD;

// ===== T14 infer =====
type T = A extends (infer U)[] ? U : never;
type T = A extends (infer U) ? U : B;
type T = A extends Array<infer U> ? U : never;
type T = A extends (infer U)[][] ? U : B;
type T = A extends (infer U) ? U : never; // c
type T = A extends /* c */ (infer U) ? U : B;

// ===== T15 keyof / typeof =====
type T = keyof A;
type T = typeof a;
type T = readonly A;
type T = unique symbol;
type T = keyof (A | B);
type T = keyof typeof a;
type T = keyof A[];
type T = /* c */ keyof A;
type T = keyof /* c */ A;
type T = typeof /* c */ a;
type T = keyof A | B;
type T = typeof a; // c

// ===== T16 索引访问 =====
type T = A[B];
type T = A[B][C];
type T = A["k"];
type T = (A | B)[C];
type T = A[B | C];
type T = A /* c */ [B];
type T = A[\nB];
type T = keyof A[B];
type T = A[B]; // c

// ===== T17 构造类型 =====
type T = new () => A;
type T = new (a: A) => B;
type T = new (a: A, b: B) => C;
type T = new /* c */ () => A;
type T = new\n() => A;
type T = new () => A[];
type T = new () => A; // c

// ===== T18 rest 参数（函数类型） =====
type T = (...a: A[]) => B;
type T = (a: A, ...b: B[]) => C;
type T = (... a: A[]) => B;
type T = (...a: A[]) => B; // c

// ===== T19 嵌套泛型实参（>> 拆分） =====
type T = A<B<C>>;
type T = A<B<C>> | D;
type T = A<B<C<D>>>;
type T = A<B<C, D>>;
type T = A<B<C>, D>;
type T = A<B<C>>[];
type T = A<B<C>>; // c

// ===== T20 mapped type =====
type T = { [K in A]: B };
type T = { readonly [K in keyof A]?: A[K] };
type T = { -readonly [K in keyof A]-?: A[K] };
type T = { +readonly [K in keyof A]+?: A[K] };
type T = { [K in A as X]: B };
type T = { [K in A]: B; };
type T = { [K in A | C]: B };
type T = { /* c */ [K in A]: B };
type T = { [K in /* c */ A]: B };
type T = { [K in A]: B }; // c
type T = { [K in A]: B }; type U = { [K in C]: D };

// ===== T21 模板字面量类型 =====
type T = `a`;
type T = `a${B}`;
type T = `a${B}c`;
type T = `${A}-${B}`;
type T = `a${B}c${D}e`;
type T = `a${B}c` | `d`;
type T = `a${keyof B}c`;
type T = `a${B}c[]`;
type T = `a${B}c`[];
type T = /* c */ `a${B}c`;
type T = `a${B}c`; // c

// ===== T22 类型谓词 =====
type T = (x: A) => x is B;
type T = (x: A) => asserts x is B;
type T = asserts x is B;
type T = (x: A) => x is B[];
type T = (x: A) => /* c */ x is B;
type T = (x: A) => x /* c */ is B;
type T = (x: A) => asserts x is B; // c

// ===== T23 abstract new =====
type T = abstract new () => A;
type T = abstract new (a: A) => B;
type T = abstract /* c */ new () => A;
type T = abstract new\n() => A;
type T = abstract new () => A; // c

// ===== T24 import type =====
type T = import("m").A;
type T = import("m").A<B>;
type T = import("m").a.b;
type T = import("m").A[];
type T = import("m").A | B;
type T = import("m").A; // c

// ===== T25 泛型类型别名（type parameter 声明） =====
type T<U> = U;
type T<U, V> = U;
type T<U extends A> = U;
type T<U = B> = U;
type T<U extends A = B> = U;
type T<U extends A = B, V = C> = [U, V];
type T<U extends A<B>> = U;
type T<in U> = U;
type T<out U> = U;
type T<in out U> = U;
type T<const U> = U;
type T < U > = U;
type T<U /* c */ extends A> = U;
type T<\n  U,\n  V\n> = U;
type T<U = B, V extends C = D> = U;
type T<U> = U; // c
type T<U> = U; type V<W> = W;
/* c */ type T<U> = U;
type T<U extends A = B, V = C> = [U, V]; // c

// ===== 暂缓（chunk 6 / 其它家族，注释目标） =====
// export / declare 修饰的 type alias（与 export/declare 声明候选抢同一格，需要先让根候选放行修饰词）
// export type T<U> = U;
// declare type T<U> = U;
// class / interface / function 的泛型参数（declarations-3/4）
// 默认值引用后面参数等语义层形态

// ===== 测量 sweep：模板字面量类型 =====
type T = `x`;
type T = `a${U}b`;
type T = `${U}-${V}`;
type T = `a${U}b${V}c`;
type T = /* c */ `a${U}b`;
type T = `a${ U }b`;

// ===== 测量 sweep：conditional / infer =====
type T<U> = U extends A ? B : C;
type T<U> = U extends infer R ? R : never;
type T<U> = U extends { a: infer R } ? R : never;
// 暂缓：元组解构里的 rest 元素（`[infer R, ...infer S]`）—— 元组类型的 rest 分支未实现
//   （oracle 侧合法，本仓 TypeBuilder 报「不支持的类型起点」）。
// `// ` type T<U> = U extends [infer R, ...infer S] ? R : never;
type T<U> = U extends A ? B : U extends C ? D : E;
type T<U> = U extends any ? 1 : 2;

// ===== 测量 sweep：mapped 类型与修饰 =====
type T = { [K in keyof U]: U[K] };
type T = { readonly [K in keyof U]: U[K] };
type T = { [K in keyof U]?: U[K] };
type T = { +readonly [K in keyof U]-?: U[K] };
type T = { -readonly [K in keyof U]+?: U[K] };
type T = { [K in keyof U as `get${string & K}`]: U[K] };
type T = { /* c */ readonly [K in keyof U]: U[K] };

// ===== 测量 sweep：类型算子 =====
type T = keyof typeof a;
type T = typeof f;
type T = import("m").T;
type T = readonly U[];
type T = U[K];
type T = keyof U;
type T = U | V;
type T = U & V;
type T = () => U;
type T = new () => U;
type T = { a: U; b?: V };

// ===== 测量 sweep：暂缓（注释目标 + 原因）=====
// 本条已在 chunk 8 实现（TypeBuilder.ParseInferType 支持 `extends` 约束），用例见下方 chunk 8 段。
// 模板字面量类型里的内插类型谓词（复杂占位符）与 mapped `as` 里组合键名的更多形态，留待后续 sweep。

// ===== chunk 8：tuple rest 元素 + 约束 infer（实现项）=====
type T = [A, ...B];
type T = [...A[]];
type T = [string, ...number[], boolean];
type T = [A?, ...B[]];
type T = readonly [A, ...B[]];
type T = [first: A, ...rest: B[]];
// 暂缓：optional named tuple member `[first: A, second?: B]` —— 词法把 `?` 与 `:` 合成一个
// combined symbol（`?:`），要拆成 QuestionToken + 冒号需要 basic token 决策（core 侧），本块不碰 core。
// `// ` type T = [first: A, second?: B];
type T = [...rest: A[]];
type T = [/* c */ A, .../* c */ B];
type T<U> = U extends [infer R, ...infer S] ? R : never;
type T<U> = U extends [...infer S] ? S : never;
type T<U> = U extends infer R extends A ? R : never;
type T<U> = U extends infer R extends string ? R : never;
type T<U> = U extends { a: infer K extends string } ? K : never;
type T<U> = U extends infer R extends A ? R : U;

// ===== sweep 3：类型谓词 / asserts / this / unique symbol / typeof import / 构造签名（measurement-only） =====
type T = (x: any) => x is A;
type T = (x: any) => asserts x is A;
type T = this;
type T = unique symbol;
type T = import("m").T;
type T = new () => A;
type T = abstract new () => A;
// 暂缓：type T = { new (): A }; —— 类型字面量成员里的 ConstructSignature 未接，当前被解析成 MethodSignature(`new` 当方法名)。
type T = keyof keyof T;
type T = readonly (A | B)[];
type T = (A | B)[];
type T = (() => A)[];
type T = { m(): this };
// trivia
type T = readonly /* c */ (A | B)[];
type T = new /* c */ () => A;
type T = (x: any) => /* c */ x is A;
// 暂缓（原因）：function isA(x: any): x is A { return true; } —— 函数声明侧返回类型的 `x is A` 谓词路径未接
//                    （函数类型位置 `type T = (x: any) => x is A;` 已绿）。
// 暂缓：function assertB(x: any): asserts x {} —— 无 is 的 asserts 谓词（TypePredicate 缺 is 分支）。
// 暂缓：declare const t: unique symbol; —— 变量声明不接受 declare 修饰。
// 暂缓：type T = typeof import("m"); —— ParseTypeQuery 只认实体名，`import(...)` 形式未接。

// ===== typeof import（TypeQuery 的 import 形态，TS 节点是 ImportType） =====
type T = typeof import("m");
type U = typeof import("m").a;
type V = typeof import("m").default;
type T = keyof typeof import("m");
type T = typeof import("m")[K];
// trivia
type T = typeof /* c */ import("m");
type T = typeof import(/* c */"m");
type T = typeof import("m") /* c */ ;
type T = typeof import("m"). /* c */ a;
// ===== base 14: construct signatures =====
type T = { new (): A };
type T = { new (a: A): B };
type T = { new (a: A, b: B): C };
type T = { new <U>(a: U): A };
type T = { new <U, V>(a: U, b: V): C };
interface I { new (): A; }
interface I { new (a: A): B; }
interface I { new <T>(a: T): A; }
type T = { abstract new (): A };
type T = { (): A; new (): B; x: C };
interface I { new (): A; m(): void; }
type T = { new: A };
// + trivia
type T = { /* c */ new (): A };
type T = { new /* c */ (): A };
type T = { new (/* c */ a: A): B };
type T = { new (a: A) /* c */: B };
interface I { /* c */ new (): A; }
interface I { new (): A; /* c */ m(): void; }
type T = {\n  new (): A;\n  new (a: A): B;\n};
type T = { new (a: A, b: B): C, };

// ===== base 15: constructor types (ConstructorType) =====
type T = new (a: A) => B;
type T = new (a: A, b: B) => C;
type T = new <U>(a: U) => A;
type T = new <U, V>(a: U, b: V) => C;
type T = abstract new (a: A) => B;
type T = abstract new (a: A, b: B) => C;
type T = (new () => A) | (new () => B);
type T = (new () => A) & (new () => B);
type T = { new (): A } & B;
type T = new () => A[];
type T = new () => { a: A };
type T = new () => A | B;
// + trivia
type T = new /* c */ (a: A) => B;
type T = new (/* c */ a: A) => B;
type T = new (a: A) /* c */ => B;
type T = new (a: A) => /* c */ B;
type T = abstract /* c */ new () => A;
type T = new\n(a: A) => B;
// + regression (function type / construct signature / array of constructor types)
type T = () => A;
// 暂缓：`type T = new (a) => b;` —— 无类型标注的参数（TS 语义错误 implicit any）；本仓
//   构造函数类型的参数走 ParseParameterList（要求 `名字: 类型`），与函数类型位置共用。
// `// ` type T = new (a) => b;
type T = (new () => A)[];
type T = Array<new () => A>;
type T = { new (): A };
// ===== base 15: type-literal method signatures with predicates =====
type T = { m(x: any): x is A };
type T = { m(x: any): asserts x is A };
type T = { m(): this is A };
type T = { m(x: any): x is A; n(): void };
type T = { m(x: any): x /* c */ is A };
// ===== import 类型 attributes（with / assert，TS 反查名 AssertClause） =====
type T = typeof import("m", { with: { type: "json" } });
type T = import("m", { with: { type: "json" } }).X;
type T = import("m", { with: { type: "json" } }).X<B>;
type T = import("m", { assert: { type: "json" } }).X;
type T = typeof import("m", { with: { "type": "json" } });
type T = typeof import("m", /* c */ { with: { type: "json" } });
type T = typeof import("m", { with: /* c */ { type: "json" } });
type T = typeof import("m", { with: { type /* c */ : "json" } });
type T = typeof import("m", { with: { type: /* c */ "json" } });

// ===== sweep 4：const 类型参数（类型位置）/ 泛型函数类型 / this 扩展（measurement-first） =====
type T = <const U>(x: U) => U;
type T = <U>(x: U) => U;
type T = <const U, V>(x: U, y: V) => U;
type T = <U extends A>(x: U) => U;
type T = this["x"];
type T = this extends A ? B : C;
type T = this & A;
// trivia
type T = <const /* c */ U>(x: U) => U;
type T = this /* c */ ["x"];

// ===== nested type args（`>>` 拆分，measurement） =====
type T = A<B<C>>;
type T = A<B<C<D>>>;
type T = Map<string, Array<number>>;
type T = A<B<C>, D<E>>;
type T<U> = U extends A<B<C>> ? 1 : 2;
// trivia
type T = A<B /* c */ <C>>;
type T = A /* c */ <B<C>>;
type T = A<B<C> >;

// ===== sweep 5：keyof/索引链 / 模板字面量类型 / infer 位置 / 递归分发（measurement） =====
type T = keyof A["b"];
type T = A["b"]["c"];
type T = (A | B)["x"];
type T = A[B["c"]];
type T = `${A}${B}`;
type T = `${A}-${B}-${C}`;
type T = `${number}`;
type T = `${string & K}`;
type T<U> = U extends A<infer R> ? R : never;
type T = Generator<infer R, infer S>;
type T = () => infer R;
type T<U> = U extends A ? U extends B<infer R> ? R : never : never;
type F<T> = T extends object ? { [K in keyof T]: F<T[K]> } : T;
type T = typeof a["b"];
type T = (typeof a)["b"];
// trivia
type T = `${A /* c */}${B}`;
type T = keyof /* c */ A["b"];

// ===== this 参数：类型字面量方法 / 函数类型 / 构造类型（measurement） =====
type T = { m(this: A): void };
type F = (this: A, x: B) => C;
type F = new (this: A) => B;
type F = (this: void) => A;
// trivia
type F = (this /* c */ : A) => B;
