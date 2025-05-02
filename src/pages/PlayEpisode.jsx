import { Headphones, Heart, List, Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const HEADER_HEIGHT = 128;

function PlayEpisode() {
  const { id } = useParams();
  const [episode, setEpisode] = useState(null);
  const [liked, setLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [containerHeight, setContainerHeight] = useState('100vh');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  // 🔁 zoomLevel 적용 및 실시간 반영
  const updateHeight = () => {
    const zoom = parseFloat(localStorage.getItem('zoomLevel')) || 1;
    const physicalViewport = window.innerHeight;
    const adjustedHeight = physicalViewport / zoom - HEADER_HEIGHT * zoom;
    setContainerHeight(`${adjustedHeight}px`);
  };

  useEffect(() => {
    if (episode && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('자동 재생 실패:', err);
        });
    }
  }, [episode]);

  useEffect(() => {
    updateHeight();

    window.addEventListener('storage', updateHeight);
    window.addEventListener('zoomChange', updateHeight);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('storage', updateHeight);
      window.removeEventListener('zoomChange', updateHeight);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const fetchEpisode = async () => {
      const { data, error } = await supabase.from('episodes').select('*').eq('id', id).single();

      if (!error) setEpisode(data);
    };

    fetchEpisode();
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplaythrough', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplaythrough', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [episode]); // 🔥 episode 로딩 후에만 붙이기

  const formatTime = (sec) => {
    if (isNaN(sec)) return '00:00';
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying((prev) => !prev);
  };

  const toggleLike = () => setLiked((prev) => !prev);

  if (!episode) return <div className="p-8 text-center">로딩 중...</div>;

  return (
    <div
      className="px-4 py-12"
      style={{
        height: containerHeight,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div className="space-y-10 w-full max-w-5xl" style={{ margin: 'auto' }}>
        {/* 상단 정보 */}
        <div className="flex md:flex-row flex-col items-center gap-8 w-full">
          <img
            src={episode.src}
            alt={episode.title}
            className="rounded-lg w-full md:w-2/5 h-auto object-cover"
          />
          <div className="flex-1 space-y-8 w-full">
            <div className="space-y-2">
              <h2 className="font-semibold text-2xl line-clamp-2 leading-snug">{episode.title}</h2>
              <p className="text-gray-500 text-lg">{episode.creator}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={toggleLike}
                className="flex items-center gap-2 bg-base-200 px-5 py-2 rounded-full text-md btn"
              >
                <Heart
                  size={18}
                  className={`transition-transform duration-300 ${
                    liked ? 'scale-125' : 'scale-100'
                  }`}
                  fill={liked ? '#F43F5E' : 'none'}
                  stroke={liked ? '#F43F5E' : 'currentColor'}
                />
                좋아요
              </button>

              <button className="flex items-center gap-2 bg-primary px-5 py-2 rounded-full text-md text-white btn">
                <Headphones size={18} className="transition-transform duration-300" />
                더빙 듣기
              </button>
            </div>
          </div>
        </div>

        {/* 오디오 재생기 */}
        <div className="w-full">
          <audio
            ref={audioRef}
            src={episode.audioFile}
            preload="metadata"
            className="mt-4 w-full"
          />
        </div>

        {/* 커스텀 컨트롤 (추후 확장 가능) */}
        <div className="space-y-6 w-full">
          <div
            className="bg-base-300 rounded-full w-full h-2 overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newTime = (clickX / rect.width) * duration;
              audioRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }}
          >
            <div
              className="bg-primary h-full transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 시간 */}
          <div className="flex justify-between w-full text-gray-500 text-sm">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex justify-center items-center pt-4 w-full">
            <div className="flex justify-between items-center px-6 w-full max-w-2xl">
              <button className="hover:bg-base-300 p-3 rounded-full transition">
                <Shuffle size={28} className="cursor-pointer" />
              </button>
              <button className="hover:bg-base-300 p-3 rounded-full transition">
                <SkipBack size={32} className="cursor-pointer" />
              </button>

              <button onClick={togglePlay} className="transition-all duration-300 ease-in-out">
                <div className="relative w-10 h-10">
                  <Play
                    size={40}
                    className={`absolute left-0 top-0 transition-all duration-300 ease-in-out ${
                      isPlaying ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                    } text-primary`}
                  />
                  <Pause
                    size={40}
                    className={`absolute left-0 top-0 transition-all duration-300 ease-in-out ${
                      isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    } text-primary`}
                  />
                </div>
              </button>

              <button className="hover:bg-base-300 p-3 rounded-full transition">
                <SkipForward size={32} className="cursor-pointer" />
              </button>
              <button className="hover:bg-base-300 p-3 rounded-full transition">
                <List size={28} className="cursor-pointer" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayEpisode;
