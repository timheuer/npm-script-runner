// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ScriptNode, PackageNode } from './nodes';
import { NpmScriptsProvider } from './npmScriptsProvider';
import { NpmTerminalManager } from './npmTerminalManager';
import { ScriptCodeLensProvider } from './scriptCodeLensProvider';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "npm-script-runner" is now active.');

	const provider = new NpmScriptsProvider(context);
	const terminalManager = new NpmTerminalManager();
	const codeLensProvider = new ScriptCodeLensProvider();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('npmScriptRunner.scripts', provider),
		vscode.languages.registerCodeLensProvider(
			{ language: 'json', pattern: '**/package.json' },
			codeLensProvider
		),
		vscode.commands.registerCommand('npm-script-run.refreshScripts', () => {
			provider.refresh();
		}),
		vscode.commands.registerCommand('npm-script-run.runScript', (node: ScriptNode) => {
			if (node instanceof ScriptNode) {
				terminalManager.runScript(node);
			}
		}),
		vscode.commands.registerCommand('npm-script-run.runScriptFromCodeLens', async (scriptName: string, packageUri: vscode.Uri) => {
			// Find the workspace folder for this package.json
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(packageUri);
			
			// Create a PackageNode and ScriptNode to reuse the terminal manager
			const packageNode = new PackageNode(
				packageUri,
				workspaceFolder?.name || packageUri.fsPath,
				workspaceFolder
			);
			
			const scriptNode = new ScriptNode(scriptName, '', packageNode);
			terminalManager.runScript(scriptNode);
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
