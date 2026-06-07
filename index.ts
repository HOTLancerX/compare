import { addHook, type PluginMeta } from "@/hook";
import PostCompare from "./ui/PostCompare";

// ─── Plugin metadata ───────────────────────────────────────────────────────────
export const PLUGINS: PluginMeta = {
    nx: "com.system.compare",
    name: "compare",
    version: "1.0.0",
    description: "Adds a compare-products selector to the product post form.",
    author: "System",
    path: "https://github.com/HOTLancerX/compare.git",
    icon: "mdi:compare",
    color: "from-violet-300 to-purple-800",
};

/**
 * Register all hooks for this plugin.
 * Called by PluginList.reregisterHooks() after the gate is armed.
 */
export function register() {
    // ─── Compare field on product post form ─────────────────────────────────
    addHook("post.form", [
        {
            key: "_compare",
            label: "Compare Products",
            type: "product",        // only appears on the product post type
            style: "left",
            position: 30,           // after Variate (10) and Specifications (20)
            component: PostCompare,
        },
    ], PLUGINS.nx);
}
