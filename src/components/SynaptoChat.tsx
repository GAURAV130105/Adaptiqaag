import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, User, Minus, Maximize2, Mic, MicOff, Sparkles, Play, Search as SearchIcon, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { synaptoService, SynaptoMessage } from '../services/synaptoService';
import { aiService } from '../services/aiService';
import { DocumentUpload } from './DocumentUpload';
import { auth } from '../lib/firebase';

const SynaptoLogo: React.FC<{ size?: 'sm' | 'md' | 'lg', highContrast?: boolean }> = ({ size = 'md', highContrast }) => {
  const dimensions = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`relative flex items-center justify-center ${dimensions[size]} shrink-0`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={`absolute inset-0 rounded-full border-2 border-dashed ${
          highContrast ? 'border-yellow-400' : 'border-accent/30'
        }`}
      />
      <div className={`relative flex h-4/5 w-4/5 items-center justify-center rounded-full shadow-lg ${
        highContrast ? 'bg-yellow-400' : 'bg-accent'
      }`}>
        <Sparkles className={`h-1/2 w-1/2 ${highContrast ? 'text-black' : 'text-white'}`} />
      </div>
      {!highContrast && (
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full scale-150 animate-pulse" />
      )}
    </div>
  );
};

export const SynaptoChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<SynaptoMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error' | null>(null);
  const [apiError, setApiError] = useState<string>('');
  const isListeningRef = useRef(false);
  const [isHovering, setIsHovering] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hasCheckedKey = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { currentSegment, transcript, settings, setVideo, setTranscript, setIsLoading, ragEnabled, grokConfigured, setGrokConfigured } = useStore();

  // Validate API key the first time the chat is opened
  useEffect(() => {
    if (isOpen && !hasCheckedKey.current) {
      hasCheckedKey.current = true;
      setApiStatus('checking');

      // Check backend health to see if Groq RAG is already active
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          if (data && data.grokConfigured) {
            // Groq RAG is configured and ready on backend!
            setGrokConfigured(true);
            setApiStatus('ok');
          } else {
            // No Groq RAG, fall back to checking Gemini local validation
            synaptoService.validateKey().then(err => {
              if (err) {
                setApiStatus('error');
                setApiError(err);
              } else {
                setApiStatus('ok');
              }
            });
          }
        })
        .catch(err => {
          console.warn('Backend health check failed, checking Gemini local key:', err);
          synaptoService.validateKey().then(err => {
            if (err) {
              setApiStatus('error');
              setApiError(err);
            } else {
              setApiStatus('ok');
            }
          });
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Voice Recognition & Synthesis Setup
  const isWakingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullText = (finalTranscript || interimTranscript).toLowerCase();
        
        // Use phonetic variations for better wake word detection
        const wakeWordMatch = fullText.includes('synapto') || 
                            fullText.includes('synapt') || 
                            fullText.includes('snapto') || 
                            fullText.includes('hey synapto');

        // Wake Word Detection
        if (!isListeningRef.current && wakeWordMatch) {
          setIsListening(true);
          setInput('');
          speak("Yes, I'm listening.");
          return;
        }

        // Active Command Input
        if (isListeningRef.current) {
          if (finalTranscript) {
            setInput(finalTranscript);
            // Intent detection for common commands
            const isSelectCommand = finalTranscript.includes('play') || 
                                  finalTranscript.includes('video') || 
                                  finalTranscript.includes('one') || 
                                  finalTranscript.includes('second');
            
            handleSend(undefined, finalTranscript);
            setIsListening(false);
          } else {
            setInput(interimTranscript);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        // Suppress common transient errors to reduce console noise
        const silencedErrors = ['no-speech', 'audio-capture', 'network', 'not-allowed'];
        if (silencedErrors.includes(event.error)) {
          if (event.error === 'not-allowed') {
            setIsListening(false);
            // Only show message once to avoid cluttering history if user keeps denying
            setMessages(prev => {
              const lastModelMsg = prev.filter(m => m.role === 'model').pop();
              if (lastModelMsg?.text.includes('Microphone access')) return prev;
              return [...prev, { 
                role: 'model', 
                text: "Microphone access was denied. Please ensure you've granted permission in your browser if you'd like to use voice commands." 
              }];
            });
          }
          return;
        }

        console.error('Speech recognition error', event.error);
      };

      recognitionRef.current.onend = () => {
        // Restart continuous listening automatically with a small safety delay
        if (isOpen && !isMinimized && navigator.onLine) {
          setTimeout(() => {
            try {
              if (recognitionRef.current && isOpen && !isMinimized) {
                recognitionRef.current.start();
              }
            } catch (e) {
              // Silently fail on restart
            }
          }, 1000); // 1s delay to prevent busy-loop on network/permission temporary failures
        }
      };

      // Initial start
      if (isOpen && !isMinimized) {
        recognitionRef.current.start();
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, isMinimized]); // Re-run when chat state changes

  const speak = React.useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speechRate || 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Optional: Filter for a more "Synapto-like" voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
  }, [settings.speechRate]);

  // Auto-speak new model messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'model' && isOpen && !isMinimized) {
      speak(lastMessage.text);
    }
  }, [messages, isOpen, isMinimized]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleVideoSelection = React.useCallback(async (videoUrl: string) => {
    setIsLoading(true);
    try {
      const transcriptData = await aiService.processVideoContent(videoUrl);
      const videoId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1] || "unknown";
      setVideo(videoUrl, `Video: ${videoId}`);
      setTranscript(transcriptData);
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `Excellent choice. I'm synchronizing the sign language translation layers for this video. You'll see the interpretation appear in real-time as you play.` 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I had some trouble loading the interpretation for that video. Let's try another one." }]);
    } finally {
      setIsLoading(false);
    }
  }, [setVideo, setTranscript, setIsLoading]);

  const handleSend = React.useCallback(async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToProcess = overrideText || input;
    if (!textToProcess.trim() || isTyping) return;

    const userText = textToProcess.trim();
    if (!overrideText) setInput('');
    
    const lowerText = userText.toLowerCase();
    
    // Check if user is selecting a video from the last results
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.videoResults && (lowerText.includes('video') || lowerText.includes('one') || lowerText.includes('two') || lowerText.includes('first') || lowerText.includes('second'))) {
      const indexMap: Record<string, number> = { 
        'one': 0, '1': 0, 'first': 0,
        'two': 1, '2': 1, 'second': 1,
        'three': 2, '3': 2, 'third': 2,
        'four': 3, '4': 3, 'fourth': 3,
      };

      const words = lowerText.split(' ');
      const match = words.find(w => indexMap[w] !== undefined);
      if (match !== undefined) {
        const idx = indexMap[match];
        const selected = lastMessage.videoResults[idx];
        if (selected) {
          setMessages(prev => [...prev, { role: 'user', text: userText }]);
          setIsTyping(true);
          await handleVideoSelection(`https://www.youtube.com/watch?v=${selected.videoId}`);
          setIsTyping(false);
          return;
        }
      }
    }

    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      // Improved YouTube link regex
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})[^\s]*/i;
      const directMatch = userText.match(youtubeRegex);

      // Detection for "I want to learn..." or "search for..."
      const isSearchIntent = lowerText.includes('learn') || lowerText.includes('how to') || lowerText.includes('search') || lowerText.includes('find');

      if (directMatch) {
         await handleVideoSelection(directMatch[0]);
      } else if (isSearchIntent) {
        setMessages(prev => [...prev, { role: 'model', text: `Searching for the best educational sources to help you learn about "${userText}"...` }]);
        const results = await aiService.searchVideos(userText);
        
        if (results && results.length > 0) {
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: "I found a few great videos that would be perfect for learning this. Which one would you like to explore?",
            videoResults: results
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'model', text: "I'm having a bit of trouble finding specific videos for that. Could you try a different topic?" }]);
        }
      } else if (lowerText.includes('play') || lowerText.includes('load video')) {
        let videoUrl = null;
        
        setMessages(prev => [...prev, { role: 'model', text: "Searching for that video and preparing the sign language interpretation layer..." }]);
        
        // Use Gemini to find a likely YouTube URL if one wasn't provided
        const prompt = `Find a high-quality educational YouTube video URL for: "${userText}". Return ONLY the YouTube URL.`;
        const suggestedUrl = await synaptoService.getResponse(prompt, [], { transcript: [], currentSegment: null });
        
        const aiMatch = suggestedUrl.match(youtubeRegex);
        if (aiMatch) {
          videoUrl = aiMatch[0].trim();
        }

        if (videoUrl) {
          await handleVideoSelection(videoUrl);
        } else {
          setMessages(prev => [...prev, { role: 'model', text: "I couldn't find a direct YouTube link for that. Could you provide a specific topic or paste a URL?" }]);
        }
      } else {
        // Try RAG first if enabled, or default to it if Groq is configured
        let response = '';

        if (ragEnabled || grokConfigured) {
          try {
            // Build user context from current video segment
            let userContext = '';
            if (currentSegment) {
              userContext = `Current video segment: "${currentSegment.text}"`;
            }

            // Get Firebase ID token
            const firebaseUser = auth.currentUser;
            const token = firebaseUser ? await firebaseUser.getIdToken() : '';

            // Call RAG endpoint
            const ragResponse = await fetch('/api/chat/rag', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                message: userText,
                userContext,
              }),
            });

            if (!ragResponse.ok) {
              throw new Error('RAG query failed');
            }

            const ragData = await ragResponse.json();
            response = ragData.response || "I couldn't generate a response.";
          } catch (ragError) {
            console.warn('RAG query failed:', ragError);
            if (grokConfigured) {
              response = "I encountered an error communicating with the RAG backend. Please verify your Groq API key is valid and the server is running.";
            } else {
              // Fallback to Gemini
              response = await synaptoService.getResponse(userText, messages, {
                currentSegment,
                transcript
              });
            }
          }
        } else {
          response = await synaptoService.getResponse(userText, messages, {
            currentSegment,
            transcript
          });
        }

        setMessages(prev => [...prev, { role: 'model', text: response || "I'm sorry, I couldn't process that right now." }]);
      }
    } catch (error: any) {
      console.error("Synapto interaction failed:", error);
      const errMsg = error?.message || 'Unknown error. Check the browser console for details.';
      setMessages(prev => [...prev, { role: 'model', text: errMsg }]);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [input, isTyping, messages, currentSegment, transcript, handleVideoSelection, setIsLoading, ragEnabled]);

  const clearHistory = () => setMessages([]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-6 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, rotate: -2 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              rotate: 0,
              height: isMinimized ? '88px' : 'min(620px, 80vh)'
            }}
            exit={{ opacity: 0, y: 40, scale: 0.9, rotate: 2 }}
            className={`pointer-events-auto flex w-[440px] max-h-[85vh] flex-col overflow-hidden rounded-[3.5rem] border-4 shadow-[0_64px_128px_-12px_rgba(0,0,0,0.3)] transition-all duration-500 ${
              settings.highContrast 
              ? 'bg-black border-yellow-400 text-yellow-400' 
              : 'bg-white/90 backdrop-blur-2xl border-white/40 text-neutral-900'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-8 ${settings.highContrast ? 'border-b border-yellow-400/30' : 'bg-neutral-50/20 border-b border-black/[0.03]'}`}>
              <div className="flex items-center gap-4">
                <SynaptoLogo size="md" highContrast={settings.highContrast} />
                <div>
                  <h3 className="text-2xl font-serif italic tracking-tighter leading-none mb-1">Synapto</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                          className={`h-1 w-1 rounded-full ${settings.highContrast ? 'bg-yellow-400' : 'bg-accent'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Cognitive Guide v4.0</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    settings.highContrast ? 'hover:bg-yellow-400 hover:text-black' : 'hover:bg-neutral-200/50 text-neutral-400'
                  }`}
                >
                  {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    settings.highContrast ? 'hover:bg-yellow-400 hover:text-black' : 'hover:bg-red-50 text-neutral-400 hover:text-red-500'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
              <>
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-6 scrollbar-hide"
                >
                  {/* API Key Status Banner */}
                  {apiStatus === 'checking' && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                      settings.highContrast ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400' : 'bg-blue-50 border border-blue-100 text-blue-700'
                    }`}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent shrink-0"
                      />
                      Checking AI connection…
                    </div>
                  )}
                  {apiStatus === 'ok' && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                      settings.highContrast ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400' : 'bg-green-50 border border-green-100 text-green-700'
                    }`}>
                      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      {grokConfigured ? 'Groq RAG connected ✓' : 'Gemini AI connected ✓'}
                    </div>
                  )}
                  {apiStatus === 'error' && (
                    <div className={`flex flex-col gap-2 px-4 py-3 rounded-2xl text-xs ${
                      settings.highContrast ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400' : 'bg-red-50 border border-red-100 text-red-700'
                    }`}>
                      <p className="font-black uppercase tracking-wider">AI Connection Failed</p>
                      <p className="leading-relaxed font-medium opacity-80">{apiError}</p>
                      <button
                        onClick={() => {
                          hasCheckedKey.current = false;
                          setApiStatus('checking');
                          setApiError('');
                          fetch('/api/health')
                            .then(res => res.json())
                            .then(data => {
                              if (data && data.grokConfigured) {
                                setGrokConfigured(true);
                                setApiStatus('ok');
                              } else {
                                synaptoService.validateKey().then(e => {
                                  if (e) {
                                    setApiStatus('error');
                                    setApiError(e);
                                  } else {
                                    setApiStatus('ok');
                                  }
                                });
                              }
                            })
                            .catch(() => {
                              synaptoService.validateKey().then(e => {
                                if (e) {
                                  setApiStatus('error');
                                  setApiError(e);
                                } else {
                                  setApiStatus('ok');
                                }
                              });
                            });
                        }}
                        className="self-start mt-1 px-3 py-1 rounded-xl bg-red-100 hover:bg-red-200 font-black uppercase text-[9px] tracking-widest transition-all"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Document Upload & RAG Status */}
                  <div className={`px-4 py-3 rounded-2xl text-xs ${
                    settings.highContrast ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className={`h-4 w-4 ${settings.highContrast ? 'text-yellow-400' : 'text-blue-600'}`} />
                      <span className={`font-bold ${settings.highContrast ? 'text-yellow-400' : 'text-blue-700'}`}>
                        RAG Mode Active
                      </span>
                    </div>
                    <DocumentUpload onUploadSuccess={() => { console.log('Document uploaded and database re-indexed.'); }} highContrast={settings.highContrast} />
                  </div>

                  {messages.length === 0 && (
                    <div className="py-24 text-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-8 inline-block"
                      >
                        <SynaptoLogo size="lg" highContrast={settings.highContrast} />
                      </motion.div>
                      <h4 className="text-xl font-serif italic mb-2">Welcome traveler of knowledge.</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 leading-loose mx-auto max-w-[200px]">
                        I am your guide across the ocean of information.
                      </p>
                    </div>
                  )}
                  {messages.map((message, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-md ${
                          message.role === 'user' 
                          ? (settings.highContrast ? 'bg-yellow-400 text-black' : 'bg-neutral-900 text-white') 
                          : (settings.highContrast ? 'bg-yellow-400/20 border-2 border-yellow-400/40' : 'bg-accent/10 border-2 border-accent/20')
                        }`}>
                          {message.role === 'user' ? <User className="h-5 w-5" /> : <Sparkles className={`h-5 w-5 ${settings.highContrast ? 'text-yellow-400' : 'text-accent'}`} />}
                        </div>
                        
                        {/* Content */}
                        <div className="flex flex-col gap-4 max-w-[90%] w-full">
                          <div className={`relative px-6 py-4 text-sm font-medium leading-relaxed group w-fit ${
                            message.role === 'user'
                            ? (settings.highContrast ? 'bg-yellow-400 text-black rounded-[2rem] rounded-tr-sm self-end' : 'bg-neutral-100 text-neutral-900 rounded-[2rem] rounded-tr-sm shadow-[0_12px_24px_-8px_rgba(0,0,0,0.05)] self-end')
                            : (settings.highContrast ? 'bg-black border-2 border-yellow-400 text-yellow-400 rounded-[2rem] rounded-tl-sm self-start' : 'bg-white border border-black/[0.03] text-neutral-800 rounded-[2rem] rounded-tl-sm shadow-[0_12px_24px_-8px_rgba(37,99,235,0.1)] self-start')
                          }`}>
                            {message.text}
                            <div className={`absolute bottom-0 text-[8px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-20 transition-opacity whitespace-nowrap ${
                              message.role === 'user' ? 'right-4 -bottom-4' : 'left-4 -bottom-4'
                            }`}>
                              {message.role === 'user' ? 'Verified Input' : 'Algorithmic Response'}
                            </div>
                          </div>

                          {/* Video Results */}
                          {message.videoResults && (
                            <div className="grid gap-3 pt-2">
                              {message.videoResults.map((video, vIdx) => (
                                <motion.button
                                  key={vIdx}
                                  whileHover={{ x: 8, backgroundColor: settings.highContrast ? '#facc15' : '#f8fafc' }}
                                  onClick={() => handleVideoSelection(`https://www.youtube.com/watch?v=${video.videoId}`)}
                                  className={`flex items-center gap-4 p-3 rounded-3xl border-2 transition-all text-left group/video ${
                                    settings.highContrast 
                                    ? 'border-yellow-400/30 text-yellow-400 hover:text-black' 
                                    : 'border-white bg-white/50 hover:border-accent/40 shadow-sm'
                                  }`}
                                >
                                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                                    <img 
                                      src={video.thumbnail} 
                                      alt={video.title}
                                      className="h-full w-full object-cover transition-transform group-hover/video:scale-110"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/video:opacity-100 transition-opacity">
                                      <Play className="h-6 w-6 text-white fill-current" />
                                    </div>
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <h5 className="text-[11px] font-black uppercase truncate mb-1">{video.title}</h5>
                                    <p className="text-[10px] opacity-60 leading-tight line-clamp-2">{video.description}</p>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start pl-14">
                      <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 border-2 ${
                        settings.highContrast ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-neutral-50 border-white text-accent shadow-sm'
                      }`}>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                              className={`h-1.5 w-1.5 rounded-full ${settings.highContrast ? 'bg-yellow-400' : 'bg-accent'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">Processing Insights</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={(e) => handleSend(e)} className="p-8 pt-0">
                  <div className={`relative flex items-center gap-4 group ${settings.highContrast ? 'text-yellow-400' : ''}`}>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening for your command..." : "Say 'Synapto' or clarify concepts..."}
                        className={`h-16 w-full rounded-[2rem] pl-8 pr-16 outline-none transition-all text-sm font-medium ${
                          settings.highContrast 
                          ? 'bg-black border-2 border-yellow-400 placeholder:text-yellow-400/40 text-yellow-400' 
                          : 'bg-neutral-50 border-2 border-transparent focus:border-accent bg-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.03)] focus:shadow-xl focus:shadow-accent/5'
                        } ${isListening ? 'ring-2 ring-accent/50 animate-pulse' : ''}`}
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className={`absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl transition-all ${
                          input.trim() && !isTyping 
                          ? 'bg-accent text-white scale-100 opacity-100 rotate-0 shadow-lg shadow-accent/25' 
                          : 'bg-neutral-200 text-neutral-400 scale-90 opacity-0 rotate-45 pointer-events-none'
                        }`}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.75rem] transition-all relative group/mic overflow-hidden ${
                        isListening 
                        ? 'bg-accent text-white ring-4 ring-accent/20' 
                        : (settings.highContrast ? 'bg-black border-2 border-yellow-400 text-yellow-400' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200/50')
                      }`}
                      title={isListening ? "Listening for command..." : "Say 'Synapto' to start"}
                    >
                      <div className="absolute inset-0 bg-accent opacity-0 group-hover/mic:opacity-10 transition-opacity" />
                      {isListening ? (
                        <Mic className="h-6 w-6 relative z-10 animate-pulse" />
                      ) : (
                        <div className="relative flex items-center justify-center">
                          <Mic className="h-6 w-6 relative z-10 opacity-30" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-1 w-1 bg-accent rounded-full animate-ping" />
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`pointer-events-auto flex h-24 w-24 flex-col items-center justify-center rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] transition-all duration-700 group relative overflow-hidden ${
          settings.highContrast 
          ? 'bg-yellow-400 text-black border-4 border-black' 
          : 'bg-neutral-900 border-4 border-white/20'
        } ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        <div className={`absolute inset-0 transition-opacity duration-700 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-accent via-blue-400 to-indigo-500 animate-gradient-xy" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
           <SynaptoLogo size="md" highContrast={settings.highContrast} />
           <span className={`mt-2 text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${
             settings.highContrast ? 'text-black' : isHovering ? 'text-white' : 'text-white/40'
           }`}>Synapto</span>
        </div>
        
        {!settings.highContrast && (
          <div className="absolute inset-0 border-[8px] border-white/5 rounded-[3rem] pointer-events-none" />
        )}
      </motion.button>
    </div>
  );
};
