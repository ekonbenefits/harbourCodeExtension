const vscode = require('vscode');
const path = require('path');
const client = require('vscode-languageclient');
const fs = require("fs");
const validation = require('./validation.js');
const decorator = require('./decorator.js');
const docCreator = require('./docCreator.js');
const taskProvider = require('./taskProvider.js');
const net = require("net");
const formatEditor = require("./formatEditor.js");

const SETTINGS_MIGRATION_KEY = "ekonHarbour.settingsMigration.v1";
const LEGACY_CONFIG_PROMPT_KEY = "ekonHarbour.legacyConfigPrompt.v1";
const SETTINGS_TO_MIGRATE = [
	"validating",
	"compilerExecutable",
	"extraOptions",
	"extraIncludePaths",
	"warningLevel",
	"decorator",
	"workspaceDepth",
	"formatter.indent.funcBody",
	"formatter.indent.variables",
	"formatter.indent.logical",
	"formatter.indent.cycle",
	"formatter.indent.switch",
	"formatter.indent.case",
	"formatter.replace.not",
	"formatter.replace.asterisk",
	"formatter.replace.amp"
];

let validationEnabled = false;

function hasLegacyLaunchConfig(data) {
	if (!data || !Array.isArray(data.configurations)) {
		return false;
	}
	return data.configurations.some(cfg => {
		if (!cfg || typeof cfg !== "object") {
			return false;
		}
		if (cfg.type === "harbour-dbg") {
			return true;
		}
		return JSON.stringify(cfg).indexOf("harbour.debugList") >= 0;
	});
}

function hasLegacyTaskConfig(data) {
	if (!data || !Array.isArray(data.tasks)) {
		return false;
	}
	return data.tasks.some(task => {
		if (!task || typeof task !== "object") {
			return false;
		}
		if (task.type === "Harbour" || task.type === "HBMK2") {
			return true;
		}
		if (typeof task.problemMatcher === "string" && task.problemMatcher === "$harbour") {
			return true;
		}
		if (Array.isArray(task.problemMatcher) && task.problemMatcher.includes("$harbour")) {
			return true;
		}
		return false;
	});
}

function rewriteLegacyLaunchConfig(data) {
	let changed = false;
	if (!data || !Array.isArray(data.configurations)) {
		return { changed, data };
	}
	for (const cfg of data.configurations) {
		if (!cfg || typeof cfg !== "object") {
			continue;
		}
		if (cfg.type === "harbour-dbg") {
			cfg.type = "ekon-harbour-dbg";
			changed = true;
		}
		const asText = JSON.stringify(cfg);
		if (asText.indexOf("harbour.debugList") >= 0) {
			for (const key of Object.keys(cfg)) {
				if (typeof cfg[key] === "string") {
					const replaced = cfg[key].replace(/harbour\.debugList/g, "ekon.harbour.debugList");
					if (replaced !== cfg[key]) {
						cfg[key] = replaced;
						changed = true;
					}
				}
			}
		}
	}
	return { changed, data };
}

function rewriteLegacyTaskConfig(data) {
	let changed = false;
	if (!data || !Array.isArray(data.tasks)) {
		return { changed, data };
	}
	for (const task of data.tasks) {
		if (!task || typeof task !== "object") {
			continue;
		}
		if (task.type === "Harbour") {
			task.type = "EkonHarbour";
			changed = true;
		} else if (task.type === "HBMK2") {
			task.type = "EkonHBMK2";
			changed = true;
		}
		if (typeof task.problemMatcher === "string" && task.problemMatcher === "$harbour") {
			task.problemMatcher = "$ekon-harbour";
			changed = true;
		} else if (Array.isArray(task.problemMatcher)) {
			const mapped = task.problemMatcher.map(pm => pm === "$harbour" ? "$ekon-harbour" : pm);
			if (JSON.stringify(mapped) !== JSON.stringify(task.problemMatcher)) {
				task.problemMatcher = mapped;
				changed = true;
			}
		}
	}
	return { changed, data };
}

function migrateWorkspaceJsonFile(filePath, rewriteFn) {
	if (!fs.existsSync(filePath)) {
		return false;
	}
	try {
		const raw = fs.readFileSync(filePath, "utf8");
		const parsed = JSON.parse(raw);
		const result = rewriteFn(parsed);
		if (!result.changed) {
			return false;
		}
		const backupPath = `${filePath}.bak`;
		if (!fs.existsSync(backupPath)) {
			fs.writeFileSync(backupPath, raw);
		}
		fs.writeFileSync(filePath, `${JSON.stringify(result.data, null, 4)}\n`);
		return true;
	} catch (_err) {
		return false;
	}
}

