## Upstream issues

Please upvote the following VS Code issues:

* [Allow extensions to publish beta releases and users to opt-in to them #15756](https://github.com/microsoft/vscode/issues/15756)
* [[theming] when completing color keys in settings, fill in current value #25633](https://github.com/microsoft/vscode/issues/25633)
* [Support more CSS for decorations before/after properties: border-radius, padding, border-width #68845](https://github.com/Microsoft/vscode/issues/68845)
* [OnClick event on Gutter #5455](https://github.com/microsoft/vscode/issues/5455)
* [Decorations with gutter icons hide breakpoint icons #5923](https://github.com/microsoft/vscode/issues/5923)
* [Decorations: Show decorations in tabs #49382](https://github.com/Microsoft/vscode/issues/49382)

# I want to see only gutter icons

It's possible to make decorations transparent
> The light version should default to dark, but until [this issue](https://github.com/microsoft/vscode/issues/32813) is not moved out of "proposed" to "stable" api you need to specify both

```js
"workbench.colorCustomizations": {
    "errorLens.errorForeground": "#fff0",
    "errorLens.warningForeground": "#fff0",
    "errorLens.infoForeground": "#fff0",
    "errorLens.hintForeground": "#fff0",
    "errorLens.errorBackground": "#fff0",
    "errorLens.warningBackground": "#fff0",
    "errorLens.infoBackground": "#fff0",
	"errorLens.hintBackground": "#fff0",

    "errorLens.errorForegroundLight": "#fff0",
    "errorLens.warningForegroundLight": "#fff0",
    "errorLens.infoForegroundLight": "#fff0",
    "errorLens.hintForegroundLight": "#fff0",
    "errorLens.errorBackgroundLight": "#fff0",
    "errorLens.warningBackgroundLight": "#fff0",
    "errorLens.infoBackgroundLight": "#fff0",
    "errorLens.hintBackgroundLight": "#fff0",
}
```

## How to build

* Run from command line `npm run watch` or `yarn watch`.
* Start debugging: **Debug: Start Debugging** `workbench.action.debug.start`

To package: run from command line: `npm run vscode:prepublish`
