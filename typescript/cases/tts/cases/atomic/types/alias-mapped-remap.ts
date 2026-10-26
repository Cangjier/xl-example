type A<T> = { [K in keyof T as `get${K}`]: T[K] }
