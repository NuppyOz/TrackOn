import { z } from 'zod';

export const googleCallbackSchema = z.strictObject({
    code: z.string().min(1).optional(),
    state: z.string().min(20).max(256).optional(),
    error: z.string().max(200).optional(),
});

export const syncCalendarSchema = z.strictObject({
    dia: z.iso.date(),
});
