export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Top Nav */}
      <nav className="border-b border-green-900/50 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl drop-shadow-[0_0_10px_#22c55e]">⛽</div>
            <div>
              <div className="font-bold text-3xl tracking-tighter">Refuelly</div>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <input 
              type="text" 
              placeholder="Enter your postcode or area" 
              className="w-full bg-zinc-950 border border-green-900/50 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50 transition"
            />
          </div>

          <div className="flex items-center gap-8 text-sm">
            <a href="#" className="hover:text-green-400 transition">Instagram</a>
            <a href="#" className="hover:text-green-400 transition">About</a>
            <button className="border border-green-500 hover:bg-green-500 hover:text-black px-8 py-3 rounded-2xl transition-all duration-300 font-medium">
              Add Fuel Entry +
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        <div className="flex justify-between mb-10">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Fuel Stations near you</h1>
            <p className="text-green-400 mt-1">Outer Belfast • Live prices</p>
          </div>
          <p className="text-sm text-gray-500 self-end">Last Updated: Moments ago</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {name: "Go Garage", address: "Upper Newtownards Road • Belfast", unleaded: "148.7", diesel: "163.9"},
            {name: "Tesco Extra", address: "Upper Newtownards Road • Belfast", unleaded: "145.2", diesel: "163.9"},
            {name: "Maxol 24hr", address: "Carryduff Roundabout • Belfast", unleaded: "145.7", diesel: "163.9"},
          ].map((station, i) => (
            <div 
              key={i} 
              className="group bg-zinc-950 border border-green-900/30 rounded-3xl p-8 hover:border-green-500/50 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300"
            >
              <h3 className="font-semibold text-2xl mb-1 group-hover:text-green-400 transition">{station.name}</h3>
              <p className="text-gray-400 mb-6">{station.address}</p>
              
              <div className="flex gap-4 text-sm mb-8">
                <div className="px-4 py-1 bg-green-950 text-green-400 rounded-full text-xs flex items-center gap-1 border border-green-900">✔ Contactless</div>
                <div className="px-4 py-1 bg-green-950 text-green-400 rounded-full text-xs flex items-center gap-1 border border-green-900">⚡ EV/Hybrid</div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="uppercase text-xs tracking-widest text-green-500/70 mb-2">Latest Prices</p>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-xs text-green-400">UNLEADED</div>
                      <div className="text-4xl font-semibold text-green-400 drop-shadow-[0_0_8px_#22c55e]">{station.unleaded}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-400">DIESEL</div>
                      <div className="text-4xl font-semibold text-green-400 drop-shadow-[0_0_8px_#22c55e]">{station.diesel}</div>
                    </div>
                  </div>
                </div>
                <button className="text-green-400 text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                  Get Directions →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}