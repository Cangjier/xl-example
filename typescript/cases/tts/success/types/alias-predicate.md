# 预期 token 树（逐字）：`type A = (x: unknown) => x is string`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36
t y p e   A   =   ( x :   u n k n o w n )   = >   x   i s   s t r i n g ⏎
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

## [char 25] `"x"`

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
         └─ Common  src=[25,26)  text="x"
```

## [char 26] `" "`

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
         ├─ Common  src=[25,26)  text="x"
         └─ WrapSymbol  src=[26,27)  text=" "
```

## [char 27] `"i"`

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
         ├─ Common  src=[25,26)  text="x"
         ├─ WrapSymbol  src=[26,27)  text=" "
         └─ Common  src=[27,28)  text="i"
```

## [char 28] `"s"`

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
         ├─ Common  src=[25,26)  text="x"
         ├─ WrapSymbol  src=[26,27)  text=" "
         └─ Common  src=[27,29)  text="is"
```

## [char 29] `" "`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            └─ WrapSymbol  src=[29,30)  text=" "
```

## [char 30] `"s"`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            ├─ WrapSymbol  src=[29,30)  text=" "
            └─ Common  src=[30,31)  text="s"
```

## [char 31] `"t"`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            ├─ WrapSymbol  src=[29,30)  text=" "
            └─ Common  src=[30,32)  text="st"
```

## [char 32] `"r"`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            ├─ WrapSymbol  src=[29,30)  text=" "
            └─ Common  src=[30,33)  text="str"
```

## [char 33] `"i"`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            ├─ WrapSymbol  src=[29,30)  text=" "
            └─ Common  src=[30,34)  text="stri"
```

## [char 34] `"n"`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            ├─ WrapSymbol  src=[29,30)  text=" "
            └─ Common  src=[30,35)  text="strin"
```

## [char 35] `"g"`

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
         └─ TypePredicateShape  pos=24  src=[25,29)
            ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
            ├─ WrapSymbol  src=[26,27)  text=" "
            ├─ Common  src=[27,29)  text="is"
            ├─ WrapSymbol  src=[29,30)  text=" "
            └─ Common  src=[30,36)  text="string"
```

## [char 36] `"\n"`

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
         ├─ TypePredicateShape  pos=24  src=[25,36)
         │  ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
         │  └─ StringKeywordShape  pos=29  src=[30,36)  text="string"
         └─ WrapSymbol  src=[36,37)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,37)
└─ TypeAliasDeclarationShape  pos=0  src=[0,36)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ FunctionTypeShape  pos=8  src=[9,36)
      ├─ ParameterShape  pos=10  src=[10,20)
      │  ├─ IdentifierShape  pos=10  src=[10,11)  text="x"
      │  └─ UnknownKeywordShape  pos=12  src=[13,20)  text="unknown"
      └─ TypePredicateShape  pos=24  src=[25,36)
         ├─ IdentifierShape  pos=24  src=[25,26)  text="x"
         └─ StringKeywordShape  pos=29  src=[30,36)  text="string"
```
