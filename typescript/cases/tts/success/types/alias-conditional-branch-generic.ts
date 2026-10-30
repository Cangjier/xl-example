type A<T> = T extends string ? Array<T> : Map<string, T>
