import { vi } from 'vitest';

// Setup mocks like in the test
const mockAdminSingle = vi.fn();
const mockAdminEq = vi.fn(() => ({ single: mockAdminSingle }));
const mockAdminSelect = vi.fn(() => ({ eq: mockAdminEq }));
const mockAdminFrom = vi.fn(() => ({ select: mockAdminSelect }));

// Test the chain
mockAdminSingle.mockResolvedValue({ full_name: 'Ms. Johnson' });

const result1 = mockAdminFrom('teachers').select('*').eq('slug', 'ms-johnson').single();
console.log('result1 type:', typeof result1);
console.log('result1:', result1);

// Now test what happens when we call it
result1.then(data => {
  console.log('Got data:', data);
}).catch(err => {
  console.log('Got error:', err);
});

// Wait a tick
await new Promise(resolve => setTimeout(resolve, 10));
