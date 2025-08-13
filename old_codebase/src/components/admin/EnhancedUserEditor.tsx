// src/components/admin/EnhancedUserEditor.tsx - Modern admin user dashboard editor
import React, { useState } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { useAdminApi } from "../../hooks/useAdminApi";
import {
  Loader2,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  User,
  Palette,
} from "lucide-react";
import { motion } from "framer-motion";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type {
  Section,
  EditState,
  AdminUser,
  UpdateUserRequest,
} from "../../types";

interface EnhancedUserEditorProps {
  user: AdminUser;
}

const EnhancedUserEditor: React.FC<EnhancedUserEditorProps> = ({ user }) => {
  const {
    state: { editStates, assets, isLoading: isContextLoading },
    dispatch,
  } = useAdmin();
  const adminApi = useAdminApi();
  const [isUpdating, setIsUpdating] = useState(false);

  const userEditState = editStates[user.id];

  const updateLocalState = <K extends keyof EditState>(
    field: K,
    value: EditState[K],
  ) => {
    dispatch({
      type: "UPDATE_EDIT_STATE",
      payload: { userId: user.id, field, value },
    });
  };

  const handleUpdateAndRefresh = async (
    field: string,
    payload: UpdateUserRequest,
  ) => {
    setIsUpdating(true);
    try {
      await adminApi.updateUserField(user.id, field, payload);
      const usersResponse = await adminApi.fetchUsers();
      if (usersResponse.success) {
        dispatch({ type: "SET_USERS", payload: usersResponse.users });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const sections = [...(userEditState?.sections || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [sections[index], sections[newIndex]] = [
      sections[newIndex],
      sections[index],
    ];
    updateLocalState("sections", sections);
  };

  const addSection = () =>
    updateLocalState("sections", [
      ...(userEditState?.sections || []),
      { type: "markdown", data: "" },
    ]);

  const removeSection = (index: number) =>
    updateLocalState(
      "sections",
      userEditState?.sections.filter((_, i) => i !== index) || [],
    );

  const updateSection = (index: number, newSectionData: Partial<Section>) => {
    const updatedSections =
      userEditState?.sections?.map((section: Section, i: number) => {
        if (i === index) {
          return { ...section, ...newSectionData };
        }
        return section;
      }) || [];
    updateLocalState("sections", updatedSections);
  };

  // Helper to build embed HTML
  const buildEmbedHtml = (input: string): string => {
    try {
      const url = new URL(input);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtube.com" || host === "youtu.be") {
        let videoId = "";
        if (host === "youtu.be") videoId = url.pathname.slice(1);
        else if (url.pathname === "/watch")
          videoId = url.searchParams.get("v") || "";
        else if (url.pathname.startsWith("/embed/"))
          videoId = url.pathname.split("/").pop() || "";
        if (videoId)
          return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      }
      if (host === "sketchfab.com") {
        if (
          url.pathname.includes("/models/") &&
          !url.pathname.includes("/embed")
        ) {
          return `<iframe width="640" height="480" src="https://sketchfab.com${url.pathname}/embed" frameborder="0" allow="autoplay; fullscreen; xr-spatial-tracking" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>`;
        }
      }
      if (/<iframe/i.test(input)) return input;
      return `<iframe src="${input}" width="100%" height="480" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    } catch {
      return input;
    }
  };

  if (!userEditState) return null;
  const isLoading = isContextLoading || isUpdating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-t border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100"
    >
      {/* Header */}
      <div className="border-b border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="flex items-center text-xl font-bold text-gray-800">
                <Palette className="mr-2 h-5 w-5 text-blue-600" />
                Dashboard Editor
              </h3>
              <p className="text-sm text-gray-600">
                Editing dashboard for{" "}
                <span className="font-semibold text-blue-600">
                  {user.username}
                </span>
              </p>
            </div>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
            {userEditState.sections?.length || 0} sections
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-6 p-6">
        {userEditState.sections?.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <select
                  value={section.type}
                  onChange={(e) =>
                    updateSection(index, { type: e.target.value })
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="markdown">📝 Markdown</option>
                  <option value="model">🎨 3D Model</option>
                  <option value="video">🎬 Video</option>
                  <option value="pdf">📄 PDF</option>
                  <option value="embed">🌐 HTML/Embed</option>
                </select>
              </div>

              {/* Section Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  className="rounded-lg p-2 text-gray-500 transition-all hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveSection(index, "down")}
                  disabled={index === (userEditState.sections?.length || 0) - 1}
                  className="rounded-lg p-2 text-gray-500 transition-all hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => removeSection(index)}
                  className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-50 hover:text-red-700"
                  title="Remove section"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-4">
              {section.type === "markdown" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Markdown Content
                  </label>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <textarea
                      value={section.data}
                      onChange={(e) =>
                        updateSection(index, { data: e.target.value })
                      }
                      placeholder="Enter your markdown content here..."
                      className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      rows={8}
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
                </div>
              ) : section.type === "embed" ? (
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
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select Asset
                  </label>
                  <select
                    value={section.data}
                    onChange={(e) =>
                      updateSection(index, { data: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an asset...</option>
                    {assets
                      .filter((asset) => {
                        if (section.type === "model")
                          return asset.file_type === "model";
                        if (section.type === "video")
                          return asset.file_type === "video";
                        if (section.type === "pdf")
                          return asset.file_type === "pdf";
                        return true;
                      })
                      .map((asset) => (
                        <option key={asset.name} value={asset.url}>
                          {asset.file_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Add Section Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <button
            onClick={addSection}
            className="group flex items-center rounded-xl border-2 border-dashed border-blue-300 px-6 py-4 text-blue-600 transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
          >
            <Plus
              size={20}
              className="mr-2 transition-transform duration-200 group-hover:rotate-90"
            />
            <span className="font-medium">Add New Section</span>
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {userEditState.sections?.length || 0} section
            {(userEditState.sections?.length || 0) !== 1 ? "s" : ""} configured
          </div>
          <button
            onClick={() =>
              handleUpdateAndRefresh("dashboard_content", {
                dashboard_content: JSON.stringify(userEditState.sections),
              })
            }
            disabled={isLoading}
            className="flex items-center rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-white shadow-md transition-all duration-200 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={18} />
                Saving Changes...
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                Save Dashboard
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedUserEditor;
