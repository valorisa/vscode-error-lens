## 2.6.0 `15 Aug 2019`

- ✨ Ability to show only closest to the cursor problems (`errorLens.followCursor`).
- ✨ Ability to change active editor tab title background when file has Errors/Warnings (`errorLens.editorActiveTabDecorationEnabled`)

## 2.5.0 `11 Jul 2019`

- 💥 Deprecate enum setting `errorLens.fontStyle` in favor of boolean `errorLens.fontStyleItalic`
- 💥 Change default settings `errorLens.addAnnotationTextPrefixes` and `errorLens.margin`
- 🐛 Error decoration must always trump Warning etc: `ERROR` => `WARNING` => `INFO` => `HINT`
- ✨ New command to copy problem at active line number `errorLens.copyProblemMessage`

## 2.4.1 `11 Jul 2019`

- 🐛 Decorations stopped working in `settings.json` in **1.37**

## 2.4.0 `06 Jul 2019`

- ✨ New gutter icon set **`circle`**
- 💥 Change default colors for `INFO` & `HINT` diagnostics
- ✨ Any unset `light` color/path should default to ordinary one.
- ✨ Add commands to temporarily disable one level of diagnostic [Fixes #10](https://github.com/usernamehw/vscode-error-lens/issues/10)
- 💥 Deprecate: `errorLens.errorGutterIconPathLight`, `errorLens.warningGutterIconPathLight` and `errorLens.infoGutterIconPathLight`. They were moved into `errorLens.light`.

## 2.3.4 `22 Jun 2019`

- ✨ Add an option to choose if the decorations should be cleared when you start typing (only when `delay` is set) – `errorLens.clearDecorations`.

## 2.3.3 `09 Jun 2019`

- 🔨 Update dependencies

## 2.3.2 `07 Jun 2019`

- ✨ Set custom gutter icons (Using absolute file path).

## 2.3.1 `02 Jun 2019`

- ✨ Configure gutter icon size with: `errorLens.gutterIconSize`
- ✨ Configure gutter icons to be borderless with `errorLens.gutterIconSet`: [PR #6](https://github.com/usernamehw/vscode-error-lens/pull/6) by [karlsander](https://github.com/karlsander)

## 2.3.0 `01 Jun 2019`

- ✨ Add an option to render gutter icons `errorLens.gutterIconsEnabled`
- 🔨 Increase limit for long messages truncation from 300 to 500 symbols

## 2.2.3 `25 May 2019`

- ✨ Draw decorations in `Untitled` files
- 📚 Add an example of `exclude` setting to README
- 🔨 Move `exclude` RegExp creation out of the loop

## 2.2.2 `24 May 2019`

- 🐛 Different fix for decorations not rendered the first time with `errorLens.onSave`

## 2.2.1 `24 May 2019`

- 🐛 Fix failed to update decorations (on save) when language diagnostics haven't changed

## 2.2.0 `23 May 2019`

- ✨ Update decorations only on document save with `errorLens.onSave`

## 2.1.1 `22 May 2019`

- ✨ Change font family with `errorLens.fontFamily`

## 2.1.0 `21 May 2019`

- ✨ Customize delay before showing problems with `errorLens.delay`

## 2.0.4 `19 May 2019`

- ✨ Allow to set colors for light themes separately with the setting `errorLens.light`

## 2.0.3 `19 May 2019`

- 🐛 Fix disposing decorations when settings change from Settings GUI

## 2.0.2 `18 May 2019`

- ✨ Customize font size of messages with `errorLens.fontSize`
- 🐛 Toggle ErrorLens command should update decorations for all visible editors

## 2.0.1 `18 May 2019`

- ✨ Update decorations for all visible editors (split/grid)
- 🐛 Additionally dispose decorations when settings change

## 2.0.0 `18 May 2019`

- ✨ Support excluding some of the problems with the setting `errorLens.exclude`
- ✨ Hot reload of all Settings
- 💥 Toggle extension with one command `errorLens.toggle` instead of two
- 💥 Rename colors to have `background` & `foreground` suffix
- 💥 Remove statusbar entry completely
- 💥 Change default values (colors, fontStyle)
- 💥 Experimental: remove `onDidOpenTextDocument` event listener
- 🔨 Minor fixes like more specific types for Setting values
- 🔨 Use webpack

# Fork happened

