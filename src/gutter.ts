import { isSeverityEnabled } from 'src/decorations';
import { extensionConfig, Global } from 'src/extension';
import { AggregatedByLineDiagnostics, Gutter } from 'src/types';
import { svgToUri } from 'src/utils';
import { DecorationOptions, ExtensionContext, TextEditor } from 'vscode';
/**
 * Set some defaults for gutter styles and return it.
 */
export function getGutterStyles(extensionContext: ExtensionContext): Gutter {
	const gutter: Gutter = Object.create(null);
	gutter.iconSet = extensionConfig.gutterIconSet;

	if (extensionConfig.gutterIconSet === 'circle') {
		gutter.errorIconPath = svgToUri(createCircleIcon(extensionConfig.errorGutterIconColor));
		gutter.errorIconPathLight = svgToUri(createCircleIcon(extensionConfig.light.errorGutterIconColor || extensionConfig.errorGutterIconColor));
		gutter.warningIconPath = svgToUri(createCircleIcon(extensionConfig.warningGutterIconColor));
		gutter.warningIconPathLight = svgToUri(createCircleIcon(extensionConfig.light.warningGutterIconColor || extensionConfig.warningGutterIconColor));
		gutter.infoIconPath = svgToUri(createCircleIcon(extensionConfig.infoGutterIconColor));
		gutter.infoIconPathLight = svgToUri(createCircleIcon(extensionConfig.light.infoGutterIconColor || extensionConfig.infoGutterIconColor));
	} else {
		gutter.errorIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-dark.svg`);
		gutter.errorIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-light.svg`);
		gutter.warningIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-dark.svg`);
		gutter.warningIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-light.svg`);
		gutter.infoIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-dark.svg`);
		gutter.infoIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-light.svg`);
	}
	// ──── User specified custom gutter path ─────────────────────
	if (extensionConfig.errorGutterIconPath) {
		gutter.errorIconPath = extensionConfig.errorGutterIconPath;
	}
	if (extensionConfig.light.errorGutterIconPath || extensionConfig.errorGutterIconPath) {
		gutter.errorIconPathLight = extensionConfig.light.errorGutterIconPath || extensionConfig.errorGutterIconPath;
	}
	if (extensionConfig.warningGutterIconPath) {
		gutter.warningIconPath = extensionConfig.warningGutterIconPath;
	}
	if (extensionConfig.light.warningGutterIconPath || extensionConfig.warningGutterIconPath) {
		gutter.warningIconPathLight = extensionConfig.light.warningGutterIconColor || extensionConfig.warningGutterIconPath;
	}
	if (extensionConfig.infoGutterIconPath) {
		gutter.infoIconPath = extensionConfig.infoGutterIconPath;
	}
	if (extensionConfig.light.infoGutterIconPath || extensionConfig.infoGutterIconPath) {
		gutter.infoIconPathLight = extensionConfig.light.infoGutterIconColor || extensionConfig.infoGutterIconPath;
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
