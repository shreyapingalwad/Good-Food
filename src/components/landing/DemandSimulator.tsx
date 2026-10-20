import React, { useState, useMemo } from 'react';
import { Sliders, Sparkles, TrendingDown, DollarSign, CloudRain, GraduationCap, Leaf, ShieldAlert } from 'lucide-react';
import { MealType } from '../../types';

export const DemandSimulator: React.FC = () => {
  const [attendance, setAttendance] = useState<number>(1450);
  const [consumptionPerPerson, setConsumptionPerPerson] = useState<number>(0.42);
  const [safetyBuffer, setSafetyBuffer] = useState<number>(5);
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [isRainy, setIsRainy] = useState<boolean>(false);
  const [isExams, setIsExams] = useState<boolean>(false);

  // Meal weight multiplier
  const mealMultiplier = {
    Breakfast: 0.75,
    Lunch: 1.0,
    Snacks: 0.45,
    Dinner: 0.95
  }[mealType];

  // Dynamic simulation calculations
  const simulation = useMemo(() => {
    // 1. Conventional static over-preparation (typically cooks for 100% capacity + 15% arbitrary buffer)
    const staticDiners = attendance * 1.25;
    const conventionalPrepKg = Math.round(staticDiners * consumptionPerPerson * mealMultiplier);

    // 2. MessSaver precision forecast
    let environmentalFactor = 1.0;
    if (isRainy) environmentalFactor *= 1.05; // slightly higher campus dining when raining
    if (isExams) environmentalFactor *= 1.10; // higher mess dining during exam weeks

    const rawNeededKg = attendance * consumptionPerPerson * mealMultiplier * environmentalFactor;
    const recommendedPrepKg = Math.round(rawNeededKg * (1 + safetyBuffer / 100));

    // Prevented overcooking waste
    const savedFoodKg = Math.max(0, conventionalPrepKg - recommendedPrepKg);
    const savedCostRupees = savedFoodKg * 95; // approx ₹95 or ~$1.15 per kg raw prep cost
    const savedCO2Kg = Math.round(savedFoodKg * 2.1 * 10) / 10; // ~2.1 kg CO2e per kg food avoided
    const mealsEquivalent = Math.round(savedFoodKg / 0.35);

    // Risk indicator
    let surplusRisk = 'OPTIMAL';
    if (safetyBuffer > 12) surplusRisk = 'MODERATE SURPLUS RISK';
    if (safetyBuffer < 3) surplusRisk = 'TIGHT BUFFER MARGIN';

    return {
      conventionalPrepKg,
      recommendedPrepKg,
      savedFoodKg,
      savedCostRupees,
      savedCO2Kg,
      mealsEquivalent,
      surplusRisk
    };
  }, [attendance, consumptionPerPerson, safetyBuffer, mealMultiplier, isRainy, isExams]);

  return (
    <section id="simulator" className="relative py-28 bg-[#151916] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#123B2A]/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
            <Sliders className="w-3.5 h-3.5 text-[#D8F078]" />
            <span>Interactive Demand & Preparation Model</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            Simulate Campus Demand <br />
            <span className="text-gradient-lime italic font-normal">& Avoidable Waste Reduction</span>
          </h2>

          <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
            Adjust the illustrative parameters below to examine how precision opt-in forecasting and dynamic buffers prevent unserved kitchen pans.
          </p>

          <div className="text-[11px] font-mono text-[#687B4B] bg-[#1C221E] px-4 py-1.5 rounded-full inline-block border border-[#28312B]">
            * Note: Illustrative simulation calculator for educational demonstration.
          </div>
        </div>

        {/* Interactive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Sliders and Controls */}
          <div className="lg:col-span-6 glass-panel-elevated p-8 rounded-3xl border border-[#28312B] space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
              <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#D8F078]" />
                <span>Simulation Controls</span>
              </h3>
              <span className="text-xs font-mono text-[#D8F078] bg-[#123B2A] px-2.5 py-1 rounded-lg border border-[#D8F078]/30">
                Live Reactive
              </span>
            </div>

            {/* Meal Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider block">
                Target Meal Service
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as MealType[]).map((meal) => (
                  <button
                    key={meal}
                    onClick={() => setMealType(meal)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      mealType === meal
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/40 shadow-sm'
                        : 'bg-[#151916] text-[#A9B7A0] border border-[#28312B] hover:text-[#F7F5EF]'
                    }`}
                  >
                    {meal}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider 1: Expected Attendance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">
                  Confirmed Diners / Opt-ins
                </label>
                <span className="text-base font-bold font-mono text-[#D8F078]">
                  {attendance.toLocaleString()} students
                </span>
              </div>
              <input
                type="range"
                min={400}
                max={3200}
                step={50}
                value={attendance}
                onChange={(e) => setAttendance(Number(e.target.value))}
                className="w-full h-2 bg-[#28312B] rounded-lg appearance-none cursor-pointer accent-[#D8F078]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#A9B7A0]">
                <span>400 (Single Block)</span>
                <span>1,800 (Avg Hall)</span>
                <span>3,200 (Central Mega-Mess)</span>
              </div>
            </div>

            {/* Slider 2: Historical Consumption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">
                  Avg Historical Intake per Diner
                </label>
                <span className="text-base font-bold font-mono text-[#F7F5EF]">
                  {consumptionPerPerson.toFixed(2)} kg
                </span>
              </div>
              <input
                type="range"
                min={0.28}
                max={0.65}
                step={0.01}
                value={consumptionPerPerson}
                onChange={(e) => setConsumptionPerPerson(Number(e.target.value))}
                className="w-full h-2 bg-[#28312B] rounded-lg appearance-none cursor-pointer accent-[#D8F078]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#A9B7A0]">
                <span>0.28 kg (Light)</span>
                <span>0.42 kg (Nominal)</span>
                <span>0.65 kg (Heavy Buffet)</span>
              </div>
            </div>

            {/* Slider 3: Safety Buffer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">
                  Configured Safety Buffer
                </label>
                <span className="text-base font-bold font-mono text-[#D8F078]">
                  +{safetyBuffer}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                className="w-full h-2 bg-[#28312B] rounded-lg appearance-none cursor-pointer accent-[#D8F078]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#A9B7A0]">
                <span>0% (Exact)</span>
                <span>5% (Recommended)</span>
                <span>20% (Conservative)</span>
              </div>
            </div>

            {/* Environmental Modifiers */}
            <div className="pt-2 border-t border-[#28312B] space-y-2">
              <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider block">
                Environmental & Calendar Variables
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsRainy(!isRainy)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    isRainy
                      ? 'bg-[#123B2A] border-[#D8F078]/40 text-[#F7F5EF]'
                      : 'bg-[#151916] border-[#28312B] text-[#A9B7A0]'
                  }`}
                >
                  <CloudRain className={`w-4 h-4 ${isRainy ? 'text-[#D8F078]' : 'text-[#A9B7A0]'}`} />
                  <div>
                    <div className="text-xs font-bold">Rainfall Alert</div>
                    <div className="text-[10px] text-[#A9B7A0]">+5% Campus presence</div>
                  </div>
                </button>

                <button
                  onClick={() => setIsExams(!isExams)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    isExams
                      ? 'bg-[#123B2A] border-[#D8F078]/40 text-[#F7F5EF]'
                      : 'bg-[#151916] border-[#28312B] text-[#A9B7A0]'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 ${isExams ? 'text-[#D8F078]' : 'text-[#A9B7A0]'}`} />
                  <div>
                    <div className="text-xs font-bold">Exam Season</div>
                    <div className="text-[10px] text-[#A9B7A0]">+10% Hostel dining</div>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Calculated Outputs & Visual Gauges */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Primary Recommendation Banner */}
            <div className="p-8 rounded-3xl bg-[#1C221E] border border-[#D8F078]/30 shadow-card-dark space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">
                    Recommended Batch Target
                  </span>
                  <div className="text-4xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] mt-1">
                    {simulation.recommendedPrepKg} <span className="text-lg font-mono text-[#D8F078]">kg</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-[#A9B7A0]">Conventional Guesswork:</span>
                  <div className="text-lg font-mono line-through text-red-400 font-bold">
                    {simulation.conventionalPrepKg} kg
                  </div>
                  <span className="text-xs font-mono text-[#D8F078] font-bold">
                    -{simulation.savedFoodKg} kg avoided
                  </span>
                </div>
              </div>

              {/* Progress Visual Comparison Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#A9B7A0]">Target Efficiency</span>
                  <span className="text-[#D8F078]">
                    {Math.round((simulation.recommendedPrepKg / simulation.conventionalPrepKg) * 100)}% of legacy prep
                  </span>
                </div>
                <div className="h-3 w-full bg-[#151916] rounded-full overflow-hidden flex border border-[#28312B]">
                  <div 
                    className="h-full bg-[#D8F078] transition-all duration-300"
                    style={{ width: `${Math.min(100, (simulation.recommendedPrepKg / simulation.conventionalPrepKg) * 100)}%` }}
                  />
                  <div 
                    className="h-full bg-red-500/50 transition-all duration-300"
                    style={{ width: `${Math.max(0, 100 - (simulation.recommendedPrepKg / simulation.conventionalPrepKg) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#A9B7A0] font-mono">
                  <span>Green: Optimized Batch</span>
                  <span>Red: Eliminated Overproduction</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#28312B]">
                <div className="p-3.5 rounded-2xl bg-[#151916] border border-[#28312B]">
                  <div className="flex items-center gap-1.5 text-xs text-[#D8F078] mb-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Food Saved</span>
                  </div>
                  <div className="text-xl font-bold font-editorial text-[#F7F5EF]">
                    {simulation.savedFoodKg} kg
                  </div>
                  <div className="text-[10px] text-[#A9B7A0]">Avoided waste per shift</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#151916] border border-[#28312B]">
                  <div className="flex items-center gap-1.5 text-xs text-[#D8F078] mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cost Avoided</span>
                  </div>
                  <div className="text-xl font-bold font-editorial text-[#F7F5EF]">
                    ₹{simulation.savedCostRupees.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#A9B7A0]">Raw material savings</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#D8F078] mb-1">
                    <Leaf className="w-3.5 h-3.5" />
                    <span>CO₂ Avoided</span>
                  </div>
                  <div className="text-xl font-bold font-editorial text-[#F7F5EF]">
                    {simulation.savedCO2Kg} kg
                  </div>
                  <div className="text-[10px] text-[#A9B7A0]">GHG landfill emissions</div>
                </div>
              </div>

              {/* Status and Community Conversion */}
              <div className="p-4 rounded-2xl bg-[#123B2A]/40 border border-[#D8F078]/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D8F078]" />
                  <span className="text-[#F7F5EF] font-medium">Community Meal Equivalent:</span>
                </div>
                <span className="font-mono font-bold text-[#D8F078] text-sm">
                  ~{simulation.mealsEquivalent} meals preserved
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
