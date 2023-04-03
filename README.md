# adapt-contrib-modifiers

An extension to manage a collection of modifier sets used throughout the content. In addition to managing registered sets, this plugin provides the abstract modifier set logic from which other plugins can extend to create new sets.

## Modifier sets

A modifier set consists of a collection of models for which changes to modifying attributes are observed and managed, to control their `_isAvailable` property.

Each plugin will register a set type with the API, and identify its parent-child model relationship, along with any extended functionality specific to that plugin. Examples of modifiers include [banking](https://github.com/adaptlearning/adapt-contrib-banking) and [randomise](https://github.com/adaptlearning/adapt-contrib-randomise).

If the config or associated child models are changed in a way which affects the modifier, the parent model is reset as the content will be refreshed and needs to be retaken.

## Usage

Plugins can extend the [ModifierSet](https://github.com/adaptlearning/adapt-contrib-modifiers/blob/master/js/ModifierSet.js) by importing the set as required:
```JavaScript
  import ModifierSet from 'extensions/adapt-contrib-modifiers/js/ModifierSet';
```

----------------------------
**Version number:** 1.0.0<br>
**Framework versions:** >=5.28.8<br>
**Author / maintainer:** Adapt Core Team with [contributors](https://github.com/adaptlearning/adapt-contrib-modifiers/graphs/contributors)
