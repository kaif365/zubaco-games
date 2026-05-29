import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props { onSubmit: (answer: string) => void; timeLimit: number; }
export function AnswerInput({ onSubmit, timeLimit }: Props) {
  const [value, setValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(t => { if (t <= 100) return 0; return t - 100; }), 100);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(value); };

  return (
    <motion.form initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onSubmit={handleSubmit}
      className="max-w-lg mx-auto text-center">
      <div className="mb-4"><div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${(timeLeft / timeLimit) * 100}%` }} /></div>
        <p className="text-gray-400 text-sm mt-1">{(timeLeft / 1000).toFixed(1)}s left</p>
      </div>
      <input ref={inputRef} type="text" value={value} onChange={e => setValue(e.target.value)}
        className="w-full px-6 py-4 bg-gray-800 border-2 border-indigo-500 rounded-xl text-white text-2xl text-center focus:outline-none focus:border-indigo-300"
        placeholder="Type your answer..." autoComplete="off" />
      <button type="submit" className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors">Submit</button>
    </motion.form>
  );
}
