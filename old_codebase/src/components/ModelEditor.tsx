// src/components/ModelEditor.tsx - Interactive 3D model editor for users
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  TransformControls,
  Environment,
  Center,
} from "@react-three/drei";
import { Suspense } from "react";
import { XR, ARButton, VRButton, createXRStore } from "@react-three/xr";
import { Group, type Object3D } from "three";
import {
  Move3d,
  RotateCcw,
  Scale,
  Download,
  Save,
  Undo,
  Redo,
  Eye,
  EyeOff,
} from "lucide-react";

interface ModelEditorProps {
  modelSrc: string;
  onSave?: (modelData: any) => void;
  onExport?: (format: "glb" | "gltf") => void;
  style?: React.CSSProperties;
}

interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

type TransformMode = "translate" | "rotate" | "scale";

function EditableModel({
  url,
  onTransformChange,
  transformMode,
  transform,
}: {
  url: string;
  onTransformChange: (transform: Transform) => void;
  transformMode: TransformMode;
  transform: Transform;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<Group | null>(null);
  const transformRef = useRef<any>(null);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.fromArray(transform.position);
      modelRef.current.rotation.fromArray(transform.rotation);
      modelRef.current.scale.fromArray(transform.scale);
    }
  }, [transform]);

  const handleTransformEnd = useCallback(() => {
    if (modelRef.current) {
      const newTransform: Transform = {
        position: modelRef.current.position.toArray() as [
          number,
          number,
          number,
        ],
        rotation: modelRef.current.rotation.toArray().slice(0, 3) as [
          number,
          number,
          number,
        ],
        scale: modelRef.current.scale.toArray() as [number, number, number],
      };
      onTransformChange(newTransform);
    }
  }, [onTransformChange]);

  return (
    <Center>
      <group ref={modelRef}>
        <primitive object={scene.clone()} />
        <TransformControls
          ref={transformRef}
          object={modelRef.current as unknown as Object3D | undefined}
          mode={transformMode}
          onObjectChange={handleTransformEnd}
        />
      </group>
    </Center>
  );
}

function CameraController({ resetTrigger }: { resetTrigger: number }) {
  const { camera } = useThree();

  useEffect(() => {
    // Reset camera position
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
  }, [resetTrigger, camera]);

  return null;
}

