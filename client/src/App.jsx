import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Search, Play, Pause, SkipBack, SkipForward, Menu, X,
  Home, Library, Settings, Volume2, Music, Heart,
  Shuffle, Repeat, Repeat1, ListPlus, Youtube, Edit2, Trash2, Check
} from 'lucide-react';


const API_BASE = '/api';





const PremiumSlider = ({ value, onChange, className = "" }) => {
  const ref = useRef();
  const handleSeek = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    onChange(Math.max(0, Math.min(1, pos)));
  };
  return (
    <div ref={ref} onClick={handleSeek} className={`relative h-1 w-full bg-white/10 rounded-full cursor-pointer overflow-hidden group ${className}`}>
      <div className="absolute top-0 left-0 h-full bg-white transition-all duration-100 group-hover:bg-[#1db954]" style={{ width: `${(value || 0) * 100}%` }} />
    </div>
  );
};



const CircularButton = ({ children, onClick, size = "md", className = "" }) => {
  const sizes = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-14 h-14" };
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center bg-white text-black rounded-full transition-all hover:scale-105 active:scale-95 ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};







function App() {
  const [view, setView] = useState('home');
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [libraryTracks, setLibraryTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none');
  const [bgVideo, setBgVideo] = useState(localStorage.getItem('onyx-bg-video') || null);
  const [bgVideos, setBgVideos] = useState([]);
  const [managedChannels, setManagedChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [editingChannel, setEditingChannel] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [libraryTab, setLibraryTab] = useState('songs');



  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);









  const audioRef = useRef(new Audio());






  const showToast = (message) => toast(message);

  const playNext = useCallback(() => {
    setQueue(q => {
      if (q.length === 0) return q;
      setQueueIndex(i => {
        let next;
        if (shuffle) {
          next = Math.floor(Math.random() * q.length);
        } else {
          next = (i + 1) % q.length;
        }
        playSongDirect(q[next]);
        return next;
      });
      return q;
    });
  }, [shuffle]);

  const playPrev = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setQueue(q => {
      if (q.length === 0) return q;
      setQueueIndex(i => {
        const prev = (i - 1 + q.length) % q.length;
        playSongDirect(q[prev]);
        return prev;
      });
      return q;
    });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const update = () => {
      setProgress(audio.currentTime / (audio.duration || 1));
      setDuration(audio.duration || 0);
    };
    const onEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeat === 'all' || queue.length > 1) {
        playNext();
      } else {
        setIsPlaying(false);
      }
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('ended', onEnded);
    loadSuggestions();
    loadLibrary();
    loadBgVideos();
    loadChannels();
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeat, queue, playNext]);




  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); if (currentSong) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(p => !p); } }
      if (e.code === 'ArrowRight') { e.preventDefault(); audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }
      if (e.code === 'ArrowUp') { e.preventDefault(); setVolume(v => Math.min(1, v + 0.1)); }
      if (e.code === 'ArrowDown') { e.preventDefault(); setVolume(v => Math.max(0, v - 0.1)); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentSong, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/featured`);
      setSuggestions(resp.data || {});
    } catch (e) { } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e.key && e.key !== 'Enter') return;
    setLoading(true);
    setVideos([]);
    try {
      const res = await axios.get(`${API_BASE}/search?q=${query}`);
      setVideos(res.data);
      if (view !== 'home') setView('home');
      setMobileMenu(false);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };











  const playSongDirect = async (video) => {
    setIsDownloading(true);
    setCurrentSong(video);
    setIsPlaying(false);
    try {
      await axios.get(`${API_BASE}/download?id=${video.id}`);
      audioRef.current.src = `${API_BASE}/stream/${video.id}`;
      audioRef.current.play();
      setIsPlaying(true);
    } catch (err) { showToast('❌ Stream failed. Try again.'); } finally { setIsDownloading(false); }
  };

  const playSong = async (video, sourceList) => {
    if (currentSong?.id === video.id) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
      return;
    }




    const list = sourceList || (Array.isArray(!query ? suggestions : videos) ? (!query ? suggestions : videos) : []);
    const idx = list.findIndex(v => v.id === video.id);
    setQueue(list);
    setQueueIndex(idx >= 0 ? idx : 0);
    await playSongDirect(video);
  };

  const loadLibrary = async () => {
    try {
      const res = await axios.get(`${API_BASE}/library`);
      setLibraryTracks(res.data);
    } catch (e) { }
  };

  const loadBgVideos = async () => {
    try {
      const res = await axios.get(`${API_BASE}/background-videos`);
      setBgVideos(res.data);
    } catch (e) { }
  };

  const handleBgSelect = (video) => {
    const newVal = bgVideo === video.url ? null : video.url;
    setBgVideo(newVal);
    if (newVal) localStorage.setItem('onyx-bg-video', newVal);
    else localStorage.removeItem('onyx-bg-video');
  };

  const loadChannels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/channels`);
      setManagedChannels(res.data);
    } catch (e) { }
  };

  const addChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await axios.post(`${API_BASE}/channels`, { identifier: newChannelName });
      setNewChannelName('');
      loadChannels();
      loadSuggestions();
      showToast('Channel added!');
    } catch (e) { showToast('Error adding channel'); }
  };

  const removeChannel = async (name) => {
    try {
      await axios.delete(`${API_BASE}/channels/${encodeURIComponent(name)}`);
      loadChannels();
      loadSuggestions();
    } catch (e) { }
  };

  const updateChannel = async (oldName) => {
    if (!editValue.trim() || editValue === oldName) {
      setEditingChannel(null);
      return;
    }
    try {
      await axios.put(`${API_BASE}/channels/${encodeURIComponent(oldName)}`, { newName: editValue });
      setEditingChannel(null);
      loadChannels();
      loadSuggestions();
      showToast('Channel updated!');
    } catch (e) { showToast('Error updating channel'); }
  };









  const toggleLove = async (track, e) => {
    if (e) e.stopPropagation();
    const isLoved = libraryTracks.find(t => t.id === track.id);
    try {
      if (isLoved) {
        await axios.delete(`${API_BASE}/library/${track.id}`);
        showToast('Removed from Library');
      } else {
        await axios.post(`${API_BASE}/library`, track);
        showToast('❤️ Added to Library');
      }
      loadLibrary();
    } catch (err) {
      showToast('Error updating library');
    }
  };

  const cycleRepeat = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');

  const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const NavLink = ({ id, label, icon: Icon }) => (
    <div
      onClick={() => { setView(id); setMobileMenu(false); }}
      className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-lg text-sm font-medium cursor-pointer transition-all
        ${view === id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </div>
  );





  return (
    <div className="flex h-screen bg-[#030303] text-white font-sans overflow-hidden relative">
      {bgVideo && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-100 transition-opacity duration-1000 brightness-[0.4] contrast-[1.1]"
            key={bgVideo}
          >
            <source src={bgVideo} type="video/mp4" />
          </video>
        </div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full bg-black/40">
          <div className="flex items-center gap-3 p-6 mb-4">
            <img src="/logo.png" alt="Onyx Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform hover:scale-105" />
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Onyx</span>
          </div>
          <div className="flex-1 space-y-1">
            <NavLink id="home" label="Explore" icon={Home} />
            <NavLink id="library" label="Library" icon={Library} />
            <NavLink id="settings" label="Settings" icon={Settings} />
          </div>
        </div>
      </div>







      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50 relative z-10">
        <header className="flex items-center gap-4 p-4 md:p-6 sticky top-0 z-30 glass-panel border-b border-white/5">
          <button className="md:hidden p-2 text-white/70 hover:text-white" onClick={() => setMobileMenu(true)}>
            <Menu size={24} />
          </button>
          <div className="flex-1 flex items-center relative max-w-lg group">
            <Search className="absolute left-4 text-white/40 group-focus-within:text-white/80 transition-colors" size={18} />
            <input
              className="w-full bg-white/5 border border-white/5 hover:bg-white/10 p-3 pl-11 rounded-full text-sm outline-none focus:bg-white/10 focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder:text-white/40 transition-all"
              placeholder="What do you want to listen to?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </header>






        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-[180px] no-scrollbar">
          {view === 'home' && (
            <>
              {query ? (
                <>
                  <h1 className="text-3xl font-bold mb-8">Search Results for "{query}"</h1>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {/* (Search results grid) */}
                    {videos.map(v => (
                      <div key={v.id} className="group cursor-pointer p-5 bg-[#0c0c0c] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#111] rounded-2xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5 relative overflow-hidden" onClick={() => playSong(v)}>
                        <div className="relative aspect-square mb-4 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all z-10">
                          <img src={v.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                          <div className={`absolute bottom-2 right-2 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(29,185,84,0.4)] transform transition-all duration-300 group-hover:scale-105 ${currentSong?.id === v.id && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                            {currentSong?.id === v.id && isPlaying ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
                          </div>
                        </div>
                        <div className="font-semibold text-sm truncate text-white mb-1 z-10 relative">{v.title}</div>
                        <div className="text-xs text-white/50 truncate z-10 relative group-hover:text-white/80 transition-colors">{v.author}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {suggestionsLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-white/5">
                          <div className="skeleton aspect-square rounded-xl mb-4 w-full" />
                          <div className="skeleton h-3.5 rounded mb-2 w-4/5" />
                          <div className="skeleton h-3 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    Object.entries(suggestions).map(([category, tracks]) => (
                      <div key={category} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">{category}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                          {tracks.map(v => (
                            <div key={v.id} className="group cursor-pointer p-5 bg-[#0c0c0c] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#111] rounded-2xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5 relative overflow-hidden" onClick={() => playSong(v)}>
                              <div className="relative aspect-square mb-4 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all z-10">
                                <img src={v.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                <div className={`absolute bottom-2 right-2 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(29,185,84,0.4)] transform transition-all duration-300 group-hover:scale-105 ${currentSong?.id === v.id && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                  {currentSong?.id === v.id && isPlaying ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
                                </div>
                              </div>
                              <div className="font-semibold text-sm truncate text-white mb-1 z-10 relative">{v.title}</div>
                              <div className="text-xs text-white/50 truncate z-10 relative group-hover:text-white/80 transition-colors">{v.author}</div>
                              {v.genre && (
                                <div className="mt-2 text-[10px] text-white/30 truncate z-10 relative font-medium tracking-wide uppercase">{v.genre}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}




          {view === 'library' && (
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Your Library</h1>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setLibraryTab('songs')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${libraryTab === 'songs' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                  >
                    Songs
                  </button>
                  <button
                    onClick={() => setLibraryTab('channels')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${libraryTab === 'channels' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                  >
                    YouTube Channels
                  </button>
                </div>
              </div>

              {libraryTab === 'songs' ? (
                libraryTracks.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Music size={64} className="mb-6 text-white/20" />
                    <div className="font-bold text-xl mb-2">It's a bit empty here</div>
                    <div className="text-white/50 text-sm">Download songs to add them to your archive.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {libraryTracks.map(v => (
                      <div key={v.id} className="group cursor-pointer p-5 bg-[#0c0c0c] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#111] rounded-2xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5 relative overflow-hidden" onClick={() => playSong(v)}>
                        {currentSong?.id === v.id && isPlaying && (
                          <div className="absolute inset-0 bg-gradient-to-t from-[#1db954]/20 to-transparent opacity-50 z-0 pointer-events-none" />
                        )}
                        <div className="relative aspect-square mb-4 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all z-10">
                          <img src={v.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                          <div className={`absolute bottom-2 right-2 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(29,185,84,0.4)] transform transition-all duration-300 group-hover:scale-105 ${currentSong?.id === v.id && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                            {currentSong?.id === v.id && isPlaying ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-2 z-10 relative">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate text-white mb-1">{v.title}</div>
                            <div className="text-xs text-white/50 truncate group-hover:text-white/80 transition-colors">{v.author}</div>
                          </div>
                          <button onClick={(e) => toggleLove(v, e)} className="text-[#1db954] hover:scale-110 active:scale-95 transition-transform flex-shrink-0">
                            <Heart size={18} className="fill-current" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="max-w-4xl">
                  {/* Add New Channel Card */}
                  <div className="relative group mb-12">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1db954]/20 to-[#1db954]/0 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-[#121212]/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-[#1db954]/10 rounded-xl flex items-center justify-center text-[#1db954]">
                          <ListPlus size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Import Music Channels</h2>
                          <p className="text-white/40 text-sm">Add your favorite YouTube channels to enrich your Home feed suggestions.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="relative flex-1 group/input">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within/input:text-[#1db954] transition-colors">
                            <Youtube size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="Paste YouTube Channel URL or Name..."
                            className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-4 rounded-xl text-sm outline-none focus:border-[#1db954]/50 focus:bg-[#1db954]/5 transition-all placeholder:text-white/20"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                          />
                        </div>
                        <button
                          onClick={addChannel}
                          className="bg-[#1db954] text-black px-10 py-2 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-[0_8px_20px_rgba(29,185,84,0.3)] flex items-center gap-2"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Channels Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {managedChannels.map(c => (
                      <div
                        key={c.identifier}
                        className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] p-5 rounded-2xl group flex items-center justify-between hover:bg-white/[0.06] hover:border-[#1db954]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-300"
                      >
                        {editingChannel === c.identifier ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              autoFocus
                              type="text"
                              className="flex-1 bg-white/10 border border-[#1db954]/50 p-2.5 rounded-xl text-sm outline-none focus:shadow-[0_0_15px_rgba(29,185,84,0.2)]"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && updateChannel(c.identifier)}
                              onBlur={() => updateChannel(c.identifier)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-[#1db954] border border-white/5 group-hover:border-[#1db954]/30 transition-all">
                              <Youtube size={22} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white truncate group-hover:text-[#1db954] transition-colors">{c.name}</div>
                              <div className="text-[10px] text-white/30 truncate uppercase tracking-widest mt-0.5">
                                {c.identifier.includes('@') ? c.identifier.split('/').pop() : 'YouTube Channel'}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 ml-4">
                          {editingChannel === c.identifier ? (
                            <button onClick={() => updateChannel(c.identifier)} className="w-9 h-9 flex items-center justify-center bg-[#1db954] text-black rounded-lg hover:scale-105 transition-all">
                              <Check size={18} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                              <button
                                onClick={() => { setEditingChannel(c.identifier); setEditValue(c.name); }}
                                className="w-9 h-9 flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                title="Rename Channel"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => removeChannel(c.identifier)}
                                className="w-9 h-9 flex items-center justify-center bg-white/5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                title="Remove Channel"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {managedChannels.length === 0 && (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                        <Youtube size={48} className="text-white/5 mb-4" />
                        <div className="text-white/20 font-medium">No channels added to your library yet.</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-4xl">
              <h1 className="text-3xl font-bold mb-8">Settings</h1>

              <div className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-white/90">Appearance</h2>
                <div className="bg-[#181818] rounded-2xl p-6 border border-white/5">
                  <div className="mb-4 text-sm font-medium text-white/60">Background Video</div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 mt-4">
                    <div
                      onClick={() => handleBgSelect({ url: null })}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all bg-[#0a0a0a] flex flex-col items-center justify-center gap-2 ${bgVideo === null ? 'border-[#1db954] shadow-[0_0_15px_rgba(29,185,84,0.3)]' : 'border-transparent hover:border-white/20'}`}
                    >
                      <X size={24} className="text-white/40" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">None</span>
                    </div>
                    {bgVideos.map((v, i) => (
                      <div
                        key={i}
                        className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all bg-[#0a0a0a] hover:scale-[1.02] ${bgVideo === v.url ? 'border-[#1db954] shadow-[0_0_15px_rgba(29,185,84,0.3)]' : 'border-transparent hover:border-white/20'}`}
                        onClick={() => handleBgSelect(v)}
                      >
                        <video
                          muted
                          playsInline
                          loop
                          className="w-full h-full object-cover"
                          onMouseOver={e => e.target.play()}
                          onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                        >
                          <source src={v.url} type="video/mp4" />
                        </video>
                        <div className="absolute bottom-2 left-2 right-2 text-[10px] font-bold uppercase tracking-widest text-white drop-shadow-md truncate">
                          {v.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] rounded-2xl p-6 border border-white/5">
                <h2 className="text-xl font-semibold mb-6 text-white/90">System</h2>
                <div className="flex justify-between items-center py-4 border-b border-white/5">
                  <span className="font-medium text-white/90">Acoustic Buffering</span>
                  <span className="bg-white/10 text-xs px-3 py-1 rounded-full text-white/80">Default</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-white/5">
                  <span className="font-medium text-white/90">System Cache</span>
                  <button className="text-sm font-semibold text-[#1db954] hover:text-white transition-colors" onClick={() => alert("WIPED")}>
                    Purge Data
                  </button>
                </div>
                <div className="pt-6 text-xs text-white/40">
                  Onyx v2.0 - Realistic Build
                </div>
              </div>
            </div>
          )}
        </main>
      </div>




      <div className="fixed bottom-0 w-full h-24 glass-panel border-t flex items-center px-4 md:px-6 z-[100]">
        {currentSong ? (
          <div className="flex items-center w-full justify-between relative">




            <div className="absolute top-[-1px] left-[-24px] right-[-24px] h-[3px] bg-transparent transform -translate-y-full">
              <div className="h-full bg-gradient-to-r from-purple-500 via-[#1db954] to-blue-500 transition-all duration-200" style={{ width: `${(progress || 0) * 100}%` }} />
            </div>




            <div className="flex items-center gap-4 w-[30%] min-w-[180px] group">
              <div className="relative w-14 h-14 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden">
                <img src={currentSong.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-[2px]">
                    <div className="w-[3px] bg-white rounded-t-sm visualizer-bar"></div>
                    <div className="w-[3px] bg-white rounded-t-sm visualizer-bar"></div>
                    <div className="w-[3px] bg-white rounded-t-sm visualizer-bar"></div>
                    <div className="w-[3px] bg-white rounded-t-sm visualizer-bar"></div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white truncate hover:underline cursor-pointer mb-0.5">{currentSong.title}</div>
                  <div className="text-xs text-white/50 truncate hover:underline cursor-pointer transition-colors hover:text-white/80">{currentSong.author}</div>
                </div>
                <button onClick={() => toggleLove(currentSong)} className={`${libraryTracks.find(t => t.id === currentSong.id) ? 'text-[#1db954]' : 'text-white/40 hover:text-white'} transition-colors hover:scale-110 active:scale-95`}>
                  <Heart size={20} className={libraryTracks.find(t => t.id === currentSong.id) ? 'fill-current' : ''} />
                </button>
              </div>
            </div>





            <div className="flex-1 flex flex-col items-center max-w-[40%]">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setShuffle(s => !s)} className={`transition-colors hover:scale-110 active:scale-95 ${shuffle ? 'text-[#1db954]' : 'text-white/40 hover:text-white'}`} title="Shuffle (S)">
                  <Shuffle size={16} />
                </button>
                <SkipBack size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={playPrev} />
                <CircularButton size="md" onClick={() => { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(p => !p); }}>
                  {isDownloading ? <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : (isPlaying ? <Pause size={20} className="fill-current text-black" /> : <Play size={20} className="fill-current text-black ml-1" />)}
                </CircularButton>
                <SkipForward size={20} className="text-white/70 hover:text-white cursor-pointer transition-colors" onClick={playNext} />
                <button onClick={cycleRepeat} className={`transition-colors hover:scale-110 active:scale-95 ${repeat !== 'none' ? 'text-[#1db954]' : 'text-white/40 hover:text-white'}`} title="Repeat">
                  {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-3 w-full max-w-md">
                <span className="text-[11px] text-white/50 min-w-10 text-right">{formatTime(audioRef.current.currentTime)}</span>
                <PremiumSlider value={progress} onChange={(v) => { if (audioRef.current.duration) audioRef.current.currentTime = v * audioRef.current.duration; }} />
                <span className="text-[11px] text-white/50 min-w-10">{formatTime(duration)}</span>
              </div>
            </div>




            <div className="hidden md:flex flex-row-reverse items-center w-[30%] min-w-[180px] gap-4">
              <div className="flex items-center gap-2 w-32">
                <Volume2 size={20} className="text-white/70" />
                <PremiumSlider value={volume} onChange={(v) => setVolume(v)} className="w-24" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center text-white/20 select-none">
            <span className="text-sm font-medium">Select a track to start listening</span>
          </div>
        )}
      </div>

      {mobileMenu && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-xl z-40 md:hidden" onClick={() => setMobileMenu(false)} />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: {
            background: 'rgba(20,20,20,0.85)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          iconTheme: { primary: '#1db954', secondary: '#000' },
        }}
      />
    </div>
  );
}

export default App;
