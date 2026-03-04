# Ekon Benefits' fork of Antonino Perricone's extension for visual studio code for Harbour and xHarbour programming languages

[![Version](https://vsmarketplacebadges.dev/version-short/ekon.harbour-full.svg)](https://marketplace.visualstudio.com/items?itemName=ekon.harbour-full)
[![Installs](https://vsmarketplacebadges.dev/installs-short/ekon.harbour-full.svg)](https://marketplace.visualstudio.com/items?itemName=ekon.harbour-full)
[![Ratings](https://vsmarketplacebadges.dev/rating-short/ekon.harbour-full.svg)](https://marketplace.visualstudio.com/items?itemName=ekon.harbour-full)

## Features
- [syntax highlight](https://github.com/ekonbenefits/harbourCodeExtension/wiki/Syntax-highlight), with [Edgard Lorraine Messias](https://github.com/edgardmessias)
- [Debug support](https://github.com/ekonbenefits/harbourCodeExtension/wiki/Debugger)
- [Diagnostic infos](https://github.com/ekonbenefits/harbourCodeExtension/wiki/Diagnostics-Lint)
- Symbol Definitions Within a Document provider (access it by pressing <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>O</kbd> or <kbd>CTRL</kbd>+<kbd>P</kbd> then <kbd>@</kbd>)
- Symbol Definitions in workspace provider (access it by pressing <kbd>CTRL</kbd>+<kbd>T</kbd> or <kbd>CTRL</kbd>+<kbd>P</kbd> then <kbd>#</kbd>)

## Documentation links
See the [wiki](https://github.com/ekonbenefits/harbourCodeExtension/wiki) for more information.
An introdution for harbour developers can be found in these articles:
- [Harbour Wiki - Developing and Debugging Harbour Programs with VSCODE](https://harbour.wiki/index.asp?page=PublicArticles&mode=show&id=190401174818&sig=6893630672) by Eric Lendvai
- [Harbour magazine - Visual Studio Code for Harbour](https://medium.com/harbour-magazine/visual-studio-code-for-harbour-e148f9c1861a) by José Luis Sánchez ([available in spanish too](https://medium.com/harbour-magazine/visual-studio-code-para-harbour-85b0646ff312))

## Requirements
Sometime is necessary to set `ekonHarbour.compilerExecutable` with complete path.

## Side-by-side with upstream extension
This fork is designed to be installed together with the original extension.

- Extension id: `ekon.harbour-full`
- Fork commands: `ekon.harbour.getDbgCode`, `ekon.harbour.setupCodeFormat`, `ekon.harbour.debugList`
- Fork debug type: `ekon-harbour-dbg`
- Fork task types: `EkonHarbour`, `EkonHBMK2`

Language id remains `harbour` for compatibility with `.prg/.ch/.hbx/.hb` files.

## Extension Settings
This extension contributes the following settings:

* `ekonHarbour.validating`: enable/disable the validation every open and save of harbour files.
* `ekonHarbour.compilerExecutable`: sometime is necessary to set the path of the harbour executable to make validation works.
* `ekonHarbour.extraIncludePaths`: add path where found the includes to avoid "file not found" error.
* `ekonHarbour.extraOptions`: other options to pass to harbour compiler.
* `ekonHarbour.warningLevel`: sets the warning level for validation.
* `ekonHarbour.decorator`: if true enables the feature of decoration of correspondents if/endif, for/next, while/endwhile, etc etc
* `ekonHarbour.features.languageServer`: if false disables LSP features from this extension (completion, symbols, formatting, navigation).
* `ekonHarbour.features.validation`: if false disables lint/diagnostics from this extension.
* `ekonHarbour.features.decorator`: if false disables block pair decoration from this extension.

### Migration from old settings
On first activation, this fork copies legacy `harbour.*` values into `ekonHarbour.*` (without overwriting existing `ekonHarbour.*` values).

On first activation, this fork can also detect legacy `.vscode/launch.json` and `.vscode/tasks.json` entries and offer automatic migration to Ekon ids.
When accepted, original files are preserved as `.bak` backups.

You can also run migration manually at any time with command:
`Ekon Harbour: Migrate legacy launch/tasks`.

### Coexistence tip
If both upstream and this fork are installed, use `ekonHarbour.features.*` to disable overlapping providers in one extension so results stay predictable.

## How to use the debugger<a name="DEBUG"></a>
You can use the command "Harbour: Get debugger code" to get the source of the debbugger, save it to a file naming it as you like, for example dbg_lib-prg. You can include this file in your project or **BETTER** create a library with this file to link in your project.

> NOTE: don't forget to compile harbour file with debug information ***-b***

### **IT IS STRONGLY RECOMMENDED TO UPDATE THE FILES EVERY EXTENSION VERSION**

## Known Issues

