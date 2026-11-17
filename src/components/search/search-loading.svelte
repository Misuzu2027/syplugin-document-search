<script lang="ts">
    import { EnvConfig } from "@/config/env-config";

    export let active: boolean = false;
    export let top: number = 0;
</script>

{#if active}
    <div class="document-search-loading" style:top="{top}px" role="status">
        <span class="document-search-loading__label">{EnvConfig.ins.i18n.loading}</span>
        <div class="document-search-loading__indicator" aria-hidden="true">
            <div class="document-search-loading__sheet">
                <span></span><span></span><span></span>
            </div>
        </div>
    </div>
{/if}

<style>
    .document-search-loading {
        --document-search-loading-ink: #4778e8;
        --document-search-loading-paper: #fff;
        --document-search-loading-glow: rgba(71, 120, 232, 0.14);
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--document-search-loading-ink);
    }

    @media (prefers-color-scheme: dark) {
        .document-search-loading {
            --document-search-loading-ink: #8baeff;
            --document-search-loading-paper: #252b36;
            --document-search-loading-glow: rgba(139, 174, 255, 0.13);
        }
    }

    :global(:root[data-theme-mode="light"]) .document-search-loading {
        --document-search-loading-ink: #4778e8;
        --document-search-loading-paper: #fff;
        --document-search-loading-glow: rgba(71, 120, 232, 0.14);
    }

    :global(:root[data-theme-mode="dark"]) .document-search-loading {
        --document-search-loading-ink: #8baeff;
        --document-search-loading-paper: #252b36;
        --document-search-loading-glow: rgba(139, 174, 255, 0.13);
    }

    .document-search-loading__label {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
    }

    .document-search-loading__indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        flex-shrink: 0;
    }

    .document-search-loading__sheet {
        position: relative;
        box-sizing: border-box;
        width: 30px;
        height: 38px;
        overflow: hidden;
        border: 1.5px solid currentColor;
        border-radius: 5px;
        background: var(--document-search-loading-paper);
    }

    .document-search-loading__sheet span {
        position: absolute;
        top: 10px;
        right: 6px;
        left: 6px;
        height: 2px;
        border-radius: 2px;
        background: currentColor;
        opacity: 0.3;
        animation: document-search-loading-line 1.8s ease-in-out infinite;
    }

    .document-search-loading__sheet span:nth-child(2) {
        top: 17px;
        animation-delay: 0.2s;
    }

    .document-search-loading__sheet span:nth-child(3) {
        top: 24px;
        right: 12px;
        animation-delay: 0.4s;
    }

    .document-search-loading__sheet::after {
        content: "";
        position: absolute;
        top: 4px;
        right: 0;
        left: 0;
        height: 12px;
        background: linear-gradient(transparent, var(--document-search-loading-glow));
        border-bottom: 1.5px solid currentColor;
        animation: document-search-loading-scan 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes document-search-loading-scan {
        0% { transform: translateY(-16px); opacity: 0; }
        15%, 80% { opacity: 1; }
        100% { transform: translateY(29px); opacity: 0; }
    }

    @keyframes document-search-loading-line {
        0%, 100% { opacity: 0.25; }
        45% { opacity: 0.85; }
    }

    @media (prefers-reduced-motion: reduce) {
        .document-search-loading__sheet span,
        .document-search-loading__sheet::after {
            animation: none;
        }

        .document-search-loading__sheet::after {
            transform: translateY(7px);
            opacity: 0.65;
        }
    }
</style>
