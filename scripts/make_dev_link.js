// make_dev_link.js — symlink ./dev → <workspace>/data/plugins/<pluginName>
import fs from "fs";
import {
    log,
    error,
    resolvePluginDir,
    getThisPluginName,
    makeSymbolicLink,
} from "./utils.js";

// Optional hardcode: workspace root or .../data/plugins (auto-normalized).
let targetDir = "";

const pluginDir = await resolvePluginDir({ manualTarget: targetDir });
if (!pluginDir) {
    process.exit(1);
}

if (!fs.existsSync(pluginDir)) {
    error(`Failed! Plugin directory does not exist: "${pluginDir}"`);
    error("Create it, or set scripts/link-config.json (see link-config.example.json).");
    process.exit(1);
}

log(`>>> Target plugin directory: ${pluginDir}`);

const devDir = `${process.cwd()}/dev`;
if (!fs.existsSync(devDir)) {
    fs.mkdirSync(devDir);
    log(">>> Created empty dev/. Run `pnpm dev` before enabling the plugin in SiYuan.");
}

const name = getThisPluginName();
if (name === null) {
    process.exit(1);
}
const targetPath = `${pluginDir}/${name}`;

const ok = makeSymbolicLink(devDir, targetPath);
process.exit(ok ? 0 : 1);
