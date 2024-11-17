"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, RotateCw, Maximize, Upload, Trash2 } from "lucide-react";

const TransformMode = {
  TRANSLATE: 'translate',
  ROTATE: 'rotate',
  SCALE: 'scale'
};

const ThreeDModelViewer = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const modelGroupRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [transformMode, setTransformMode] = useState(TransformMode.TRANSLATE);
  const [modelInfo, setModelInfo] = useState(null);
  const animationFrameRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'model/gltf-binary': ['.glb'],
      'model/gltf+json': ['.gltf']
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        loadModel(acceptedFiles[0]);
      }
    }
  });

  // Initialize scene
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Scene Setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf4f4f5);
      sceneRef.current = scene;

      // Create a group to hold the model
      const modelGroup = new THREE.Group();
      scene.add(modelGroup);
      modelGroupRef.current = modelGroup;

      // Renderer Setup
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // Camera Setup
      const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
      const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      camera.position.set(5, 5, 5);
      cameraRef.current = camera;

      // Lighting Setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // Grid Helper
      const grid = new THREE.GridHelper(20, 20, 0x888888, 0x888888);
      grid.material.opacity = 0.2;
      grid.material.transparent = true;
      scene.add(grid);

      // Transform Controls - using imported TransformControls
      const transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.addEventListener('dragging-changed', (event) => {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = !event.value;
        }
      });
      transformControls.setSpace('local');
      transformControls.setSize(0.75);
      if(transformControls instanceof THREE.Object3D){
      scene.add(transformControls);
      }
      transformControlsRef.current = transformControls;

      // Orbit Controls - initialize after transform controls
      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControlsRef.current = orbitControls;

      // Handle Resize
      const handleResize = () => {
        if (!canvasRef.current) return;
        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;
        
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      // Animation Loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.update();
        }
        renderer.render(scene, camera);
      };
      animate();

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (transformControlsRef.current) {
          scene.remove(transformControlsRef.current);
          transformControlsRef.current.dispose();
        }
        if (orbitControlsRef.current) {
          orbitControlsRef.current.dispose();
        }
        renderer.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      };
    } catch (error) {
      console.error("Error initializing scene:", error);
    }
  }, []);

  // Update transform mode
  useEffect(() => {
    if (transformControlsRef.current && modelGroupRef.current && selectedModel) {
      transformControlsRef.current.setMode(transformMode);
      transformControlsRef.current.attach(modelGroupRef.current);
    }
  }, [transformMode, selectedModel]);

  const loadModel = (file) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Clear existing model
    if (modelGroupRef.current) {
      while (modelGroupRef.current.children.length > 0) {
        const child = modelGroupRef.current.children[0];
        modelGroupRef.current.remove(child);
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.detach();
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const modelData = event.target.result;
      gltfLoader.parse(
        modelData,
        '',
        (gltf) => {
          const model = gltf.scene;
          
          // Setup model
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Center and scale model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.multiplyScalar(scale);
          
          model.position.sub(center.multiplyScalar(scale));
          model.position.y = 0;

          // Add to group
          if (modelGroupRef.current) {
            modelGroupRef.current.add(model);
            setSelectedModel(model);
            
            // Attach transform controls to the group
            if (transformControlsRef.current) {
              transformControlsRef.current.attach(modelGroupRef.current);
            }
          }
          
          // Update model info
          setModelInfo({
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            type: file.type
          });
        },
        (error) => {
          console.error('Error loading model:', error);
        }
      );
    };
    reader.readAsArrayBuffer(file);
  };

  const removeModel = () => {
    if (modelGroupRef.current) {
      while (modelGroupRef.current.children.length > 0) {
        const child = modelGroupRef.current.children[0];
        modelGroupRef.current.remove(child);
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.detach();
      }
      setSelectedModel(null);
      setModelInfo(null);
    }
  };

  return (
    <Card className="w-full h-screen bg-zinc-50">
      <CardContent className="p-0 h-full relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />

        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white p-2 rounded-lg shadow-lg">
          <Button
            variant={transformMode === TransformMode.TRANSLATE ? "default" : "secondary"}
            size="icon"
            onClick={() => setTransformMode(TransformMode.TRANSLATE)}
            title="Move"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant={transformMode === TransformMode.ROTATE ? "default" : "secondary"}
            size="icon"
            onClick={() => setTransformMode(TransformMode.ROTATE)}
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant={transformMode === TransformMode.SCALE ? "default" : "secondary"}
            size="icon"
            onClick={() => setTransformMode(TransformMode.SCALE)}
            title="Scale"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {!selectedModel && (
          <div 
            {...getRootProps()} 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64"
          >
            <div className={`p-8 rounded-lg border-2 border-dashed transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
            }`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="text-center">
                  Drag & drop a 3D model here,<br />or click to select
                </p>
                <p className="text-xs text-gray-400">
                  Supports GLB and GLTF formats
                </p>
              </div>
            </div>
          </div>
        )}

        {modelInfo && (
          <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-sm">{modelInfo.name}</h3>
                <p className="text-xs text-gray-500">{modelInfo.size}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeModel}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ThreeDModelViewer;