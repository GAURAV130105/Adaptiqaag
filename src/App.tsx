/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from './store/useStore';
import { AdaptiveThemeProvider } from './components/AdaptiveThemeProvider';
import { YouTubePlayer } from './components/YouTubePlayer';
import { AccessibilityControls } from './components/AccessibilityControls';
import { SignMtInterpreter } from './components/SignMtInterpreter';
import { UserGestureRecognizer } from './components/UserGestureRecognizer';
import { SynaptoChat } from './components/SynaptoChat';
import { ViewModeToggle } from './components/ViewModeToggle';
import { TranslatePanel } from './components/TranslatePanel';
import { LoginPage } from './components/LoginPage';
import { aiService } from './services/aiService';
import { synaptoService } from './services/synaptoService';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged } from './lib/firebase';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Loader2, LogIn, LogOut, AlertCircle, Waves, Languages } from 'lucide-react';
import { motion } from 'motion/react';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-red-50 p-8 text-center">
      <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-black uppercase italic mb-2">Something went wrong</h2>
      <p className="text-red-600 mb-6 max-w-md">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-2xl bg-neutral-900 px-8 py-3 text-white font-bold uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
      >
        Try Again
      </button>
    </div>
  );
}

export default function App() {
  const { setVideo, setTranscript, settings, user, setUser, syncSettings, isLoading, videoUrl, viewMode, translateMode, setTranslateMode, currentSegment, isPlaying } = useStore();
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<{videoId: string; title: string; description: string; thumbnail: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build interpreter text from the current segment captions
  const interpreterText = currentSegment?.text || '';

  const handleVideoSearch = async (query: string) => {
    setUrl(query);
    setSearchError('');

    // If it's a YouTube URL, don't search
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/i;
    if (youtubeRegex.test(query)) {
      setShowDropdown(false);
      return;
    }

    if (query.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      // Prevent parallel AI searches
      if (isSearching) return;
      
      setIsSearching(true);
      setShowDropdown(true);

      const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
      const hasKey = YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_DATA_API_V3_KEY_HERE';

      // ── Path 1: YouTube Data API v3 ───────────────────────────────────────
      if (hasKey) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`,
            { signal: AbortSignal.timeout(8000) }
          );

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody?.error?.message || `YouTube API error ${res.status}`);
          }

          const data = await res.json();
          if (data?.items?.length > 0) {
            const videos = data.items.map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              description: `${item.snippet.channelTitle} · ${new Date(item.snippet.publishedAt).getFullYear()}`,
              thumbnail: item.snippet.thumbnails?.medium?.url ||
                `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
            }));
            setSearchResults(videos);
            setSearchError('');
          } else {
            setSearchResults([]);
            setSearchError('No videos found for that search.');
          }
          setIsSearching(false);
          return;
        } catch (err: any) {
          console.error('[YouTube API] Error:', err.message);
          // Extract meaningful Google error reason if available
          const reason = err.message?.includes('keyInvalid')
            ? '❌ API key is invalid or not yet active'
            : err.message?.includes('accessNotConfigured')
              ? '❌ YouTube Data API v3 not enabled — go to console.cloud.google.com and enable it'
              : err.message?.includes('API key not valid')
                ? '❌ API key is invalid — double-check it in .env'
                : err.message?.includes('forbidden') || err.message?.includes('403')
                  ? '❌ API key blocked — set restriction to "YouTube Data API v3" in Google Cloud Console'
                  : `❌ ${err.message}`;
          setSearchError(`${reason}. Falling back to AI suggestions…`);
        }
      }

      // ── Path 2: Gemini AI suggestions (no API key / API failed) ──────────
      try {
        const results = await aiService.searchVideos(query);
        if (results.length > 0) {
          setSearchResults(results);
          if (!hasKey) {
            setSearchError('💡 Add a YouTube API key in .env for real results. Showing AI suggestions.');
          } else {
            setSearchError('Showing AI suggestions (YouTube API failed).');
          }
        } else {
          setSearchResults([]);
          setSearchError('No results found. Paste a YouTube URL directly.');
        }
      } catch {
        setSearchResults([]);
        setSearchError('Search unavailable. Paste a YouTube URL directly.');
      } finally {
        setIsSearching(false);
      }
    }, 1000);
  };


  const handleSelectVideo = async (videoId: string, title: string) => {
    setShowDropdown(false);
    setSearchResults([]);
    setUrl('');
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    setIsProcessing(true);
    try {
      const transcript = await aiService.processVideoContent(videoUrl);
      setVideo(videoUrl, title);
      setTranscript(transcript);
    } catch (err) {
      console.error('Failed to load video:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        syncSettings();
      }
    });

    // Fallback: If auth doesn't respond in 5 seconds, clear loading state anyway
    const timer = setTimeout(() => {
      useStore.getState().setIsLoading(false);
    }, 5000);

    // No default video — wait for user to search or paste a link

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.history.pushState({}, '', '/');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

    const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = url.trim();
    if (!query) return;
    
    setIsProcessing(true);
    try {
      let videoUrlToProcess = query;
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})[^\s]*/i;
      
      // If it's not a direct URL, use Synapto logic to find one
      if (!youtubeRegex.test(query)) {
        const prompt = `Find a high-quality educational YouTube video URL for: "${query}". Return ONLY the YouTube URL.`;
        const suggestedUrl = await synaptoService.getResponse(prompt, [], { transcript: [], currentSegment: null });
        const aiMatch = suggestedUrl.match(youtubeRegex);
        if (aiMatch) {
          videoUrlToProcess = aiMatch[0].trim();
        } else {
          throw new Error("Could not find a relevant video for this topic.");
        }
      }

      const simplifiedTranscript = await aiService.processVideoContent(videoUrlToProcess);
      const videoId = videoUrlToProcess.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1] || "unknown";
      
      setVideo(videoUrlToProcess, `Lesson: ${videoId}`);
      setTranscript(simplifiedTranscript);
      setUrl(''); // clear input
    } catch (err) {
      console.error("Search failed", err);
      // Fallback or error message could go here
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-main">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
        <AdaptiveThemeProvider>
          <LoginPage />
        </AdaptiveThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <AdaptiveThemeProvider>
        <div className="flex h-screen w-full overflow-hidden bg-main text-main-text">
        <main className={`flex-1 overflow-y-auto p-12 pt-10 transition-all custom-scrollbar ${settings.focusMode ? 'max-w-4xl mx-auto' : ''}`}>
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-accent text-white shadow-2xl relative z-10">
                  <Waves className="h-7 w-7" />
                </div>
                <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full scale-150 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="px-4 py-1 rounded-full bg-accent text-[9px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-accent/20">
                    Live Engine Active
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.3em] italic opacity-40`}>Version 4.2.0-Alpha</span>
                </div>
                <h1 className="text-6xl font-serif italic tracking-tighter -ml-1">
                  Synapto<span className="text-accent text-4xl not-italic font-black -ml-1"> AI</span>
                </h1>
              </div>
            </div>

              <div className="flex items-center gap-8 focus-hide">
                {user && !settings.focusMode && (
                  <div className="flex items-center gap-3 pr-2 border-r border-neutral-200 dark:border-white/10">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="h-9 w-9 rounded-full border border-accent/20"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.1em] text-accent">
                        {user.email?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col text-left mr-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.05em] leading-none mb-0.5">
                        {user.displayName || 'Learner'}
                      </span>
                      <span className="text-[9px] opacity-40 leading-none">
                        {user.email}
                      </span>
                    </div>
                  </div>
                )}
                {!settings.focusMode && (
                  <button
                    onClick={() => window.open('https://kozha-translate.com/app.html', '_blank')}
                  className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-2.5 font-black uppercase text-[9px] tracking-[0.15em] transition-all shadow-sm ${
                    settings.theme === 'dark'
                      ? 'border-white/10 bg-white/5 text-white hover:bg-accent/20 hover:border-accent/30'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-accent/5 hover:border-accent/30 hover:text-accent'
                  }`}
                >
                  <Languages className="h-3.5 w-3.5" />
                  Translate
                </button>
              )}
              {!settings.focusMode && !translateMode && <ViewModeToggle />}
              {!settings.focusMode && (
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-2.5 font-black uppercase text-[9px] tracking-[0.15em] transition-all shadow-sm ${
                    settings.theme === 'dark'
                      ? 'border-white/10 bg-white/5 text-white hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              )}
              {!settings.focusMode && (
                <form onSubmit={handleSearch} className="flex gap-4">
                  <div className="relative group">
                    <Search className={`absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 transition-all z-10 ${isSearching ? 'animate-spin text-accent' : (settings.theme === 'dark' ? 'text-white/30' : 'text-neutral-400')} group-focus-within:text-accent`} />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleVideoSearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      onKeyDown={(e) => e.key === 'Escape' && setShowDropdown(false)}
                      placeholder="Search YouTube or paste a link..."
                      className={`h-14 w-72 md:w-[420px] rounded-2xl border-2 shadow-inner pl-14 pr-4 outline-none transition-all font-medium text-sm focus:border-blue-400 ${
                        settings.theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
                          : 'bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                      }`}
                    />
                    {/* Search Results Dropdown */}
                    {showDropdown && (
                      <div className={`absolute top-[calc(100%+8px)] left-0 z-50 w-[500px] rounded-3xl border shadow-2xl overflow-hidden ${
                        settings.theme === 'dark' ? 'bg-neutral-900 border-white/10' : 'bg-white border-neutral-100'
                      }`}>
                        <div className={`px-5 py-3 border-b flex items-center justify-between ${
                          settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'
                        }`}>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                            {isSearching ? 'Searching...' : searchResults.length > 0 ? `${searchResults.length} Results` : 'No Results'}
                          </span>
                          <button onClick={() => setShowDropdown(false)} className="opacity-30 hover:opacity-100 text-xs font-bold">✕</button>
                        </div>
                        {searchError && (
                          <div className="px-5 py-3 text-xs text-orange-500 bg-orange-500/5">{searchError}</div>
                        )}
                        <div className="flex flex-col max-h-80 overflow-y-auto">
                          {searchResults.map((result) => (
                            <button
                              key={result.videoId}
                              onMouseDown={() => handleSelectVideo(result.videoId, result.title)}
                              className={`flex items-center gap-4 px-5 py-3 text-left transition-all ${
                                settings.theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-neutral-50'
                              }`}
                            >
                              <img
                                src={`https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`}
                                alt={result.title}
                                className="h-14 w-24 rounded-xl object-cover shrink-0 bg-neutral-200"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'; }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold leading-tight line-clamp-2 mb-1">{result.title}</p>
                                <p className="text-[10px] opacity-50 line-clamp-1">{result.description}</p>
                              </div>
                              <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-500/10">
                                <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className={`px-5 py-3 border-t ${settings.theme === 'dark' ? 'border-white/5' : 'border-neutral-100'}`}>
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-bold text-red-500 hover:underline"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5V8.5l6.5 3.5-6.5 3.5z"/></svg>
                            Search on YouTube for &ldquo;{url}&rdquo;
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
              {translateMode ? (
                <div className="col-span-12">
                  <TranslatePanel />
                </div>
              ) : viewMode === 'standard' ? (
                // STANDARD VIEW
                <>
                  <div className={`${settings.focusMode ? 'col-span-12' : 'col-span-12 lg:col-span-8'} space-y-8`}>
                    <div className={`rounded-[3rem] overflow-hidden shadow-2xl border-4 ${settings.theme === 'dark' ? 'border-white/5' : 'border-white'}`}>
                      <YouTubePlayer />
                    </div>
                  </div>

                  {!settings.focusMode && (
                    <div className="hidden lg:flex col-span-4 flex-col gap-6 text-main-text">
                      <div className={`aspect-[3/4] w-full rounded-[3rem] border-4 shadow-2xl overflow-hidden relative group bg-main border-border-main`}>
                        <SignMtInterpreter
                          text={interpreterText}
                          isActive={isPlaying}
                          label="Sign Interpreter"
                          showExternalLink
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // INTERPRETATION VIEW (sign.mt Focused)
                <>
                  <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                    <div className={`relative aspect-video lg:aspect-[4/5] w-full rounded-[3rem] shadow-3xl overflow-hidden border-4 ring-1 ring-black/5 bg-main border-border-main`}>
                      <SignMtInterpreter
                        text={interpreterText}
                        isActive={isPlaying}
                        label="Live Sign Interpreter"
                        showExternalLink
                      />
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                    <div className={`aspect-video w-full rounded-[3rem] overflow-hidden shadow-2xl border-4 relative ${
                      settings.theme === 'dark' ? 'border-white/5' : 'border-white'
                    }`}>
                      <YouTubePlayer />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                    </div>
                  </div>
                </>
              )}
          </div>
        </main>

        <AccessibilityControls />
        
        {settings.focusMode && (
          <button
            onClick={() => useStore.getState().toggleFocusMode()}
            title="Exit Focus Mode"
            className="fixed bottom-10 right-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-[300] text-2xl font-black"
          >
            ✕
          </button>
        )}
        <UserGestureRecognizer />
        <SynaptoChat />
      </div>
    </AdaptiveThemeProvider>
  </ErrorBoundary>
  );
}
