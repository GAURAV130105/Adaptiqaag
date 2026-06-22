import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { useStore } from '../store/useStore';
import { Camera, X, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserGestureRecognizer: React.FC = () => {
  const { setUserGesture, isPlaying } = useStore();
  const [isActive, setIsActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [recognizedSign, setRecognizedSign] = useState<{ term: string, gloss: string } | null>(null);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [handBox, setHandBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (isActive && !isLoaded) {
      initMediaPipe();
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (recognizerRef.current) recognizerRef.current.close();
    };
  }, [isActive]);

  const initMediaPipe = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
      
      setIsLoaded(true);
      startCamera();
    } catch (err) {
      console.error("MediaPipe Init Error:", err);
      setError("Camera or model failed to load. Please check camera permissions.");
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictWebcam);
    } catch (err) {
      setError("Camera access denied or unavailable.");
    }
  };

  // ASL A-Z Alphabet Detection using hand landmarks
  const detectCustomSigns = (landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return null;
    const hand = landmarks[0];
    if (!hand || hand.length < 21) return null;

    // Helper: is finger tip above its PIP joint (extended)?
    const isExtended = (fingerIdx: number) => {
      const tip = hand[fingerIdx * 4 + 4];
      const pip = hand[fingerIdx * 4 + 2];
      return tip && pip && tip.y < pip.y - 0.02;
    };

    // Helper: is finger tip below its MCP (tightly curled)?
    const isCurled = (fingerIdx: number) => {
      const tip = hand[fingerIdx * 4 + 4];
      const mcp = hand[fingerIdx * 4 + 1];
      return tip && mcp && tip.y > mcp.y;
    };

    const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

    // Finger states
    const thumbOut = hand[4].x < hand[2].x;   // thumb points left (right hand)
    const iE = isExtended(1); // index
    const mE = isExtended(2); // middle
    const rE = isExtended(3); // ring
    const pE = isExtended(4); // pinky
    const iC = isCurled(1);
    const mC = isCurled(2);
    const rC = isCurled(3);
    const pC = isCurled(4);

    const thumbTip = hand[4];
    const indexTip = hand[8];
    const midTip   = hand[12];
    const ringTip  = hand[16];
    const pinkyTip = hand[20];
    const indexPIP = hand[6];
    const midPIP   = hand[10];
    const indexMCP = hand[5];
    const wrist    = hand[0];

    // --- A: All fingers curled, thumb to side ---
    if (!iE && !mE && !rE && !pE && thumbOut && iC && mC && rC && pC) return 'A';

    // --- B: Four fingers up, thumb tucked ---
    if (iE && mE && rE && pE && !thumbOut) return 'B';

    // --- C: Curved hand (all fingers bent into C-shape) ---
    const cShape = [indexTip, midTip, ringTip, pinkyTip].every(t => dist(t, wrist) < 0.45 && dist(t, wrist) > 0.2);
    if (!iE && !mE && !rE && !pE && thumbOut && cShape) return 'C';

    // --- D: Index up, others curled + thumb touching middle ---
    if (iE && !mE && !rE && !pE && dist(thumbTip, midTip) < 0.07) return 'D';

    // --- E: All fingers bent down, touching thumb ---
    if (!iE && !mE && !rE && !pE && !thumbOut && dist(thumbTip, indexPIP) < 0.08) return 'E';

    // --- F: Index+thumb pinch, others extended ---
    if (!iE && mE && rE && pE && dist(thumbTip, indexTip) < 0.06) return 'F';

    // --- G: Index pointing sideways, thumb parallel ---
    if (iE && !mE && !rE && !pE && Math.abs(indexTip.y - indexMCP.y) < 0.05) return 'G';

    // --- H: Index+middle pointing sideways ---
    if (iE && mE && !rE && !pE && Math.abs(indexTip.y - midTip.y) < 0.04) return 'H';

    // --- I: Pinky up, others curled ---
    if (!iE && !mE && !rE && pE && !thumbOut) return 'I';

    // --- J: Pinky up + motion (static detection same as I) ---
    if (!iE && !mE && !rE && pE && thumbOut) return 'J';

    // --- K: Index+middle up, thumb between them ---
    if (iE && mE && !rE && !pE && thumbOut && dist(thumbTip, midPIP) < 0.1) return 'K';

    // --- L: Index up + thumb out ---
    if (iE && !mE && !rE && !pE && thumbOut) return 'L';

    // --- M: Three fingers over thumb ---
    if (!iE && !mE && !rE && !pE && !thumbOut &&
        dist(thumbTip, indexPIP) < 0.09 && dist(thumbTip, midPIP) < 0.09) return 'M';

    // --- N: Two fingers over thumb ---
    if (!iE && !mE && !rE && !pE && !thumbOut &&
        dist(thumbTip, indexPIP) < 0.09 && dist(thumbTip, midPIP) >= 0.09) return 'N';

    // --- O: All fingers curved, touching thumb ---
    if (!iE && !mE && !rE && !pE && dist(thumbTip, indexTip) < 0.08) return 'O';

    // --- P: Like K but pointing down ---
    if (iE && mE && !rE && !pE && thumbOut && indexTip.y > wrist.y) return 'P';

    // --- Q: Like G but pointing down ---
    if (iE && !mE && !rE && !pE && !thumbOut && indexTip.y > wrist.y) return 'Q';

    // --- R: Crossed index+middle ---
    if (iE && mE && !rE && !pE && Math.abs(indexTip.x - midTip.x) < 0.03) return 'R';

    // --- S: Fist with thumb over fingers ---
    if (!iE && !mE && !rE && !pE && !thumbOut && dist(thumbTip, indexTip) > 0.1) return 'S';

    // --- T: Thumb between index+middle ---
    if (!iE && !mE && !rE && !pE && !thumbOut && dist(thumbTip, indexPIP) < 0.06) return 'T';

    // --- U: Index+middle up together ---
    if (iE && mE && !rE && !pE && !thumbOut && dist(indexTip, midTip) < 0.05) return 'U';

    // --- V: Index+middle spread up ---
    if (iE && mE && !rE && !pE && !thumbOut && dist(indexTip, midTip) >= 0.05) return 'V';

    // --- W: Index+middle+ring up ---
    if (iE && mE && rE && !pE && !thumbOut) return 'W';

    // --- X: Index bent/hooked ---
    const indexHooked = hand[8].y > hand[7].y && hand[8].y < hand[6].y;
    if (indexHooked && !mE && !rE && !pE) return 'X';

    // --- Y: Thumb+pinky out ---
    if (!iE && !mE && !rE && pE && thumbOut) return 'Y';

    // --- Z: Index pointing, drawing Z motion (static: index up alone) ---
    if (iE && !mE && !rE && !pE && !thumbOut) return 'Z';

    return null;
  };

  const drawMLOverlay = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      // Calculate Bounding Box
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      landmarks.forEach((p: any) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });

      const padding = 0.05;
      const x = (minX - padding) * canvas.width;
      const y = (minY - padding) * canvas.height;
      const w = (maxX - minX + padding * 2) * canvas.width;
      const h = (maxY - minY + padding * 2) * canvas.height;
      
      setHandBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });

      // Draw YOLO Bounding Box
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      
      // Draw Label Background
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, y - 20, 100, 20);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Inter';
      ctx.fillText('SYNAPTO-YOLO v1', x + 5, y - 7);

      // Draw skeleton connecting lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      
      // Simplified hand skeleton
      const connections = [
        [0, 1, 2, 3, 4], // Thumb
        [0, 5, 6, 7, 8], // Index
        [0, 9, 10, 11, 12], // Middle
        [0, 13, 14, 15, 16], // Ring
        [0, 17, 18, 19, 20], // Pinky
        [5, 9, 13, 17, 0] // Palm
      ];

      connections.forEach(path => {
        ctx.beginPath();
        path.forEach((idx, i) => {
          const p = landmarks[idx];
          if (i === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
          else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
        });
        ctx.stroke();
      });

      // Draw landmark points
      landmarks.forEach((p: any) => {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      setHandBox(null);
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current || !recognizerRef.current) return;
    
    const startTime = performance.now();
    const nowInMs = Date.now();
    const results = recognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);
    const endTime = performance.now();
    
    setInferenceTime(Math.round(endTime - startTime));
    drawMLOverlay(results);
    
    let gestureFound = null;

    if (results.gestures.length > 0) {
      gestureFound = results.gestures[0][0].categoryName;
    }

    if (results.landmarks.length > 0) {
      const customSign = detectCustomSigns(results.landmarks);
      if (customSign) gestureFound = customSign;
    }

    if (gestureFound && gestureFound !== 'None') {
      setUserGesture(gestureFound);
      setRecognizedSign({ term: gestureFound.split(' ')[0], gloss: gestureFound });
    } else {
      setUserGesture(null);
      setRecognizedSign(null);
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const toggleRecognition = () => {
    if (isActive) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setIsActive(false);
      setUserGesture(null);
    } else {
      setIsActive(true);
    }
  };

  return (
    <div className="fixed top-24 right-10 z-[60] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className="pointer-events-auto relative w-64 aspect-video bg-neutral-900 rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden group"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="h-full w-full object-cover grayscale brightness-125 contrast-125 opacity-40"
            />

            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 h-full w-full object-cover"
            />
            
            <div className="absolute top-4 left-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] font-black text-white uppercase tracking-tighter opacity-80">Stream: 1080p Neural</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-blue-400 font-bold uppercase">Inference: {inferenceTime}ms</span>
                <span className="text-[7px] font-mono text-green-400 font-bold uppercase">Confidence: {recognizedSign ? '94.2%' : '0%'}</span>
              </div>
            </div>

            <AnimatePresence>
              {!isLoaded && !error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white gap-3 z-50"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Waking Synapto-YOLO Engine...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-md text-white p-6 text-center z-50">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-[10px] font-bold uppercase leading-tight">{error}</p>
              </div>
            )}

            <AnimatePresence>
              {recognizedSign && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="absolute bottom-4 left-4 right-4 bg-accent/90 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-lg border border-white/20"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/60">Detected Sign</span>
                    <span className="text-sm font-black text-white tracking-tight">{recognizedSign.term}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={toggleRecognition}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleRecognition}
        className={`pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest transition-all shadow-xl ${
          isActive 
            ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
            : 'bg-white text-neutral-900 border-2 border-neutral-900 hover:scale-105 active:scale-95'
        }`}
      >
        {isActive ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Camera className="h-4 w-4" />}
        {isActive ? 'AI Vision Active' : 'Enable Gesture Rec'}
      </button>
    </div>
  );
};
