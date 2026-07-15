"use client";

/**
 * CompareElement.tsx — Page builder element for the Compare plugin.
 *
 * Renders the product comparison table/card UI inside the page builder.
 * All styling options (colours, borders, visibility toggles) are
 * dynamically configurable through the builder controls panel.
 *
 * Data flow:
 *   Server hook (builderData.tsx) fetches compareProducts + categoryProducts
 *   from the database and passes them as props to this client component.
 *   The client component dynamically imports the appropriate Compare style
 *   component and renders it with the configured options.
 */

import React, { useEffect, useState, type ComponentType } from "react";
import { useProduct } from "@/plugin/product/product/ProductContext";
import {
    Select,
    Toggle,
    ColorPickerPopup,
    Dimensions,
    Text,
    Section,
    Typography,
} from "@/components/builder/controls";
import type { CompareProduct, CompareProps } from "./CompareTypes";

// ── Client wrapper ────────────────────────────────────────────────────────────

export function CompareElementClient({
    schema,
    compareProducts = [],
    categoryProducts = [],
    currentProduct,
    currencySymbol = "$",
}: {
    schema: any;
    compareProducts?: CompareProduct[];
    categoryProducts?: CompareProduct[];
    currentProduct?: CompareProduct | null;
    currencySymbol?: string;
}) {
    const product = useProduct();
    const [CompareUI, setCompareUI] = useState<ComponentType<CompareProps> | null>(null);

    const styleNum = parseInt(String(schema.content?.style ?? "1"), 10) || 1;

    // Dynamic import of the Compare component
    useEffect(() => {
        import("./Compare")
            .then((m) => setCompareUI(() => m.default))
            .catch(() => {});
    }, []);

    // Style overrides from builder schema
    const title = schema.content?.title ?? "Compare Products";
    const showTitle = schema.content?.showTitle !== false;
    const showImage = schema.content?.showImage !== false;
    const showPrice = schema.content?.showPrice !== false;
    const showSpecs = schema.content?.showSpecs !== false;
    const showSwap = schema.content?.showSwap !== false;

    const bgColor = schema.style?.bgColor ?? "#ffffff";
    const borderColor = schema.style?.borderColor ?? "#e5e7eb";
    const headerBg = schema.style?.headerBg ?? "#f9fafb";
    const titleColor = schema.style?.titleColor ?? "#111827";
    const labelColor = schema.style?.labelColor ?? "#6b7280";
    const valueColor = schema.style?.valueColor ?? "#374151";
    const priceColor = schema.style?.priceColor ?? "#059669";
    const borderRadius = schema.style?.borderRadius ?? "16";

    // Build current product from context or props
    let current: CompareProduct | null = currentProduct ?? null;
    if (!current && product) {
        const variate = product.data?.info?._variate
            ? (() => { try { return JSON.parse(product.data.info._variate); } catch { return {}; } })()
            : {};
        current = {
            id: product.data?._id || product.data?.id || "",
            slug: product.data?.slug || "",
            title: product.data?.title || "",
            url: "#",
            images: product.gallery,
            sellingPrice: product.sellingPrice || 0,
            regularPrice: product.regularPrice || 0,
            priceType: product.priceType,
            specifications: product.specifications?.map((s: any) => ({
                title: s.title,
                fields: s.fields,
            })) || [],
            variants: product.variants?.map((v: any) => ({
                id: v.id, color: v.color, options: v.options,
                image: v.image, gallery: v.gallery,
            })) || [],
        };
    }

    // Mock data for builder editor preview
    if (!current) {
        current = {
            id: "mock-current",
            slug: "mock-product",
            title: "Current Product",
            url: "#",
            images: [],
            sellingPrice: 120,
            regularPrice: 150,
            priceType: "single",
            specifications: [
                {
                    title: "General",
                    fields: [
                        { title: "Material", description: "Stainless Steel" },
                        { title: "Weight", description: "500g" },
                    ],
                },
            ],
        };
    }

    const mockCompare: CompareProduct[] = compareProducts.length > 0
        ? compareProducts
        : [
            {
                id: "mock-compare-1",
                slug: "compare-1",
                title: "Compare Product 1",
                url: "#",
                images: [],
                sellingPrice: 99,
                regularPrice: 130,
                priceType: "single",
                specifications: [
                    {
                        title: "General",
                        fields: [
                            { title: "Material", description: "Aluminum" },
                            { title: "Weight", description: "350g" },
                        ],
                    },
                ],
            },
        ];

    if (!CompareUI) {
        return (
            <div
                style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: `${borderRadius}px`,
                    overflow: "hidden",
                }}
            >
                {showTitle && (
                    <div style={{ background: headerBg, padding: "12px 20px", borderBottom: `1px solid ${borderColor}` }}>
                        <h3 style={{ color: titleColor, fontSize: "18px", fontWeight: "700", margin: 0 }}>{title}</h3>
                    </div>
                )}
                <div style={{ padding: "40px 20px", textAlign: "center", color: labelColor, fontSize: "14px" }}>
                    Loading comparison table…
                </div>
            </div>
        );
    }

    // Wrap the Compare component with style overrides via CSS variables
    return (
        <div
            className="compare-element-wrapper"
            style={{
                "--compare-bg": bgColor,
                "--compare-border": borderColor,
                "--compare-header-bg": headerBg,
                "--compare-title-color": titleColor,
                "--compare-label-color": labelColor,
                "--compare-value-color": valueColor,
                "--compare-price-color": priceColor,
                "--compare-radius": `${borderRadius}px`,
            } as React.CSSProperties}
        >
            {showTitle && (
                <div
                    style={{
                        background: headerBg,
                        padding: "12px 20px",
                        borderBottom: `1px solid ${borderColor}`,
                        borderTopLeftRadius: `${borderRadius}px`,
                        borderTopRightRadius: `${borderRadius}px`,
                    }}
                >
                    <h3
                        style={{
                            color: titleColor,
                            fontSize: schema.style?.typography?.fontSize
                                ? `${schema.style.typography.fontSize}px`
                                : "20px",
                            fontWeight: schema.style?.typography?.fontWeight ?? "700",
                            margin: 0,
                        }}
                    >
                        {title}
                    </h3>
                </div>
            )}
            <div
                style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: showTitle ? `0 0 ${borderRadius}px ${borderRadius}px` : `${borderRadius}px`,
                    overflow: "hidden",
                }}
            >
                <CompareUI
                    current={current}
                    compareProducts={mockCompare}
                    categoryProducts={categoryProducts}
                    currencySymbol={currencySymbol}
                    style={styleNum}
                />
            </div>

            <style jsx>{`
                .compare-element-wrapper :global(section) {
                    background: var(--compare-bg) !important;
                    border-color: var(--compare-border) !important;
                    border-radius: var(--compare-radius) !important;
                    margin: 0 !important;
                }
                .compare-element-wrapper :global(th),
                .compare-element-wrapper :global(.bg-gray-50) {
                    background: var(--compare-header-bg) !important;
                }
                .compare-element-wrapper :global(.text-main) {
                    color: var(--compare-price-color) !important;
                }
                .compare-element-wrapper :global(.text-gray-500) {
                    color: var(--compare-label-color) !important;
                }
                .compare-element-wrapper :global(.text-gray-700) {
                    color: var(--compare-value-color) !important;
                }
            `}</style>
        </div>
    );
}

