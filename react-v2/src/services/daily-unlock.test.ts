import {describe,expect,it} from 'vitest';
import {todayInTokyo} from './daily-unlock';
describe('daily unlock date',()=>{it('returns a stable Tokyo calendar date',()=>{expect(todayInTokyo().split('-')).toHaveLength(3);});});
