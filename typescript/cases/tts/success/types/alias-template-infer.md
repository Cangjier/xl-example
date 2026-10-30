# 预期 token 树（逐字）：`type A<T> = T extends `a${infer R}` ? R : never`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47
t y p e   A < T >   =   T   e x t e n d s   ` a $ { i n f e r   R } `   ?   R   :   n e v e r ⏎
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

## [char 6] `"<"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      └─ Symbol  src=[6,7)  text="<"
```

## [char 7] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterListShape  pos=6  src=[6,...)
      ├─ Symbol  src=[6,7)  text="<"
      └─ Common  src=[7,8)  text="T"
```

## [char 8] `">"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TypeParameterShape  pos=7  src=[7,8)
      └─ IdentifierShape  pos=7  src=[7,8)  text="T"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Symbol  src=[10,11)  text="="
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"T"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   └─ Common  src=[12,13)  text="T"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,15)  text="e"
```

## [char 15] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,16)  text="ex"
```

## [char 16] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,17)  text="ext"
```

## [char 17] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,18)  text="exte"
```

## [char 18] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,19)  text="exten"
```

## [char 19] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,20)  text="extend"
```

## [char 20] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   ├─ WrapSymbol  src=[11,12)  text=" "
   ├─ Common  src=[12,13)  text="T"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ Common  src=[14,21)  text="extends"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"`"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
```

## [char 23] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         └─ ConstString  src=[23,24)  text="a"
```

## [char 24] `"$"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         └─ ConstString  src=[23,24)  text="a"
```

## [char 25] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
```

## [char 26] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            └─ Common  src=[26,27)  text="i"
```

## [char 27] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            └─ Common  src=[26,28)  text="in"
```

## [char 28] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            └─ Common  src=[26,29)  text="inf"
```

## [char 29] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            └─ Common  src=[26,30)  text="infe"
```

## [char 30] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            └─ Common  src=[26,31)  text="infer"
```

## [char 31] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            ├─ Common  src=[26,31)  text="infer"
            └─ WrapSymbol  src=[31,32)  text=" "
```

## [char 32] `"R"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,...)
            ├─ Common  src=[26,31)  text="infer"
            ├─ WrapSymbol  src=[31,32)  text=" "
            └─ Common  src=[32,33)  text="R"
```

## [char 33] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ WrapSymbol  src=[21,22)  text=" "
      └─ String  src=[22,...)
         ├─ ConstString  src=[23,24)  text="a"
         └─ InterpolationString  src=[25,34)
            ├─ Common  src=[26,31)  text="infer"
            ├─ WrapSymbol  src=[31,32)  text=" "
            └─ Common  src=[32,33)  text="R"
```

## [char 34] `"`"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      └─ TemplateLiteralTypeShape  pos=21  src=[22,35)
         ├─ TemplateHeadShape  pos=21  src=[22,26)
         └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
            ├─ InferTypeShape  pos=26  src=[26,33)
            │  └─ TypeParameterShape  pos=31  src=[32,33)
            │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
            └─ TemplateTailShape  pos=33  src=[33,35)
```

## [char 35] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      └─ WrapSymbol  src=[35,36)  text=" "
```

## [char 36] `"?"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ WrapSymbol  src=[35,36)  text=" "
      └─ Symbol  src=[36,37)  text="?"
```

## [char 37] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      └─ WrapSymbol  src=[37,38)  text=" "
```

## [char 38] `"R"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ WrapSymbol  src=[37,38)  text=" "
      └─ Common  src=[38,39)  text="R"
```

## [char 39] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ WrapSymbol  src=[37,38)  text=" "
      ├─ Common  src=[38,39)  text="R"
      └─ WrapSymbol  src=[39,40)  text=" "
```

## [char 40] `":"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ WrapSymbol  src=[37,38)  text=" "
      ├─ Common  src=[38,39)  text="R"
      ├─ WrapSymbol  src=[39,40)  text=" "
      └─ Symbol  src=[40,41)  text=":"
```

## [char 41] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      └─ WrapSymbol  src=[41,42)  text=" "
```

## [char 42] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,43)  text="n"
```

## [char 43] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,44)  text="ne"
```

## [char 44] `"v"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,45)  text="nev"
```

## [char 45] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,46)  text="neve"
```

## [char 46] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      ├─ WrapSymbol  src=[41,42)  text=" "
      └─ Common  src=[42,47)  text="never"
```

## [char 47] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Symbol  src=[10,11)  text="="
   └─ ConditionalTypeShape  pos=11  src=[12,...)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      ├─ NeverKeywordShape  pos=41  src=[42,47)  text="never"
      └─ WrapSymbol  src=[47,48)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,48)
└─ TypeAliasDeclarationShape  pos=0  src=[0,47)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ TypeParameterShape  pos=7  src=[7,8)
   │  └─ IdentifierShape  pos=7  src=[7,8)  text="T"
   └─ ConditionalTypeShape  pos=11  src=[12,47)
      ├─ TypeReferenceShape  pos=11  src=[12,13)
      │  └─ IdentifierShape  pos=11  src=[12,13)  text="T"
      ├─ TemplateLiteralTypeShape  pos=21  src=[22,35)
      │  ├─ TemplateHeadShape  pos=21  src=[22,26)
      │  └─ TemplateLiteralTypeSpanShape  pos=26  src=[26,35)
      │     ├─ InferTypeShape  pos=26  src=[26,33)
      │     │  └─ TypeParameterShape  pos=31  src=[32,33)
      │     │     └─ IdentifierShape  pos=31  src=[32,33)  text="R"
      │     └─ TemplateTailShape  pos=33  src=[33,35)
      ├─ TypeReferenceShape  pos=37  src=[38,39)
      │  └─ IdentifierShape  pos=37  src=[38,39)  text="R"
      └─ NeverKeywordShape  pos=41  src=[42,47)  text="never"
```
