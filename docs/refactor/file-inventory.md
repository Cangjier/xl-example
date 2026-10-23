# file-inventory — `*possible*.xl.md` 清单与引用关系（供 WP-7 删除）

- 生成：impl-wp0（WP-0），分支 `impl-wp0`，起点 `main @ 3eb86b72`
- 生成方式：脚本扫描仓库内全部 `.xl.md` 的 `import ... from "..."`，按相对路径解析到绝对路径；排除 `node_modules` / `dist` / `build` / `.git` / `.xl`
- 行数：按 LF 切分（末尾换行不额外计一行）；`throw`：文件内 `throw` 出现次数

## 汇总

| 项 | 值 |
|---|---|
| *possible*.xl.md 文件数 | 408 |
| 总行数 | 22242 |
| 含 	hrow 的文件数 | 379 |
| 	hrow 总次数（按文件计） | 760 |
| 引用 possible 文件的非 possible 文件数 | 23 |
| 仓库 .xl.md 总数（扫描范围） | 885 |

## 按目录分布

| 目录 | 文件数 | 行数 |
|---|---|---|
| `core/syntax/compute-possible-shapes-states.xl.md` | 1 | 16 |
| `core/syntax/i-compute-possible-shapes.xl.md` | 1 | 49 |
| `core/syntax/possible-shape.xl.md` | 1 | 108 |
| `core/syntax/possible-shape-cache.xl.md` | 1 | 91 |
| `typescript/tokens/aliases` | 32 | 800 |
| `typescript/tokens/bindings` | 3 | 387 |
| `typescript/tokens/declarations` | 31 | 6445 |
| `typescript/tokens/expressions` | 32 | 865 |
| `typescript/tokens/files` | 3 | 1571 |
| `typescript/tokens/jsdoc` | 43 | 1075 |
| `typescript/tokens/jsx` | 12 | 300 |
| `typescript/tokens/keywords` | 84 | 2100 |
| `typescript/tokens/literals` | 10 | 360 |
| `typescript/tokens/members` | 10 | 554 |
| `typescript/tokens/names` | 2 | 50 |
| `typescript/tokens/punctuation` | 61 | 1525 |
| `typescript/tokens/statements` | 20 | 1617 |
| `typescript/tokens/synthetic` | 7 | 175 |
| `typescript/tokens/trivia` | 9 | 225 |
| `typescript/tokens/types` | 45 | 3929 |

## 清单（408 个文件）

