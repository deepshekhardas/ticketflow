import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, ChevronLeft, CreditCard, Ticket, QrCode, Download, CheckCircle2, Armchair, ArrowRight, Loader2, Info, LogOut, LogIn, MessageSquare, Send, ShieldCheck, Share, BellRing, Printer } from 'lucide-react';
import { EventInfo, Seat, syncEvents, subscribeToEvents, subscribeToSeats, bookSeatsData, subscribeToUserBookings, UserBooking, createSupportTicket, subscribeToSupportTickets, SupportTicket } from './data';
import { auth, loginWithGoogle, logout } from './firebase';
import QRCode from 'react-qr-code';
import { onAuthStateChanged, User } from 'firebase/auth';

type ViewState = 'home' | 'seats' | 'checkout' | 'ticket' | 'profile' | 'support';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [userDetails, setUserDetails] = useState({ name: '', email: '' });
  const [seatMap, setSeatMap] = useState<Seat[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
        const timer = setTimeout(() => setErrorMessage(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    // Automatically remove seats that get booked by someone else while selecting
    if (seatMap.length > 0 && selectedSeats.length > 0) {
        const compromisedSeats = selectedSeats.filter(id => {
            const s = seatMap.find(seat => seat.id === id);
            return s && s.status === 'booked';
        });
        if (compromisedSeats.length > 0) {
            setNotification(`Seat(s) ${compromisedSeats.join(', ')} were just booked by someone else.`);
            setSelectedSeats(prev => prev.filter(id => !compromisedSeats.includes(id)));
        }
    }
  }, [seatMap, selectedSeats]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setUserDetails({ name: u.displayName || '', email: u.email || '' });
        // Seed if necessary when user logs in
        syncEvents();
      }
    });

    const unsubEvents = subscribeToEvents((data) => {
        setEvents(data);
        setLoadingEvents(false);
    });

    return () => {
        unsubAuth();
        unsubEvents();
    };
  }, []);

  // Generate seat map when an event is selected
  useEffect(() => {
    if (selectedEvent) {
      setSelectedSeats([]);
      const unsub = subscribeToSeats(selectedEvent.id, (seats) => {
          setSeatMap(seats);
      });
      return () => unsub();
    }
  }, [selectedEvent]);

  const handleSelectEvent = (event: EventInfo) => {
    setSelectedEvent(event);
    setView('seats');
  };

  const handleSeatToggle = (seatId: string) => {
    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setErrorMessage("Popup blocked by browser. Please allow popups or open the app in a new tab to login.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // user cancelled or multiple clicks, ignore
      } else {
        setErrorMessage("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const totalPrice = selectedSeats.length * (selectedEvent?.price || 50);

  const resetFlow = () => {
    setView('home');
    setSelectedEvent(null);
    setSelectedSeats([]);
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden relative">
      {/* Background ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
         <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/10 blur-[120px] animate-float"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[140px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-6xl rounded-full glass-panel px-6 sm:px-10 py-4 flex items-center justify-between transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-3 font-bold text-xl tracking-tight cursor-pointer"
            onClick={resetFlow}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <div className="lavish-gradient-text tracking-widest text-lg font-serif">
              INDIGO<span className="text-white">PASS</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full text-[10px] font-medium text-amber-400 tracking-wider uppercase">
            <span className="w-1 h-1 rounded-full bg-amber-400"></span> Portfolio Demo
          </div>
        </div>
        
        {view !== 'home' ? (
          <button 
            onClick={() => {
              if (view === 'seats') setView('home');
              if (view === 'checkout') setView('seats');
              if (view === 'ticket') resetFlow();
              if (view === 'profile') resetFlow();
            }}
            className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            {view === 'ticket' || view === 'profile' ? 'Home' : <><ChevronLeft size={16} /> Back</>}
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-slate-400">
            <span className="hover:text-white cursor-pointer transition-all px-2 py-1 relative overflow-hidden group" onClick={resetFlow}>
              Explore
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </span>
            <span 
              className="hover:text-white cursor-pointer transition-all px-2 py-1 relative overflow-hidden group" 
              onClick={() => {
                if (user) setView('profile');
                else { setErrorMessage("Please login to view profile."); handleLogin(); }
              }}
            >
              My Profile
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </span>
            <span 
              className="hover:text-white cursor-pointer transition-all px-2 py-1 relative overflow-hidden group"
              onClick={() => {
                if (user) setView('support');
                else { setErrorMessage("Please login to access support."); handleLogin(); }
              }}
            >
              Support
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </span>
            {user ? (
               <div className="flex items-center gap-4">
                 <img 
                   src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                   alt="avatar" 
                   className="w-8 h-8 rounded-full border border-slate-700 cursor-pointer hover:border-indigo-400 transition-colors" 
                   onClick={() => setView('profile')}
                 />
                 <button onClick={logout} className="text-slate-400 hover:text-white transition-colors"><LogOut size={16} /></button>
               </div>
            ) : (
                <button onClick={handleLogin} disabled={isLoggingIn} className="flex items-center gap-2 glass-panel hover:bg-white/10 px-5 py-2.5 rounded-full text-white transition-all text-sm shimmer-button disabled:opacity-50">
                  {isLoggingIn ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Login
               </button>
            )}
          </div>
        )}
      </header>

      <main className="w-full min-h-[calc(100vh-64px)] pt-32">
        <AnimatePresence>
          {errorMessage && (
            <motion.div
               initial={{ top: 0, opacity: 0 }}
               animate={{ top: 80, opacity: 1 }}
               exit={{ top: 0, opacity: 0 }}
               className="fixed left-1/2 -translate-x-1/2 z-[100] bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-red-400 w-max max-w-[90vw]"
            >
               <Info size={18} className="shrink-0" />
               <span className="text-sm font-medium">{errorMessage}</span>
            </motion.div>
          )}
          {notification && (
            <motion.div
               initial={{ bottom: -50, opacity: 0 }}
               animate={{ bottom: 30, opacity: 1 }}
               exit={{ bottom: -50, opacity: 0 }}
               className="fixed left-1/2 -translate-x-1/2 z-[100] bg-indigo-900/90 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center gap-3 border border-indigo-500/50 w-max max-w-[90vw]"
            >
               <Info size={18} className="shrink-0 text-indigo-300" />
               <span className="text-sm font-medium">{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <HomeView key="home" onSelect={handleSelectEvent} events={events} loading={loadingEvents} />
          )}
          {view === 'seats' && selectedEvent && (
            <SeatsView 
              key="seats" 
              event={selectedEvent} 
              seatMap={seatMap}
              selectedSeats={selectedSeats}
              onToggleSeat={handleSeatToggle}
              onProceed={() => setView('checkout')}
              totalPrice={totalPrice}
              user={user}
              setErrorMessage={setErrorMessage}
              onLogin={handleLogin}
            />
          )}
          {view === 'checkout' && selectedEvent && (
            <CheckoutView 
              key="checkout" 
              event={selectedEvent}
              selectedSeats={selectedSeats}
              totalPrice={totalPrice}
              userDetails={userDetails}
              setUserDetails={setUserDetails}
              onSuccess={() => setView('ticket')}
              user={user}
              setErrorMessage={setErrorMessage}
            />
          )}
          {view === 'ticket' && selectedEvent && (
            <TicketView 
              key="ticket" 
              event={selectedEvent}
              selectedSeats={selectedSeats}
              userDetails={userDetails}
              totalPrice={totalPrice}
            />
          )}
          {view === 'profile' && (
            <ProfileView key="profile" events={events} user={user} />
          )}
          {view === 'support' && (
            <SupportView key="support" user={user} />
          )}
        </AnimatePresence>
      </main>

      {/* Futuristic / Lavish Footer */}
      <footer className="border-t border-white/5 bg-[#050505]/80 backdrop-blur-md mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex flex-col items-center md:items-start">
             <div className="lavish-gradient-text font-bold text-xl tracking-tight mb-2">INDIGOPASS</div>
             <p className="text-sm font-light text-slate-500">Curating the world's most extraordinary experiences.</p>
           </div>
           <div className="flex gap-8 text-sm font-light text-slate-400">
             <span className="hover:text-indigo-400 transition-colors cursor-pointer">Terms</span>
             <span className="hover:text-indigo-400 transition-colors cursor-pointer">Privacy</span>
             <span className="hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => {
                if (user) setView('support');
                else { setErrorMessage("Please login to access support."); handleLogin(); }
              }}>Support</span>
           </div>
        </div>
      </footer>
    </div>
  );
}

