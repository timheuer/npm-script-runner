import * as vscode from 'vscode';
import { Logger, createLoggerFromConfig } from '@timheuer/vscode-ext-logger';

let logger: Logger | undefined;

/**
 * Initialize the extension logger with VS Code integration and automatic config monitoring.
 * @param context The VS Code extension context
 * @returns The initialized logger instance
 */
export function initializeLogger(context: vscode.ExtensionContext): Logger {
	logger = createLoggerFromConfig(
		context.extension.packageJSON.displayName, // Logger name from extension
		'npmscriptrunner',                         // Config section
		'logLevel',                                // Config key
		'info',                                    // Default level
		true,                                      // Enable output channel
		context,                                   // Extension context for cleanup
		true                                       // Enable automatic config monitoring
	);
	
	return logger;
}

/**
 * Get the current logger instance.
 * @returns The logger instance, or throws if not initialized
 */
export function getLogger(): Logger {
	if (!logger) {
		throw new Error('Logger not initialized. Call initializeLogger first.');
	}
	return logger;
}
