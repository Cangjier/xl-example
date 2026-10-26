type A<T> = T extends `a${infer R}` ? R : never
