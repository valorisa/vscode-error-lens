import { isSeverityEnabled } from 'src/decorations';
import { $config, Global } from 'src/extension';
import { AggregatedByLineDiagnostics, Gutter } from 'src/types';
import { svgToUri } from 'src/utils';
import { DecorationOptions, ExtensionContext, TextEditor } from 'vscode';
/**
 * Set some defaults for gutter styles and return it.
 */
export function getGutterStyles(extensionContext: ExtensionContext): Gutter {
	const gutter: Gutter = Object.create(null);
	gutter.iconSet = $config.gutterIconSet;

	if ($config.gutterIconSet === 'circle') {
		gutter.errorIconPath = svgToUri(createCircleIcon($config.errorGutterIconColor));
		gutter.errorIconPathLight = svgToUri(createCircleIcon($config.light.errorGutterIconColor || $config.errorGutterIconColor));
		gutter.warningIconPath = svgToUri(createCircleIcon($config.warningGutterIconColor));
		gutter.warningIconPathLight = svgToUri(createCircleIcon($config.light.warningGutterIconColor || $config.warningGutterIconColor));
		gutter.infoIconPath = svgToUri(createCircleIcon($config.infoGutterIconColor));
		gutter.infoIconPathLight = svgToUri(createCircleIcon($config.light.infoGutterIconColor || $config.infoGutterIconColor));
	} else {
		gutter.errorIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-dark.svg`);
		gutter.errorIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-light.svg`);
		gutter.warningIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-dark.svg`);
		gutter.warningIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-light.svg`);
		gutter.infoIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-dark.svg`);
		gutter.infoIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-light.svg`);
	}
	// ──── User specified custom gutter path ─────────────────────
	if ($config.errorGutterIconPath) {
		gutter.errorIconPath = $config.errorGutterIconPath;
	}
	if ($config.light.errorGutterIconPath || $config.errorGutterIconPath) {
		gutter.errorIconPathLight = $config.light.errorGutterIconPath || $config.errorGutterIconPath;
	}
	if ($config.warningGutterIconPath) {
		gutter.warningIconPath = $config.warningGutterIconPath;
	}
	if ($config.light.warningGutterIconPath || $config.warningGutterIconPath) {
		gutter.warningIconPathLight = $config.light.warningGutterIconColor || $config.warningGutterIconPath;
	}
	if ($config.infoGutterIconPath) {
		gutter.infoIconPath = $config.infoGutterIconPath;
	}
	if ($config.light.infoGutterIconPath || $config.infoGutterIconPath) {
		gutter.infoIconPathLight = $config.light.infoGutterIconColor || $config.infoGutterIconPath;
	}

	return gutter;
}

/**
 * Actually apply gutter decorations.
 */
export function doUpdateGutterDecorations(editor: TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics) {
	const decorationOptionsGutterError: DecorationOptions[] = [];
	const decorationOptionsGutterWarning: DecorationOptions[] = [];
	const decorationOptionsGutterInfo: DecorationOptions[] = [];

	for (const key in aggregatedDiagnostics) {
		const aggregatedDiagnostic = aggregatedDiagnostics[key].sort((a, b) => a.severity - b.severity);
		const diagnostic = aggregatedDiagnostic[0];
		const severity = diagnostic.severity;

		if (isSeverityEnabled(severity)) {
			const diagnosticDecorationOptions: DecorationOptions = {
				range: diagnostic.range,
			};
			switch (severity) {
				case 0: decorationOptionsGutterError.push(diagnosticDecorationOptions); break;
				case 1: decorationOptionsGutterWarning.push(diagnosticDecorationOptions); break;
				case 2: decorationOptionsGutterInfo.push(diagnosticDecorationOptions); break;
			}
		}
	}
	editor.setDecorations(Global.decorationTypeGutterError, decorationOptionsGutterError);
	editor.setDecorations(Global.decorationTypeGutterWarning, decorationOptionsGutterWarning);
	editor.setDecorations(Global.decorationTypeGutterInfo, decorationOptionsGutterInfo);
}
/**
 * Create circle gutter icons with different colors. `%23` is encoded `#` sign (need it to work).
 */
function createCircleIcon(color: string) {
	return `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="%23${color.slice(1)}"/></svg>`;
}
