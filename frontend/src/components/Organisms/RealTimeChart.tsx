import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Generate a random value that stays close to a base number — simulates real server data
const randomNear = (base: number, range: number) =>
  Math.min(100, Math.max(0, base + (Math.random() - 0.5) * range));

// Format current time as "HH:MM PM"
const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Generate initial 10 data points
const generateInitialData = () =>
  Array.from({ length: 10 }, () => ({
    time: now(),
    cpu: randomNear(75, 20),
    ram: randomNear(80, 15),
    storage: randomNear(70, 10),
  }));

export default function RealTimeChart() {
  const [data, setData] = useState(generateInitialData());

  useEffect(() => {
    // Every 5 seconds, add a new data point and remove the oldest one
    const interval = setInterval(() => {
      setData(prev => [
        ...prev.slice(1), // remove first (oldest)
        {
          time: now(),
          cpu: randomNear(75, 20),
          ram: randomNear(80, 15),
          storage: randomNear(70, 10),
        }
      ]);
    }, 5000);

    return () => clearInterval(interval); // cleanup when component unmounts
  }, []);

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', marginBottom: 28,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 20, fontSize: 16 }}>
        Real-Time Resource Usage
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            {/* Gradient fills under each line */}
            <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ram" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="storage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number | undefined) => v !== undefined ? `${v.toFixed(1)}%` : ''} />
          <Legend />

          <Area type="monotone" dataKey="cpu"     name="CPU %"     stroke="#3b82f6" fill="url(#cpu)"     strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="ram"     name="RAM %"     stroke="#8b5cf6" fill="url(#ram)"     strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="storage" name="Storage %" stroke="#10b981" fill="url(#storage)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}