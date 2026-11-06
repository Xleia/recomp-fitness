import{describe,expect,it}from'vitest';import{parseManualAmount}from'./NutritionManual';
describe('manual nutrition input',()=>{it('keeps blanks empty and validates values',()=>{expect(parseManualAmount('','kcal')).toBe(null);expect(parseManualAmount('96','kcal')).toBe(96);expect(()=>parseManualAmount('-1','protein')).toThrow();expect(()=>parseManualAmount('10001','kcal')).toThrow();});});
