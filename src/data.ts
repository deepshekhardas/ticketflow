import { doc, getDoc, getDocs, setDoc, collection, serverTimestamp, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';

export interface EventInfo {
  id: string;
  title: string;
  category: string;
  date: string;
  venue: string;
  image: string;
  price: number;
}

export interface UserBooking {
  id: string;
  eventId: string;
  seats: string[];
  totalAmount: number;
  status: string;
  createdAt: any;
}

export const MOck_EVENTS: EventInfo[] = [
  {
    id: "e1",
    title: "Live Music Concert: The Weeknd",
    category: "Music",
    date: "Aug 15, 2026 • 8:00 PM",
    venue: "Stade De France, Paris",
    image: "https://images.unsplash.com/photo-1540039155732-680854537c54?auto=format&fit=crop&q=80&w=800&h=400",
    price: 50
  },
  {
    id: "e2",
    title: "Tech Summit 2026: AI & Beyond",
    category: "Conference",
    date: "Sep 12, 2026 • 9:00 AM",
    venue: "Moscone Center, SF",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800&h=400",
    price: 50
  },
  {
    id: "e3",
    title: "Standup Comedy: John Mulaney",
    category: "Comedy",
    date: "Oct 05, 2026 • 7:30 PM",
    venue: "Madison Square Garden, NY",
    image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800&h=400",
    price: 50
  },
  {
    id: "e4",
    title: "Broadway: Hamilton",
    category: "Theatre",
    date: "Nov 20, 2026 • 7:00 PM",
    venue: "Richard Rodgers Theatre, NY",
    image: "https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&q=80&w=800&h=400",
    price: 50
  }
];

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'booked';
  userId?: string;
}

export const generateSeatMap = (rows: number, cols: number): Seat[] => {
  const seats: Seat[] = [];
  const rowsLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      seats.push({
        id: `${rowsLetters[r]}${c}`,
        row: rowsLetters[r],
        number: c,
        status: 'available'
      });
    }
  }
  return seats;
};

export const syncEvents = async (): Promise<void> => {
  if (!auth.currentUser) return;
  try {
    const eventsQuery = query(collection(db, 'events'));
    const snapshot = await getDocs(eventsQuery);
    
    if (snapshot.empty) {
      console.log('Seeding events...');
      // Seed data if empty and authorized
      const promises = MOck_EVENTS.map(event => {
        const { id, ...data } = event;
        return setDoc(doc(db, 'events', id), {
          ...data,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      console.log('Seeded events successfully!');
    }
  } catch (error) {
    console.error("Error seeding events:", error);
    handleFirestoreError(error, OperationType.WRITE, 'events');
  }
};

export const subscribeToEvents = (callback: (events: EventInfo[]) => void) => {
  const eventsQuery = query(collection(db, 'events'));
  return onSnapshot(eventsQuery, (snapshot) => {
    const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventInfo));
    callback(evs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'events');
  });
};

export const subscribeToSeats = (eventId: string, callback: (seats: Seat[]) => void) => {
  const allSeats = generateSeatMap(8, 12); // Default map
  const seatsCollection = collection(db, 'events', eventId, 'seats');
  
  return onSnapshot(seatsCollection, (snapshot) => {
    const bookedMap = new Map();
    snapshot.docs.forEach(doc => bookedMap.set(doc.id, doc.data()));
    
    const updatedSeats = allSeats.map(seat => {
      const bookedData = bookedMap.get(seat.id);
      if (bookedData) {
        return {
          ...seat,
          status: 'booked' as const,
          userId: bookedData.userId
        };
      }
      return seat;
    });
    
    callback(updatedSeats);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `events/${eventId}/seats`);
  });
};

export const bookSeatsData = async (eventId: string, selectedSeats: string[], totalAmount: number): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to book seats");
  
  try {
    // Book each seat in events/{eventId}/seats/{seatId}
    const seatPromises = selectedSeats.map(seatId => {
      return setDoc(doc(db, 'events', eventId, 'seats', seatId), {
        userId: user.uid,
        status: 'booked',
        updatedAt: serverTimestamp()
      });
    });
    await Promise.all(seatPromises);
    
    // Save User booking receipt
    const bookingId = Math.random().toString(36).substring(2, 12).toUpperCase();
    await setDoc(doc(db, 'users', user.uid, 'bookings', bookingId), {
      eventId,
      seats: selectedSeats,
      totalAmount,
      status: 'confirmed',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookings`);
  }
};

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: any;
}

export const subscribeToSupportTickets = (callback: (tickets: SupportTicket[]) => void) => {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'users', user.uid, 'support'));
  return onSnapshot(q, (snapshot) => {
    const tks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
    callback(tks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/support`);
  });
};

export const createSupportTicket = async (subject: string, message: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to submit a ticket");
  
  try {
    const ticketId = Math.random().toString(36).substring(2, 12).toUpperCase();
    await setDoc(doc(db, 'users', user.uid, 'support', ticketId), {
      subject,
      message,
      status: 'open',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `support`);
  }
};

export const subscribeToUserBookings = (callback: (bookings: UserBooking[]) => void) => {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'users', user.uid, 'bookings'));
  return onSnapshot(q, (snapshot) => {
    const bks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserBooking));
    callback(bks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/bookings`);
  });
};

