import { decorationTypes } from 'src/decorations';
import { $config } from 'src/extension';
import { type ExtensionConfig } from 'src/types';
import { extUtils, type GroupedByLineDiagnostics } from 'src/utils/extUtils';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { type DecorationOptions, type ExtensionContext, type TextEditor, type Uri } from 'vscode';

export interface Gutter {
	iconSet: ExtensionConfig['gutterIconSet'];

	errorIconPath: Uri | string;
	errorIconPathLight: Uri | string;

	warningIconPath: Uri | string;
	warningIconPathLight: Uri | string;

	infoIconPath: Uri | string;
	infoIconPathLight: Uri | string;

	hintIconPath: Uri | string | undefined;
	hintIconPathLight: Uri | string | undefined;
}

/**
 * Set some defaults for gutter styles and return it.
 */
export function getGutterStyles(extensionContext: ExtensionContext): Gutter {
	const gutter: Partial<Gutter> = {};

	gutter.iconSet = $config.gutterIconSet;

	if ($config.gutterIconSet === 'circle') {
		gutter.errorIconPath = vscodeUtils.svgToUri(createCircleIcon($config.errorGutterIconColor));
		gutter.errorIconPathLight = vscodeUtils.svgToUri(createCircleIcon($config.light.errorGutterIconColor || $config.errorGutterIconColor));
		gutter.warningIconPath = vscodeUtils.svgToUri(createCircleIcon($config.warningGutterIconColor));
		gutter.warningIconPathLight = vscodeUtils.svgToUri(createCircleIcon($config.light.warningGutterIconColor || $config.warningGutterIconColor));
		gutter.infoIconPath = vscodeUtils.svgToUri(createCircleIcon($config.infoGutterIconColor));
		gutter.infoIconPathLight = vscodeUtils.svgToUri(createCircleIcon($config.light.infoGutterIconColor || $config.infoGutterIconColor));
		gutter.hintIconPath = vscodeUtils.svgToUri(createCircleIcon($config.hintGutterIconColor));
		gutter.hintIconPathLight = vscodeUtils.svgToUri(createCircleIcon($config.light.hintGutterIconPath || $config.hintGutterIconColor));
	} else if ($config.gutterIconSet === 'square') {
		gutter.errorIconPath = vscodeUtils.svgToUri(createSquareIcon($config.errorGutterIconColor));
		gutter.errorIconPathLight = vscodeUtils.svgToUri(createSquareIcon($config.light.errorGutterIconColor || $config.errorGutterIconColor));
		gutter.warningIconPath = vscodeUtils.svgToUri(createSquareIcon($config.warningGutterIconColor));
		gutter.warningIconPathLight = vscodeUtils.svgToUri(createSquareIcon($config.light.warningGutterIconColor || $config.warningGutterIconColor));
		gutter.infoIconPath = vscodeUtils.svgToUri(createSquareIcon($config.infoGutterIconColor));
		gutter.infoIconPathLight = vscodeUtils.svgToUri(createSquareIcon($config.light.infoGutterIconColor || $config.infoGutterIconColor));
		gutter.hintIconPath = vscodeUtils.svgToUri(createSquareIcon($config.hintGutterIconColor));
		gutter.hintIconPathLight = vscodeUtils.svgToUri(createSquareIcon($config.light.hintGutterIconPath || $config.hintGutterIconColor));
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
	if ($config.hintGutterIconPath) {
		gutter.hintIconPath = $config.hintGutterIconPath;
	}
	if ($config.light.hintGutterIconPath || $config.hintGutterIconPath) {
		gutter.hintIconPathLight = $config.light.hintGutterIconColor || $config.hintGutterIconPath;
	}

	return {
		errorIconPath: gutter.errorIconPath,
		errorIconPathLight: gutter.errorIconPathLight,
		warningIconPath: gutter.warningIconPath,
		warningIconPathLight: gutter.warningIconPathLight,
		infoIconPath: gutter.infoIconPath,
		infoIconPathLight: gutter.infoIconPathLight,
		hintIconPath: gutter.hintIconPath,
		hintIconPathLight: gutter.hintIconPathLight,
		iconSet: gutter.iconSet,
	};
}

/**
 * Actually apply gutter decorations.
 */
export function doUpdateGutterDecorations(editor: TextEditor, groupedDiagnostics: GroupedByLineDiagnostics): void {
	const decorationOptionsGutterError: DecorationOptions[] = [];
	const decorationOptionsGutterWarning: DecorationOptions[] = [];
	const decorationOptionsGutterInfo: DecorationOptions[] = [];
	const decorationOptionsGutterHint: DecorationOptions[] = [];

	for (const key in groupedDiagnostics) {
		const groupedDiagnostic = groupedDiagnostics[key].sort((a, b) => a.severity - b.severity);
		const diagnostic = groupedDiagnostic[0];
		const severity = diagnostic.severity;

		if (!extUtils.isSeverityEnabled(severity)) {
			continue;
		}

		const diagnosticDecorationOptions: DecorationOptions = {
			range: diagnostic.range,
		};

		switch (severity) {
			case 0: {
				decorationOptionsGutterError.push(diagnosticDecorationOptions);
				break;
			}
			case 1: {
				decorationOptionsGutterWarning.push(diagnosticDecorationOptions);
				break;
			}
			case 2: {
				decorationOptionsGutterInfo.push(diagnosticDecorationOptions);
				break;
			}
			case 3: {
				if ($config.gutterIconSet === 'circle' ||
					$config.gutterIconSet === 'square') {
					decorationOptionsGutterHint.push(diagnosticDecorationOptions);
				}
				break;
			}
			default: {}
		}
	}

	editor.setDecorations(decorationTypes.decorationTypeGutterError, decorationOptionsGutterError);
	editor.setDecorations(decorationTypes.decorationTypeGutterWarning, decorationOptionsGutterWarning);
	editor.setDecorations(decorationTypes.decorationTypeGutterInfo, decorationOptionsGutterInfo);
	editor.setDecorations(decorationTypes.decorationTypeGutterHint, decorationOptionsGutterHint);
}
/**
 * Create circle gutter icons with different colors. `%23` is encoded `#` sign (need it to work).
 */
function createCircleIcon(color: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="7" fill="%23${color.slice(1)}"/></svg>`;
}
/**
 * Create circle gutter icons with different colors. `%23` is encoded `#` sign (need it to work).
 */
function createSquareIcon(color: string): string {
	return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" height="40" width="40"><g transform="translate(12, 12)"><rect width="16" height="16" fill="%23${color.slice(1)}"/></g></svg>`;
}