// --- VIEWS ---

function HomeView({ onSelect, events, loading }: { onSelect: (e: EventInfo) => void, events: EventInfo[], loading: boolean, key?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(events.map(e => e.category)))], [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchCat = activeCategory === 'All' || e.category === activeCategory;
      const matchQuery = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.venue.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [events, activeCategory, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24"
    >
      <section className="mb-20 mt-4 sm:mt-12 text-center sm:text-left flex flex-col items-center sm:items-start relative">
        {/* Subtle premium label */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium uppercase tracking-[0.2em] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          Exclusive Access
        </div>
        
        <h1 className="text-5xl sm:text-[80px] font-serif text-white mb-8 leading-[1.1] tracking-tight max-w-4xl">
          Discover <span className="lavish-gold-text italic pr-2">Extraordinary</span> <br className="hidden sm:block" />Experiences.
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl font-light leading-relaxed mb-12">
          Reserve your place at the most sought-after concerts, conferences, and comedy shows. A seamless, premium ticketing experience.
        </p>

        <div className="flex flex-col gap-4 w-full md:w-auto relative z-10 w-full sm:max-w-md">
           <div className="relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
             <input 
               type="text" 
               placeholder="Search events or venues..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="relative w-full glass-panel bg-[#0a0a0a]/80 border border-white/10 px-6 py-4 pl-12 rounded-full text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all shadow-xl"
             />
             <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
        </div>
      </section>

      {!loading && events.length > 0 && (
        <div className="flex overflow-x-auto pb-6 mb-8 hide-scrollbar gap-3 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="glass-panel rounded-3xl overflow-hidden flex flex-col h-[400px]">
               <div className="aspect-[16/10] w-full bg-white/5 animate-pulse"></div>
               <div className="p-8 flex-1 flex flex-col gap-4">
                 <div className="w-3/4 h-6 bg-white/5 rounded-full animate-pulse"></div>
                 <div className="w-1/2 h-6 bg-white/5 rounded-full animate-pulse"></div>
                 <div className="mt-auto space-y-3">
                    <div className="w-full h-4 bg-white/5 rounded-full animate-pulse"></div>
                    <div className="w-2/3 h-4 bg-white/5 rounded-full animate-pulse"></div>
                 </div>
               </div>
             </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
            No events found. Log in to auto-seed mock data.
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 text-slate-400 glass-panel rounded-3xl mx-auto max-w-2xl">
            <p className="text-lg">No events match your search criteria.</p>
            <button onClick={() => {setSearchQuery(''); setActiveCategory('All');}} className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium">Clear filters</button>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredEvents.map((event) => (
            <motion.div 
              variants={item}
              key={event.id}
              className="group glass-panel rounded-3xl overflow-hidden hover:lavish-glow transition-all duration-700 flex flex-col cursor-pointer relative"
              onClick={() => onSelect(event)}
            >
              {/* Premium hover border gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20"></div>

              <div className="aspect-[16/10] w-full overflow-hidden relative">
                <div className="absolute top-4 left-4 glass-panel px-4 py-1.5 rounded-full text-[10px] font-bold text-white z-10 uppercase tracking-[0.2em] backdrop-blur-md bg-black/40 border-white/20">
                  {event.category}
                </div>
                {/* VIP badge */}
                <div className="absolute top-4 right-4 glass-panel px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-300 z-10 uppercase tracking-widest backdrop-blur-md bg-amber-500/10 border-amber-500/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <svg className="w-3 h-3 drop-shadow-[0_0_2px_rgba(245,158,11,1)]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> Demo VIP
                </div>
                <img 
                  src={event.image} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22400%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23191330%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%20fill%3D%22%23c4b5fd%22%20font-family%3D%22sans-serif%22%20font-size%3D%2236%22%3EIndigoPass%20%C2%B7%20Demo%20event%3C/text%3E%3C/svg%3E'; }} 
                  alt={event.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 group-hover:opacity-100 mix-blend-luminosity opacity-70 group-hover:mix-blend-normal"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent"></div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col relative z-20 -mt-6">
                <h3 className="font-serif text-2xl mb-4 text-white line-clamp-2 leading-snug group-hover:lavish-gold-text transition-colors duration-500">{event.title}</h3>
                
                <div className="space-y-4 mt-auto">
                  <div className="flex items-center text-slate-300 text-sm font-light">
                    <Calendar size={16} className="mr-4 text-indigo-400" />
                    <span className="tracking-wide">Sample schedule: {event.date}</span>
                  </div>
                  <div className="flex items-center text-slate-300 text-sm font-light">
                    <MapPin size={16} className="mr-4 text-indigo-400" />
                    <span className="tracking-wide line-clamp-1">{event.venue}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-light pt-2">
                    <div className="flex items-center text-amber-400">
                      <svg className="w-4 h-4 mr-1 drop-shadow-[0_0_2px_rgba(245,158,11,1)]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <span className="font-medium mr-1 text-slate-200">4.9</span>
                      <span className="text-slate-500 text-xs tracking-wider">(demo)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium tracking-wide uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                      Sample event
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div className="font-serif text-3xl lavish-gold-text flex items-baseline gap-2">
                    ${event.price} <span className="font-sans text-xs font-normal text-slate-500 uppercase tracking-widest hidden sm:inline">/ seat</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (navigator.share) {
                          navigator.share({
                            title: event.title,
                            text: `Check out ${event.title} at ${event.venue}!`,
                            url: window.location.href,
                          }).catch(console.error);
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Link copied to clipboard!');
                        }
                      }}
                      className="glass-panel text-white p-3 rounded-full hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      title="Share Event"
                    >
                      <Share size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onSelect(event); }}
                      className="shimmer-button bg-white text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                    >
                      Try demo <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function SeatsView({ event, seatMap, selectedSeats, onToggleSeat, onProceed, totalPrice, user, setErrorMessage, onLogin }: any) {
  // Group seats by row
  const rows = useMemo(() => {
    const rowMap = new Map<string, Seat[]>();
    seatMap.forEach((seat: Seat) => {
      if (!rowMap.has(seat.row)) rowMap.set(seat.row, []);
      rowMap.get(seat.row)!.push(seat);
    });
    return Array.from(rowMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seatMap]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto px-4 py-8 pb-40"
    >
      {/* Social Proof Banner */}
      <div className="flex justify-center mb-8">
        <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-3 shadow-lg border border-indigo-500/30 bg-indigo-500/10">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-amber-400"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
           </span>
           <span className="text-sm font-medium text-amber-100/90 tracking-wide">
             Portfolio demo: <span className="font-bold text-amber-400">sample events</span> — no real tickets or live demand.
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Sidebar - Event Details */}
        <div className="xl:col-span-1 flex flex-col gap-6 order-2 xl:order-1">
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden h-full hidden xl:block">
             <div className="w-full aspect-[4/5] rounded-xl overflow-hidden mb-6 relative">
                <img src={event.image} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22400%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23191330%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%20fill%3D%22%23c4b5fd%22%20font-family%3D%22sans-serif%22%20font-size%3D%2236%22%3EIndigoPass%20%C2%B7%20Demo%20event%3C/text%3E%3C/svg%3E'; }} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
             </div>
             <h3 className="text-2xl font-serif text-white mb-2 leading-tight">{event.title}</h3>
             <p className="text-sm text-indigo-300 font-medium tracking-wider uppercase mb-1">{event.date}</p>
              <p className="text-xs text-slate-400 tracking-wide uppercase mb-6 line-clamp-1">{event.venue}</p>

             <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 relative overflow-hidden group border border-white/5 transition-all text-sm mb-6 uppercase tracking-widest font-medium">
               <span className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent top-0 opacity-0 group-hover:opacity-100 transition-opacity"></span>
               Virtual Tour <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
             </button>

             <div className="space-y-4 border-t border-white/10 pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <span className="text-indigo-400 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium mb-1">Select your seats</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Choose up to 8 seats from the interactive map. The closer to the stage, the better the experience.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <span className="text-indigo-400 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-medium mb-1">Secure Checkout</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Demo timer only: no server-side seat reservation or payment is made.</p>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Area - Interactive Map */}
        <div className="xl:col-span-3 order-1 xl:order-2">
          <div className="glass-panel rounded-[32px] p-6 sm:p-12 relative overflow-hidden min-h-[600px] flex flex-col border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            {/* Subtle glow behind seats */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

            <div className="mb-14 text-center relative z-10 xl:hidden">
              <h2 className="text-4xl font-serif text-white mb-3">{event.title}</h2>
              <p className="text-slate-400 font-light tracking-wide uppercase text-sm">{event.venue} <span className="mx-2 text-indigo-400">&bull;</span> {event.date}</p>
            </div>

            {/* Stage Curved Screen Indicator */}
            <div className="w-full flex justify-center mb-24 relative z-10">
              <div className="w-[80%] sm:w-[60%] h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_40px_rgba(129,140,248,0.9)] relative rounded-full">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[50px] bg-indigo-500/20 blur-[25px] rounded-b-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/4 h-1 bg-white/20 blur-[2px]"></div>
                <span className="absolute top-8 left-1/2 -translate-x-1/2 text-[12px] text-indigo-200 tracking-[10px] uppercase font-light">S t a g e</span>
              </div>
            </div>

            {/* Seat Grid */}
            <div className="overflow-x-auto pb-4 flex-1">
              <div className="min-w-max flex flex-col gap-4 items-center mx-auto relative pl-8">
                {rows.map(([rowId, seats]) => (
                  <div key={rowId} className="flex items-center gap-3 relative">
                    <div className="absolute -left-10 text-sm text-slate-500 font-mono font-medium select-none flex items-center h-full leading-none mt-0.5 w-6 justify-end">{rowId}</div>
                    <div className="flex gap-3">
                      {seats.map(seat => {
                        const isSelected = selectedSeats.includes(seat.id);
                        const isBooked = seat.status === 'booked';
                        
                        return (
                          <button
                            key={seat.id}
                            aria-label={`Seat ${seat.id}, ${isBooked ? 'booked' : isSelected ? 'selected' : 'available'}`}
                            aria-pressed={isSelected}
                            onClick={() => {
                              if (isBooked) {
                                 if (user) {
                                   setErrorMessage(`Demo only: seat ${seat.id} is booked. No waitlist or notification has been created.`);
                                 } else {
                                   setErrorMessage(`Seat ${seat.id} is already booked.`);
                                 }
                                 return;
                              }
                              if (!user) {
                                 setErrorMessage("Please login first to select seats.");
                                 onLogin();
                                 return;
                              }
                              onToggleSeat(seat.id);
                            }}
                            className={`w-10 h-12 rounded-t-[14px] rounded-b-md border-[1px] outline-none flex flex-col items-center justify-end pb-1.5 transition-all duration-300 text-[10px] font-mono group relative shadow-md
                              ${isBooked 
                                ? 'bg-[#0a0a0a]/50 border-white/5 opacity-40 hover:opacity-80 hover:border-indigo-500/50 cursor-pointer text-transparent hover:text-indigo-300 shadow-none' 
                                : isSelected
                                  ? 'bg-gradient-to-br from-indigo-400 to-violet-600 border-transparent text-white shadow-[0_0_25px_rgba(99,102,241,0.7)] scale-110 z-10'
                                  : 'bg-white/5 border-white/20 text-slate-400 hover:bg-white/15 hover:border-slate-300 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:-translate-y-1'
                              }
                            `}
                            title={isBooked ? "Booked sample seat — no notifications" : `Seat ${seat.id}`}
                          >
                             <div className={`w-6 h-1.5 rounded-full mb-1 opacity-50 ${isSelected ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-slate-400'} group-hover:bg-white transition-all`}></div>
                             {isBooked ? (
                               <BellRing size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-indigo-400" />
                             ) : null}
                             <span className={isSelected || isBooked ? "text-white group-hover:opacity-0" : "text-transparent group-hover:text-slate-200 transition-colors"}>{seat.number}</span>
                             
                             {/* VIP Star Indicator for first row */}
                             {rowId === 'A' && !isBooked && !isSelected && (
                               <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-3 h-3 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                               </div>
                             )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-10 mt-16 text-xs text-slate-300 font-medium tracking-widest uppercase pb-4">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-8 rounded-t-lg rounded-b-sm border border-white/20 bg-white/5 flex flex-col items-center justify-end pb-1 shadow-sm"><div className="w-3 h-0.5 rounded-full bg-slate-400 opacity-50 mb-1"></div></div> Available
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-8 rounded-t-lg rounded-b-sm bg-gradient-to-br from-indigo-400 to-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.6)] flex flex-col items-center justify-end pb-1"><div className="w-3 h-0.5 rounded-full bg-white opacity-90 mb-1"></div></div> Selected
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-6 h-8 rounded-t-lg rounded-b-sm bg-white/5 border border-white/5 flex flex-col items-center justify-end pb-1"></div> Booked
              </div>
            </div>
            
            <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-4 pb-2">All prices set by the event organizer</div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar (Frosted Glass) */}
      <AnimatePresence>
        {selectedSeats.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] sm:w-[450px] bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-6 pb-5 z-40 overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-b-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            
            <div className="flex justify-between items-start mb-6">
               <div>
                 <div className="text-xs text-slate-400 mb-1 tracking-widest uppercase font-medium">Selected Seats ({selectedSeats.length})</div>
                 <div className="font-medium text-white max-w-[200px] truncate">{selectedSeats.sort().join(', ')}</div>
               </div>
               
               <div className="text-right">
                  <div className="text-xs text-slate-400 mb-1 tracking-widest uppercase font-medium">Subtotal</div>
                  <div className="text-3xl font-serif text-white flex items-baseline gap-1 justify-end">
                    <span className="lavish-gold-text">${totalPrice.toFixed(2)}</span>
                  </div>
               </div>
            </div>

            <button
               onClick={onProceed}
               className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-5 rounded-full font-bold hover:lavish-glow transition-all flex items-center justify-center gap-3 text-base shimmer-button shadow-[0_10px_20px_rgba(99,102,241,0.3)]"
            >
               Secure Checkout <ArrowRight size={18} />
            </button>
            <div className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
               <ShieldCheck size={14} className="text-indigo-400/50" /> Secure 256-bit SSL encrypted payment
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CheckoutView({ event, selectedSeats, totalPrice, userDetails, setUserDetails, onSuccess, user, setErrorMessage }: any) {
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600 seconds)

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setErrorMessage("Authentication required to complete booking.");
        return;
    }
    setLoading(true);
    try {
        await bookSeatsData(event.id, selectedSeats, totalPrice);
        onSuccess();
    } catch (err) {
        console.error("Booking error: ", err);
        setErrorMessage("Failed to book seats. They might have already been taken by someone else.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto px-4 py-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Order Summary Form */}
        <div className="lg:col-span-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <h2 className="text-4xl font-serif text-white">Secure Checkout</h2>
            {timeLeft > 0 ? (
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] whitespace-nowrap">
                <div className="animate-pulse w-2 h-2 bg-indigo-400 rounded-full"></div>
                <span className="text-sm font-medium tracking-wide">Seats held for <span className="font-mono text-white">{formatTime(timeLeft)}</span></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-full text-red-400">
                <span className="text-sm font-medium tracking-wide">Session expired. Please select seats again.</span>
              </div>
            )}
          </div>

          <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Info className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-amber-400 font-medium text-sm mb-1">Portfolio Demonstration Mode</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                This is a portfolio showcase. No real payments are processed, no credit cards are charged, and you can enter dummy info to complete the flow.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8 glass-panel p-6 sm:p-10 rounded-[32px] relative overflow-hidden">
            {/* Subtle glow inside the form */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="space-y-6 relative z-10">
              <h3 className="font-medium text-2xl text-white font-serif flex items-center gap-3">
                 <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 text-sm flex items-center justify-center font-sans tracking-widest border border-indigo-500/30">1</span>
                 Guest Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pl-11">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest">Full Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="E.g. Jane Doe"
                    value={userDetails.name}
                    onChange={e => setUserDetails({...userDetails, name: e.target.value})}
                    className="w-full px-6 py-4 bg-[#0a0a0a]/50 rounded-2xl border border-white/10 text-white focus:outline-none focus:border-indigo-400 focus:bg-white/5 transition-all font-light placeholder:text-slate-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest">Email Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="E.g. jane@example.com"
                    value={userDetails.email}
                    onChange={e => setUserDetails({...userDetails, email: e.target.value})}
                    className="w-full px-6 py-4 bg-[#0a0a0a]/50 rounded-2xl border border-white/10 text-white focus:outline-none focus:border-indigo-400 focus:bg-white/5 transition-all font-light placeholder:text-slate-600 shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-10 relative z-10"></div>

            <div className="space-y-6 relative z-10">
              <h3 className="font-medium text-2xl text-white font-serif flex items-center gap-3">
                 <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 text-sm flex items-center justify-center font-sans tracking-widest border border-indigo-500/30">2</span>
                 Payment Method <span className="ml-auto text-[10px] uppercase font-sans tracking-widest text-slate-500 font-normal">Demo</span>
              </h3>
              
              <div className="pl-11 space-y-6">
                {/* Digital Wallets */}
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" className="py-4 px-6 bg-white hover:bg-slate-200 text-black rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-white group">
                     <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                     Pay
                  </button>
                  <button type="button" className="py-4 px-6 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-white/20 group">
                     <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 488 512" fill="currentColor"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>
                     Pay
                  </button>
                </div>

                <div className="flex items-center gap-4 py-2 opacity-60">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Or pay with card</div>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-3xl p-8 border border-white/10 flex flex-col sm:flex-row items-start gap-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                  <div className="absolute top-4 right-4 text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20 shadow-sm opacity-80">Test Mode</div>
                  
                  <CreditCard className="text-white/40 mt-1 relative z-10 group-hover:text-indigo-400 transition-colors" size={32} />
                  <div className="flex-1 space-y-6 w-full relative z-10">
                    <div className="font-medium text-white flex justify-between items-center">
                       <span className="text-lg tracking-wide">Credit Card</span>
                    </div>
                    <div>
                      <input 
                        required
                        type="text" 
                        placeholder="Card Number (Demo)"
                        className="w-full px-6 py-4 bg-[#050505]/80 rounded-t-xl border-b border-b-white/5 font-mono text-white focus:outline-none focus:bg-[#0a0a0a] transition-all tracking-widest placeholder:text-slate-600 text-base"
                        maxLength={19}
                      />
                      <div className="grid grid-cols-2">
                        <input 
                          required
                          type="text" 
                          placeholder="MM/YY"
                          className="w-full px-6 py-4 bg-[#050505]/80 rounded-bl-xl border-r border-r-white/5 font-mono text-white focus:outline-none focus:bg-[#0a0a0a] transition-all tracking-widest placeholder:text-slate-600 text-base"
                          maxLength={5}
                        />
                        <input 
                          required
                          type="text" 
                          placeholder="CVC"
                          className="w-full px-6 py-4 bg-[#050505]/80 rounded-br-xl font-mono text-white focus:outline-none focus:bg-[#0a0a0a] transition-all tracking-widest placeholder:text-slate-600 text-base"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || timeLeft <= 0}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-full py-6 font-bold text-lg hover:lavish-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-10 shimmer-button relative z-10 shadow-[0_10px_30px_rgba(99,102,241,0.4)]"
            >
              {loading ? (
                <><Loader2 size={24} className="animate-spin" /> Authorizing...</>
              ) : timeLeft <= 0 ? (
                <>Reservation Expired</>
              ) : (
                <>Pay ${(totalPrice * 1.15).toFixed(2)}</>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-4 relative z-10">Payments are secure and encrypted</p>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5">
          <div className="sticky top-32 glass-panel p-8 sm:p-10 rounded-[32px] border-t border-t-white/20">
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-serif text-3xl text-white">Order Summary</h3>
              <div className={`px-4 py-2 rounded-full text-xs font-mono border shadow-inner ${timeLeft <= 60 ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-indigo-400/50 text-indigo-300 bg-indigo-500/10'} flex items-center gap-3 transition-colors`}>
                 <span className="relative flex h-2.5 w-2.5">
                   <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timeLeft <= 60 ? 'bg-red-400' : 'bg-indigo-400'}`}></span>
                   <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${timeLeft <= 60 ? 'bg-red-500' : 'bg-indigo-500'}`}></span>
                 </span>
                 <span className="tracking-widest font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-b from-white/5 to-transparent rounded-2xl p-5 flex gap-5 mb-10 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Ticket size={100} />
              </div>
              <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0 shadow-lg relative z-10">
                 <img src={event.image} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22400%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23191330%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%20fill%3D%22%23c4b5fd%22%20font-family%3D%22sans-serif%22%20font-size%3D%2236%22%3EIndigoPass%20%C2%B7%20Demo%20event%3C/text%3E%3C/svg%3E'; }} alt={event.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col justify-center relative z-10 pr-4">
                <h4 className="font-serif text-white line-clamp-2 text-xl leading-snug mb-3 group-hover:text-indigo-200 transition-colors">{event.title}</h4>
                <p className="text-xs text-indigo-300 mb-1 tracking-widest font-medium uppercase">{event.date}</p>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase truncate">{event.venue}</p>
              </div>
            </div>

            <div className="space-y-6 text-sm mb-10 pb-10 border-b border-dashed border-white/20">
              <div className="flex justify-between items-end">
                <span className="text-slate-400 tracking-wide font-light">
                  <span className="text-white font-medium mr-2">{selectedSeats.length}x</span> 
                  Selected Seats
                </span>
                <span className="font-medium text-white text-right max-w-[150px] truncate tracking-wider">{selectedSeats.join(', ')}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 tracking-wide font-light">Price per ticket</span>
                <span className="text-white font-mono tracking-wider">${event.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 tracking-wide font-light">Subtotal</span>
                <span className="text-white font-mono tracking-wider">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
                <span className="text-slate-400 tracking-wide font-light flex items-center gap-2">
                   Service Fee 
                   <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] cursor-help" title="Platform processing fees">i</span>
                </span>
                <span className="text-white font-mono tracking-wider">${(totalPrice * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 tracking-wide font-light">Taxes (5%)</span>
                <span className="text-white font-mono tracking-wider">${(totalPrice * 0.05).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                 <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Total Due</div>
                 <div className="text-[10px] text-indigo-400/70 font-light">Includes all fees & taxes</div>
              </div>
              <span className="text-5xl font-serif lavish-gold-text tracking-tight">${(totalPrice * 1.15).toFixed(2)}</span>
            </div>
            
            <div className="mt-8 flex items-start gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
               <ShieldCheck className="text-indigo-400 shrink-0 mt-0.5" size={20} />
               <p className="text-[10px] text-indigo-200/70 leading-relaxed font-light">
                 Portfolio demonstration only. No real payment is processed and no admission ticket is issued.
               </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TicketView({ event, selectedSeats, userDetails, totalPrice }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto px-4 py-8"
    >
      <div className="text-center mb-12 relative z-10">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-400/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(139,92,246,0.3)] backdrop-blur-md">
          <CheckCircle2 className="text-indigo-400" size={48} />
        </div>
        <h2 className="text-4xl sm:text-5xl font-serif text-white mb-4 leading-tight">Reservation<br /><span className="lavish-gold-text italic">Confirmed</span></h2>
        <p className="text-slate-400 font-light text-lg max-w-md mx-auto">Your digital pass has been securely generated and is ready for the experience.</p>
        
        <div className="mt-6 flex justify-center">
            <span className="inline-block px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium uppercase tracking-wider">
               Portfolio Demo: No real money was charged
            </span>
        </div>
      </div>

      <div className="glass-panel ticket-holo rounded-[32px] overflow-hidden border border-white/10 relative max-w-[400px] mx-auto shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
        {/* Ticket Header Graphic */}
        <div className="h-56 bg-[#0a0a0a] relative">
          <img src={event.image} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22400%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23191330%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%20fill%3D%22%23c4b5fd%22%20font-family%3D%22sans-serif%22%20font-size%3D%2236%22%3EIndigoPass%20%C2%B7%20Demo%20event%3C/text%3E%3C/svg%3E'; }} alt="Event Cover" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#030303]"></div>
          
          <div className="absolute top-6 right-6">
             <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Ticket size={20} className="text-white/80" />
             </div>
          </div>

          <div className="absolute bottom-4 left-8 right-6">
            <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] uppercase font-bold tracking-[0.2em] border border-white/10 inline-block mb-2">
              {event.category}
            </span>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-8 relative bg-[#030303]/90 overflow-hidden">
          {/* Demo Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[80px] font-bold text-white/[0.03] pointer-events-none whitespace-nowrap z-0 select-none font-sans uppercase tracking-[0.2em]">
             DEMO PASS
          </div>

          {/* Perforated lines simulation */}
          <div className="absolute -left-4 top-0 w-8 h-8 bg-[#030303] rounded-full -translate-y-1/2 border-r border-white/10 box-content shadow-inner z-10"></div>
          <div className="absolute -right-4 top-0 w-8 h-8 bg-[#030303] rounded-full -translate-y-1/2 border-l border-white/10 box-content shadow-inner z-10"></div>
          <div className="absolute left-8 right-8 top-0 h-px border-b-2 border-dashed border-white/10 -translate-y-1/2 z-10"></div>

          <h3 className="font-serif text-3xl text-white leading-tight mb-8 mt-4 relative z-10">{event.title}</h3>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-medium tracking-widest mb-1">Date & Time</div>
              <div className="text-sm font-light text-white">{event.date}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-medium tracking-widest mb-1">Venue</div>
              <div className="text-sm font-light text-white">{event.venue}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-medium tracking-widest mb-1">Admit</div>
              <div className="text-sm font-light text-white">{userDetails.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-medium tracking-widest mb-1">Seat(s)</div>
              <div className="text-sm font-light text-white line-clamp-1">{selectedSeats.join(', ')}</div>
            </div>
            <div className="col-span-2 pt-4 mt-2 border-t border-white/10 flex justify-between items-center">
              <div className="text-[10px] text-slate-500 uppercase font-medium tracking-widest">Total Paid</div>
              <div className="text-xl font-serif text-white">${totalPrice?.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center justify-center space-y-4">
             <div className="bg-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
               <QRCode
                 value={JSON.stringify({
                   eventId: event?.id,
                   eventName: event?.name,
                   seats: selectedSeats,
                   name: userDetails?.name,
                   email: userDetails?.email,
                   total: totalPrice
                 })}
                 size={120}
                 level="M"
                 bgColor="#ffffff"
                 fgColor="#0f172a"
               />
             </div>
             <div className="text-[10px] tracking-[4px] text-slate-500 uppercase font-mono mt-2">
               SCAN FOR ENTRY
             </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-center gap-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_10px_30px_rgba(139,92,246,0.3)] px-8 py-4 rounded-full font-medium text-white hover:lavish-glow hover:scale-[0.98] transition-all shimmer-button"
        >
          <Printer size={18} /> Print & Download Pass
        </button>
      </div>
    </motion.div>
  );
}


function ProfileView({ events, user }: { events: EventInfo[], user: User | null, key?: string }) {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToUserBookings((data) => {
      setBookings(data.sort((a,b) => {
        const timeB = b.createdAt?.toMillis?.() || 0;
        const timeA = a.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto px-4 sm:px-8 py-12"
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 p-8 glass-panel rounded-[32px] relative overflow-hidden">
         {/* blur accent */}
         <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-[50px] pointer-events-none"></div>

         {user && <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="avatar" className="w-24 h-24 rounded-full border-2 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.3)] relative z-10" />}
         <div className="text-center md:text-left flex-1 relative z-10">
            <h2 className="text-3xl font-serif text-white mb-2">{user?.displayName || 'User'}</h2>
            <div className="text-slate-400 font-light mb-4">{user?.email}</div>
            <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-slate-300 uppercase tracking-widest mb-6 md:mb-0">
              IndigoPass Member
            </div>
         </div>
         
         <div className="flex gap-4 md:gap-6 mt-2 md:mt-0 relative z-10 w-full md:w-auto justify-center">
             <div className="text-center p-4 bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-2xl min-w-[100px] sm:w-32">
                <div className="text-3xl font-serif lavish-gold-text mb-1">{bookings.length}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Bookings</div>
             </div>
             <div className="text-center p-4 bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-2xl min-w-[100px] sm:w-32">
                <div className="text-3xl font-serif text-white mb-1">
                  {bookings.reduce((sum, b) => sum + b.seats.length, 0)}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Tickets</div>
             </div>
         </div>
      </div>

      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-4xl font-serif text-white mb-4">The Collection</h2>
        <p className="text-slate-400 font-light text-lg">Your curated experiences and past reservations.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white/5 rounded-2xl border border-white/10">
            No bookings found. Try exploring events!
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => {
             const event = events.find(e => e.id === booking.eventId);
             return (
               <div key={booking.id} className="glass-panel rounded-3xl p-6 flex flex-col sm:flex-row gap-8 items-center cursor-pointer hover:lavish-glow transition-all duration-300">
                 {event && (
                   <img src={event.image} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22400%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23191330%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22210%22%20text-anchor%3D%22middle%22%20fill%3D%22%23c4b5fd%22%20font-family%3D%22sans-serif%22%20font-size%3D%2236%22%3EIndigoPass%20%C2%B7%20Demo%20event%3C/text%3E%3C/svg%3E'; }} alt={event.title} className="w-32 h-32 rounded-2xl object-cover shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
                 )}
                 <div className="flex-1 w-full">
                    <h3 className="font-serif text-2xl text-white mb-2">{event?.title || 'Unknown Event'}</h3>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-6 font-light">
                      {event && (
                        <>
                           <div className="flex items-center"><Calendar size={16} className="mr-2 text-indigo-400" /> {event.date}</div>
                           <div className="flex items-center"><MapPin size={16} className="mr-2 text-indigo-400" /> {event.venue}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {booking.seats.map(seat => (
                           <div key={seat} className="border border-white/10 bg-white/5 text-white/80 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-mono">
                              Seat {seat}
                           </div>
                       ))}
                    </div>
                 </div>
                 <div className="w-full sm:w-auto flex flex-col items-end border-t sm:border-t-0 sm:border-l border-white/10 pt-6 sm:pt-0 sm:pl-8">
                    <div className="flex gap-4 items-center sm:items-end justify-between w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Total Paid</div>
                        <div className="text-3xl font-serif lavish-gold-text">${booking.totalAmount}</div>
                        <div className="inline-block mt-3 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full">
                           {booking.status}
                        </div>
                      </div>
                      <div className="shrink-0 p-2 bg-white rounded-xl shadow-lg border-2 border-indigo-500/30">
                        <QRCode value={booking.id} size={64} level="M" />
                      </div>
                    </div>
                 </div>
               </div>
             );
          })}
         </div>
      )}
    </motion.div>
  );
}

function SupportView({ user }: { user: User | null, key?: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = subscribeToSupportTickets((data) => {
      setTickets(data.sort((a,b) => {
        const timeB = b.createdAt?.toMillis?.() || 0;
        const timeA = a.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await createSupportTicket(subject, message);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto px-4 sm:px-8 py-12"
    >
      <div className="mb-16 text-center sm:text-left flex flex-col md:flex-row items-center md:items-end justify-between gap-8 relative z-10">
        <div>
          <h2 className="text-5xl font-serif text-white mb-4">The VIP <span className="lavish-gold-text italic">Concierge</span></h2>
          <p className="text-slate-300 font-light text-xl max-w-2xl">Bespoke assistance for our distinguished members. Reach out for ticket upgrades, exclusive access, or any inquiries.</p>
        </div>
        <div className="flex items-center gap-4 text-indigo-300 bg-indigo-500/10 px-6 py-3 rounded-full border border-indigo-500/20 shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-indigo-400"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="text-sm font-medium tracking-wide uppercase">Agents Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <div className="glass-panel p-8 sm:p-10 rounded-[32px] border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="mb-8 relative z-10">
               <h3 className="text-2xl font-serif text-white mb-2">New Inquiry</h3>
               <p className="text-sm font-light text-slate-400">Our concierge team typically responds within 5 minutes.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col relative z-10 p-1">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-widest pl-2">Subject</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-[#0a0a0a]/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-light"
                  placeholder="E.g., VIP Package Upgrade"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-widest pl-2">Message</label>
                <textarea 
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full flex-1 min-h-[220px] bg-[#0a0a0a]/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-light resize-none"
                  placeholder="How may our concierge assist you today?"
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={submitting || !subject.trim() || !message.trim()}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-full py-5 font-bold text-base shadow-[0_10px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shimmer-button mt-4"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Transmit Request</>}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col">
           <div className="flex items-center justify-between mb-8 pl-4">
              <h3 className="text-xl font-serif text-white flex items-center gap-3">
                 <MessageSquare className="text-indigo-400" size={20} />
                 Active Inquiries
              </h3>
              <div className="text-sm text-slate-400 font-light">{tickets.length} requests</div>
           </div>

           <div className="flex-1 bg-[#050505]/50 border border-white/5 rounded-[32px] p-6 sm:p-8 relative overflow-hidden flex flex-col">
             {loading ? (
               <div className="m-auto flex justify-center py-20">
                   <Loader2 className="animate-spin text-indigo-500" size={40} />
               </div>
             ) : tickets.length === 0 ? (
               <div className="m-auto flex flex-col items-center justify-center text-center max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-inner text-slate-500/50">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <h4 className="text-white font-medium text-lg mb-2">No active inquiries</h4>
                  <p className="text-slate-400 font-light leading-relaxed">When you contact the concierge, your secure communications will appear here.</p>
               </div>
             ) : (
               <div className="space-y-6 overflow-y-auto pr-2 hide-scrollbar flex-1 max-h-[600px]">
                 {tickets.map(ticket => (
                   <div key={ticket.id} className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-transparent rounded-3xl p-8 border border-white-[0.05] hover:border-indigo-500/30 transition-all hover:shadow-[0_10px_30px_rgba(99,102,241,0.1)] group">
                      {/* subtle decorative blur */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                      
                      <div className="flex justify-between items-start gap-4 mb-6 relative z-10">
                         <h4 className="text-white font-medium text-xl leading-tight group-hover:text-indigo-200 transition-colors">{ticket.subject}</h4>
                         <span className={`shrink-0 text-[10px] uppercase tracking-[0.15em] px-4 py-1.5 rounded-full font-bold shadow-sm ${ticket.status === 'open' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                           {ticket.status}
                         </span>
                      </div>

                      <div className="bg-[#0a0a0a]/50 rounded-2xl p-5 border border-white/5 relative z-10 mb-4 inline-block max-w-[85%] rounded-tl-sm shadow-inner">
                        <p className="text-sm text-slate-300 font-light leading-relaxed">{ticket.message}</p>
                      </div>

                      <div className="flex items-center justify-end w-full relative z-10 mt-2">
                         <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                            {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            <CheckCircle2 size={12} className="text-emerald-500/50" />
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
}
