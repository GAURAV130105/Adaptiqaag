import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const UserGestureHUD = () => {
  const { userGesture } = useStore();
  
  return (
    <AnimatePresence>
      {userGesture && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -20 }}
          className="absolute top-10 right-10 z-40 bg-accent text-white px-6 py-2 rounded-full font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center gap-3 border-2 border-white/20"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          {userGesture}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const YouTubePlayer: React.FC = () => {
  const { videoUrl, setCurrentTime, setIsPlaying, isPlaying, currentSegment, currentTime, seekTime, setTranslateInput, setIsPlayingTranslation } = useStore();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<Array<{start:number,end:number,text:string}>>([]);
  const lastCaptionRef = useRef<string>('');

  useEffect(() => {
    if (seekTime !== null && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seekTime, true);
    }
  }, [seekTime]);

  useEffect(() => {
    if (!videoUrl) return;

    const getYouTubeId = (url: string) => {
      const regex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regex);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYouTubeId(videoUrl);

    const loadVideo = () => {
      try {
        if (playerRef.current) {
          playerRef.current.destroy();
        }

        if (!videoId) {
          console.error("Could not extract YouTube Video ID from:", videoUrl);
          return;
        }

        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            controls: 1,
            disablekb: 0,
          },
          events: {
            onStateChange: (event: any) => {
              const state = event.data;
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
            },
            onError: (err: any) => {
              console.error("YouTube Player Error:", err);
            }
          },
        });

        // Best-effort: fetch captions tracks via YouTube timedtext (may not exist for all videos)
        const fetchCaptions = async (vid: string) => {
          try {
            const listRes = await fetch(`https://video.google.com/timedtext?type=list&v=${vid}`);
            const listText = await listRes.text();
            const parser = new DOMParser();
            const listDoc = parser.parseFromString(listText, 'text/xml');
            const tracks = Array.from(listDoc.getElementsByTagName('track') || []);
            if (!tracks.length) return;
            const lang = tracks[0].getAttribute('lang_code') || tracks[0].getAttribute('lang') || 'en';
            const capsRes = await fetch(`https://video.google.com/timedtext?lang=${encodeURIComponent(lang)}&v=${vid}`);
            const capsText = await capsRes.text();
            const capsDoc = parser.parseFromString(capsText, 'text/xml');
            const texts = Array.from(capsDoc.getElementsByTagName('text')).map((n: any) => {
              const start = parseFloat(n.getAttribute('start') || '0');
              const dur = parseFloat(n.getAttribute('dur') || '0');
              let t = n.textContent || '';
              const ta = document.createElement('textarea'); ta.innerHTML = t; t = ta.value;
              return { start, end: start + dur, text: t };
            });
            captionsRef.current = texts;
          } catch (e) {
            console.warn('Captions fetch failed:', e);
          }
        };

        fetchCaptions(videoId);
      } catch (err) {
        console.error("Failed to load YouTube player:", err);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        console.error("YouTube IFrame API failed to load.");
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = loadVideo;
    } else {
      loadVideo();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    let interval: number;

    const update = () => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number') {
          setCurrentTime(time);

          // find active caption
          if (captionsRef.current && captionsRef.current.length) {
            const found = captionsRef.current.find(c => time >= c.start && time < c.end);
            const captionText = found ? found.text.replace(/\n/g, ' ').trim() : '';
            if (captionText && lastCaptionRef.current !== captionText) {
              lastCaptionRef.current = captionText;
              // push into text input so SignMtInterpreter can pick it up
              setTranslateInput(captionText);
              // ensure the textual playback mode is off so interpreter shows live text
              setIsPlayingTranslation(false);
            }
          }
        }
      }
    };

    if (isPlaying && playerRef.current && playerRef.current.getCurrentTime) {
      interval = window.setInterval(update, 500);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isPlaying, setCurrentTime, setTranslateInput, setIsPlayingTranslation]);

  if (!videoUrl) {
    return (
      <div className="relative group aspect-video w-full overflow-hidden rounded-[3rem] border-[12px] border-neutral-800 bg-neutral-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/20 flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 shadow-2xl transition-transform hover:scale-110 duration-500">
            <svg className="h-16 w-16 drop-shadow-[0_0_15px_rgba(255,0,0,0.4)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.54 6.42C22.4214 5.96886 22.1816 5.5574 21.8446 5.22676C21.5076 4.89613 21.0858 4.65851 20.62 4.54C18.88 4 12 4 12 4C12 4 5.12 4 3.38 4.54C2.9142 4.65851 2.49239 4.89613 2.15541 5.22676C1.81843 5.5574 1.57859 5.96886 1.46 6.42C1 8.17 1 12 1 12C1 12 1 15.83 1.46 17.58C1.57859 18.0311 1.81843 18.4426 2.15541 18.7732C2.49239 19.1039 2.9142 19.3415 3.38 19.46C5.12 20 12 20 12 20C12 20 18.88 20 20.62 19.46C21.0858 19.3415 21.5076 19.1039 21.8446 18.7732C22.1816 18.4426 22.4214 18.0311 22.54 17.58C23 15.83 23 12 23 12C23 12 23 8.17 22.54 6.42Z" fill="#FF0000"/>
              <path d="M9.75 15.02L15.5 12L9.75 8.98001V15.02Z" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">No Video Loaded</p>
            <p className="text-[10px] text-white/15">Search YouTube or paste a link above to begin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group aspect-video w-full overflow-hidden rounded-[3rem] border-[12px] border-neutral-800 bg-neutral-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/20" ref={containerRef}>
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-20" />
      <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
      
      <div id="youtube-player" className="absolute inset-0 grayscale-[10%] sepia-[5%] contrast-[105%]" />
      
      <UserGestureHUD />


      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
};
