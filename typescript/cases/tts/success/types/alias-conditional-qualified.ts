type A<T> = T extends NS.Array<infer U> ? U : never
