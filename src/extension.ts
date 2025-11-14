// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ScriptNode } from './nodes';
import { NpmScriptsProvider } from './npmScriptsProvider';
import { NpmTerminalManager } from './npmTerminalManager';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "npm-script-runner" is now active.');

	const provider = new NpmScriptsProvider(context);
	const terminalManager = new NpmTerminalManager();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('npmScriptRunner.scripts', provider),
		vscode.commands.registerCommand('npm-script-runner.refreshScripts', () => {
			provider.refresh();
		}),
		vscode.commands.registerCommand('npm-script-runner.runScript', (node: ScriptNode) => {
			if (node instanceof ScriptNode) {
				terminalManager.runScript(node);
			}
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
