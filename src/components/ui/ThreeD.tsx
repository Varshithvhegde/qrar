"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useDropzone } from "react-dropzone";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ThreeDModelViewer = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlaneRef = useRef(null);
  const previousMousePosition = useRef(null);
  const modelsRef = useRef(new Map());

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      acceptedFiles.forEach((file) => loadModel(file));
    },
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    cameraRef.current = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    cameraRef.current.position.set(5, 5, 5);
    cameraRef.current.lookAt(0, 0, 0);

    // Renderer setup
    rendererRef.current = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    rendererRef.current.setSize(
      canvasRef.current.clientWidth,
      canvasRef.current.clientHeight
    );
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    sceneRef.current.add(directionalLight);

    // Controls
    controlsRef.current = new OrbitControls(
      cameraRef.current,
      rendererRef.current.domElement
    );
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.05;

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10);
    sceneRef.current.add(gridHelper);

    // Ground plane for dragging
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    dragPlaneRef.current = new THREE.Mesh(groundGeometry, groundMaterial);
    dragPlaneRef.current.rotation.x = -Math.PI / 2;
    dragPlaneRef.current.position.y = 0;
    dragPlaneRef.current.receiveShadow = true;
    sceneRef.current.add(dragPlaneRef.current);

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current) return;
      
      requestAnimationFrame(animate);
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Initial resize
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      rendererRef.current.dispose();
      controlsRef.current.dispose();
    };
  }, []);

  const loadModel = (file) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const url = URL.createObjectURL(file);
    gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        
        // Add unique identifier and configure model
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData.modelId = file.name;
            
            // Create a new material with emissive properties
            const newMaterial = new THREE.MeshStandardMaterial({
              ...child.material,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0
            });
            child.material = newMaterial;
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
        
        model.name = file.name;
        model.userData.modelId = file.name;
        
        modelsRef.current.set(file.name, model);
        sceneRef.current.add(model);
        
        URL.revokeObjectURL(url);
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        URL.revokeObjectURL(url);
      }
    );
  };

  const handleModelSelection = (model) => {
    // Deselect previous model
    if (selectedModel) {
      selectedModel.traverse((child) => {
        if (child.isMesh) {
          child.material.emissive.setHex(0x000000);
          child.material.emissiveIntensity = 0;
        }
      });
    }

    // Select new model
    if (model && model !== selectedModel) {
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.emissive.setHex(0x666666);
          child.material.emissiveIntensity = 0.5;
        }
      });
      setSelectedModel(model);
    } else {
      setSelectedModel(null);
    }
  };

  const handleCanvasClick = (event) => {
    if (isDragging || !sceneRef.current || !cameraRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // Get all meshes in the scene except the drag plane
    const meshes = [];
    sceneRef.current.traverse((object) => {
      if (object.isMesh && object !== dragPlaneRef.current) {
        meshes.push(object);
      }
    });

    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      let modelRoot = hitObject;
      
      // Find the root model object
      while (modelRoot.parent && !modelRoot.userData.modelId) {
        modelRoot = modelRoot.parent;
      }
      
      if (modelRoot.userData.modelId) {
        const model = modelsRef.current.get(modelRoot.userData.modelId);
        handleModelSelection(model);
      }
    } else {
      handleModelSelection(null);
    }
  };

  const getMousePositionOnPlane = (event) => {
    if (!sceneRef.current || !cameraRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObject(dragPlaneRef.current);
    return intersects.length > 0 ? intersects[0].point : null;
  };

  const handleMouseDown = (event) => {
    if (selectedModel && event.button === 0) {
      event.preventDefault();
      controlsRef.current.enabled = false;
      setIsDragging(true);
      previousMousePosition.current = getMousePositionOnPlane(event);
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging && selectedModel && previousMousePosition.current) {
      const currentPosition = getMousePositionOnPlane(event);
      
      if (currentPosition && previousMousePosition.current) {
        const delta = new THREE.Vector3().subVectors(
          currentPosition,
          previousMousePosition.current
        );
        
        selectedModel.position.add(new THREE.Vector3(delta.x, 0, delta.z));
        previousMousePosition.current = currentPosition;
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      controlsRef.current.enabled = true;
      setIsDragging(false);
      previousMousePosition.current = null;
    }
  };

  return (
    <Card className="w-full h-screen">
      <CardHeader>
        <CardTitle>3D Model Viewer</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className="border-dashed border-2 p-4 m-4 cursor-pointer bg-white rounded-md"
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">
            Drag and drop 3D model files here or click to select
          </p>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-[calc(100vh-200px)]"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {selectedModel && (
          <div className="fixed top-4 left-4 bg-white px-4 py-2 rounded-md shadow-md">
            Selected Model: {selectedModel.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ThreeDModelViewer;