| # | 相对路径 | 行数 | throw | 被引用次数 |
|---|---|---|---|---|
| 1 | `core/syntax/compute-possible-shapes-states.xl.md` | 16 | 0 | 15 |
| 2 | `core/syntax/i-compute-possible-shapes.xl.md` | 49 | 0 | 12 |
| 3 | `core/syntax/possible-shape.xl.md` | 108 | 2 | 412 |
| 4 | `core/syntax/possible-shape-cache.xl.md` | 91 | 0 | 406 |
| 5 | `typescript/tokens/aliases/first-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 6 | `typescript/tokens/aliases/first-binary-operator-possible-shape.xl.md` | 25 | 2 | 0 |
| 7 | `typescript/tokens/aliases/first-compound-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 8 | `typescript/tokens/aliases/first-future-reserved-word-possible-shape.xl.md` | 25 | 2 | 0 |
| 9 | `typescript/tokens/aliases/first-jsdoc-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 10 | `typescript/tokens/aliases/first-jsdoc-tag-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 11 | `typescript/tokens/aliases/first-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 12 | `typescript/tokens/aliases/first-literal-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 13 | `typescript/tokens/aliases/first-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 14 | `typescript/tokens/aliases/first-punctuation-possible-shape.xl.md` | 25 | 2 | 0 |
| 15 | `typescript/tokens/aliases/first-reserved-word-possible-shape.xl.md` | 25 | 2 | 0 |
| 16 | `typescript/tokens/aliases/first-statement-possible-shape.xl.md` | 25 | 2 | 0 |
| 17 | `typescript/tokens/aliases/first-template-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 18 | `typescript/tokens/aliases/first-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 19 | `typescript/tokens/aliases/first-trivia-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 20 | `typescript/tokens/aliases/first-type-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 21 | `typescript/tokens/aliases/jsdoc-comment-possible-shape.xl.md` | 25 | 2 | 0 |
| 22 | `typescript/tokens/aliases/last-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 23 | `typescript/tokens/aliases/last-binary-operator-possible-shape.xl.md` | 25 | 2 | 0 |
| 24 | `typescript/tokens/aliases/last-compound-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 25 | `typescript/tokens/aliases/last-future-reserved-word-possible-shape.xl.md` | 25 | 2 | 0 |
| 26 | `typescript/tokens/aliases/last-jsdoc-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 27 | `typescript/tokens/aliases/last-jsdoc-tag-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 28 | `typescript/tokens/aliases/last-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 29 | `typescript/tokens/aliases/last-literal-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 30 | `typescript/tokens/aliases/last-punctuation-possible-shape.xl.md` | 25 | 2 | 0 |
| 31 | `typescript/tokens/aliases/last-reserved-word-possible-shape.xl.md` | 25 | 2 | 0 |
| 32 | `typescript/tokens/aliases/last-statement-possible-shape.xl.md` | 25 | 2 | 0 |
| 33 | `typescript/tokens/aliases/last-template-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 34 | `typescript/tokens/aliases/last-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 35 | `typescript/tokens/aliases/last-trivia-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 36 | `typescript/tokens/aliases/last-type-node-possible-shape.xl.md` | 25 | 2 | 0 |
| 37 | `typescript/tokens/bindings/array-binding-pattern-possible-shape.xl.md` | 104 | 0 | 0 |
| 38 | `typescript/tokens/bindings/binding-element-possible-shape.xl.md` | 180 | 0 | 0 |
| 39 | `typescript/tokens/bindings/object-binding-pattern-possible-shape.xl.md` | 103 | 0 | 0 |
| 40 | `typescript/tokens/declarations/case-block-possible-shape.xl.md` | 25 | 2 | 0 |
| 41 | `typescript/tokens/declarations/class-declaration-end-possible-shape.xl.md` | 66 | 0 | 1 |
| 42 | `typescript/tokens/declarations/class-declaration-possible-shape.xl.md` | 234 | 0 | 1 |
| 43 | `typescript/tokens/declarations/enum-declaration-end-possible-shape.xl.md` | 60 | 0 | 1 |
| 44 | `typescript/tokens/declarations/enum-declaration-possible-shape.xl.md` | 264 | 0 | 1 |
| 45 | `typescript/tokens/declarations/export-assignment-possible-shape.xl.md` | 160 | 0 | 1 |
| 46 | `typescript/tokens/declarations/export-declaration-end-possible-shape.xl.md` | 241 | 0 | 1 |
| 47 | `typescript/tokens/declarations/export-declaration-possible-shape.xl.md` | 1371 | 6 | 1 |
| 48 | `typescript/tokens/declarations/export-specifier-possible-shape.xl.md` | 25 | 2 | 0 |
| 49 | `typescript/tokens/declarations/external-module-reference-possible-shape.xl.md` | 25 | 2 | 0 |
| 50 | `typescript/tokens/declarations/function-declaration-possible-shape.xl.md` | 478 | 1 | 1 |
| 51 | `typescript/tokens/declarations/import-attributes-possible-shape.xl.md` | 129 | 0 | 2 |
| 52 | `typescript/tokens/declarations/import-clause-end-possible-shape.xl.md` | 86 | 0 | 1 |
| 53 | `typescript/tokens/declarations/import-clause-possible-shape.xl.md` | 487 | 0 | 1 |
| 54 | `typescript/tokens/declarations/import-declaration-end-possible-shape.xl.md` | 263 | 0 | 1 |
| 55 | `typescript/tokens/declarations/import-declaration-possible-shape.xl.md` | 183 | 0 | 1 |
| 56 | `typescript/tokens/declarations/import-equals-declaration-possible-shape.xl.md` | 406 | 0 | 1 |
| 57 | `typescript/tokens/declarations/import-specifier-possible-shape.xl.md` | 25 | 2 | 0 |
| 58 | `typescript/tokens/declarations/interface-declaration-end-possible-shape.xl.md` | 66 | 0 | 1 |
| 59 | `typescript/tokens/declarations/interface-declaration-possible-shape.xl.md` | 255 | 0 | 1 |
| 60 | `typescript/tokens/declarations/missing-declaration-possible-shape.xl.md` | 25 | 2 | 0 |
| 61 | `typescript/tokens/declarations/module-block-possible-shape.xl.md` | 25 | 2 | 0 |
| 62 | `typescript/tokens/declarations/module-declaration-possible-shape.xl.md` | 303 | 0 | 1 |
| 63 | `typescript/tokens/declarations/named-exports-possible-shape.xl.md` | 115 | 0 | 1 |
| 64 | `typescript/tokens/declarations/named-imports-possible-shape.xl.md` | 105 | 0 | 1 |
| 65 | `typescript/tokens/declarations/namespace-export-declaration-possible-shape.xl.md` | 142 | 0 | 1 |
| 66 | `typescript/tokens/declarations/namespace-export-possible-shape.xl.md` | 166 | 0 | 1 |
| 67 | `typescript/tokens/declarations/namespace-import-possible-shape.xl.md` | 157 | 0 | 1 |
| 68 | `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md` | 508 | 0 | 2 |
| 69 | `typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md` | 25 | 2 | 0 |
| 70 | `typescript/tokens/declarations/variable-declaration-possible-shape.xl.md` | 25 | 2 | 0 |
| 71 | `typescript/tokens/expressions/array-literal-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 72 | `typescript/tokens/expressions/arrow-function-possible-shape.xl.md` | 25 | 2 | 0 |
| 73 | `typescript/tokens/expressions/as-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 74 | `typescript/tokens/expressions/await-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 75 | `typescript/tokens/expressions/binary-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 76 | `typescript/tokens/expressions/call-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 77 | `typescript/tokens/expressions/class-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 78 | `typescript/tokens/expressions/conditional-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 79 | `typescript/tokens/expressions/delete-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 80 | `typescript/tokens/expressions/element-access-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 81 | `typescript/tokens/expressions/expression-with-type-arguments-possible-shape.xl.md` | 25 | 2 | 0 |
| 82 | `typescript/tokens/expressions/function-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 83 | `typescript/tokens/expressions/meta-property-possible-shape.xl.md` | 25 | 2 | 0 |
| 84 | `typescript/tokens/expressions/new-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 85 | `typescript/tokens/expressions/non-null-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 86 | `typescript/tokens/expressions/object-literal-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 87 | `typescript/tokens/expressions/omitted-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 88 | `typescript/tokens/expressions/parenthesized-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 89 | `typescript/tokens/expressions/postfix-unary-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 90 | `typescript/tokens/expressions/prefix-unary-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 91 | `typescript/tokens/expressions/property-access-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 92 | `typescript/tokens/expressions/satisfies-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 93 | `typescript/tokens/expressions/semicolon-class-element-possible-shape.xl.md` | 90 | 2 | 1 |
| 94 | `typescript/tokens/expressions/spread-element-possible-shape.xl.md` | 25 | 2 | 0 |
| 95 | `typescript/tokens/expressions/synthetic-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 96 | `typescript/tokens/expressions/tagged-template-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 97 | `typescript/tokens/expressions/template-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 98 | `typescript/tokens/expressions/template-span-possible-shape.xl.md` | 25 | 2 | 0 |
| 99 | `typescript/tokens/expressions/type-assertion-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 100 | `typescript/tokens/expressions/type-of-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 101 | `typescript/tokens/expressions/void-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 102 | `typescript/tokens/expressions/yield-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 103 | `typescript/tokens/files/bundle-possible-shape.xl.md` | 25 | 2 | 0 |
| 104 | `typescript/tokens/files/source-file-end-possible-shape.xl.md` | 1521 | 3 | 1 |
| 105 | `typescript/tokens/files/source-file-possible-shape.xl.md` | 25 | 2 | 0 |
| 106 | `typescript/tokens/jsdoc/jsdoc-all-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 107 | `typescript/tokens/jsdoc/jsdoc-augments-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 108 | `typescript/tokens/jsdoc/jsdoc-author-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 109 | `typescript/tokens/jsdoc/jsdoc-callback-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 110 | `typescript/tokens/jsdoc/jsdoc-class-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 111 | `typescript/tokens/jsdoc/jsdoc-deprecated-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 112 | `typescript/tokens/jsdoc/jsdoc-enum-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 113 | `typescript/tokens/jsdoc/jsdoc-function-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 114 | `typescript/tokens/jsdoc/jsdoc-implements-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 115 | `typescript/tokens/jsdoc/jsdoc-import-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 116 | `typescript/tokens/jsdoc/jsdoc-link-code-possible-shape.xl.md` | 25 | 2 | 0 |
| 117 | `typescript/tokens/jsdoc/jsdoc-link-plain-possible-shape.xl.md` | 25 | 2 | 0 |
| 118 | `typescript/tokens/jsdoc/jsdoc-link-possible-shape.xl.md` | 25 | 2 | 0 |
| 119 | `typescript/tokens/jsdoc/jsdoc-member-name-possible-shape.xl.md` | 25 | 2 | 0 |
| 120 | `typescript/tokens/jsdoc/jsdoc-namepath-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 121 | `typescript/tokens/jsdoc/jsdoc-name-reference-possible-shape.xl.md` | 25 | 2 | 0 |
| 122 | `typescript/tokens/jsdoc/jsdoc-non-nullable-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 123 | `typescript/tokens/jsdoc/jsdoc-nullable-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 124 | `typescript/tokens/jsdoc/jsdoc-optional-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 125 | `typescript/tokens/jsdoc/jsdoc-overload-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 126 | `typescript/tokens/jsdoc/jsdoc-override-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 127 | `typescript/tokens/jsdoc/jsdoc-parameter-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 128 | `typescript/tokens/jsdoc/jsdoc-possible-shape.xl.md` | 25 | 2 | 0 |
| 129 | `typescript/tokens/jsdoc/jsdoc-private-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 130 | `typescript/tokens/jsdoc/jsdoc-property-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 131 | `typescript/tokens/jsdoc/jsdoc-protected-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 132 | `typescript/tokens/jsdoc/jsdoc-public-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 133 | `typescript/tokens/jsdoc/jsdoc-readonly-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 134 | `typescript/tokens/jsdoc/jsdoc-return-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 135 | `typescript/tokens/jsdoc/jsdoc-satisfies-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 136 | `typescript/tokens/jsdoc/jsdoc-see-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 137 | `typescript/tokens/jsdoc/jsdoc-signature-possible-shape.xl.md` | 25 | 2 | 0 |
| 138 | `typescript/tokens/jsdoc/jsdoc-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 139 | `typescript/tokens/jsdoc/jsdoc-template-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 140 | `typescript/tokens/jsdoc/jsdoc-text-possible-shape.xl.md` | 25 | 2 | 0 |
| 141 | `typescript/tokens/jsdoc/jsdoc-this-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 142 | `typescript/tokens/jsdoc/jsdoc-throws-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 143 | `typescript/tokens/jsdoc/jsdoc-typedef-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 144 | `typescript/tokens/jsdoc/jsdoc-type-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 145 | `typescript/tokens/jsdoc/jsdoc-type-literal-possible-shape.xl.md` | 25 | 2 | 0 |
| 146 | `typescript/tokens/jsdoc/jsdoc-type-tag-possible-shape.xl.md` | 25 | 2 | 0 |
| 147 | `typescript/tokens/jsdoc/jsdoc-unknown-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 148 | `typescript/tokens/jsdoc/jsdoc-variadic-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 149 | `typescript/tokens/jsx/jsx-attribute-possible-shape.xl.md` | 25 | 2 | 0 |
| 150 | `typescript/tokens/jsx/jsx-attributes-possible-shape.xl.md` | 25 | 2 | 0 |
| 151 | `typescript/tokens/jsx/jsx-closing-element-possible-shape.xl.md` | 25 | 2 | 0 |
| 152 | `typescript/tokens/jsx/jsx-closing-fragment-possible-shape.xl.md` | 25 | 2 | 0 |
| 153 | `typescript/tokens/jsx/jsx-element-possible-shape.xl.md` | 25 | 2 | 0 |
| 154 | `typescript/tokens/jsx/jsx-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 155 | `typescript/tokens/jsx/jsx-fragment-possible-shape.xl.md` | 25 | 2 | 0 |
| 156 | `typescript/tokens/jsx/jsx-namespaced-name-possible-shape.xl.md` | 25 | 2 | 0 |
| 157 | `typescript/tokens/jsx/jsx-opening-element-possible-shape.xl.md` | 25 | 2 | 0 |
| 158 | `typescript/tokens/jsx/jsx-opening-fragment-possible-shape.xl.md` | 25 | 2 | 0 |
| 159 | `typescript/tokens/jsx/jsx-self-closing-element-possible-shape.xl.md` | 25 | 2 | 0 |
| 160 | `typescript/tokens/jsx/jsx-spread-attribute-possible-shape.xl.md` | 25 | 2 | 0 |
| 161 | `typescript/tokens/keywords/abstract-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 162 | `typescript/tokens/keywords/accessor-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 163 | `typescript/tokens/keywords/any-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 164 | `typescript/tokens/keywords/as-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 165 | `typescript/tokens/keywords/assert-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 166 | `typescript/tokens/keywords/asserts-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 167 | `typescript/tokens/keywords/async-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 168 | `typescript/tokens/keywords/await-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 169 | `typescript/tokens/keywords/big-int-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 170 | `typescript/tokens/keywords/boolean-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 171 | `typescript/tokens/keywords/break-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 172 | `typescript/tokens/keywords/case-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 173 | `typescript/tokens/keywords/catch-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 174 | `typescript/tokens/keywords/class-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 175 | `typescript/tokens/keywords/const-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 176 | `typescript/tokens/keywords/constructor-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 177 | `typescript/tokens/keywords/continue-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 178 | `typescript/tokens/keywords/debugger-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 179 | `typescript/tokens/keywords/declare-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 180 | `typescript/tokens/keywords/default-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 181 | `typescript/tokens/keywords/defer-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 182 | `typescript/tokens/keywords/delete-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 183 | `typescript/tokens/keywords/do-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 184 | `typescript/tokens/keywords/else-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 185 | `typescript/tokens/keywords/enum-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 186 | `typescript/tokens/keywords/export-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 187 | `typescript/tokens/keywords/extends-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 188 | `typescript/tokens/keywords/false-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 189 | `typescript/tokens/keywords/finally-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 190 | `typescript/tokens/keywords/for-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 191 | `typescript/tokens/keywords/from-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 192 | `typescript/tokens/keywords/function-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 193 | `typescript/tokens/keywords/get-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 194 | `typescript/tokens/keywords/global-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 195 | `typescript/tokens/keywords/if-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 196 | `typescript/tokens/keywords/implements-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 197 | `typescript/tokens/keywords/import-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 198 | `typescript/tokens/keywords/infer-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 199 | `typescript/tokens/keywords/in-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 200 | `typescript/tokens/keywords/instance-of-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 201 | `typescript/tokens/keywords/interface-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 202 | `typescript/tokens/keywords/intrinsic-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 203 | `typescript/tokens/keywords/is-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 204 | `typescript/tokens/keywords/key-of-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 205 | `typescript/tokens/keywords/let-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 206 | `typescript/tokens/keywords/module-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 207 | `typescript/tokens/keywords/namespace-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 208 | `typescript/tokens/keywords/never-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 209 | `typescript/tokens/keywords/new-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 210 | `typescript/tokens/keywords/null-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 211 | `typescript/tokens/keywords/number-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 212 | `typescript/tokens/keywords/object-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 213 | `typescript/tokens/keywords/of-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 214 | `typescript/tokens/keywords/out-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 215 | `typescript/tokens/keywords/override-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 216 | `typescript/tokens/keywords/package-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 217 | `typescript/tokens/keywords/private-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 218 | `typescript/tokens/keywords/protected-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 219 | `typescript/tokens/keywords/public-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 220 | `typescript/tokens/keywords/readonly-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 221 | `typescript/tokens/keywords/require-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 222 | `typescript/tokens/keywords/return-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 223 | `typescript/tokens/keywords/satisfies-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 224 | `typescript/tokens/keywords/set-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 225 | `typescript/tokens/keywords/static-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 226 | `typescript/tokens/keywords/string-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 227 | `typescript/tokens/keywords/super-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 228 | `typescript/tokens/keywords/switch-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 229 | `typescript/tokens/keywords/symbol-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 230 | `typescript/tokens/keywords/this-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 231 | `typescript/tokens/keywords/throw-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 232 | `typescript/tokens/keywords/true-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 233 | `typescript/tokens/keywords/try-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 234 | `typescript/tokens/keywords/type-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 235 | `typescript/tokens/keywords/type-of-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 236 | `typescript/tokens/keywords/undefined-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 237 | `typescript/tokens/keywords/unique-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 238 | `typescript/tokens/keywords/unknown-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 239 | `typescript/tokens/keywords/using-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 240 | `typescript/tokens/keywords/var-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 241 | `typescript/tokens/keywords/void-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 242 | `typescript/tokens/keywords/while-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 243 | `typescript/tokens/keywords/with-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 244 | `typescript/tokens/keywords/yield-keyword-possible-shape.xl.md` | 25 | 2 | 0 |
| 245 | `typescript/tokens/literals/big-int-literal-possible-shape.xl.md` | 25 | 2 | 0 |
| 246 | `typescript/tokens/literals/jsx-text-all-white-spaces-possible-shape.xl.md` | 25 | 2 | 0 |
| 247 | `typescript/tokens/literals/jsx-text-possible-shape.xl.md` | 25 | 2 | 0 |
| 248 | `typescript/tokens/literals/no-substitution-template-literal-possible-shape.xl.md` | 25 | 2 | 0 |
| 249 | `typescript/tokens/literals/numeric-literal-possible-shape.xl.md` | 25 | 2 | 0 |
| 250 | `typescript/tokens/literals/regular-expression-literal-possible-shape.xl.md` | 25 | 2 | 0 |
| 251 | `typescript/tokens/literals/string-literal-possible-shape.xl.md` | 135 | 0 | 2 |
| 252 | `typescript/tokens/literals/template-head-possible-shape.xl.md` | 25 | 2 | 0 |
| 253 | `typescript/tokens/literals/template-middle-possible-shape.xl.md` | 25 | 2 | 0 |
| 254 | `typescript/tokens/literals/template-tail-possible-shape.xl.md` | 25 | 2 | 0 |
| 255 | `typescript/tokens/members/case-clause-possible-shape.xl.md` | 25 | 2 | 0 |
| 256 | `typescript/tokens/members/catch-clause-possible-shape.xl.md` | 25 | 2 | 0 |
| 257 | `typescript/tokens/members/default-clause-possible-shape.xl.md` | 25 | 2 | 0 |
| 258 | `typescript/tokens/members/enum-member-possible-shape.xl.md` | 329 | 1 | 1 |
| 259 | `typescript/tokens/members/heritage-clause-possible-shape.xl.md` | 25 | 2 | 0 |
| 260 | `typescript/tokens/members/import-attribute-possible-shape.xl.md` | 25 | 2 | 0 |
| 261 | `typescript/tokens/members/import-attributes-possible-shape.xl.md` | 25 | 2 | 0 |
| 262 | `typescript/tokens/members/property-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 263 | `typescript/tokens/members/shorthand-property-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 264 | `typescript/tokens/members/spread-assignment-possible-shape.xl.md` | 25 | 2 | 0 |
| 265 | `typescript/tokens/names/identifier-possible-shape.xl.md` | 25 | 2 | 0 |
| 266 | `typescript/tokens/names/private-identifier-possible-shape.xl.md` | 25 | 2 | 0 |
| 267 | `typescript/tokens/punctuation/ampersand-ampersand-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 268 | `typescript/tokens/punctuation/ampersand-ampersand-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 269 | `typescript/tokens/punctuation/ampersand-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 270 | `typescript/tokens/punctuation/ampersand-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 271 | `typescript/tokens/punctuation/asterisk-asterisk-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 272 | `typescript/tokens/punctuation/asterisk-asterisk-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 273 | `typescript/tokens/punctuation/asterisk-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 274 | `typescript/tokens/punctuation/asterisk-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 275 | `typescript/tokens/punctuation/at-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 276 | `typescript/tokens/punctuation/backtick-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 277 | `typescript/tokens/punctuation/bar-bar-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 278 | `typescript/tokens/punctuation/bar-bar-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 279 | `typescript/tokens/punctuation/bar-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 280 | `typescript/tokens/punctuation/bar-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 281 | `typescript/tokens/punctuation/caret-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 282 | `typescript/tokens/punctuation/caret-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 283 | `typescript/tokens/punctuation/close-brace-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 284 | `typescript/tokens/punctuation/close-bracket-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 285 | `typescript/tokens/punctuation/close-paren-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 286 | `typescript/tokens/punctuation/colon-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 287 | `typescript/tokens/punctuation/comma-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 288 | `typescript/tokens/punctuation/dot-dot-dot-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 289 | `typescript/tokens/punctuation/dot-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 290 | `typescript/tokens/punctuation/equals-equals-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 291 | `typescript/tokens/punctuation/equals-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 292 | `typescript/tokens/punctuation/equals-greater-than-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 293 | `typescript/tokens/punctuation/equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 294 | `typescript/tokens/punctuation/exclamation-equals-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 295 | `typescript/tokens/punctuation/exclamation-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 296 | `typescript/tokens/punctuation/exclamation-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 297 | `typescript/tokens/punctuation/greater-than-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 298 | `typescript/tokens/punctuation/greater-than-greater-than-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 299 | `typescript/tokens/punctuation/greater-than-greater-than-greater-than-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 300 | `typescript/tokens/punctuation/greater-than-greater-than-greater-than-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 301 | `typescript/tokens/punctuation/greater-than-greater-than-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 302 | `typescript/tokens/punctuation/greater-than-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 303 | `typescript/tokens/punctuation/hash-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 304 | `typescript/tokens/punctuation/less-than-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 305 | `typescript/tokens/punctuation/less-than-less-than-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 306 | `typescript/tokens/punctuation/less-than-less-than-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 307 | `typescript/tokens/punctuation/less-than-slash-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 308 | `typescript/tokens/punctuation/less-than-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 309 | `typescript/tokens/punctuation/minus-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 310 | `typescript/tokens/punctuation/minus-minus-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 311 | `typescript/tokens/punctuation/minus-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 312 | `typescript/tokens/punctuation/open-brace-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 313 | `typescript/tokens/punctuation/open-bracket-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 314 | `typescript/tokens/punctuation/open-paren-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 315 | `typescript/tokens/punctuation/percent-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 316 | `typescript/tokens/punctuation/percent-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 317 | `typescript/tokens/punctuation/plus-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 318 | `typescript/tokens/punctuation/plus-plus-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 319 | `typescript/tokens/punctuation/plus-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 320 | `typescript/tokens/punctuation/question-dot-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 321 | `typescript/tokens/punctuation/question-question-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 322 | `typescript/tokens/punctuation/question-question-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 323 | `typescript/tokens/punctuation/question-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 324 | `typescript/tokens/punctuation/semicolon-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 325 | `typescript/tokens/punctuation/slash-equals-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 326 | `typescript/tokens/punctuation/slash-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 327 | `typescript/tokens/punctuation/tilde-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 328 | `typescript/tokens/statements/block-possible-shape.xl.md` | 25 | 2 | 1 |
| 329 | `typescript/tokens/statements/break-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 330 | `typescript/tokens/statements/continue-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 331 | `typescript/tokens/statements/debugger-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 332 | `typescript/tokens/statements/do-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 333 | `typescript/tokens/statements/empty-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 334 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | 999 | 1 | 15 |
| 335 | `typescript/tokens/statements/for-in-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 336 | `typescript/tokens/statements/for-of-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 337 | `typescript/tokens/statements/for-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 338 | `typescript/tokens/statements/if-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 339 | `typescript/tokens/statements/labeled-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 340 | `typescript/tokens/statements/return-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 341 | `typescript/tokens/statements/statement-possible-shape.xl.md` | 168 | 3 | 1 |
| 342 | `typescript/tokens/statements/switch-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 343 | `typescript/tokens/statements/throw-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 344 | `typescript/tokens/statements/try-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 345 | `typescript/tokens/statements/variable-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 346 | `typescript/tokens/statements/while-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 347 | `typescript/tokens/statements/with-statement-possible-shape.xl.md` | 25 | 2 | 1 |
| 348 | `typescript/tokens/synthetic/comma-list-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 349 | `typescript/tokens/synthetic/count-possible-shape.xl.md` | 25 | 2 | 0 |
| 350 | `typescript/tokens/synthetic/not-emitted-statement-possible-shape.xl.md` | 25 | 2 | 0 |
| 351 | `typescript/tokens/synthetic/not-emitted-type-element-possible-shape.xl.md` | 25 | 2 | 0 |
| 352 | `typescript/tokens/synthetic/partially-emitted-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 353 | `typescript/tokens/synthetic/syntax-list-possible-shape.xl.md` | 25 | 2 | 0 |
| 354 | `typescript/tokens/synthetic/synthetic-reference-expression-possible-shape.xl.md` | 25 | 2 | 0 |
| 355 | `typescript/tokens/trivia/conflict-marker-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 356 | `typescript/tokens/trivia/end-of-file-token-possible-shape.xl.md` | 25 | 2 | 0 |
| 357 | `typescript/tokens/trivia/multi-line-comment-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 358 | `typescript/tokens/trivia/new-line-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 359 | `typescript/tokens/trivia/non-text-file-marker-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 360 | `typescript/tokens/trivia/shebang-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 361 | `typescript/tokens/trivia/single-line-comment-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 362 | `typescript/tokens/trivia/unknown-possible-shape.xl.md` | 25 | 2 | 0 |
| 363 | `typescript/tokens/trivia/whitespace-trivia-possible-shape.xl.md` | 25 | 2 | 0 |
| 364 | `typescript/tokens/types/array-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 365 | `typescript/tokens/types/call-signature-possible-shape.xl.md` | 100 | 2 | 1 |
| 366 | `typescript/tokens/types/class-get-accessor-possible-shape.xl.md` | 93 | 2 | 1 |
| 367 | `typescript/tokens/types/class-index-signature-possible-shape.xl.md` | 94 | 2 | 1 |
| 368 | `typescript/tokens/types/class-member-catch-all-possible-shape.xl.md` | 73 | 1 | 1 |
| 369 | `typescript/tokens/types/class-member-possible-util.xl.md` | 895 | 0 | 9 |
| 370 | `typescript/tokens/types/class-set-accessor-possible-shape.xl.md` | 93 | 2 | 1 |
| 371 | `typescript/tokens/types/class-static-block-declaration-possible-shape.xl.md` | 92 | 2 | 1 |
| 372 | `typescript/tokens/types/computed-property-name-possible-shape.xl.md` | 25 | 2 | 0 |
| 373 | `typescript/tokens/types/conditional-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 374 | `typescript/tokens/types/constructor-possible-shape.xl.md` | 95 | 2 | 1 |
| 375 | `typescript/tokens/types/constructor-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 376 | `typescript/tokens/types/construct-signature-possible-shape.xl.md` | 115 | 2 | 1 |
| 377 | `typescript/tokens/types/decorator-possible-shape.xl.md` | 25 | 2 | 0 |
| 378 | `typescript/tokens/types/function-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 379 | `typescript/tokens/types/get-accessor-possible-shape.xl.md` | 96 | 2 | 1 |
| 380 | `typescript/tokens/types/import-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 381 | `typescript/tokens/types/indexed-access-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 382 | `typescript/tokens/types/index-signature-possible-shape.xl.md` | 94 | 2 | 1 |
| 383 | `typescript/tokens/types/infer-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 384 | `typescript/tokens/types/intersection-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 385 | `typescript/tokens/types/literal-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 386 | `typescript/tokens/types/mapped-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 387 | `typescript/tokens/types/method-declaration-possible-shape.xl.md` | 102 | 2 | 1 |
| 388 | `typescript/tokens/types/method-signature-possible-shape.xl.md` | 105 | 2 | 1 |
| 389 | `typescript/tokens/types/named-tuple-member-possible-shape.xl.md` | 25 | 2 | 0 |
| 390 | `typescript/tokens/types/optional-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 391 | `typescript/tokens/types/parameter-possible-shape.xl.md` | 25 | 2 | 0 |
| 392 | `typescript/tokens/types/parenthesized-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 393 | `typescript/tokens/types/property-declaration-possible-shape.xl.md` | 102 | 2 | 1 |
| 394 | `typescript/tokens/types/property-signature-possible-shape.xl.md` | 958 | 2 | 12 |
| 395 | `typescript/tokens/types/qualified-name-possible-shape.xl.md` | 25 | 2 | 0 |
| 396 | `typescript/tokens/types/rest-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 397 | `typescript/tokens/types/set-accessor-possible-shape.xl.md` | 97 | 2 | 1 |
| 398 | `typescript/tokens/types/template-literal-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 399 | `typescript/tokens/types/template-literal-type-span-possible-shape.xl.md` | 25 | 2 | 0 |
| 400 | `typescript/tokens/types/this-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 401 | `typescript/tokens/types/tuple-type-possible-shape.xl.md` | 25 | 2 | 0 |
| 402 | `typescript/tokens/types/type-literal-possible-shape.xl.md` | 25 | 2 | 0 |
| 403 | `typescript/tokens/types/type-operator-possible-shape.xl.md` | 25 | 2 | 0 |
| 404 | `typescript/tokens/types/type-parameter-possible-shape.xl.md` | 25 | 2 | 0 |
| 405 | `typescript/tokens/types/type-predicate-possible-shape.xl.md` | 25 | 2 | 0 |
| 406 | `typescript/tokens/types/type-query-possible-shape.xl.md` | 25 | 2 | 0 |
| 407 | `typescript/tokens/types/type-reference-possible-shape.xl.md` | 25 | 2 | 0 |
| 408 | `typescript/tokens/types/union-type-possible-shape.xl.md` | 25 | 2 | 0 |

## 引用 possible 层的非 possible 文件

| # | 相对路径 | 引用的 possible 文件数 |
|---|---|---|
| 1 | `core/syntax/basic-tokens/area-annotation.xl.md` | 2 |
| 2 | `core/syntax/basic-tokens/bom.xl.md` | 2 |
| 3 | `core/syntax/basic-tokens/bracket.xl.md` | 2 |
| 4 | `core/syntax/basic-tokens/common.xl.md` | 2 |
| 5 | `core/syntax/basic-tokens/line-annotation.xl.md` | 2 |
| 6 | `core/syntax/basic-tokens/regex-token.xl.md` | 2 |
| 7 | `core/syntax/basic-tokens/shebang.xl.md` | 2 |
| 8 | `core/syntax/basic-tokens/string/string.xl.md` | 2 |
| 9 | `core/syntax/basic-tokens/symbol.xl.md` | 2 |
| 10 | `core/syntax/batch/legacy-batch-adapter.xl.md` | 2 |
| 11 | `core/syntax/catalog-guide.xl.md` | 3 |
| 12 | `core/syntax/unit-token.xl.md` | 2 |
| 13 | `typescript/tokens/declarations/body-guide-util.xl.md` | 1 |
| 14 | `typescript/tokens/declarations/class-declaration-shape.xl.md` | 11 |
| 15 | `typescript/tokens/declarations/enum-declaration-shape.xl.md` | 3 |
| 16 | `typescript/tokens/declarations/export-declaration-shape.xl.md` | 6 |
| 17 | `typescript/tokens/declarations/import-clause-shape.xl.md` | 3 |
| 18 | `typescript/tokens/declarations/import-declaration-shape.xl.md` | 6 |
| 19 | `typescript/tokens/declarations/interface-declaration-shape.xl.md` | 9 |
| 20 | `typescript/tokens/files/source-file-shape.xl.md` | 33 |
| 21 | `typescript/tokens/statements/statement-builder.xl.md` | 2 |
| 22 | `typescript/tokens/statements/statement-scanner.xl.md` | 1 |
| 23 | `typescript/tokens/trivia/end-of-file-token-shape.xl.md` | 2 |

## 说明

- 本清单只做**事实记录**，不判断删/留；WP-7 按 PLAN §9.2 的退役顺序删除。
- 408 个文件里 379 个是纯 `throw` 桩（PLAN §9.1 实测），232 个（keywords/punctuation/jsdoc/jsx/aliases/literals/trivia/synthetic/names/bindings）零引用。
- `core/syntax` 下 4 个共享协议（catalog-guide / possible-shape / possible-shape-cache / i-compute-possible-shapes / compute-possible-shapes-states / shape-states）是最后一批删除对象。
