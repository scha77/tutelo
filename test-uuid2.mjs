import { z } from 'zod';

// UUIDs with different patterns
const testIds = [
  '11111111-1111-1111-1111-111111111111', // all ones
  '22222222-2222-2222-2222-222222222222', // all twos
  'ffffffff-ffff-ffff-ffff-ffffffffffff', // all f
  '00000000-0000-0000-0000-000000000000', // all zeros
  '550e8400-e29b-41d4-a716-446655440000', // real UUID
  '550e8400-e29b-41d4-a716-446655440001', // real UUID
];

const uuidSchema = z.string().uuid();

testIds.forEach(id => {
  const result = uuidSchema.safeParse(id);
  console.log(`${id}: ${result.success}`);
});
