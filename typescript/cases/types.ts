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

// ===== 暂缓（chunk 3 / 其它家族，注释目标） =====
// constructor type / 构造签名
// type T = new () => A;
// rest 参数 / 解构参数 / 默认值
// type T = (a: A, ...b: B) => C;
// type T = ({ a }: A) => B;
// 对象类型里暂缓的成员形态
// type T = { readonly [k: string]: A };
// type T = { a?(): B };
// type T = { get a(): A };
// conditional / mapped / infer / keyof / typeof / indexed / import type / template literal type / predicate / 类型算子
// type T = A extends B ? C : D;
// type T = { [K in keyof A]: A[K] };
// type T = A extends infer U ? U : never;
// type T = keyof A;
// type T = typeof a;
// type T = A["b"];
// type T = import("m").A;
// type T = `a${B}c`;
// type T = (x: A) => x is B;
// type T = -1;
// type T = readonly A[];
// A<B<C>> 连写闭合（>> 被 basic token 收成一个 Symbol）
// type T = A<B<C>>;
// 泛型参数声明与修饰词（留给 declarations chunk）
// type T<U> = U[];
// export type T = A;
// declare type T = A;
