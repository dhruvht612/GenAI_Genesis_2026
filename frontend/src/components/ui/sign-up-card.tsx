import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import RoleSelector from '@/components/RoleSelector';
import MedicationTagInput from '@/components/MedicationTagInput';

const PRIMARY_CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'High Cholesterol',
  'Asthma',
  'COPD',
  'Heart Disease',
  'Other',
];

const SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Cardiology',
  'Endocrinology',
  'Other',
];

type SignUpCardProps = {
  onSubmit: () => void;
};

export function SignUpCard({ onSubmit }: SignUpCardProps) {
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryCondition, setPrimaryCondition] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [terms, setTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg h-10 text-white placeholder:text-white/30 px-3 pl-10 outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all text-sm';
  const labelClass = 'block text-xs text-white/70 mb-1.5';

  return (
    <div className="min-h-screen w-screen bg-slate-950 relative overflow-hidden flex items-center justify-center py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/40 via-blue-800/50 to-slate-950" />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-blue-500/20 blur-[80px]" />
      <motion.div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-blue-600/20 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', delay: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10 px-4"
      >
        <div className="relative group">
          <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-white/3 via-white/7 to-white/3 opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
          <div className="relative bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="text-center space-y-1 mb-5">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.8 }}
                className="mx-auto w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-blue-600/30"
              >
                <span className="text-lg font-bold text-white">M</span>
              </motion.div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                Create account
              </h1>
              <p className="text-white/60 text-xs">Join MedGuard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="auth-card-extra">
                <label className={labelClass}>I am a</label>
                <RoleSelector value={role} onChange={setRole} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="su-first" className={labelClass}>First name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      id="su-first"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="su-last" className={labelClass}>Last name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      id="su-last"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="su-email" className={labelClass}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    id="su-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="su-password" className={labelClass}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    id="su-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {role === 'patient' && (
                <>
                  <div>
                    <label htmlFor="su-condition" className={labelClass}>Primary condition</label>
                    <select
                      id="su-condition"
                      value={primaryCondition}
                      onChange={(e) => setPrimaryCondition(e.target.value)}
                      className={cn(inputClass, 'cursor-pointer')}
                    >
                      <option value="">Select condition</option>
                      {PRIMARY_CONDITIONS.map((c) => (
                        <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Medications</label>
                    <div className="auth-card-extra">
                      <MedicationTagInput
                        value={medications}
                        onChange={setMedications}
                        placeholder="Type and press Enter"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'doctor' && (
                <>
                  <div>
                    <label htmlFor="su-specialty" className={labelClass}>Specialty</label>
                    <select
                      id="su-specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className={cn(inputClass, 'cursor-pointer')}
                    >
                      <option value="">Select specialty</option>
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="su-license" className={labelClass}>License number</label>
                    <input
                      id="su-license"
                      type="text"
                      placeholder="e.g. 12345"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  required
                  className="rounded border border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 w-4 h-4"
                />
                <span className="text-xs text-white/60">I agree to the Terms and Privacy Policy</span>
              </label>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white text-slate-900 font-medium h-10 rounded-lg flex items-center justify-center gap-1 text-sm mt-2 hover:bg-white/95 transition-colors"
              >
                Create account
                <ArrowRight className="w-3 h-3" />
              </motion.button>
            </form>

            <p className="text-center text-xs text-white/60 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-medium hover:text-white/80 transition-colors underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
