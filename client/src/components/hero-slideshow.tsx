import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSlideshowProps {
  images: string[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export default function HeroSlideshow({ 
  images, 
  autoPlay = true, 
  autoPlayInterval = 5000 
}: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Touch handlers for mobile swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isPlaying, autoPlayInterval, images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, togglePlayPause]);

  return (
      <div 
        className="hero-slideshow-container relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      aria-label="Modern Hero Slideshow"
        style={{
          position: 'relative',
          width: '100vw',
          height: '90vh',
          minHeight: '700px',
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          maxWidth: 'none',
          overflow: 'hidden',
          left: '50%',
          right: '50%',
          marginLeft: '-50vw',
          marginRight: '-50vw',
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
    >
      {/* Slideshow Container */}
      <div 
        className="slideshow-container relative w-full h-full"
        style={{
          margin: 0,
          padding: 0,
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-out ${
              index === currentIndex 
                ? 'opacity-100 z-10' 
                : 'opacity-0 z-0'
            }`}
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              boxSizing: 'border-box',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Image with enhanced styling */}
            <img
              src={image}
              alt={`Modern Banner ${index + 1}`}
              className="w-full h-full object-cover object-center"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                filter: 'brightness(1.0) contrast(1.1)',
                margin: 0,
                padding: 0,
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                boxSizing: 'border-box',
                display: 'block',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'scale(1)',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            
          </div>
        ))}
      </div>

      {/* Modern Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-40 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-4 rounded-full transition-all duration-300 shadow-2xl border border-white/20 hover:border-white/30 group"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
      </button>
      
      <button
        onClick={goToNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-40 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-4 rounded-full transition-all duration-300 shadow-2xl border border-white/20 hover:border-white/30 group"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
      </button>

      {/* Modern Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="absolute top-6 right-6 z-40 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-4 rounded-full transition-all duration-300 shadow-2xl border border-white/20 hover:border-white/30 group"
        aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
      >
        {isPlaying ? <Pause className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" /> : <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />}
      </button>

      {/* Modern Slide Counter */}
      <div className="absolute top-6 left-6 z-40 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 shadow-2xl">
        <span className="text-blue-200">{currentIndex + 1}</span>
        <span className="text-white/60 mx-1">/</span>
        <span className="text-white/60">{images.length}</span>
      </div>

      {/* Modern Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex space-x-3">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 shadow-lg border-2 ${
              index === currentIndex
                ? 'w-8 h-3 bg-white border-white rounded-full shadow-white/50'
                : 'w-3 h-3 bg-white/30 border-white/30 hover:bg-white/50 hover:border-white/50 rounded-full hover:scale-110'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

    </div>
  );
}
