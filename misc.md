## Upstream issues

Please upvote the following VS Code issues:

* [Allow extensions to publish beta releases and users to opt-in to them #15756](https://github.com/microsoft/vscode/issues/15756)
* [[theming] when completing color keys in settings, fill in current value #25633](https://github.com/microsoft/vscode/issues/25633)
* [Support more CSS for decorations before/after properties: border-radius, padding, border-width #68845](https://github.com/Microsoft/vscode/issues/68845)
* [OnClick event on Gutter #5455](https://github.com/microsoft/vscode/issues/5455)
* [Decorations with gutter icons hide breakpoint icons #5923](https://github.com/microsoft/vscode/issues/5923)
* [Decorations: Show decorations in tabs #49382](https://github.com/Microsoft/vscode/issues/49382)

## `editorActiveTabDecorationEnabled` setting

This setting is undocumented and not recommended due to limitations: https://github.com/usernamehw/vscode-error-lens/issues/18#issuecomment-521758711.

## How to build

* Run from command line `npm run watch` or `yarn watch`.
* Start debugging: **Debug: Start Debugging** `workbench.action.debug.start`

To package: run from command line: `npm run vscode:prepublish`
