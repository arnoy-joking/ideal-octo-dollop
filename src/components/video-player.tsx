
"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Skeleton } from './ui/skeleton';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

let apiLoaded = false;
let apiLoading = false;
const callbacks: (()=>void)[] = [];

const loadYouTubeAPI = () => {
  if (typeof window === 'undefined') return;
  if (apiLoaded) {
    callbacks.forEach(cb => cb());
    callbacks.length = 0;
    return;
  }
  if (apiLoading) return;

  apiLoading = true;
  window.onYouTubeIframeAPIReady = () => {
    apiLoaded = true;
    apiLoading = false;
    callbacks.forEach(cb => cb());
    callbacks.length = 0;
  };

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
};

interface VideoPlayerProps {
  videoId: string;
  title: string;
  onVideoEnd: () => void;
  startTime?: number;
  onProgress: (currentTime: number) => void;
}

export function VideoPlayer({ videoId, title, onVideoEnd, startTime = 0, onProgress }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerId = `youtube-player-${videoId}-${Math.random().toString(36).substring(7)}`;

  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.error("Error destroying YouTube player", e);
      }
      playerRef.current = null;
    }
  }, []);

  const saveCurrentProgress = useCallback(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const currentTime = playerRef.current.getCurrentTime();
          if (currentTime > 0) {
              onProgress(currentTime);
          }
      }
  }, [onProgress]);

  const createPlayer = useCallback(() => {
      if (!document.getElementById(playerContainerId) || !window.YT) return;
      
      cleanup();

      playerRef.current = new window.YT.Player(playerContainerId, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(startTime),
        },
        events: {
          onStateChange: (event: any) => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }

            if (event.data === window.YT.PlayerState.PLAYING) {
                progressIntervalRef.current = setInterval(saveCurrentProgress, 15000);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
                saveCurrentProgress();
            } else if (event.data === window.YT.PlayerState.ENDED) { 
              onVideoEnd();
              saveCurrentProgress();
            }
          },
        },
      });
  }, [videoId, startTime, onVideoEnd, saveCurrentProgress, playerContainerId, cleanup]);

  useEffect(() => {
    const initPlayer = () => {
        if (apiLoaded) {
            createPlayer();
        } else {
            callbacks.push(createPlayer);
            loadYouTubeAPI();
        }
    };
    
    initPlayer();

    return () => {
      const index = callbacks.indexOf(createPlayer);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      cleanup();
    };
  }, [createPlayer, cleanup]);

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg border bg-muted">
      <div id={playerContainerId} className="w-full h-full">
        <Skeleton className="w-full h-full" />
      </div>
    </div>
  );
}
