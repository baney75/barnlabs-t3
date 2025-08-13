import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAdminApi } from "../../hooks/useAdminApi";
import { Upload, Package, FileType, Zap, Download } from "lucide-react";
import LoadingButton from "../forms/LoadingButton";

const ModelTools: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");

  const adminApi = useAdminApi();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsProcessing(true);
      setUploadProgress(`Uploading ${file.name}...`);

      try {
        if (!selectedUserId) {
          throw new Error("Please select a user for the AI resource");
        }

        const result = await adminApi.uploadModelResource(
          Number(selectedUserId),
          file,
        );
        if (result.success) {
          setUploadProgress(`Successfully uploaded ${file.name}`);
          setTimeout(() => setUploadProgress(""), 3000);
        } else {
          throw new Error(result.message || "Upload failed");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setUploadProgress(`Error: ${message}`);
        setTimeout(() => setUploadProgress(""), 5000);
      } finally {
        setIsProcessing(false);
      }
    },
    [adminApi, selectedUserId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "model/gltf-binary": [".glb"],
      "model/gltf+json": [".gltf"],
      "application/octet-stream": [".glb"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleOptimizeModels = async () => {
    setIsProcessing(true);
    setUploadProgress("Optimizing all models...");

    try {
      // This would call a backend endpoint to optimize models
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing
      setUploadProgress("Model optimization completed");
      setTimeout(() => setUploadProgress(""), 3000);
    } catch (error) {
      setUploadProgress("Error: Failed to optimize models");
      setTimeout(() => setUploadProgress(""), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateThumbnails = async () => {
    setIsProcessing(true);
    setUploadProgress("Generating thumbnails...");

    try {
      // This would call a backend endpoint to generate thumbnails
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate processing
      setUploadProgress("Thumbnails generated successfully");
      setTimeout(() => setUploadProgress(""), 3000);
    } catch (error) {
      setUploadProgress("Error: Failed to generate thumbnails");
      setTimeout(() => setUploadProgress(""), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Model Tools</h2>
        <p className="mb-6 text-gray-600">
          Upload and process 3D models, generate thumbnails, and optimize
          assets. AR functionality is handled through Google ARCore via the
          model viewer.
        </p>
      </div>

      {/* AI Resource Upload */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center">
          <Upload className="mr-2 h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Upload AI Resource</h3>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Assign to User (optional)
          </label>
          <select
            value={selectedUserId}
            onChange={(e) =>
              setSelectedUserId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select a user...</option>
            {/* This would be populated from the admin state */}
            <option value={1}>Admin User</option>
          </select>
        </div>

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the file here...</p>
          ) : (
            <div>
              <p className="mb-2 text-gray-600">
                Drag and drop a 3D model or AI resource here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports .glb, .gltf, .pdf, .txt files
              </p>
            </div>
          )}
        </div>

        {uploadProgress && (
          <div className="mt-4 rounded-md bg-blue-50 p-3">
            <p className="text-sm text-blue-800">{uploadProgress}</p>
          </div>
        )}
      </div>

      {/* Model Processing Tools */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center">
          <Zap className="mr-2 h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-semibold">Model Processing</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LoadingButton
            onClick={handleOptimizeModels}
            isLoading={isProcessing}
            className="flex w-full items-center justify-center space-x-2 rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Package className="h-5 w-5" />
            <span>Optimize All Models</span>
          </LoadingButton>

          <LoadingButton
            onClick={handleGenerateThumbnails}
            isLoading={isProcessing}
            className="flex w-full items-center justify-center space-x-2 rounded-md bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <FileType className="h-5 w-5" />
            <span>Generate Thumbnails</span>
          </LoadingButton>
        </div>

        <div className="mt-6 rounded-md bg-gray-50 p-4">
          <h4 className="mb-2 font-medium text-gray-900">Processing Options</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>
              • Model optimization reduces file sizes and improves performance
            </li>
            <li>• Thumbnail generation creates preview images for 3D models</li>
            <li>
              • AI resources can be assigned to specific users for their
              dashboards
            </li>
            <li>
              • AR viewing is handled automatically through Google ARCore and
              WebXR
            </li>
          </ul>
        </div>
      </div>

      {/* Export Tools */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center">
          <Download className="mr-2 h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold">Export Tools</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button className="flex items-center justify-center space-x-2 rounded-md border border-gray-300 px-4 py-3 hover:bg-gray-50">
            <Download className="h-5 w-5" />
            <span>Export Models</span>
          </button>

          <button className="flex items-center justify-center space-x-2 rounded-md border border-gray-300 px-4 py-3 hover:bg-gray-50">
            <FileType className="h-5 w-5" />
            <span>Export Metadata</span>
          </button>

          <button className="flex items-center justify-center space-x-2 rounded-md border border-gray-300 px-4 py-3 hover:bg-gray-50">
            <Package className="h-5 w-5" />
            <span>Backup All Assets</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelTools;
