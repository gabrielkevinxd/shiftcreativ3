"use client";

import { useRef, useState, useEffect } from "react";
import { Play } from "@phosphor-icons/react";

interface ReelCardProps {
  videoSrc?: string;
  poster: string;
  title: string;
  link: string;
}

export default function ReelCard({ videoSrc, poster, title, link }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered && videoRef.current && videoSrc) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else if (!isHovered && videoRef.current && videoSrc) {
      videoRef.current.pause();
    }
  }, [isHovered, videoSrc]);

  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group relative block w-full aspect-square overflow-hidden bg-surface-high cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
    >
      {/* Imagem Padrão (Poster) */}
      <img 
        src={poster} 
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${isHovered && videoSrc ? 'scale-105 opacity-0' : 'scale-100 opacity-100'}`}
        loading="lazy"
      />

      {/* Elemento de Vídeo HTML5 */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          muted
          loop
          preload="none"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      
      {/* Overlay Escuro Leve ao Passar o Mouse */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
      
      {/* Ícone IG Reels Top Right */}
      <div className="absolute top-2 right-2 drop-shadow-md z-10 transition-transform duration-300 group-hover:scale-110">
        <Play weight="fill" className="text-white w-5 h-5 drop-shadow-lg opacity-90" />
      </div>
    </a>
  );
}
