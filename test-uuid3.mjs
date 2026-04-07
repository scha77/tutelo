// UUID format: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
// M = version (1-5), N = variant (8, 9, a, b)
// For v4 (random): M=4, N should be 8, 9, a, or b

const testIds = [
  '11111111-1111-1111-1111-111111111111', // version 1, invalid variant
  '22222222-2222-2222-2222-222222222222', // version 2, invalid variant
  '33333333-3333-3333-3333-333333333333', // version 3, invalid variant
  '44444444-4444-4444-4444-444444444444', // version 4, invalid variant
  '11111111-1111-4111-8111-111111111111', // version 4, valid variant 8
  '11111111-1111-4111-a111-111111111111', // version 4, valid variant a
  '11111111-1111-4111-b111-111111111111', // version 4, valid variant b
  '11111111-1111-4111-c111-111111111111', // version 4, invalid variant c
  '550e8400-e29b-41d4-a716-446655440000', // real v4 UUID
];

import { z } from 'zod';
const uuidSchema = z.string().uuid();

testIds.forEach(id => {
  const result = uuidSchema.safeParse(id);
  console.log(`${id}: ${result.success}`);
});