function migrateLegacyConfigFilesInWorkspace() {
	let foundLegacy = false;
	let migratedCount = 0;
	if (!vscode.workspace.workspaceFolders) {
		return { foundLegacy, migratedCount };
	}
	for (const folder of vscode.workspace.workspaceFolders) {
		const root = folder.uri.fsPath;
		const launchPath = path.join(root, ".vscode", "launch.json");
		const tasksPath = path.join(root, ".vscode", "tasks.json");
		if (fs.existsSync(launchPath)) {
			try {
				if (hasLegacyLaunchConfig(JSON.parse(fs.readFileSync(launchPath, "utf8")))) {
					foundLegacy = true;
				}
			} catch (_err) {}
		}
		if (fs.existsSync(tasksPath)) {
			try {
				if (hasLegacyTaskConfig(JSON.parse(fs.readFileSync(tasksPath, "utf8")))) {
					foundLegacy = true;
				}
			} catch (_err) {}
		}
		if (migrateWorkspaceJsonFile(launchPath, rewriteLegacyLaunchConfig)) {
			migratedCount++;
		}
		if (migrateWorkspaceJsonFile(tasksPath, rewriteLegacyTaskConfig)) {
			migratedCount++;
		}
	}
	return { foundLegacy, migratedCount };
}

async function offerLegacyConfigMigration(context) {
	if (context.globalState.get(LEGACY_CONFIG_PROMPT_KEY) || !vscode.workspace.workspaceFolders) {
		return;
	}
	const status = migrateLegacyConfigFilesInWorkspace();
	const foundLegacy = status.foundLegacy || status.migratedCount > 0;
	if (!foundLegacy) {
		await context.globalState.update(LEGACY_CONFIG_PROMPT_KEY, true);
		return;
	}
	if (status.migratedCount > 0) {
		await context.globalState.update(LEGACY_CONFIG_PROMPT_KEY, true);
		vscode.window.showInformationMessage(`Ekon Harbour migration complete. Updated ${status.migratedCount} file(s).`);
		return;
	}
	const choice = await vscode.window.showInformationMessage(
		"Legacy Harbour debug/task configuration found. Update launch/tasks files to Ekon ids?",
		"Update now",
		"Later",
		"Don't ask again"
	);
	if (choice === "Don't ask again") {
		await context.globalState.update(LEGACY_CONFIG_PROMPT_KEY, true);
		return;
	}
	if (choice !== "Update now") {
		return;
	}
	const result = migrateLegacyConfigFilesInWorkspace();
	await context.globalState.update(LEGACY_CONFIG_PROMPT_KEY, true);
	vscode.window.showInformationMessage(`Ekon Harbour migration complete. Updated ${result.migratedCount} file(s).`);
}

async function runLegacyConfigMigrationCommand() {
	const result = migrateLegacyConfigFilesInWorkspace();
	if (!result.foundLegacy) {
		vscode.window.showInformationMessage("No legacy Harbour launch/tasks configuration found.");
		return;
	}
	vscode.window.showInformationMessage(`Ekon Harbour migration complete. Updated ${result.migratedCount} file(s).`);
}

async function migrateLegacySettings(context) {
	if (context.globalState.get(SETTINGS_MIGRATION_KEY)) {
		return;
	}
	const oldConfig = vscode.workspace.getConfiguration("harbour");
	const newConfig = vscode.workspace.getConfiguration("ekonHarbour");
	for (const setting of SETTINGS_TO_MIGRATE) {
		const oldValue = oldConfig.inspect(setting);
		const newValue = newConfig.inspect(setting);
		if (oldValue && newValue) {
			if (newValue.globalValue === undefined && oldValue.globalValue !== undefined) {
				await newConfig.update(setting, oldValue.globalValue, vscode.ConfigurationTarget.Global);
			}
			if (newValue.workspaceValue === undefined && oldValue.workspaceValue !== undefined) {
				await newConfig.update(setting, oldValue.workspaceValue, vscode.ConfigurationTarget.Workspace);
			}
			if (newValue.workspaceFolderValue === undefined && oldValue.workspaceFolderValue !== undefined) {
				await newConfig.update(setting, oldValue.workspaceFolderValue, vscode.ConfigurationTarget.WorkspaceFolder);
			}
		}
	}
	await context.globalState.update(SETTINGS_MIGRATION_KEY, true);
}

