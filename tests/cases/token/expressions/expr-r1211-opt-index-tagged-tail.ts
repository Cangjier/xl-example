// xl:note 第 1211 轮（口径 1.1）收掉：`tailUnitsOf` 补上「以模板串开头的外壳」那一档——
// `a?.[c]`x`.b` 的 `?.` 之后是 `PropertyAccess([String(反引号), ., b])`，模板与后缀装在同一格，
// 不摊开 chainOnto 里「紧跟一格反引号模板」那一支就看不到它 ⇒ 那一整段丢。
// xl:round 1211
// xl:end
a?.[c]`x`.b;
