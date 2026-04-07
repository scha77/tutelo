import { z } from 'zod';

const uuidSchema = z.string().uuid();

const ids = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440000',
];

ids.forEach(id => {
  const result = uuidSchema.safeParse(id);
  console.log(`${id}: ${result.success}`);
  if (!result.success) {
    console.log('  error:', result.error.issues[0]?.message);
  }
});
