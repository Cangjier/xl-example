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

// ===== 暂缓：chunk 2 / 依赖 harness 的 TS kind 别名（不实现，写注释目标） =====
// 限定名 A.B / A.B.C / A.B<C>：TS 反查名是 FirstNode，ast-json.mjs 缺 ["FirstNode","QualifiedName"] 别名
// type T = A.B;
// type T = A.B.C;
// type T = A.B<C>;
// 函数类型 / 构造类型 / 参数（依赖 cover-expressions-1 的 ParameterShape 与 `=>`）
// type T = () => void;
// type T = (a: A) => B;
// type T = new () => A;
// 对象类型成员（类型字面量非空）
// type T = { a: number };
// type T = { a: number; b: string };
// type T = { [k: string]: number };
// type T = { readonly a?: A };
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
// 泛型参数声明（type T<U> = U[];）与修饰词（export / declare）留给 declarations chunk
// type T<U> = U[];
// export type T = A;
// declare type T = A;
