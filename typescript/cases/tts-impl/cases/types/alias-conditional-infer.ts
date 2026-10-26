type A<T> = T extends Array<infer U> ? U : never
