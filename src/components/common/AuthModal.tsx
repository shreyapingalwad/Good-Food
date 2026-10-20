import React, { useState } from 'react';
import { useAuth, DEMO_ROLE_CREDENTIALS } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { 
  Lock, 
  User, 
  Key, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  GraduationCap, 
  ChefHat, 
  LayoutDashboard, 
  HeartHandshake, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, targetRole }) => {
  const { login, switchDevRole, error, clearError, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!identifier.trim() || !password.trim()) {
      setFormError('Please enter both username/email and password.');
      return;
    }

    try {
      await login(identifier.trim(), password);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleQuickRole = async (role: UserRole) => {
    setFormError(null);
    clearError();
    try {
      await switchDevRole(role);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to authenticate demo account.');
    }
  };

  const roleIcons: Record<UserRole, any> = {
    student: GraduationCap,
    kitchen: ChefHat,
    manager: LayoutDashboard,
    ngo: HeartHandshake,
    admin: ShieldCheck,
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#151916] border border-[#28312B] shadow-2xl text-[#F7F5EF] space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-[#F7F5EF]">
                Authenticate MessSaver Session
              </h2>
              <p className="text-[11px] text-[#A9B7A0]">
                Institutional role-based access control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A9B7A0] hover:text-[#F7F5EF] hover:bg-[#1C221E] transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Feedback */}
        {(formError || error) && (
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A9B7A0] flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#D8F078]" />
              <span>Username or Institutional Email</span>
            </label>
            <input
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. student_shreya or dr_anita_roy"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1C221E] border border-[#28312B] focus:border-[#D8F078] focus-visible:ring-1 focus-visible:ring-[#D8F078] text-xs text-[#F7F5EF] placeholder:text-[#A9B7A0]/50 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A9B7A0] flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-[#D8F078]" />
              <span>Password</span>
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1C221E] border border-[#28312B] focus:border-[#D8F078] focus-visible:ring-1 focus-visible:ring-[#D8F078] text-xs text-[#F7F5EF] placeholder:text-[#A9B7A0]/50 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#D8F078] hover:bg-[#E4F88D] text-[#151916] text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-glow-lime active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Backend...</span>
              </>
            ) : (
              <span>Sign In with Credentials</span>
            )}
          </button>
        </form>

        {/* Demo Fast-Login Pill Buttons */}
        <div className="pt-4 border-t border-[#28312B] space-y-3">
          <div className="flex items-center justify-between text-[11px] text-[#A9B7A0]">
            <span className="font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D8F078]" />
              Quick Demo Authentications:
            </span>
            <span className="text-[10px] text-[#A9B7A0]/60">Evaluator mode</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DEMO_ROLE_CREDENTIALS) as UserRole[]).map((r) => {
              const RoleIcon = roleIcons[r];
              const creds = DEMO_ROLE_CREDENTIALS[r];
              const isTarget = targetRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickRole(r)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs flex items-center gap-2 ${
                    isTarget
                      ? 'bg-[#123B2A] border-[#D8F078]/50 text-[#D8F078] font-bold shadow-sm'
                      : 'bg-[#1C221E] border-[#28312B] text-[#A9B7A0] hover:text-[#F7F5EF] hover:border-[#D8F078]/30'
                  }`}
                >
                  <RoleIcon className="w-4 h-4 text-[#D8F078] shrink-0" />
                  <div className="truncate">
                    <div className="capitalize leading-tight font-semibold">{r}</div>
                    <div className="text-[10px] text-[#A9B7A0] truncate">{creds.identifier}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
