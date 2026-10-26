type A<T> = T extends Array<infer U extends string> ? U : never