// ── Builder element definition ────────────────────────────────────────────────

const compareElement = {
    type: "product-compare",
    category: "Product Details",
    label: "Product Compare Table",
    icon: "mdi:compare",

    schema: {
        content: {
            title: "Compare Products",
            showTitle: true,
            showImage: true,
            showPrice: true,
            showSpecs: true,
            showSwap: true,
            style: "1",
        },
        style: {
            bgColor: "#ffffff",
            borderColor: "#e5e7eb",
            headerBg: "#f9fafb",
            titleColor: "#111827",
            labelColor: "#6b7280",
            valueColor: "#374151",
            priceColor: "#059669",
            borderRadius: "16",
            typography: {
                fontSize: 20,
                fontSizeUnit: "px",
                fontWeight: "700",
            },
        },
        advanced: {
            margin: { top: 0, right: 0, bottom: 24, left: 0, unit: "px" },
            padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
        },
    },

    controls: [
        {
            tab: "Layout",
            section: "Title & Style",
            controls: [
                {
                    name: "title",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <Text label="Section Title" value={value} onChange={onChange} />
                    ),
                },
                {
                    name: "style",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <Select
                            label="Compare Layout Style"
                            value={String(value ?? "1")}
                            onChange={onChange}
                            options={[
                                { value: "1", label: "Style 1 — Horizontal Table" },
                                { value: "2", label: "Style 2 — Stacked Cards" },
                            ]}
                        />
                    ),
                },
            ],
        },
        {
            tab: "Layout",
            section: "Visibility Toggles",
            controls: [
                {
                    name: "showTitle",
                    responsive: false,
                    render: (value: any, onChange: any, { schema, updateSchema }: any) => (
                        <Section label="Show / Hide Sections" defaultOpen>
                            <Toggle label="Show Title Bar" value={value !== false} onChange={onChange} />
                            <Toggle
                                label="Show Product Images"
                                value={schema.content.showImage !== false}
                                onChange={(v) => updateSchema("content", "showImage", v)}
                            />
                            <Toggle
                                label="Show Product Prices"
                                value={schema.content.showPrice !== false}
                                onChange={(v) => updateSchema("content", "showPrice", v)}
                            />
                            <Toggle
                                label="Show Specifications"
                                value={schema.content.showSpecs !== false}
                                onChange={(v) => updateSchema("content", "showSpecs", v)}
                            />
                            <Toggle
                                label="Show Swap Dropdown"
                                value={schema.content.showSwap !== false}
                                onChange={(v) => updateSchema("content", "showSwap", v)}
                            />
                        </Section>
                    ),
                },
            ],
        },
        {
            tab: "Style",
            section: "Colors",
            controls: [
                {
                    name: "bgColor",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Background Color" value={value ?? "#ffffff"} onChange={onChange} />
                    ),
                },
                {
                    name: "borderColor",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Border Color" value={value ?? "#e5e7eb"} onChange={onChange} />
                    ),
                },
                {
                    name: "headerBg",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Header / Row Bg" value={value ?? "#f9fafb"} onChange={onChange} />
                    ),
                },
                {
                    name: "titleColor",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Title Text Color" value={value ?? "#111827"} onChange={onChange} />
                    ),
                },
                {
                    name: "labelColor",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Label / Field Name Color" value={value ?? "#6b7280"} onChange={onChange} />
                    ),
                },
                {
                    name: "valueColor",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Spec Value Color" value={value ?? "#374151"} onChange={onChange} />
                    ),
                },
                {
                    name: "priceColor",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <ColorPickerPopup label="Price Color" value={value ?? "#059669"} onChange={onChange} />
                    ),
                },
            ],
        },
        {
            tab: "Style",
            section: "Border & Typography",
            controls: [
                {
                    name: "borderRadius",
                    responsive: false,
                    render: (value: any, onChange: any) => (
                        <Select
                            label="Border Radius"
                            value={String(value ?? "16")}
                            onChange={onChange}
                            options={[
                                { value: "0", label: "None (0px)" },
                                { value: "8", label: "Small (8px)" },
                                { value: "12", label: "Medium (12px)" },
                                { value: "16", label: "Large (16px)" },
                                { value: "24", label: "Extra Large (24px)" },
                            ]}
                        />
                    ),
                },
                {
                    name: "typography",
                    responsive: true,
                    render: (value: any, onChange: any) => (
                        <Typography value={value} onChange={onChange} />
                    ),
                },
            ],
        },
        {
            tab: "Advanced",
            section: "Spacing",
            controls: [
                {
                    name: "margin",
                    responsive: true,
                    render: (value: any, onChange: any) => <Dimensions type="margin" value={value} onChange={onChange} />,
                },
                {
                    name: "padding",
                    responsive: true,
                    render: (value: any, onChange: any) => <Dimensions type="padding" value={value} onChange={onChange} />,
                },
            ],
        },
    ],

    render: (element: any) => {
        const marginObj = element.schema.advanced?.margin || {};
        const paddingObj = element.schema.advanced?.padding || {};

        return (
            <div
                style={{
                    boxSizing: "border-box",
                    marginTop: `${marginObj.top ?? 0}px`,
                    marginRight: `${marginObj.right ?? 0}px`,
                    marginBottom: `${marginObj.bottom ?? 24}px`,
                    marginLeft: `${marginObj.left ?? 0}px`,
                    paddingTop: `${paddingObj.top ?? 0}px`,
                    paddingRight: `${paddingObj.right ?? 0}px`,
                    paddingBottom: `${paddingObj.bottom ?? 0}px`,
                    paddingLeft: `${paddingObj.left ?? 0}px`,
                }}
            >
                <CompareElementClient schema={element.schema} />
            </div>
        );
    },
};

export default compareElement;
