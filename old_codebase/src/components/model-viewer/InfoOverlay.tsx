import React from "react";
import { motion } from "framer-motion";
import {
  Info,
  X,
  Cpu,
  Eye,
  RotateCcw,
  Layers,
  Grid3X3,
  FileText,
} from "lucide-react";

interface ModelInfo {
  vertices: number;
  faces: number;
  size: string;
}

interface InfoOverlayProps {
  dpr: number;
  environment: string;
  autoRotateEnabled: boolean;
  modelInfo: ModelInfo | null;
  setShowInfo: (v: boolean) => void;
}

const InfoOverlay: React.FC<InfoOverlayProps> = ({
  dpr,
  environment,
  autoRotateEnabled,
  modelInfo,
  setShowInfo,
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20, scale: 0.95 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: -20, scale: 0.95 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="absolute top-4 right-4 left-4 z-50 max-w-sm rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-900/95 to-gray-800/95 p-4 shadow-2xl backdrop-blur-md sm:right-auto sm:max-w-xs sm:p-5"
  >
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="absolute top-2 right-2 rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-700/50 hover:text-white"
      onClick={() => setShowInfo(false)}
      aria-label="Close info panel"
    >
      <X size={16} />
    </motion.button>

    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 p-2">
        <Info size={16} className="text-white" />
      </div>
      <h3 className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-sm font-semibold text-transparent text-white sm:text-base">
        Model Information
      </h3>
    </div>

    <div className="space-y-2 text-xs sm:text-sm">
      {/* Render Quality */}
      <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-2">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-gray-400" />
          <span className="text-gray-400">Quality:</span>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            dpr === 1
              ? "bg-gray-600/50 text-gray-300"
              : dpr === 1.5
                ? "bg-cyan-600/30 text-cyan-400"
                : "bg-purple-600/30 text-purple-400"
          }`}
        >
          {dpr === 1 ? "Standard" : dpr === 1.5 ? "High" : "Ultra"}
        </span>
      </div>

      {/* Environment */}
      <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-2">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-gray-400" />
          <span className="text-gray-400">Environment:</span>
        </div>
        <span className="font-medium text-gray-300 capitalize">
          {environment}
        </span>
      </div>

      {/* Auto-rotate */}
      <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-2">
        <div className="flex items-center gap-2">
          <RotateCcw size={14} className="text-gray-400" />
          <span className="text-gray-400">Auto-rotate:</span>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            autoRotateEnabled
              ? "bg-cyan-600/30 text-cyan-400"
              : "bg-gray-600/50 text-gray-400"
          }`}
        >
          {autoRotateEnabled ? "On" : "Off"}
        </span>
      </div>

      {modelInfo && (
        <>
          {/* Vertices */}
          <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-2">
            <div className="flex items-center gap-2">
              <Grid3X3 size={14} className="text-gray-400" />
              <span className="text-gray-400">Vertices:</span>
            </div>
            <span className="font-medium text-purple-400">
              {modelInfo.vertices.toLocaleString()}
            </span>
          </div>

          {/* Faces */}
          <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-2">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-gray-400" />
              <span className="text-gray-400">Faces:</span>
            </div>
            <span className="font-medium text-cyan-400">
              {modelInfo.faces.toLocaleString()}
            </span>
          </div>

          {/* Size */}
          <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-2">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-400" />
              <span className="text-gray-400">Size:</span>
            </div>
            <span className="font-medium text-gray-300">{modelInfo.size}</span>
          </div>
        </>
      )}
    </div>

    {/* Performance tip */}
    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-600/20 p-2">
      <p className="text-xs text-blue-300">
        💡 Use Quality toggle for better performance on mobile devices
      </p>
    </div>
  </motion.div>
);

export default InfoOverlay;
