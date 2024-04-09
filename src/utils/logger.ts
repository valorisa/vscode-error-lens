import { $config } from 'src/extension';
import { LogLevel, type LogOutputChannel, window } from 'vscode';

/**
 * Logger - Log a message to the `Error Lens Debug` output channel. Supports a lambda for lazy evaluation.
 * 
 * Note: if any decorators are listening to changes to output windows, this causes looping event cycles
 */
export class Logger {
	private logWindow: LogOutputChannel | undefined;
	
	constructor() {
		this.logWindow = undefined;
	}

	public isLoggingEnabled(): boolean {
		return $config.debugLogEnabled;
	}

	public dispose(): void {
		this.logWindow?.dispose();
		this.logWindow = undefined;
	}

	public trace(message: string | (()=> string)): void {
		this.log(LogLevel.Trace, message);
	}
	    
	public info(message: string | (()=> string)): void {
		this.log(LogLevel.Info, message);
	}	

	public warn(message: string | (()=> string)): void {
		this.log(LogLevel.Warning, message);
	}

	public error(message: string | (()=> string)): void {
		this.log(LogLevel.Error, message);
	}

	private log(logLevel: LogLevel, message: string | (()=> string)): void {
		if (this.isLoggingEnabled()) {
			if (!this.logWindow) {				
				this.logWindow = window.createOutputChannel('Error Lens Debug', { log: true });
			}
			const messageText = (typeof message === 'function') ? message() : message;
			switch (logLevel) {
				case LogLevel.Info:
					this.logWindow.info(messageText);
					break;
				case LogLevel.Warning:
					this.logWindow.warn(messageText);
					break;
				case LogLevel.Error:
					this.logWindow.error(messageText);
					break;
				case LogLevel.Trace:
					this.logWindow.error(messageText);
					break;
				default:
					this.logWindow.info(messageText);
					break;
			}
		}
	}
}
