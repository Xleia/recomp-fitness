import{describe,expect,it}from'vitest';import{measurementSeries,removeMeasurementDate,upsertMeasurement}from'./selectors';
describe('body measurement history',()=>{
 it('keeps actual weight and waist values and sorts chart points',()=>{
  const rows=[{date:'2026-11-03',weight:71,waist:80},{date:'2026-11-01',weight:72.5,waist:null},{date:'bad',weight:50,waist:60}];
  expect(measurementSeries(rows,'weight')).toEqual([{date:'2026-11-01',value:72.5},{date:'2026-11-03',value:71}]);
  expect(measurementSeries(rows,'waist')).toEqual([{date:'2026-11-03',value:80}]);
 });
 it('upserts without mutating source and removes only requested dates',()=>{
  const old=[{date:'2026-11-01',weight:72,waist:81}];
  const next=upsertMeasurement(old,'2026-11-01',71.8,null);
  expect(old[0].weight).toBe(72);expect(next[0]).toEqual({date:'2026-11-01',weight:71.8,waist:null});
  expect(removeMeasurementDate(next,'2026-11-01')).toEqual([]);
  expect(()=>upsertMeasurement(old,'2026-11-02',null,null)).toThrow();
 });
});
