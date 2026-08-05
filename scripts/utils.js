// Shared helpers for make_dev_link / make_install / install_to_workspace
import fs from "fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import readline from "node:readline";

const LINK_CONFIG_PATH = path.join(process.cwd(), "scripts", "link-config.json");
const LINK_CONFIG_EXAMPLE_PATH = path.join(process.cwd(), "scripts", "link-config.example.json");
/** SiYuan writes runtime ports / workspace list under ~/.config/siyuan/ */
const SIYUAN_CONF_DIR = path.join(os.homedir(), ".config", "siyuan");
const SIYUAN_PORT_JSON = path.join(SIYUAN_CONF_DIR, "port.json");
const SIYUAN_WORKSPACE_JSON = path.join(SIYUAN_CONF_DIR, "workspace.json");
/** Default / reverse-proxy port; actual kernel port may differ when 6806 is busy. */
const SIYUAN_FIXED_PORT = "6806";
const PROBE_TIMEOUT_MS = 800;

export const log = (info) => console.log(`\x1B[36m%s\x1B[0m`, info);
export const error = (info) => console.log(`\x1B[31m%s\x1B[0m`, info);
export const warn = (info) => console.log(`\x1B[33m%s\x1B[0m`, info);

export const POST_HEADER = {
    "Content-Type": "application/json",
};

export async function myfetch(url, options = {}) {
    const { timeout = 2000, body, ...reqOptions } = options;
    return new Promise((resolve, reject) => {
        const req = http.request(url, reqOptions, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => JSON.parse(data),
                });
            });
        });
        req.on("error", (e) => {
            reject(e);
        });
        req.setTimeout(timeout, () => {
            req.destroy(new Error(`timeout after ${timeout}ms`));
        });
        if (body != null) {
            req.write(body);
        }
        req.end();
    });
}

