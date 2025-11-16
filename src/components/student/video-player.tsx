"use client";

import { useRef, useState, useEffect } from "react";

interface VideoPlayerProps {
  playbackId: string;
  lessonId: string;
  onProgressUpdate?: (percentage: number) => void;
  onComplete?: () => void;
}

export default function VideoPlayer({
  playbackId,
  lessonId,
  onProgressUpdate,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Auto-salvar progresso a cada 10 segundos
      if (Math.floor(video.currentTime) % 10 === 0 && onProgressUpdate) {
        const percentage = (video.currentTime / video.duration) * 100;
        onProgressUpdate(percentage);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onComplete) {
        onComplete();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onProgressUpdate, onComplete]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      className="relative bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onClick={togglePlay}
      >
        {/* Em produção, usar URL real do vídeo (Mux, Vimeo, etc.) */}
        <source src={`/videos/${playbackId}.mp4`} type="video/mp4" />
        Seu navegador não suporta vídeo HTML5.
      </video>

      {/* Controles customizados */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Barra de progresso */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full mb-2 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="hover:text-blue-400">
                {isPlaying ? "⏸" : "▶"}
              </button>

              {/* Tempo */}
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <span>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Velocidade */}
              <select
                value={playbackRate}
                onChange={(e) =>
                  handlePlaybackRateChange(parseFloat(e.target.value))
                }
                className="bg-black/50 text-white text-sm rounded px-2 py-1"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>

              {/* Qualidade (TODO: Implementar) */}
              <select className="bg-black/50 text-white text-sm rounded px-2 py-1">
                <option>Auto</option>
                <option>1080p</option>
                <option>720p</option>
                <option>480p</option>
              </select>

              {/* Legendas (TODO: Implementar) */}
              <button className="hover:text-blue-400">CC</button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="hover:text-blue-400">
                ⛶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
