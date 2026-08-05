// install_to_workspace.js — build (via npm script) then copy dist into one or more SiYuan workspaces
import fs from 'fs';
import path from 'node:path';
import minimist from 'minimist';
import {
    log,
    warn,
    error,
    ask,
    getSiYuanDir,
    chooseTarget,
    getThisPluginName,
    resolveWorkspaceToPluginsDir,
    installDistAsPlugin,
} from './utils.js';

const argv = minimist(process.argv.slice(2), {
    boolean: ['all', 'help'],
    string: ['workspace'],
    alias: { w: 'workspace', a: 'all', h: 'help' },
});

/** `-w Life,Knowledge`, `-w Life -w Knowledge` and bare args all end up here. */
const requested = [argv.workspace ?? [], argv._ ?? []]
    .flat()
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

function printUsage() {
    log('用法: pnpm install-workspace [-- 选项]');
    log('\t-w, --workspace <名称|路径>  指定工作空间，逗号分隔或重复传入');
    log('\t-a, --all                   安装到所有可见的工作空间');
    log('\t不带选项时进入交互式选择');
    log('示例: pnpm install-workspace -- -w Life,Knowledge');
}

/** Names are matched against the detected list; anything with a separator is a real path. */
const isPathLike = (value) => /[\\/]/.test(value) || /^[a-zA-Z]:$/.test(value.slice(0, 2));

function matchWorkspace(workspaces, name) {
    const lower = name.toLowerCase();
    const byName = workspaces.filter((w) => path.basename(w.path).toLowerCase() === lower);
    if (byName.length > 0) {
        return byName;
    }
    return workspaces.filter((w) => w.path.toLowerCase().includes(lower));
}

function listWorkspaces(workspaces) {
    workspaces.forEach((w) => log(`\t- ${path.basename(w.path)}  (${w.path})`));
}

async function detectWorkspaces() {
    log('>>> 正在解析思源工作空间列表...');
    const workspaces = await getSiYuanDir();
    if (!workspaces || workspaces.length === 0) {
        error('>>> 无法获取工作空间列表，请确认思源已启动，或直接用 -w 传入工作空间目录');
        process.exit(1);
    }
    return workspaces;
}

/** @returns {Promise<string[]>} plugins dirs to install into */
async function resolvePluginsDirs() {
    if (argv.all) {
        const workspaces = await detectWorkspaces();
        log(`>>> 将安装到全部 ${workspaces.length} 个工作空间`);
        return workspaces.map((w) => resolveWorkspaceToPluginsDir(w.path));
    }

    if (requested.length > 0) {
        const names = requested.filter((value) => !isPathLike(value));
        const workspaces = names.length > 0 ? await detectWorkspaces() : [];
        const dirs = [];
        for (const value of requested) {
            if (isPathLike(value)) {
                dirs.push(resolveWorkspaceToPluginsDir(value));
                continue;
            }
            const matched = matchWorkspace(workspaces, value);
            if (matched.length === 0) {
                error(`>>> 未找到匹配的工作空间: "${value}"，可用的有:`);
                listWorkspaces(workspaces);
                process.exit(1);
            }
            if (matched.length > 1) {
                error(`>>> "${value}" 匹配到多个工作空间，请使用更精确的名称或完整路径:`);
                listWorkspaces(matched);
                process.exit(1);
            }
            dirs.push(resolveWorkspaceToPluginsDir(matched[0].path));
        }
        return dirs;
    }

    log('>>> 选择工作空间来源:');
    log('\t[0] 自动检测（运行中的思源端口 / ~/.config/siyuan/workspace.json）');
    log('\t[1] 手动输入工作空间目录');
    log('\t（提示: 可用 `pnpm install-workspace -- -w Life,Knowledge` 跳过交互）');

    const modeAnswer = await ask('\t请选择 [0/1]: ');
    if (modeAnswer === '0') {
        const workspaces = await detectWorkspaces();
        return [await chooseTarget(workspaces)];
    }
    if (modeAnswer === '1') {
        const workspacePath = await ask('\t请输入工作空间目录（工作空间根路径，含 data 的上一级）: ');
        if (!workspacePath) {
            error('>>> 未输入目录');
            process.exit(1);
        }
        return [resolveWorkspaceToPluginsDir(workspacePath)];
    }
    error(`>>> 无效选项: "${modeAnswer}"`);
    process.exit(1);
}

if (argv.help) {
    printUsage();
    process.exit(0);
}

const pluginsDirs = [...new Set(await resolvePluginsDirs())];

const name = getThisPluginName();
if (name === null) {
    process.exit(1);
}

const distDir = `${process.cwd()}/dist`;
let failed = 0;

for (const pluginsDir of pluginsDirs) {
    if (!fs.existsSync(pluginsDir)) {
        log(`>>> 插件目录不存在，将创建: ${pluginsDir}`);
    }
    if (!installDistAsPlugin(distDir, pluginsDir, name)) {
        failed += 1;
    }
}

if (pluginsDirs.length > 1) {
    const okCount = pluginsDirs.length - failed;
    const summary = `>>> 完成: ${okCount}/${pluginsDirs.length} 个工作空间安装成功`;
    failed > 0 ? warn(summary) : log(summary);
}

process.exit(failed > 0 ? 1 : 0);
