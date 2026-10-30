# 预期 token 树（逐字）：`type A = (x: unknown) => asserts x is string`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44
t y p e   A   =   ( x :   u n k n o w n )   = >   a s s e r t s   x   i s   s t r i n g ⏎
```

## [char 0] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="t"
```

## [char 1] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="ty"
```

## [char 2] `"p"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="typ"
```

## [char 3] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,4)  text="type"
```

## [char 4] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
└─ WrapSymbol  src=[4,5)  text=" "
```

## [char 5] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
├─ WrapSymbol  src=[4,5)  text=" "
└─ Common  src=[5,6)  text="A"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Symbol  src=[7,8)  text="="
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ Symbol  src=[9,10)  text="("
```

## [char 10] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   └─ Common  src=[10,11)  text="x"
```

## [char 11] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   └─ Symbol  src=[11,12)  text=":"
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"u"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,14)  text="u"
```

## [char 14] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,15)  text="un"
```

## [char 15] `"k"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,16)  text="unk"
```

## [char 16] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,17)  text="unkn"
```

## [char 17] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,18)  text="unkno"
```

## [char 18] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,19)  text="unknow"
```

## [char 19] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,20)  text="unknown"
```

## [char 20] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,20)  text="unknown"
   └─ Symbol  src=[20,21)  text=")"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,20)  text="unknown"
   ├─ Symbol  src=[20,21)  text=")"
   └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ Symbol  src=[9,10)  text="("
   ├─ Common  src=[10,11)  text="x"
   ├─ Symbol  src=[11,12)  text=":"
   ├─ WrapSymbol  src=[12,13)  text=" "
   ├─ Common  src=[13,20)  text="unknown"
   ├─ Symbol  src=[20,21)  text=")"
   ├─ WrapSymbol  src=[21,22)  text=" "
   └─ Symbol  src=[22,23)  text="="
```

## [char 23] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
```

## [char 24] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         └─ WrapSymbol  src=[24,25)  text=" "
```

## [char 25] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,26)  text="a"
```

## [char 26] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,27)  text="as"
```

## [char 27] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,28)  text="ass"
```

## [char 28] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,29)  text="asse"
```

## [char 29] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,30)  text="asser"
```

## [char 30] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,31)  text="assert"
```

## [char 31] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ Common  src=[25,32)  text="asserts"
```

## [char 32] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,32)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            └─ WrapSymbol  src=[32,33)  text=" "
```

## [char 33] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,32)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            └─ Common  src=[33,34)  text="x"
```

## [char 34] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            └─ WrapSymbol  src=[34,35)  text=" "
```

## [char 35] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            └─ Common  src=[35,36)  text="i"
```

## [char 36] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            └─ Common  src=[35,37)  text="is"
```

## [char 37] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            └─ WrapSymbol  src=[37,38)  text=" "
```

## [char 38] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            ├─ WrapSymbol  src=[37,38)  text=" "
            └─ Common  src=[38,39)  text="s"
```

## [char 39] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            ├─ WrapSymbol  src=[37,38)  text=" "
            └─ Common  src=[38,40)  text="st"
```

## [char 40] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            ├─ WrapSymbol  src=[37,38)  text=" "
            └─ Common  src=[38,41)  text="str"
```

## [char 41] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            ├─ WrapSymbol  src=[37,38)  text=" "
            └─ Common  src=[38,42)  text="stri"
```

## [char 42] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            ├─ WrapSymbol  src=[37,38)  text=" "
            └─ Common  src=[38,43)  text="strin"
```

## [char 43] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         └─ TypePredicateShape  pos=24  src=[25,34)
            ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
            ├─ WrapSymbol  src=[32,33)  text=" "
            ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
            ├─ WrapSymbol  src=[34,35)  text=" "
            ├─ Common  src=[35,37)  text="is"
            ├─ WrapSymbol  src=[37,38)  text=" "
            └─ Common  src=[38,44)  text="string"
```

## [char 44] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ FunctionTypeShape  pos=8  src=[9,24)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ ReturnTypeContextShape  pos=21  src=[24,24)
         ├─ WrapSymbol  src=[24,25)  text=" "
         ├─ TypePredicateShape  pos=24  src=[25,44)
         │  ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
         │  ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
         │  └─ StringKeywordShape  pos=37  src=[38,44)  text="string"
         └─ WrapSymbol  src=[44,45)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,45)
└─ TypeAliasDeclarationShape  pos=0  src=[0,44)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ FunctionTypeShape  pos=8  src=[9,44)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ TypePredicateShape  pos=24  src=[25,44)
         ├─ AssertsKeywordShape  pos=24  src=[25,32)  text="asserts"
         ├─ IdentifierShape  pos=32  src=[33,34)  text="x"
         └─ StringKeywordShape  pos=37  src=[38,44)  text="string"
```
