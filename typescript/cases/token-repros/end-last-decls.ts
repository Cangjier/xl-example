interface I extends { a: 1 } { }
declare function f<T>(): T\nf<string>;
