// make_install.js — copy ./dist into <workspace>/data/plugins/<pluginName>
import fs from "fs";
import {
    log,
    error,
    resolvePluginDir,
    getThisPluginName,
    installDistAsPlugin,
} from "./utils.js";

let targetDir = "";

const pluginDir = await resolvePluginDir({ manualTarget: targetDir });
if (!pluginDir) {
    process.exit(1);
}

if (!fs.existsSync(pluginDir)) {
    log(`>>> Plugin directory missing, will create: ${pluginDir}`);
}

const distDir = `${process.cwd()}/dist`;
if (!fs.existsSync(distDir)) {
    error(`Build output not found: ${distDir}`);
    error("Run `pnpm build` first (or use `pnpm make-install`).");
    process.exit(1);
}

const name = getThisPluginName();
if (name === null) {
    process.exit(1);
}

const ok = installDistAsPlugin(distDir, pluginDir, name);
process.exit(ok ? 0 : 1);
