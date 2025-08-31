import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Calendar, MapPin, Home, Mountain, Building, DollarSign, Users } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export default function HomePage() {
  const [selectedCheckIn, setSelectedCheckIn] = useState<string | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [guests, setGuests] = useState<number>(2);
  const [calendarData, setCalendarData] = useState<Record<string, any>>({});
  const [priceEstimate, setPriceEstimate] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [bookingForm, setBookingForm] = useState({ guestName: '', email: '', phone: '', specialRequests: '' });
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  useEffect(() => { fetchCalendarData(); }, [currentMonth, currentYear]);
  useEffect(() => { if (selectedCheckIn && selectedCheckOut && guests) calculatePrice(); }, [selectedCheckIn, selectedCheckOut, guests]);

  async function fetchCalendarData() {
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/calendar/${currentYear}/${currentMonth + 1}`);
      if (res.ok) setCalendarData(await res.json());
    } catch (e) { console.error(e); }
  }

  async function calculatePrice() {
    if (!selectedCheckIn || !selectedCheckOut) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/bookings/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIn: selectedCheckIn, checkOut: selectedCheckOut, guests })
      });
      if (res.ok) setPriceEstimate(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleBooking() {
    if (!selectedCheckIn || !selectedCheckOut || !bookingForm.guestName || !bookingForm.email || !bookingForm.phone) {
      alert('Please fill in all required fields'); return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingForm, checkIn: selectedCheckIn, checkOut: selectedCheckOut, guests })
      });
      if (res.ok) {
        await res.json();
        alert('Booking submitted successfully!');
        setShowBookingModal(false);
        setBookingForm({ guestName: '', email: '', phone: '', specialRequests: '' });
        setSelectedCheckIn(null); setSelectedCheckOut(null);
        fetchCalendarData();
      } else {
        const err = await res.json();
        alert(err.error || 'Booking failed.');
      }
    } catch (e) { console.error(e); alert('An error occurred.'); }
    finally { setLoading(false); }
  }

  function getDaysInMonth(month:number, year:number){ return new Date(year, month+1, 0).getDate(); }
  function getFirstDayOfMonth(month:number, year:number){ return new Date(year, month, 1).getDay(); }

  function handleDateClick(day:number){
    const clicked = new Date(currentYear, currentMonth, day);
    const dateStr = clicked.toISOString().split('T')[0];
    if (calendarData[dateStr] && !calendarData[dateStr].available) return;
    if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) { setSelectedCheckIn(dateStr); setSelectedCheckOut(null); }
    else if (selectedCheckIn && !selectedCheckOut) {
      if (clicked > new Date(selectedCheckIn)) setSelectedCheckOut(dateStr);
      else { setSelectedCheckIn(dateStr); setSelectedCheckOut(null); }
    }
  }

  function renderCalendar(){
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const elements: JSX.Element[] = [];
    for (let i=0;i<firstDay;i++) elements.push(<div key={`e-${i}`} className="p-2" />);
    for (let d=1; d<=daysInMonth; d++){
      const date = new Date(currentYear, currentMonth, d);
      const ds = date.toISOString().split('T')[0];
      const dayData = calendarData[ds];
      const isCheckIn = selectedCheckIn === ds;
      const isCheckOut = selectedCheckOut === ds;
      const isInRange = selectedCheckIn && selectedCheckOut && date > new Date(selectedCheckIn) && date < new Date(selectedCheckOut);
      const unavailable = dayData && !dayData.available;
      elements.push(
        <button key={d} onClick={()=>handleDateClick(d)} disabled={unavailable}
          className={`p-2 text-sm rounded transition-colors ${unavailable ? 'bg-red-100 text-red-400 cursor-not-allowed' :
            isCheckIn || isCheckOut ? 'bg-amber-600 text-white' :
            isInRange ? 'bg-amber-200 text-amber-900' : 'hover:bg-amber-100 text-amber-900 cursor-pointer'}`}>
          {d}
        </button>
      );
    }
    return elements;
  }

  return (
    <>
      <Head><title>Villa Niva – Rooted Heaven</title></Head>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <div className="relative h-[80vh] bg-cover bg-center bg-no-repeat" style={{backgroundImage:"linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('/hero.jpg')"}}>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
            <h1 className="text-5xl md:text-7xl font-light mb-4 tracking-wide">Villa Niva – Rooted Heaven</h1>
            <p className="text-xl md:text-2xl font-light mb-12 max-w-2xl">Where mountains whisper and tranquility resides</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#booking" className="bg-amber-100 text-amber-900 px-8 py-3 rounded-full font-medium hover:bg-amber-200 transition-colors">Check Availability</a>
              <a href="#about" className="border-2 border-white text-white px-8 py-3 rounded-full font-medium hover:bg-white hover:text-amber-900 transition-colors">Explore the Villa</a>
            </div>
          </div>
        </div>

        <div id="about" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-light text-amber-900 mb-8">About the Villa</h2>
              <p className="text-lg text-amber-800 leading-relaxed">Rooted in nature, Villa Niva blends rustic charm with soulful elegance. Nestled among mountains, overlooking serene waters. It offers a timeless retreat where simplicity meets luxury.</p>
            </div>
            <div className="relative">
              <div className="bg-amber-200 rounded-lg p-4 h-80">
                <div className="w-full h-full bg-gradient-to-b from-green-300 to-amber-600 rounded-lg flex items-end justify-center">
                  <div className="bg-amber-800 w-24 h-16 mb-4 rounded-sm relative">
                    <div className="absolute -top-4 left-2 w-4 h-4 bg-amber-900 rounded-sm"></div>
                    <div className="absolute -top-4 right-2 w-4 h-4 bg-amber-900 rounded-sm"></div>
                    <div className="absolute top-2 left-2 w-3 h-3 bg-amber-700"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 bg-amber-700"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-20 px-6 max-w-6xl mx-auto">
          <h2 className="text-5xl font-light text-amber-900 mb-16 text-center">Highlights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[{icon:Home, title:'Rustic Heritage Architecture'},{icon:Mountain, title:'Mountain & Lake Views'},{icon:Building, title:'Cozy Indoor & Outdoor Spaces'},{icon:DollarSign, title:'Secluded Nature-Rooted Experience'}].map((it, i)=>(
              <div key={i} className="bg-amber-100 p-8 rounded-lg text-center">
                <it.icon className="w-12 h-12 mx-auto mb-4 text-amber-700"/><h3 className="font-medium text-amber-900">{it.title}</h3>
              </div>
            ))}
          </div>
        </div>

        <div id="booking" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-5xl font-light text-amber-900 mb-8">Gallery</h2>
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-amber-200 rounded-lg aspect-square p-4">
                    <div className="w-full h-full bg-gradient-to-br from-amber-300 to-amber-700 rounded-lg flex items-center justify-center">
                      <div className="text-amber-900 text-2xl font-light">{i===1?'Dining':i===2?'View':i===3?'Room':'Suite'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-lg font-medium text-amber-900">{months[currentMonth]} {currentYear}</div>
                  <div className="flex gap-2">
                    <button onClick={()=>{ const d=new Date(currentYear, currentMonth-1, 1); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); }} className="px-3 py-1 border rounded">Prev</button>
                    <button onClick={()=>{ const d=new Date(currentYear, currentMonth+1, 1); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); }} className="px-3 py-1 border rounded">Next</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['S','M','T','W','T','F','S'].map(d => <div key={d} className="p-2 text-center text-sm font-medium text-amber-700">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 mb-6">{renderCalendar()}</div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-800">Guests:</span>
                    <select value={guests} onChange={e=>setGuests(parseInt(e.target.value))} className="border border-amber-200 rounded px-2 py-1 text-amber-900">
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} guest{n>1?'s':''}</option>)}
                    </select>
                  </div>
                  {selectedCheckIn && <div className="text-sm text-amber-800">
                    <div>Check-in: {new Date(selectedCheckIn).toLocaleDateString()}</div>
                    {selectedCheckOut && <div>Check-out: {new Date(selectedCheckOut).toLocaleDateString()}</div>}
                  </div>}
                  {priceEstimate && (
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="text-amber-900 font-medium mb-2">Price Estimate</div>
                      <div className="text-sm space-y-1 text-amber-800">
                        <div className="flex justify-between"><span>{priceEstimate.nights} nights × ${priceEstimate.pricePerNight}</span><span>${priceEstimate.subtotal}</span></div>
                        <div className="flex justify-between"><span>Cleaning fee</span><span>${priceEstimate.cleaningFee}</span></div>
                        <div className="flex justify-between"><span>Taxes</span><span>${priceEstimate.taxes.toFixed(2)}</span></div>
                        <div className="flex justify-between font-medium text-amber-900 border-t pt-1"><span>Total</span><span>${priceEstimate.total.toFixed(2)}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <button onClick={()=>setShowBookingModal(true)} disabled={!selectedCheckIn || !selectedCheckOut || loading} className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                    {loading ? 'Loading...' : 'Book Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-2xl font-light text-amber-900 mb-4">Complete Your Booking</h3>
              <div className="space-y-4 mb-6">
                <div><label className="block text-amber-800 mb-1">Full Name *</label>
                  <input type="text" value={bookingForm.guestName} onChange={e=>setBookingForm({...bookingForm,guestName:e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2" placeholder="Enter your full name"/></div>
                <div><label className="block text-amber-800 mb-1">Email *</label>
                  <input type="email" value={bookingForm.email} onChange={e=>setBookingForm({...bookingForm,email:e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2" placeholder="Enter your email"/></div>
                <div><label className="block text-amber-800 mb-1">Phone *</label>
                  <input type="tel" value={bookingForm.phone} onChange={e=>setBookingForm({...bookingForm,phone:e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2" placeholder="Enter your phone number"/></div>
                <div><label className="block text-amber-800 mb-1">Special Requests</label>
                  <textarea value={bookingForm.specialRequests} onChange={e=>setBookingForm({...bookingForm,specialRequests:e.target.value})} className="w-full border border-amber-200 rounded-lg px-3 py-2 h-20" placeholder="Any special requests or notes..."/></div>
                {priceEstimate && <div className="bg-amber-50 p-3 rounded-lg">
                  <div className="text-amber-900 font-medium">Total: ${priceEstimate.total.toFixed(2)}</div>
                  <div className="text-sm text-amber-700">{selectedCheckIn && selectedCheckOut && `${new Date(selectedCheckIn).toLocaleDateString()} - ${new Date(selectedCheckOut).toLocaleDateString()}`} • {guests} guest{guests>1?'s':''}</div>
                </div>}
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setShowBookingModal(false)} className="flex-1 border border-amber-300 text-amber-900 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors">Cancel</button>
                <button onClick={handleBooking} disabled={loading} className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300">{loading ? 'Booking...' : 'Confirm Booking'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="py-20 px-6 max-w-6xl mx-auto">
          <h2 className="text-5xl font-light text-amber-900 mb-8">Location</h2>
          <div className="bg-amber-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-amber-700" />
              <p className="text-amber-800">Nestled in the serene mountains</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}