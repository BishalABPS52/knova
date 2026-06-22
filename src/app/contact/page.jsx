"use client";
import React, { useState } from 'react';
import { Headset, Users } from 'lucide-react';

export default function ContactScreen({ setCurrentScreen }) {
  const [isSent, setIsSent] = useState(false);

  return (
    <div className="max-w-[1000px] mx-auto p-6 md:p-10 pt-4">
      <div className="mb-12 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-2 h-2 bg-[#f36710] mb-4"></div>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#1b1c1c] mb-4">Get in touch</h1>
        <p className="text-[#594137] max-w-xl text-lg">Ready to climb the learning ladder? Whether you're a curious student or a campus innovator, our team is here to support your Knova journey.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-[#efeded] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <h2 className="text-2xl font-semibold mb-8 text-[#1b1c1c]">Send us a message</h2>
          <form 
            className="space-y-6" 
            onSubmit={(e) => { 
              e.preventDefault(); 
              setIsSent(true); 
              setTimeout(()=>setIsSent(false), 2500)
            }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-semibold text-[#594137] mb-2 uppercase tracking-wide">Name</label>
                 <input type="text" className="w-full border border-[#d9d9d9] rounded-xl p-3.5 focus:outline-none focus:ring-1 focus:ring-[#00afef] focus:border-[#00afef] transition-colors" placeholder="Your full name" required />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-[#594137] mb-2 uppercase tracking-wide">Email</label>
                 <input type="email" className="w-full border border-[#d9d9d9] rounded-xl p-3.5 focus:outline-none focus:ring-1 focus:ring-[#00afef] focus:border-[#00afef] transition-colors" placeholder="email@example.com" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#594137] mb-3 uppercase tracking-wide">Inquiry Type</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-4 border border-[#efeded] rounded-xl flex-1 focus-within:ring-1 focus-within:ring-[#f36710] hover:bg-[#fef3ea]/50 transition-colors">
                  <input type="radio" name="inquiry" className="w-4 h-4 text-[#f36710] border-[#d9d9d9] focus:ring-[#f36710]" defaultChecked />
                  <span className="text-sm font-medium text-[#1b1c1c]">Support</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-4 border border-[#efeded] rounded-xl flex-1 focus-within:ring-1 focus-within:ring-[#f36710] hover:bg-[#fef3ea]/50 transition-colors">
                  <input type="radio" name="inquiry" className="w-4 h-4 text-[#f36710] border-[#d9d9d9] focus:ring-[#f36710]" />
                  <span className="text-sm font-medium text-[#1b1c1c]">Creator</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-4 border border-[#efeded] rounded-xl flex-1 focus-within:ring-1 focus-within:ring-[#f36710] hover:bg-[#fef3ea]/50 transition-colors">
                  <input type="radio" name="inquiry" className="w-4 h-4 text-[#f36710] border-[#d9d9d9] focus:ring-[#f36710]" />
                  <span className="text-sm font-medium text-[#1b1c1c]">Partnership</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#594137] mb-2 uppercase tracking-wide">Message</label>
              <textarea className="w-full border border-[#d9d9d9] rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-[#00afef] focus:border-[#00afef] resize-none h-32 transition-colors" placeholder="How can we help you today?" required></textarea>
            </div>
            
            <button 
              type="submit" 
              className={`w-full md:w-auto px-10 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center ${isSent ? 'bg-[#00afef] text-white' : 'bg-[#f36710] text-white hover:bg-[#d45600]'}`}
            >
              {isSent ? "Message Sent!" : "Send Message"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#efeded]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#E0F6FE] rounded-full flex items-center justify-center text-[#00afef]">
                <Headset className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-[#1b1c1c]">Direct channels</h3>
            </div>
            <div className="space-y-6">
              <div className="group cursor-pointer">
                <p className="text-xs text-[#8d7165] uppercase font-semibold mb-1">General Support</p>
                <p className="font-medium text-[#00658c] group-hover:underline transition-all">support@knova.ai</p>
              </div>
              <div className="w-full h-px bg-[#efeded]"></div>
              <div className="group cursor-pointer">
                <p className="text-xs text-[#8d7165] uppercase font-semibold mb-1">Creator Relations</p>
                <p className="font-medium text-[#00658c] group-hover:underline transition-all">creators@knova.ai</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#efeded]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#fef3ea] rounded-full flex items-center justify-center text-[#f36710]">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-[#1b1c1c]">The developer core</h3>
            </div>
            <div className="space-y-6">
              {[
                { name: 'Amay Jha', initial: 'AJ' },
                { name: 'Birendra Rawat', initial: 'BR' },
                { name: 'Bishal Shrestha', initial: 'BS' }
              ].map((dev, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#efeded] rounded-full flex items-center justify-center font-bold text-sm text-[#594137] group-hover:bg-[#fef3ea] group-hover:text-[#f36710] transition-colors">
                      {dev.initial}
                    </div>
                    <span className="font-medium text-[#1b1c1c]">{dev.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
