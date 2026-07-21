/**
 * plugin/compare/index.ts
 *
 * The compare plugin provides:
 *   - Admin: _compare field on product post form (select products to compare)
 *   - Frontend: Compare UI table rendered server-data-first via ProductClient
 *
 * Data flow:
 *   compare/lib/serverHooks.ts exports fetchCompareData()
 *   product/lib/serverHooks.ts calls fetchCompareData() when building pageData
 *   page.tsx passes pageData to Layout1/Layout2
 *   Layout1/Layout2 passes compareProducts + categoryProducts to ProductClient
 *   ProductClient dynamically imports Compare UI and renders with server data
 *
 * No client-side fetching, no registerCompareComponent, no cross-plugin imports.
 */

import { addHook, addBuilderElement, type PluginMeta } from "@/hook";
import { registerLazyComponent } from "@/hook/pluginHooks";
import PostCompare from "./ui/PostCompare";
import compareElement from "./ui/CompareElement";

export const PLUGINS: PluginMeta = {
    nx:          "com.system.compare",
    name:        "compare",
    version:     "1.0.0",
    description: "Adds a compare-products selector to the product post form.",
    author:      "System",
    path:        "https://github.com/HOTLancerX/compare.git",
    icon:        "mdi:compare",
    color:       "from-violet-300 to-purple-800",
};

export function register() {
    // ─── Register builder element ────────────────────────────────────────────
    addBuilderElement(compareElement, PLUGINS.nx);

    // ─── Register lazy component ─────────────────────────────────────────────
    registerLazyComponent(
        "product.Compare",
        () => import("./ui/Compare"),
        PLUGINS.nx
    );

    // ─── Compare field on product post form ──────────────────────────────────
    // Admin selects which products to compare against this product.
    // Stored as _compare JSON array in post_info.
    addHook("post.form", [
        {
            key:      "_compare",
            label:    "Compare Products",
            type:     "product",
            style:    "left",
            position: 30,
            component: PostCompare,
        },
    ], PLUGINS.nx);
}
