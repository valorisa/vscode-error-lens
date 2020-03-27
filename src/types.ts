import type * as vscode from 'vscode';

export interface IConfig {
	light: {
		errorGutterIconPath?: string;
		warningGutterIconPath?: string;
		infoGutterIconPath?: string;

		errorGutterIconColor: string;
		warningGutterIconColor: string;
		infoGutterIconColor: string;
	};

	fontFamily: string;
	fontWeight: string;
	fontSize: string;
	fontStyleItalic: boolean;

	margin: string;
	padding: string;
	borderRadius: string;
	enabledDiagnosticLevels: string[];
	annotationPrefix: string[];
	addAnnotationTextPrefixes: boolean;
	addNumberOfDiagnostics: boolean;
	exclude: string[];

	statusBarMessageEnabled: boolean;
	statusBarMessageType: 'activeLine' | 'closestProblem';

	delay?: number;

	followCursor: FollowCursor;
	followCursorMore: number;

	onSave: boolean;

	gutterIconsEnabled: boolean;
	gutterIconSize: string;
	gutterIconSet: GutterIconSet;

	errorGutterIconPath?: string;
	warningGutterIconPath?: string;
	infoGutterIconPath?: string;

	errorGutterIconColor: string;
	warningGutterIconColor: string;
	infoGutterIconColor: string;
}

export type GutterIconSet = 'default' | 'defaultOutline' | 'borderless' | 'circle';
export type FollowCursor = 'allLines' | 'activeLine' | 'closestProblem';

export interface IAggregatedByLineDiagnostics {
	[lineNumber: string]: vscode.Diagnostic[];
}

export interface ISomeDiagnostics {
	[stringUri: string]: IInnerDiag;
}
export interface IInnerDiag {
	[lnmessage: string]: vscode.Diagnostic;
}

export interface IGutter {
	iconSet: GutterIconSet;

	errorIconPath: string;
	errorIconPathLight: string;

	warningIconPath: string;
	warningIconPathLight: string;

	infoIconPath: string;
	infoIconPathLight: string;
}