const ModelEditor: React.FC<ModelEditorProps> = ({
  modelSrc,
  onSave,
  onExport,
  style = { width: "100%", height: "600px" },
}) => {
  const [transformMode, setTransformMode] =
    useState<TransformMode>("translate");
  const [currentTransform, setCurrentTransform] = useState<Transform>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const [history, setHistory] = useState<Transform[]>([currentTransform]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showWireframe, setShowWireframe] = useState(false);
  const [environment, setEnvironment] = useState<string>("warehouse");
  const [lighting, setLighting] = useState({
    ambient: 0.5,
    directional: 0.8,
    point: 0.4,
  });
  const [cameraResetTrigger, setCameraResetTrigger] = useState(0);
  const [isXRSupported, setIsXRSupported] = useState(false);

  const xrStore = React.useMemo(() => createXRStore(), []);

  // Check XR support
  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      navigator.xr
        ?.isSessionSupported("immersive-ar")
        .then(setIsXRSupported)
        .catch(() => setIsXRSupported(false));
    }
  }, []);

  const handleTransformChange = useCallback(
    (newTransform: Transform) => {
      setCurrentTransform(newTransform);
      // Add to history for undo/redo
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newTransform);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentTransform(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentTransform(history[newIndex]);
    }
  }, [history, historyIndex]);

  const resetTransform = useCallback(() => {
    const resetTransform: Transform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    handleTransformChange(resetTransform);
  }, [handleTransformChange]);

  const resetCamera = useCallback(() => {
    setCameraResetTrigger((prev) => prev + 1);
  }, []);

  const handleSave = useCallback(() => {
    const modelData = {
      transform: currentTransform,
      environment,
      lighting,
      wireframe: showWireframe,
      timestamp: Date.now(),
    };
    if (onSave) onSave(modelData);
  }, [currentTransform, environment, lighting, showWireframe, onSave]);

  const environments = [
    "apartment",
    "city",
    "dawn",
    "forest",
    "lobby",
    "night",
    "park",
    "studio",
    "sunset",
    "warehouse",
  ];

  return (
    <div
      style={style}
      className="relative overflow-hidden rounded-lg bg-gray-900"
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 rounded-lg bg-black/80 p-2">
        {/* Transform Tools */}
        <div className="flex gap-1 border-r border-gray-600 pr-2">
          <button
            onClick={() => setTransformMode("translate")}
            className={`rounded p-2 transition-colors ${
              transformMode === "translate"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title="Move (G)"
          >
            <Move3d size={16} />
          </button>
          <button
            onClick={() => setTransformMode("rotate")}
            className={`rounded p-2 transition-colors ${
              transformMode === "rotate"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title="Rotate (R)"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setTransformMode("scale")}
            className={`rounded p-2 transition-colors ${
              transformMode === "scale"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title="Scale (S)"
          >
            <Scale size={16} />
          </button>
        </div>

        {/* History Tools */}
        <div className="flex gap-1 border-r border-gray-600 pr-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="rounded bg-gray-700 p-2 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="rounded bg-gray-700 p-2 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
          </button>
        </div>

        {/* View Tools */}
        <div className="flex gap-1 border-r border-gray-600 pr-2">
          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className={`rounded p-2 transition-colors ${
              showWireframe
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title="Toggle Wireframe"
          >
            {showWireframe ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={resetCamera}
            className="rounded bg-gray-700 p-2 text-gray-300 hover:bg-gray-600"
            title="Reset Camera"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Action Tools */}
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="rounded bg-green-600 p-2 text-white hover:bg-green-700"
            title="Save (Ctrl+S)"
          >
            <Save size={16} />
          </button>
          {onExport && (
            <button
              onClick={() => onExport("glb")}
              className="rounded bg-blue-600 p-2 text-white hover:bg-blue-700"
              title="Export GLB"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="absolute top-4 right-4 z-20 max-h-96 w-64 overflow-y-auto rounded-lg bg-black/80 p-4">
        <h3 className="mb-3 font-semibold text-white">Properties</h3>

        {/* Transform Values */}
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-300">Transform</h4>
          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400">Position:</label>
              <div className="text-white">
                X: {currentTransform.position[0].toFixed(2)} | Y:{" "}
                {currentTransform.position[1].toFixed(2)} | Z:{" "}
                {currentTransform.position[2].toFixed(2)}
              </div>
            </div>
            <div>
              <label className="text-gray-400">Rotation:</label>
              <div className="text-white">
                X: {((currentTransform.rotation[0] * 180) / Math.PI).toFixed(1)}
                ° | Y:{" "}
                {((currentTransform.rotation[1] * 180) / Math.PI).toFixed(1)}° |
                Z: {((currentTransform.rotation[2] * 180) / Math.PI).toFixed(1)}
                °
              </div>
            </div>
            <div>
              <label className="text-gray-400">Scale:</label>
              <div className="text-white">
                X: {currentTransform.scale[0].toFixed(2)} | Y:{" "}
                {currentTransform.scale[1].toFixed(2)} | Z:{" "}
                {currentTransform.scale[2].toFixed(2)}
              </div>
            </div>
            <button
              onClick={resetTransform}
              className="mt-2 w-full rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500"
            >
              Reset Transform
            </button>
          </div>
        </div>

        {/* Environment */}
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-300">
            Environment
          </h4>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="w-full rounded bg-gray-700 p-1 text-xs text-white"
          >
            {environments.map((env) => (
              <option key={env} value={env}>
                {env.charAt(0).toUpperCase() + env.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Lighting */}
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-300">Lighting</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400">
                Ambient: {lighting.ambient}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lighting.ambient}
                onChange={(e) =>
                  setLighting((prev) => ({
                    ...prev,
                    ambient: parseFloat(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">
                Directional: {lighting.directional}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lighting.directional}
                onChange={(e) =>
                  setLighting((prev) => ({
                    ...prev,
                    directional: parseFloat(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">
                Point: {lighting.point}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lighting.point}
                onChange={(e) =>
                  setLighting((prev) => ({
                    ...prev,
                    point: parseFloat(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* XR Buttons */}
      {isXRSupported && (
        <div className="absolute bottom-4 left-4 z-20 flex gap-2">
          <ARButton store={xrStore} />
          <VRButton store={xrStore} />
        </div>
      )}

      {/* Canvas */}
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
        <XR store={xrStore}>
          <CameraController resetTrigger={cameraResetTrigger} />

          <ambientLight intensity={lighting.ambient} />
          <directionalLight
            intensity={lighting.directional}
            position={[5, 5, 5]}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight intensity={lighting.point} position={[-5, -5, -5]} />

          <Suspense fallback={null}>
            <EditableModel
              url={modelSrc}
              onTransformChange={handleTransformChange}
              transformMode={transformMode}
              transform={currentTransform}
            />
            <Environment preset={environment as any} />
          </Suspense>

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={1}
            maxDistance={20}
          />

          {/* Ground plane for reference */}
          <mesh
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -1, 0]}
          >
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#333333" transparent opacity={0.5} />
          </mesh>
        </XR>
      </Canvas>
    </div>
  );
};

export default ModelEditor;
