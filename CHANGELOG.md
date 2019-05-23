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

- ✨ Update decorations for all visible editors
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

---

# Fork happened

---

## 1.1.3 `24 Feb 2019`

- Various minor fixes.
- Remove superfluous `console.log()` calls.
- Truncate very long messages.

## 1.1.2 `14 Feb 2019`

- Fix for <https://github.com/phindle/error-lens/issues/15>. Diagnostic highlights are now shown on the whole line again.

## 1.1.0 `Feb 2019`

- This release contains some new features and fixes some bugs.
- Additional font weight options. (Thank you to Oleg Orlov for the PR).
- Changes to the ErrorLens settings will be reloaded without restarting VS Code. (Hot reload).
- Implement the ability to configure which diagnostic levels are shown (Addresses issue #1: <https://github.com/phindle/error-lens/issues/1>).
  Configured via `errorlens.enabledDiagnosticLevels` in the settings.

  The default setting is to show all diagnostics, i.e. `errorlens.enabledDiagnosticLevels = [ "error", "warning", "info", "hint" ]`

  If you wanted to show only errors for example, use this setting: `errorlens.enabledDiagnosticLevels = [ "error" ]`

- Implement configurable text and background colours, per diagnostic type, which may override the default values.
  This addresses issue #4 (<https://github.com/phindle/error-lens/issues/4>).
  For example, to configure the background and text colour for errors:

```javascript
"errorLens.errorBackground": {
  "type": "string",
  "default": "rgba(240,10,0,0.3)",
  "description": "The background color used to highlight lines containing errors. (Alpha is used)"
},
"errorLens.errorForeground": {
  "type": "string",
  "default": "rgba(240,240,240,1.0)",
  "description": "The text color used to highlight lines containing errors. (Alpha is used)"
},
```

- More responsive when switching between tabs and editors. (Fix for <https://github.com/phindle/error-lens/issues/8>)

- Added a configuration property (`errorLens.statusBarControl`) which controls when ErrorLens status bar info is shown.
 One of 3 options: (1) always show, (2) never show or (3) only show when there are any warnings or errors.
 This addresses issue #11: <https://github.com/phindle/error-lens/issues/11>.

- Added a configuration property (`errorLens.addAnnotationTextPrefixes`) which controls whether to prefix diagnostic severity to the ErrorLens annotations. (Implements <https://github.com/phindle/error-lens/issues/9>).

- Added command to enable and disable ErrorLens on-demand. Implements request <https://github.com/phindle/error-lens/issues/3>.
 2 commands are available from the command palette: _Enable ErrorLens_ and _Disable ErrorLens_.
 These commands do not have any default keyboard bindings.

## 1.0.0 `Oct 2019`

- Initial release
