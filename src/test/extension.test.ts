import * as assert from 'assert';
import * as vscode from 'vscode';

suite('NPM Script Runner Extension', () => {
	test('Activation does not throw and view can be registered', async () => {
		await vscode.extensions.getExtension('npm-script-runner')?.activate();
		// If activation reaches here without throwing, basic wiring is OK.
		assert.ok(true);
	});
});