function activate(context) {
	migrateLegacySettings(context).catch(() => {});
	offerLegacyConfigMigration(context).catch(() => {});
	const featureSettings = vscode.workspace.getConfiguration("ekonHarbour").get("features") || {};
	validationEnabled = featureSettings.validation !== false;
	const languageServerEnabled = featureSettings.languageServer !== false;
	const decoratorFeatureEnabled = featureSettings.decorator !== false;
	vscode.languages.setLanguageConfiguration('harbour', {
		indentationRules: {
			increaseIndentPattern: /^\s*((?:(?:static|init|exit)\s+)?(?:proc(?:e(?:d(?:u(?:r(?:e)?)?)?)?)?|func(?:t(?:i(?:o(?:n)?)?)?)?)|class(?!\s*(?:var|data|method))|method|if|else(?:if)?|for|if|try|case|otherwise|(?:do\s+)?while|switch|begin)\b/i,
			decreaseIndentPattern: /^\s*(end\s*([a-z]*)?|next|else|elseif|return)\b/i,
			indentNextLinePattern: /;((?:\/\/|&&).*)?$/
		}
	});
		if (validationEnabled) {
			validation.activate(context);
		}

	var serverModuleDbg = context.asAbsolutePath(path.join('..','server'));
	var serverModule = context.asAbsolutePath('server');
	var debugOptions = { execArgv: ["--nolazy", "--inspect-brk=21780"] };
	var serverOptions = {
		run : { module: serverModule, transport: client.TransportKind.ipc },
		debug: { module: serverModuleDbg, transport: client.TransportKind.ipc , options: debugOptions }
	}
	var clientOptions = {
		documentSelector: ['harbour'],
		synchronize: {
			configurationSection: ['ekonHarbour','harbour','search','editor']
		}
	}
	let cl;
	if (languageServerEnabled) {
		cl = new client.LanguageClient('HarbourServer', 'Harbour Server', serverOptions, clientOptions);
		cl.registerProposedFeatures();
		context.subscriptions.push(cl.start());
	}
	vscode.commands.registerCommand('ekon.harbour.getDbgCode', () => { getDbgCode(context); })
	vscode.commands.registerCommand("ekon.harbour.debugList", DebugList)
	vscode.commands.registerCommand("ekon.harbour.setupCodeFormat", () => { formatEditor.showEditor(context); })
	vscode.commands.registerCommand("ekon.harbour.migrateLegacyConfig", () => { runLegacyConfigMigrationCommand(); })
	if (cl) {
		if (decoratorFeatureEnabled) {
			decorator.activate(context,cl);
		}
		docCreator.activate(context,cl);
	}
	taskProvider.activate();	
	// https://code.visualstudio.com/updates/v1_30#:~:text=Finalized%20Debug%20Adapter%20Tracker%20API
	/*vscode.debug.registerDebugAdapterTrackerFactory('ekon-harbour-dbg', {
		createDebugAdapterTracker(  ) {
		  return {
			onWillReceiveMessage: m => console.log(`> ${m.seq} - C ${m.command} - ${m.arguments? JSON.stringify(m.arguments).substring(0,50) : "no-args"}`),
			onDidSendMessage: m => console.log(`< ${m.seq} - ${m.command ? "C" : "E"} ${m.command ? m.command : m.event} - ${m.body? JSON.stringify(m.body).substring(0,50) : 'no-body'}`)
		  };
		}
	  });*/
}

function DebugList(args) {
	return new Promise((resolve,reject) => {
		var picks = vscode.window.createQuickPick();
		picks.placeholder = "select the process to attach with"
		picks.busy=true;
		picks.items=[];
		var port = args.port? args.port :6110;
		var server = net.createServer(socket => {
			socket.on("data", data=> {
				try {
					while(true) {
						var lines = data.toString().split("\r\n");
						if(lines.length<2)  {//todo: check if they arrive in 2 tranches.
							break;
						}
						var clPath = path.basename(lines[0],path.extname(lines[0])).toLowerCase();
						var processId = parseInt(lines[1]);
						if(args.program && args.program.length>0) {
							var exeTarget = path.basename(args.program,path.extname(args.program)).toLowerCase();
							if(clPath!=exeTarget) break;
						}
						if(!picks.items.find((v)=>v.process==processId))
							picks.items=picks.items.concat([{label:clPath+":"+processId, process:processId }])
						break;
					}
				} catch(ex) { }
				socket.write("NO\r\n")
				socket.end();
			});
		}).listen(port);
		picks.onDidAccept(()=>{
			picks.hide();
		});
		picks.onDidHide(()=> {
			server.close();
			if(picks.selectedItems.length>0) {
				resolve(picks.selectedItems[0].process.toString());
			} else
				resolve("");
		})

		picks.show();;
	});
}

function getDbgCode(context) {
	fs.readFile(path.join(context.extensionPath,'extra','dbg_lib.prg'),(err,data) =>
    {
        if(!err)
			vscode.workspace.openTextDocument({
				content: data.toString(),
				language: 'harbour'}).then(doc => {
					vscode.window.showTextDocument(doc);
				})
    });
}

function deactivate() {
	if (validationEnabled) {
		validation.deactivate();
	}
}

exports.activate = activate;
exports.deactivate = deactivate;

