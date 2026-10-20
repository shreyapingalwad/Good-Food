import React, { useState, useEffect } from 'react';
import { storageService, SEED_MENUS } from '../../services/storageService';
import { DayMenu, MenuItem, MealType } from '../../types';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Star, 
  Leaf, 
  AlertCircle, 
  Award, 
  Send,
  MessageSquare
} from 'lucide-react';

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
    
    setFeedbackSuccess(`Updated attendance for ${meal}: ${next ? 'Attending' : 'Not Attending'}`);
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
    setFeedbackSuccess(`Thank you! Rated "${ratingModalItem.name}" with ${starCount} stars.`);
    setTimeout(() => setFeedbackSuccess(null), 3500);
  };

  const currentMenu = SEED_MENUS.find(m => m.mealType === selectedMeal) || SEED_MENUS[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {feedbackSuccess && (
        <div className="p-4 rounded-2xl bg-[#123B2A] border border-[#D8F078]/40 text-[#D8F078] text-xs font-semibold flex items-center justify-between shadow-glow-lime">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            <span>{feedbackSuccess}</span>
          </div>
          <span className="font-mono text-[10px] text-[#A9B7A0]">Synchronized with Kitchen Headcount</span>
        </div>
      )}

      {/* Student Profile & Sustainability Impact Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="glass-panel p-5 rounded-2xl border border-[#28312B] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] font-bold text-lg">
            SP
          </div>
          <div>
            <div className="text-sm font-bold text-[#F7F5EF]">Sankalp Pingalwad</div>
            <div className="text-xs text-[#A9B7A0]">ID: STD-2024-8902 | Hostel Block C</div>
            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/20">
              Active Meal Plan
            </span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#28312B] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-[#A9B7A0] uppercase">Attendance Precision</div>
            <div className="text-2xl font-bold font-editorial text-[#D8F078] mt-0.5">94.8%</div>
            <p className="text-[11px] text-[#A9B7A0]">Opt-in accuracy this semester</p>
          </div>
          <Award className="w-8 h-8 text-[#D8F078]" />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#28312B] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-[#A9B7A0] uppercase">Food Waste Saved</div>
            <div className="text-2xl font-bold font-editorial text-[#F7F5EF] mt-0.5">14.2 kg</div>
            <p className="text-[11px] text-[#A9B7A0]">Prevented via timely opt-outs</p>
          </div>
          <Leaf className="w-8 h-8 text-[#D8F078]" />
        </div>

      </div>

      {/* Meal Attendance Action Cards (Opt-in / Opt-out before Cutoff) */}
      <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#28312B]">
          <div>
            <h2 className="text-lg font-bold text-[#F7F5EF]">Today's Meal Attendance Confirmation</h2>
            <p className="text-xs text-[#A9B7A0]">Toggle your attendance before the configured cutoff time so the kitchen prepares exact quantities.</p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/25 self-start sm:self-auto">
            Cutoff Policy: 2 Hours Prior
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as MealType[]).map((meal) => {
            const isAttending = attendance[meal] ?? true;
            const isCutoff = meal === 'Breakfast'; // demo Breakfast already passed
            return (
              <div 
                key={meal}
                className={`p-5 rounded-2xl border transition-all ${
                  isAttending
                    ? 'bg-[#1C221E] border-[#D8F078]/30 shadow-card-dark'
                    : 'bg-[#151916] border-[#28312B] opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-[#F7F5EF]">{meal}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isCutoff ? 'bg-red-500/10 text-red-400' : 'bg-[#123B2A] text-[#D8F078]'
                  }`}>
                    {isCutoff ? 'Cutoff Passed' : 'Active Window'}
                  </span>
                </div>

                <div className="text-xs text-[#A9B7A0] mb-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#D8F078]" />
                  <span>{isCutoff ? 'Closed 07:30 AM' : 'Cutoff: 2h remaining'}</span>
                </div>

                <button
                  disabled={isCutoff}
                  onClick={() => handleToggleAttendance(meal)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isCutoff
                      ? 'bg-[#28312B]/40 text-[#A9B7A0] cursor-not-allowed'
                      : isAttending
                        ? 'bg-[#123B2A] hover:bg-[#1B523B] text-[#D8F078] border border-[#D8F078]/40 shadow-glow-lime'
                        : 'bg-[#28312B] hover:bg-[#313C34] text-[#A9B7A0] hover:text-[#F7F5EF]'
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Menu & Dish Rating Board */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#28312B]">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D8F078]" />
              <span>Menu Inspection & Taste Rating</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">Review dish allergens, nutritional weights, and rate items to fine-tune AI portioning.</p>
          </div>

          {/* Meal selector */}
          <div className="flex items-center gap-2 bg-[#1C221E] p-1 rounded-xl border border-[#28312B]">
            {(['Lunch', 'Dinner'] as MealType[]).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMeal(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedMeal === m
                    ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30'
                    : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
                }`}
              >
                {m} Menu
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentMenu.items.map((item) => (
            <div 
              key={item.id}
              className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/20">
                      {item.category}
                    </span>
                    <h4 className="text-base font-bold text-[#F7F5EF] mt-1.5">{item.name}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-[#D8F078] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{item.avgRating.toFixed(1)}</span>
                    </span>
                    <span className="text-[10px] text-[#A9B7A0] block">({item.totalRatings} ratings)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#A9B7A0] my-3">
                  <span>Portion: <strong className="text-[#F7F5EF] font-mono">{item.portionGrams}g</strong></span>
                  <span>•</span>
                  <span>Eco-Score: <strong className="text-[#D8F078] font-mono">{item.sustainabilityScore}/10</strong></span>
                  {item.allergens.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300">Contains: {item.allergens.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#28312B] flex items-center justify-between">
                <span className="text-[11px] text-[#A9B7A0]">Did you enjoy this dish?</span>
                <button
                  onClick={() => handleOpenRating(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C221E] hover:bg-[#28312B] text-[#D8F078] border border-[#28312B] flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Rate Dish</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Rating Modal */}
      {ratingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1C221E] border border-[#28312B] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
              <h3 className="text-base font-bold text-[#F7F5EF]">Rate {ratingModalItem.name}</h3>
              <button 
                onClick={() => setRatingModalItem(null)}
                className="text-[#A9B7A0] hover:text-[#F7F5EF]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#A9B7A0] block mb-2">
                  Taste & Portion Quality (1 to 5 Stars):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStarCount(star)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          star <= starCount 
                            ? 'text-[#D8F078] fill-current' 
                            : 'text-[#28312B]'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono text-xs text-[#D8F078] font-bold">
                    {starCount} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-[#A9B7A0] block mb-1.5">
                  Feedback for Culinary Team (Optional):
                </label>
                <textarea
                  rows={3}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="e.g. Spice level was optimal, but rice was slightly over-salted..."
                  className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-3 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B7A0] hover:bg-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] flex items-center gap-2"
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
