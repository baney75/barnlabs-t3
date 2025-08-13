// src/components/EnhancedDashboardEditor.tsx - Enhanced user dashboard editor matching admin quality
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Loader2,
  Save,
  FileText,
  Image,
  Video,
  Box,
} from "lucide-react";
import type { Section } from "../types";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface EnhancedDashboardEditorProps {
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  onSave: () => Promise<void>;
  assets: Array<{ name: string; url: string; file_type: string }>;
  isLoading?: boolean;
}

const EnhancedDashboardEditor: React.FC<EnhancedDashboardEditorProps> = ({
  sections,
  onSectionsChange,
  onSave,
  assets,
  isLoading = false,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSections.length) return;
    [newSections[index], newSections[newIndex]] = [
      newSections[newIndex],
      newSections[index],
    ];
    onSectionsChange(newSections);
  };

  const addSection = () => {
    onSectionsChange([...sections, { type: "markdown", data: "" }]);
  };

  const removeSection = (index: number) => {
    onSectionsChange(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, newSectionData: Partial<Section>) => {
    const updatedSections = sections.map((section, i) => {
      if (i === index) {
        return { ...section, ...newSectionData };
      }
      return section;
    });
    onSectionsChange(updatedSections);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "markdown":
        return <FileText size={16} />;
      case "image":
        return <Image size={16} />;
      case "video":
        return <Video size={16} />;
      case "model":
        return <Box size={16} />;
      case "embed":
        return <Video size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getSectionTypeColor = (type: string) => {
    switch (type) {
      case "markdown":
        return "from-blue-500 to-blue-600";
      case "image":
        return "from-green-500 to-green-600";
      case "video":
        return "from-purple-500 to-purple-600";
      case "model":
        return "from-orange-500 to-orange-600";
      case "embed":
        return "from-pink-500 to-pink-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  // Helper: build safe embed HTML for known providers (YouTube); otherwise pass through sanitized iframe/html
  const buildEmbedHtml = (input: string): string => {
    try {
      const url = new URL(input);
      const host = url.hostname.replace(/^www\./, "");
      // YouTube auto-detect
      if (host === "youtube.com" || host === "youtu.be") {
        let videoId = "";
        if (host === "youtu.be") {
          videoId = url.pathname.slice(1);
        } else if (url.pathname === "/watch") {
          videoId = url.searchParams.get("v") || "";
        } else if (url.pathname.startsWith("/embed/")) {
          videoId = url.pathname.split("/").pop() || "";
        }
        if (videoId) {
          return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        }
      }
      // Sketchfab detection
      if (host === "sketchfab.com") {
        // Accept direct embed URLs or model URLs; if it's a model page, attempt to transform to embed
        if (
          url.pathname.includes("/models/") &&
          !url.pathname.includes("/embed")
        ) {
          return `<iframe width="640" height="480" src="https://sketchfab.com${url.pathname}/embed" frameborder="0" allow="autoplay; fullscreen; xr-spatial-tracking" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>`;
        }
      }
      // If input already contains an iframe, return it after sanitize
      if (/<iframe/i.test(input)) return input;
      // Fallback: treat as generic URL in iframe
      return `<iframe src="${input}" width="100%" height="480" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    } catch {
      // Raw HTML fallback (sanitized later)
      return input;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {/* Palette icon removed */}
            </div>
            <div>
              <h3 className="text-xl font-bold">Dashboard Editor</h3>
              <p className="text-sm text-blue-100">
                Customize your personal dashboard content
              </p>
            </div>
          </div>
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur-sm">
            {sections.length} sections
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="max-h-96 space-y-6 overflow-y-auto p-6">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center bg-gradient-to-r ${getSectionTypeColor(
                    section.type,
                  )} rounded-lg text-white`}
                >
                  {getSectionIcon(section.type)}
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-700">
                    Section {index + 1}
                  </span>
                  <select
                    value={section.type}
                    onChange={(e) =>
                      updateSection(index, {
                        type: e.target.value as Section["type"],
                        data: "",
                      })
                    }
                    className="ml-2 border-0 bg-transparent text-xs font-medium text-gray-600 focus:ring-0"
                  >
                    <option value="markdown">Markdown</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="model">3D Model</option>
                    <option value="embed">HTML/Embed</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sections.length - 1}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => removeSection(index)}
                  className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Remove section"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-4">
              {section.type === "markdown" && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <textarea
                    value={section.data}
                    onChange={(e) =>
                      updateSection(index, { data: e.target.value })
                    }
                    placeholder="Enter your markdown content here..."
                    className="h-40 w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="rounded-lg border bg-white p-3">
                    <div className="mb-2 text-xs text-gray-500">
                      Live preview
                    </div>
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          marked(section.data || "", {
                            breaks: true,
                          }) as string,
                          {
                            ADD_TAGS: ["iframe"],
                            ADD_ATTR: [
                              "allow",
                              "allowfullscreen",
                              "frameborder",
                              "mozallowfullscreen",
                              "webkitallowfullscreen",
                              "xr-spatial-tracking",
                              "execution-while-out-of-viewport",
                              "execution-while-not-rendered",
                              "web-share",
                            ],
                            // Allow sketchfab embeds
                            FORBID_TAGS: [],
                            FORBID_ATTR: [],
                            ALLOW_DATA_ATTR: false,
                            ALLOW_UNKNOWN_PROTOCOLS: true,
                            USE_PROFILES: { html: true },
                          },
                        ),
                      }}
                    />
                  </div>
                </div>
              )}

              {(section.type === "image" ||
                section.type === "video" ||
                section.type === "model") && (
                <div className="space-y-3">
                  <select
                    value={section.data}
                    onChange={(e) =>
                      updateSection(index, { data: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an asset...</option>
                    {assets
                      .filter((asset) => {
                        if (section.type === "image")
                          return ["image", "svg"].includes(asset.file_type);
                        if (section.type === "video")
                          return asset.file_type === "video";
                        if (section.type === "model")
                          return asset.file_type === "model";
                        return false;
                      })
                      .map((asset) => (
                        <option key={asset.name} value={asset.url}>
                          {asset.name}
                        </option>
                      ))}
                  </select>
                  {section.type === "model" && assets.length > 0 && (
                    <p className="text-xs text-gray-500">
                      AR uses GLB via Google Scene Viewer and WebXR; no USDZ
                      required.
                    </p>
                  )}
                  {section.data && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-2 text-xs text-gray-600">Preview:</p>
                      <div className="flex h-24 w-full items-center justify-center rounded bg-gray-200">
                        {getSectionIcon(section.type)}
                        <span className="ml-2 text-sm text-gray-500">
                          {section.type.charAt(0).toUpperCase() +
                            section.type.slice(1)}{" "}
                          Asset
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {section.type === "embed" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={section.data}
                    onChange={(e) =>
                      updateSection(index, { data: e.target.value })
                    }
                    placeholder="Paste YouTube/Sketchfab URL or iframe HTML"
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="rounded-lg border bg-white p-3">
                    <div className="mb-2 text-xs text-gray-500">
                      Embed preview
                    </div>
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          buildEmbedHtml(section.data || ""),
                          {
                            ADD_TAGS: ["iframe"],
                            ADD_ATTR: [
                              "allow",
                              "allowfullscreen",
                              "frameborder",
                              "mozallowfullscreen",
                              "webkitallowfullscreen",
                              "xr-spatial-tracking",
                              "execution-while-out-of-viewport",
                              "execution-while-not-rendered",
                              "web-share",
                            ],
                            FORBID_TAGS: [],
                            FORBID_ATTR: [],
                            ALLOW_DATA_ATTR: false,
                            ALLOW_UNKNOWN_PROTOCOLS: true,
                            USE_PROFILES: { html: true },
                          },
                        ),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Add Section Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: sections.length * 0.05 }}
        >
          <button
            onClick={addSection}
            className="group w-full rounded-lg border-2 border-dashed border-gray-300 p-4 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="flex items-center justify-center space-x-2 text-gray-500 group-hover:text-blue-600">
              <Plus
                size={20}
                className="transition-transform duration-200 group-hover:rotate-90"
              />
              <span className="font-medium">Add New Section</span>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {sections.length} section{sections.length !== 1 ? "s" : ""}{" "}
            configured
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading || isSaving ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={18} />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2" size={18} />
                Save Dashboard
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedDashboardEditor;
