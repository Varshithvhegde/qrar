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
  const [files, setFiles] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      acceptedFiles.forEach((file) => loadModel(file));
    },
  });

  useEffect(() => {
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0xf0f0f0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(10, 10, 10);
    sceneRef.current.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(-10, -10, 10);
    sceneRef.current.add(pointLight);

    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf0f0f0, 1);

    controlsRef.current = new OrbitControls(cameraRef.current, renderer.domElement);

    const gridHelper = new THREE.GridHelper(10, 10);
    sceneRef.current.add(gridHelper);

    const animate = () => {
      requestAnimationFrame(animate);
      controlsRef.current.update();
      renderer.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => {
      renderer.dispose();
    };
  }, []);

  const loadModel = (file) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      URL.createObjectURL(file),
      (gltf) => {
        const modelGroup = new THREE.Group();
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        model.position.copy(center);
        model.position.y += size / 2;

        modelGroup.add(model);
        modelGroup.name = file.name;
        sceneRef.current.add(modelGroup);
      },
      undefined,
      (error) => console.error("Error loading model:", error)
    );
  };

  const handleModelSelection = (model) => {
    if (selectedModel === model) {
      setSelectedModel(null);
    } else {
      setSelectedModel(model);
    }
  };

  const handleCanvasClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      while (object.parent && object.parent.type !== "Scene") {
        object = object.parent;
      }
      handleModelSelection(object);
    } else {
      handleModelSelection(null);
    }
  };

  const handleMouseDown = (event) => {
    if (selectedModel) {
      controlsRef.current.enabled = false;
      setIsDragging(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setDragStart({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging && selectedModel) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(plane, intersection)) {
        selectedModel.position.set(intersection.x, selectedModel.position.y, intersection.z);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      controlsRef.current.enabled = true;
      setIsDragging(false);
    }
  };

  return (
    <Card className="w-full h-screen">
      <CardHeader>
        <CardTitle>3D Model Viewer</CardTitle>
      </CardHeader>
      <CardContent>
        <div {...getRootProps()} className="border-dashed border-2 p-4 cursor-pointer bg-white rounded-md">
          <input {...getInputProps()} />
          <p className="text-gray-600">Drag and drop 3D model files here or click to select</p>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        {selectedModel && <div className="fixed top-4 left-4 bg-white px-4 py-2">Selected Model: {selectedModel.name}</div>}
      </CardContent>
    </Card>
  );
};

export default ThreeDModelViewer;
