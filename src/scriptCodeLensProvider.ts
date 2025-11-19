import * as vscode from 'vscode';

export class ScriptCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	constructor() {
		// Listen for configuration changes to refresh CodeLenses
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('npm-script-run.enableCodeLens')) {
				this._onDidChangeCodeLenses.fire();
			}
		});
	}

	public provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		const config = vscode.workspace.getConfiguration('npm-script-run');
		const enableCodeLens = config.get<boolean>('enableCodeLens', true);

		if (!enableCodeLens) {
			return [];
		}

		// Only provide CodeLenses for package.json files
		if (!document.fileName.endsWith('package.json')) {
			return [];
		}

		const codeLenses: vscode.CodeLens[] = [];

		try {
			const text = document.getText();
			const packageJson = JSON.parse(text);

			if (!packageJson.scripts || typeof packageJson.scripts !== 'object') {
				return [];
			}

			// Find the "scripts" section in the document
			const scriptsMatch = text.match(/"scripts"\s*:\s*\{/);
			if (!scriptsMatch || scriptsMatch.index === undefined) {
				return [];
			}

			const scriptsStartLine = document.positionAt(scriptsMatch.index).line;
			
			// Parse each script and create CodeLens
			for (const scriptName in packageJson.scripts) {
				// Find the line where this script is defined
				const scriptPattern = new RegExp(`"${this.escapeRegExp(scriptName)}"\\s*:\\s*"`, 'g');
				const scriptMatch = scriptPattern.exec(text);
				
				if (scriptMatch && scriptMatch.index !== undefined) {
					const scriptLine = document.positionAt(scriptMatch.index).line;
					
					// Only add CodeLens if this script is within the scripts section
					if (scriptLine > scriptsStartLine) {
						const range = new vscode.Range(
							new vscode.Position(scriptLine, 0),
							new vscode.Position(scriptLine, 0)
						);

						const command: vscode.Command = {
							title: `$(play) Run ${scriptName}`,
							command: 'npm-script-run.runScriptFromCodeLens',
							arguments: [scriptName, document.uri]
						};

						codeLenses.push(new vscode.CodeLens(range, command));
					}
				}
			}
		} catch (error) {
			// Invalid JSON or other parsing error - don't provide CodeLenses
			return [];
		}

		return codeLenses;
	}

	private escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}