function isProcessAlive(pid) {
    const n = Number(pid);
    if (!Number.isInteger(n) || n <= 0) {
        return false;
    }
    try {
        process.kill(n, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * Candidate ports (deduped, preferred order):
 * SIYUAN_PORT → 6806 → ports of living PIDs in ~/.config/siyuan/port.json
 */
export function collectSiYuanPortCandidates() {
    const ports = [];
    const seen = new Set();
    const add = (port) => {
        const p = String(port ?? "").trim();
        if (!/^\d+$/.test(p) || seen.has(p)) {
            return;
        }
        seen.add(p);
        ports.push(p);
    };

    if (process.env.SIYUAN_PORT) {
        add(process.env.SIYUAN_PORT);
    }
    add(SIYUAN_FIXED_PORT);

    if (fs.existsSync(SIYUAN_PORT_JSON)) {
        try {
            const pidPorts = JSON.parse(fs.readFileSync(SIYUAN_PORT_JSON, "utf8"));
            for (const [pid, port] of Object.entries(pidPorts ?? {})) {
                if (isProcessAlive(pid)) {
                    add(port);
                }
            }
        } catch (e) {
            warn(`\tFailed to read ${SIYUAN_PORT_JSON}: ${e.message}`);
        }
    }

    return ports;
}

async function probeSiYuanVersion(port) {
    const url = `http://127.0.0.1:${port}/api/system/version`;
    const response = await myfetch(url, {
        method: "GET",
        timeout: PROBE_TIMEOUT_MS,
    });
    if (!response.ok) {
        return null;
    }
    const conf = await response.json();
    // SiYuan: { code: 0, data: "x.y.z" }
    if (conf?.code === 0 && typeof conf?.data === "string" && conf.data.length > 0) {
        return conf.data;
    }
    return null;
}

/**
 * Find reachable SiYuan HTTP ports. Uses /api/system/version (no auth) to verify.
 * @returns {Promise<string[]>}
 */
export async function detectSiYuanPorts() {
    const candidates = collectSiYuanPortCandidates();
    const checks = await Promise.all(
        candidates.map(async (port) => {
            try {
                const ver = await probeSiYuanVersion(port);
                return ver ? port : null;
            } catch {
                return null;
            }
        }),
    );
    return checks.filter(Boolean);
}

/** Offline fallback: read workspace list from ~/.config/siyuan/workspace.json */
export function readWorkspacesFromConfig() {
    if (!fs.existsSync(SIYUAN_WORKSPACE_JSON)) {
        return null;
    }
    try {
        const paths = JSON.parse(fs.readFileSync(SIYUAN_WORKSPACE_JSON, "utf8"));
        if (!Array.isArray(paths)) {
            return null;
        }
        return paths
            .filter((p) => typeof p === "string" && p.trim() && fs.existsSync(p))
            .map((p) => ({ path: path.resolve(p), closed: true }));
    } catch (e) {
        warn(`\tFailed to read ${SIYUAN_WORKSPACE_JSON}: ${e.message}`);
        return null;
    }
}

export function loadLinkConfig() {
    if (!fs.existsSync(LINK_CONFIG_PATH)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(LINK_CONFIG_PATH, "utf8"));
    } catch (e) {
        error(`Failed to parse ${LINK_CONFIG_PATH}: ${e.message}`);
        return null;
    }
}

export function saveLinkConfig(workspaceDir) {
    fs.writeFileSync(
        LINK_CONFIG_PATH,
        JSON.stringify({ workspaceDir: path.resolve(workspaceDir) }, null, 2) + "\n",
        "utf8",
    );
    log(`Saved workspace path to ${LINK_CONFIG_PATH}`);
}

function cleanPath(input) {
    return input.trim().replace(/^["']|["']$/g, "");
}

/** Extract workspace root from workspace / data / data/plugins input. */
export function getWorkspaceDir(input) {
    let dir = path.resolve(cleanPath(input));
    const normalized = dir.replace(/\\/g, "/").replace(/\/+$/, "");
    if (normalized.endsWith("/data/plugins")) {
        return path.resolve(normalized.replace(/\/data\/plugins$/, ""));
    }
    if (normalized.endsWith("/data")) {
        return path.resolve(normalized.replace(/\/data$/, ""));
    }
    return dir;
}

/** Normalize any workspace-ish path to `.../data/plugins`. */
export function toPluginDir(input) {
    const workspaceDir = getWorkspaceDir(input);
    const pluginsDir = path.join(workspaceDir, "data", "plugins");
    log(`>>> Workspace: ${workspaceDir}`);
    log(`>>> Plugin directory: ${pluginsDir}`);
    return pluginsDir;
}

/** @deprecated alias — prefer `toPluginDir` */
export function resolveWorkspaceToPluginsDir(workspacePath) {
    return toPluginDir(workspacePath);
}

function getConfigWorkspaceDir(config) {
    if (config?.workspaceDir) {
        return config.workspaceDir;
    }
    if (config?.pluginDir) {
        return getWorkspaceDir(config.pluginDir);
    }
    return null;
}

export function printResolveHelp() {
    warn("\nCould not resolve the SiYuan plugins directory automatically.");
    warn("Configure it with one of:\n");
    warn("  1. Start SiYuan and re-run (auto-detect port via ~/.config/siyuan/port.json)");
    warn("  2. Copy scripts/link-config.example.json → scripts/link-config.json and set workspaceDir");
    warn("  3. Set env SIYUAN_PLUGIN_DIR to a workspace root (data/plugins is appended)");
    warn("  4. Set env SIYUAN_PORT if the kernel listens on a non-default port");
    warn("  5. Enter a workspace path when prompted\n");
    if (fs.existsSync(LINK_CONFIG_EXAMPLE_PATH)) {
        warn(`  Example: ${LINK_CONFIG_EXAMPLE_PATH}`);
    }
}

export async function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const answer = await new Promise((resolve) => {
        rl.question(question, resolve);
    });
    rl.close();
    return answer.trim();
}

export async function promptPluginDir() {
    printResolveHelp();
    const answer = await ask("\tEnter SiYuan workspace directory: ");
    if (!answer) {
        error("No path entered.");
        return null;
    }
    return {
        workspaceDir: getWorkspaceDir(answer),
        pluginDir: toPluginDir(answer),
    };
}

async function promptSaveConfig() {
    const answer = await ask("\tSave this path to scripts/link-config.json for next time? [Y/n]: ");
    return answer === "" || answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Resolve `<workspace>/data/plugins` from (in order):
 * manual target → link-config.json → running SiYuan API → SIYUAN_PLUGIN_DIR → prompt.
 */
export async function resolvePluginDir(options = {}) {
    const { manualTarget = "" } = options;

    if (manualTarget) {
        log(`>>> Using manual targetDir: ${manualTarget}`);
        return toPluginDir(manualTarget);
    }

    const config = loadLinkConfig();
    const workspaceFromConfig = getConfigWorkspaceDir(config);
    if (workspaceFromConfig) {
        log(`>>> From scripts/link-config.json: ${workspaceFromConfig}`);
        return toPluginDir(workspaceFromConfig);
    }

    log(">>> Trying to detect SiYuan workspaces (kernel must be running)...");
    const workspaces = await getSiYuanDir();
    if (workspaces?.length > 0) {
        return await chooseTarget(workspaces);
    }

    const env = process.env?.SIYUAN_PLUGIN_DIR;
    if (env) {
        log(`>>> From SIYUAN_PLUGIN_DIR: ${env}`);
        return toPluginDir(env);
    }

    const result = await promptPluginDir();
    if (!result) {
        return null;
    }

    const { workspaceDir, pluginDir } = result;
    if (await promptSaveConfig()) {
        saveLinkConfig(workspaceDir);
    }

    return pluginDir;
}

async function fetchWorkspacesFromPort(port) {
    const url = `http://127.0.0.1:${port}/api/system/getWorkspaces`;
    const response = await myfetch(url, {
        method: "POST",
        headers: POST_HEADER,
        timeout: PROBE_TIMEOUT_MS,
    });
    let conf;
    try {
        conf = await response.json();
    } catch {
        throw new Error(`HTTP ${response.status} (invalid JSON)`);
    }
    if (!response.ok || conf?.code !== 0) {
        throw new Error(conf?.msg || `HTTP ${response.status}`);
    }
    if (!Array.isArray(conf?.data)) {
        throw new Error("unexpected getWorkspaces payload");
    }
    return conf.data;
}

/**
 * Resolve workspace list:
 * 1. Probe SiYuan ports (SIYUAN_PORT / 6806 / living PIDs in port.json)
 * 2. Fall back to ~/.config/siyuan/workspace.json (works even if kernel is down)
 */
export async function getSiYuanDir() {
    const ports = await detectSiYuanPorts();
    if (ports.length > 0) {
        log(`>>> Detected SiYuan at: ${ports.map((p) => `127.0.0.1:${p}`).join(", ")}`);
        const errors = [];
        for (const port of ports) {
            try {
                const data = await fetchWorkspacesFromPort(port);
                if (data.length > 0) {
                    log(`>>> Workspaces from API (port ${port})`);
                    return data;
                }
                errors.push(`${port}: empty workspace list (auth required?)`);
            } catch (e) {
                errors.push(`${port}: ${e.message}`);
            }
        }
        warn(`\tgetWorkspaces failed on detected ports: ${errors.join("; ")}`);
    } else {
        warn("\tNo running SiYuan HTTP port detected (tried 6806 + ~/.config/siyuan/port.json)");
    }

    const fromFile = readWorkspacesFromConfig();
    if (fromFile?.length > 0) {
        warn(`>>> Using offline workspace list: ${SIYUAN_WORKSPACE_JSON}`);
        return fromFile;
    }

    error("\tCannot resolve SiYuan workspaces.");
    error("\tStart SiYuan, or configure scripts/link-config.json / SIYUAN_PLUGIN_DIR");
    return null;
}

export async function chooseTarget(workspaces) {
    const count = workspaces.length;
    log(`>>> Got ${count} SiYuan ${count > 1 ? "workspaces" : "workspace"}`);
    workspaces.forEach((workspace, i) => {
        const mark = workspace.closed === false ? " (open)" : workspace.closed === true ? " (closed)" : "";
        log(`\t[${i}] ${workspace.path}${mark}`);
    });

    if (count === 1) {
        return toPluginDir(workspaces[0].path);
    }

    while (true) {
        const answer = await ask(`\tPlease select a workspace [0-${count - 1}]: `);
        const index = Number.parseInt(answer, 10);
        if (!Number.isNaN(index) && index >= 0 && index < count) {
            return toPluginDir(workspaces[index].path);
        }
        error(`\tInvalid selection: "${answer}"`);
    }
}

export function cmpPath(path1, path2) {
    path1 = path1.replace(/\\/g, "/");
    path2 = path2.replace(/\\/g, "/");
    if (path1[path1.length - 1] !== "/") {
        path1 += "/";
    }
    if (path2[path2.length - 1] !== "/") {
        path2 += "/";
    }
    return path1 === path2;
}

export function getThisPluginName() {
    if (!fs.existsSync("./plugin.json")) {
        process.chdir("../");
        if (!fs.existsSync("./plugin.json")) {
            error("Failed! plugin.json not found");
            return null;
        }
    }

    const plugin = JSON.parse(fs.readFileSync("./plugin.json", "utf8"));
    const name = plugin?.name;
    if (!name) {
        error("Failed! Please set plugin name in plugin.json");
        return null;
    }

    return name;
}

export function installDistAsPlugin(distDir, pluginsDir, pluginName) {
    if (!fs.existsSync(distDir)) {
        error(`Build output not found: ${distDir}`);
        return false;
    }

    fs.mkdirSync(pluginsDir, { recursive: true });
    const targetPath = path.join(pluginsDir, pluginName);

    if (fs.existsSync(targetPath)) {
        log(`>>> Removing existing plugin directory: ${targetPath}`);
        fs.rmSync(targetPath, { recursive: true, force: true });
    }

    fs.mkdirSync(targetPath, { recursive: true });
    copyDirectory(distDir, targetPath);
    log(`>>> Installed plugin to: ${targetPath}`);
    return true;
}

export function copyDirectory(srcDir, dstDir) {
    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir);
        log(`Created directory ${dstDir}`);
    }

    fs.readdirSync(srcDir, { withFileTypes: true }).forEach((file) => {
        const src = path.join(srcDir, file.name);
        const dst = path.join(dstDir, file.name);

        if (file.isDirectory()) {
            copyDirectory(src, dst);
        } else {
            fs.copyFileSync(src, dst);
            log(`Copied file: ${src} --> ${dst}`);
        }
    });
    log(`All files copied!`);
}

export function makeSymbolicLink(srcPath, targetPath) {
    if (!fs.existsSync(targetPath)) {
        // Go 1.23 no longer supports junctions as symlinks:
        // https://github.com/siyuan-note/siyuan/issues/12399
        fs.symlinkSync(srcPath, targetPath, "dir");
        log(`Done! Created symlink ${targetPath}`);
        return true;
    }

    const isSymbol = fs.lstatSync(targetPath).isSymbolicLink();
    if (!isSymbol) {
        error(`Failed! ${targetPath} already exists and is not a symbolic link`);
        return false;
    }
    const existedPath = fs.readlinkSync(targetPath);
    if (cmpPath(existedPath, srcPath)) {
        log(`Good! ${targetPath} is already linked to ${srcPath}`);
        return true;
    }
    error(`Error! Already exists symbolic link ${targetPath}\nBut it links to ${existedPath}`);
    return false;
}
