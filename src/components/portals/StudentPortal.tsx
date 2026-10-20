import React, { useState, useEffect } from 'react';
import { storageService, SEED_MENUS } from '../../services/storageService';
import { MenuItem, MealType } from '../../types';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Star, 
  Leaf, 
  Award, 
  Send,
  MessageSquare,
  Lock,
  Sparkles,
  UtensilsCrossed,
  Info
} from 'lucide-react';
import { OptimizedImage } from '../common/OptimizedImage';

export const StudentPortal: React.FC = () => {
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Lunch');
  const [ratingModalItem, setRatingModalItem] = useState<MenuItem | null>(null);
  const [starCount, setStarCount] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    setAttendance(storageService.getAttendance());
  }, []);

  const handleToggleAttendance = (meal: MealType) => {
    const current = attendance[meal] ?? true;
    const next = !current;
    storageService.setAttendance(meal, next);
    setAttendance(prev => ({ ...prev, [meal]: next }));
    
    setFeedbackSuccess(`Updated attendance for ${meal}: ${next ? 'Attending (Portion Prepared)' : 'Not Attending (Portion Saved)'}`);
    setTimeout(() => setFeedbackSuccess(null), 3500);
  };

  const handleOpenRating = (item: MenuItem) => {
    setRatingModalItem(item);
    setStarCount(item.avgRating ? Math.round(item.avgRating) : 5);
    setRatingComment('');
  };

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModalItem) return;

    storageService.submitRating({
      dishId: ratingModalItem.id,
      dishName: ratingModalItem.name,
      rating: starCount,
      comment: ratingComment,
      studentId: 'std-101',
      timestamp: new Date().toISOString()
    });

    setRatingModalItem(null);
    setFeedbackSuccess(`Thank you! Rated "${ratingModalItem.name}" with ${starCount} stars. Feedback submitted to culinary team.`);
    setTimeout(() => setFeedbackSuccess(null), 3500);
  };

  const currentMenu = SEED_MENUS.find(m => m.mealType === selectedMeal) || SEED_MENUS[0];

  const mealSlots: { type: MealType; timing: string; cutoffPassed: boolean; cutoffRemaining?: string }[] = [
    { type: 'Breakfast', timing: '07:30 - 09:30 AM', cutoffPassed: true },
    { type: 'Lunch', timing: '12:30 - 02:30 PM', cutoffPassed: false, cutoffRemaining: '2h remaining' },
    { type: 'Snacks', timing: '05:00 - 06:30 PM', cutoffPassed: false, cutoffRemaining: '2h remaining' },
    { type: 'Dinner', timing: '08:00 - 10:00 PM', cutoffPassed: false, cutoffRemaining: '2h remaining' }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      
      {/* Toast Feedback Alert */}
      {feedbackSuccess && (
        <div className="p-4 rounded-2xl bg-[#123B2A] border border-[#D8F078]/40 text-[#D8F078] text-xs font-semibold flex items-center justify-between shadow-glow-lime">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            <span>{feedbackSuccess}</span>
          </div>
          <span className="font-mono text-[10px] text-[#A9B7A0]">Synchronized with Kitchen Headcount Engine</span>
        </div>
      )}

      {/* Student Profile & Personal Eco-Impact Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* User Card */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] font-bold text-xl shadow-sm">
            SP
          </div>
          <div>
            <div className="text-base font-bold text-[#F7F5EF]">Sankalp Pingalwad</div>
            <div className="text-xs text-[#A9B7A0] font-mono">ID: STD-2024-8902 • Hostel Block C</div>
            <span className="inline-block mt-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/25 font-semibold">
              Hostel Dining Plan Active
            </span>
          </div>
        </div>

        {/* Attendance Precision */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Attendance Precision</div>
            <div className="text-3xl font-bold font-editorial text-[#D8F078]">94.8%</div>
            <p className="text-xs text-[#A9B7A0]">Opt-in accuracy this semester</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078]">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Food Waste Prevented */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Food Waste Prevented</div>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">14.2 kg</div>
            <p className="text-xs text-[#A9B7A0]">Prevented via timely opt-outs (~35 meals)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] shadow-glow-lime">
            <Leaf className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Today's Meal Attendance Confirmation Suite */}
      <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#28312B]">
          <div>
            <h3 className="text-xl font-editorial font-bold text-[#F7F5EF] flex items-center gap-2.5">
              <UtensilsCrossed className="w-5 h-5 text-[#D8F078]" />
              <span>Today's Meal Attendance Confirmation</span>
            </h3>
            <p className="text-xs text-[#A9B7A0] mt-0.5">
              Toggle your attendance before the configured 2-hour cutoff time so kitchen chefs prepare exact portions.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs font-mono text-[#D8F078] self-start sm:self-auto">
            Cutoff Policy: 2 Hours Prior
          </div>
        </div>

        {/* 4 Meal Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {mealSlots.map((slot) => {
            const isAttending = attendance[slot.type] ?? true;

            return (
              <div 
                key={slot.type}
                className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-5 ${
                  slot.cutoffPassed
                    ? 'bg-[#151916]/50 border-[#28312B] opacity-65'
                    : isAttending
                    ? 'bg-[#1C221E] border-[#D8F078]/40 shadow-glow-forest'
                    : 'bg-[#151916] border-[#28312B]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#F7F5EF]">{slot.type}</span>
                    {slot.cutoffPassed ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-red-500/25 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Cutoff Passed
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25">
                        Active Window
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono text-[#A9B7A0] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#D8F078]" />
                    <span>{slot.cutoffPassed ? 'Closed 07:30 AM' : `Cutoff: ${slot.cutoffRemaining}`}</span>
                  </div>
                </div>

                {/* Interactive Attendance Toggle */}
                {slot.cutoffPassed ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-[#28312B]/40 text-xs font-mono text-[#A9B7A0] text-center border border-[#28312B]">
                    Attending (Locked)
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleAttendance(slot.type)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      isAttending
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/40 shadow-sm hover:bg-[#123B2A]/80'
                        : 'bg-[#28312B] text-[#F7F5EF] hover:bg-[#28312B]/80'
                    }`}
                  >
                    {isAttending ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
                        <span>Attending (Opted In)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>Not Attending (Opted Out)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Image-Led Menu Inspection & Taste Rating Experience */}
      <div className="space-y-6">
        
        {/* Menu Section Header & Lunch/Dinner Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-editorial font-bold text-[#F7F5EF] flex items-center gap-2.5">
              <span>Today's Culinary Menu & Taste Rating</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">
              Review portion weights, allergen profiles, and rate dishes to fine-tune AI culinary forecasting.
            </p>
          </div>

          <div className="inline-flex p-1.5 rounded-2xl bg-[#1C221E] border border-[#28312B] self-start sm:self-auto">
            <button
              onClick={() => setSelectedMeal('Lunch')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMeal === 'Lunch'
                  ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                  : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
              }`}
            >
              Lunch Menu
            </button>
            <button
              onClick={() => setSelectedMeal('Dinner')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMeal === 'Dinner'
                  ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                  : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
              }`}
            >
              Dinner Menu
            </button>
          </div>
        </div>

        {/* High-Resolution Photographic Dish Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentMenu.items.map((dish) => (
            <div 
              key={dish.id}
              className="glass-panel rounded-3xl overflow-hidden border border-[#28312B] hover:border-[#D8F078]/40 transition-all duration-300 flex flex-col justify-between group shadow-card-dark"
            >
              {/* Dish Photography Frame */}
              <div className="relative h-48 w-full overflow-hidden bg-[#151916]">
                <OptimizedImage 
                  src={dish.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'} 
                  alt={dish.name}
                  width={600}
                  height={350}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C221E] via-transparent to-transparent opacity-85" />
                
                {/* Category Chip */}
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#151916]/85 backdrop-blur-md text-[#D8F078] border border-[#D8F078]/30 font-bold uppercase">
                    {dish.category}
                  </span>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#151916]/85 backdrop-blur-md border border-[#28312B] text-xs font-bold text-[#F7F5EF]">
                  <Star className="w-3.5 h-3.5 text-[#D8F078] fill-current" />
                  <span>{dish.avgRating ? dish.avgRating.toFixed(1) : '4.8'}</span>
                  <span className="text-[10px] text-[#A9B7A0] font-normal">({dish.totalRatings || 342})</span>
                </div>

                {/* Portion Weight Badge */}
                <div className="absolute bottom-3 left-3 text-xs font-mono text-[#F7F5EF] bg-[#123B2A]/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-[#D8F078]/25">
                  Portion: {dish.portionGrams}g
                </div>
              </div>

              {/* Dish Content Body */}
              <div className="p-6 pt-4 flex-1 flex flex-col justify-between space-y-4">
                
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-[#F7F5EF] leading-snug group-hover:text-[#D8F078] transition-colors">
                    {dish.name}
                  </h4>

                  {/* Allergen Chips */}
                  {dish.allergens && dish.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dish.allergens.map((allg, aIdx) => (
                        <span key={aIdx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#28312B] text-[#A9B7A0]">
                          Contains: {allg}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-[#A9B7A0] pt-1">
                      No major allergens flagged
                    </div>
                  )}

                  {/* Eco-Score Bar */}
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#A9B7A0] flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-[#D8F078]" />
                        <span>Eco-Score:</span>
                      </span>
                      <span className="text-[#D8F078] font-bold">
                        {dish.sustainabilityScore ? `${dish.sustainabilityScore} / 10` : '9.2 / 10'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#28312B] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#123B2A] to-[#D8F078] rounded-full"
                        style={{ width: `${(dish.sustainabilityScore || 9.2) * 10}%` }}
                      />
                    </div>
                  </div>
                </div>


                {/* Rating CTA Button */}
                <div className="pt-3 border-t border-[#28312B] flex items-center justify-between">
                  <span className="text-xs text-[#A9B7A0]">Did you enjoy this dish?</span>
                  <button
                    onClick={() => handleOpenRating(dish)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1C221E] hover:bg-[#28312B] text-[#D8F078] border border-[#28312B] hover:border-[#D8F078]/40 transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Rate Dish</span>
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5-Star Interactive Dish Rating Modal */}
      {ratingModalItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rating-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRatingModalItem(null);
          }}
        >
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 sm:p-8 border border-[#D8F078]/30 space-y-6 shadow-2xl">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold">Taste Feedback</span>
                <h3 id="rating-modal-title" className="text-xl font-editorial font-bold text-[#F7F5EF] mt-0.5">
                  {ratingModalItem.name}
                </h3>
                <p className="text-xs text-[#A9B7A0]">Your rating directly trains AI batch portioning recommendations.</p>
              </div>
              <button
                onClick={() => setRatingModalItem(null)}
                aria-label="Close dish rating modal"
                className="p-1.5 rounded-xl bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] focus-visible:ring-2 focus-visible:ring-[#D8F078] focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRating} className="space-y-5">
              {/* Star Selector */}
              <div className="space-y-2 text-center py-2">
                <span className="text-xs font-mono text-[#A9B7A0] block">Select Rating (1 to 5 Stars):</span>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStarCount(s)}
                      className="p-2 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          s <= starCount 
                            ? 'text-[#D8F078] fill-current drop-shadow-[0_0_8px_rgba(216,240,120,0.5)]' 
                            : 'text-[#28312B]'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Feedback */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#A9B7A0]">Optional Culinary Notes / Portion Critique:</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="e.g. Perfectly spiced curry; portion size was generous."
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] focus:border-[#D8F078] text-xs text-[#F7F5EF] focus:outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingModalItem(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] border border-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Rating</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
