"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from 'lucide-react';
import Script from 'next/script';

// Firebase configuration remains the same
const firebaseConfig = {
  apiKey: "AIzaSyCAKQdjVR_YSCvc9OsffXVlys1dvr04IN4",
  authDomain: "varshith-world-peace.firebaseapp.com",
  databaseURL: "https://varshith-world-peace-default-rtdb.firebaseio.com",
  projectId: "varshith-world-peace",
  storageBucket: "varshith-world-peace.appspot.com",
  messagingSenderId: "337313037712",
  appId: "1:337313037712:web:12bf67d91b50868cbd8715",
  measurementId: "G-D5EV6VDMW8"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const ARImageTracker = () => {
  const [step, setStep] = useState('upload');
  const [trackerImage, setTrackerImage] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState({
    three: false,
    mindArCore: false,
    mindArThree: false
  });

  const containerRef = useRef(null);
  const mindARRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);

  // Check if all scripts are loaded
  const isAllScriptsLoaded = useCallback(() => {
    return Object.values(scriptsLoaded).every(loaded => loaded);
  }, [scriptsLoaded]);

  // Initialize AR
  const initAR = useCallback(async () => {
    if (!trackerImage || !selectedModel) {
      setError('Please select both an image and a model');
      return;
    }

    if (!isAllScriptsLoaded()) {
      setError('Required scripts are still loading. Please wait...');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Initializing AR...');

      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });

      // Cleanup previous instance
      if (mindARRef.current) {
        await mindARRef.current.stop();
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Check if MINDAR is available
      if (!window.MINDAR || !window.MINDAR.IMAGE) {
        throw new Error('MindAR is not properly initialized');
      }

      // Initialize compiler and compile image
      const compiler = new window.MINDAR.IMAGE.Compiler();
      const dataUrl = trackerImage.split(',')[1];
      const targetImage = await compiler.compileImageTargets(dataUrl);

      // Create MindAR instance
      const mindarThree = new window.MINDAR.IMAGE.MindARThree({
        container: containerRef.current,
        imageTargetSrc: targetImage,
        uiLoading: "yes",
        uiScanning: "yes",
        uiError: "yes",
      });

      const { renderer, scene, camera } = mindarThree;
      sceneRef.current = scene;
      rendererRef.current = renderer;

      // Add lighting
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Load and setup 3D model
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(selectedModel.url);
      const model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1);
      model.position.set(0, 0, 0);

      // Add model to anchor
      const anchor = mindarThree.addAnchor(0);
      anchor.group.add(model);

      // Start AR experience
      await mindarThree.start();
      mindARRef.current = mindarThree;
      setStep('ar');
      console.log('AR started successfully');

    } catch (error) {
      console.error('AR initialization error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access to use AR.');
      } else {
        setError('Error initializing AR: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [trackerImage, selectedModel, isAllScriptsLoaded]);

  // Other functions remain the same
  const handleImageUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    try {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        setTrackerImage(e.target.result);
        setStep('selectModel');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      const modelsRef = ref(storage, 'models');
      const modelsList = await listAll(modelsRef);
      
      const models = await Promise.all(
        modelsList.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return {
            id: item.name,
            name: item.name.split('.').slice(0, -1).join('.'),
            url: url
          };
        })
      );
      
      setAvailableModels(models);
    } catch (error) {
      setError('Error fetching models: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mindARRef.current) {
        mindARRef.current.stop();
      }
    };
  }, []);

  return (
    <>
      {/* Load required scripts */}
      <Script
        id="three-js"
        src="https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, three: true }))}
      />
      <Script
        id="mindar-image-core"
        src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, mindArCore: true }))}
      />
      <Script
        id="mindar-image-three"
        src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-three.prod.js"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, mindArThree: true }))}
        strategy="afterInteractive"
      />

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            AR Image Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
              <Button 
                variant="link" 
                className="ml-2 text-red-700" 
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {!isAllScriptsLoaded() && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              Loading required scripts... Please wait.
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isLoading || !isAllScriptsLoaded()}
              />
              {trackerImage && (
                <img 
                  src={trackerImage} 
                  alt="Target" 
                  className="max-w-xs rounded"
                />
              )}
            </div>
          )}

          {step === 'selectModel' && (
            <div className="grid grid-cols-2 gap-4">
              {availableModels.map((model) => (
                <Button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    initAR();
                  }}
                  variant="outline"
                  className="h-24"
                  disabled={!isAllScriptsLoaded()}
                >
                  {model.name}
                </Button>
              ))}
              <Button
                onClick={() => setStep('upload')}
                variant="outline"
              >
                Back
              </Button>
            </div>
          )}

          {step === 'ar' && (
            <div className="relative">
              <div ref={containerRef} className="w-full h-[600px]" />
              <div className="absolute top-4 right-4 space-y-2">
                <Button
                  onClick={() => setIsModelSelectOpen(true)}
                  variant="secondary"
                >
                  Change Model
                </Button>
                <Button
                  onClick={() => {
                    if (mindARRef.current) {
                      mindARRef.current.stop();
                    }
                    setStep('upload');
                  }}
                  variant="destructive"
                >
                  Exit AR
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                <p className="mt-2 text-center">Loading...</p>
              </div>
            </div>
          )}
        </CardContent>

        <Dialog open={isModelSelectOpen} onOpenChange={setIsModelSelectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select New Model</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {availableModels.map((model) => (
                <Button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setIsModelSelectOpen(false);
                    initAR();
                  }}
                  variant="outline"
                  className="h-24"
                >
                  {model.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </>
  );
};

export default ARImageTracker;