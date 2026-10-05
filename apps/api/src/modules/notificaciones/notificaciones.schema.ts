import { z } from 'zod';

const positiveId = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647));
export const notificationParams = z.strictObject({ id: positiveId });
export const notificationQuery = z.strictObject({
    limite: z.preprocess((value) => value === undefined ? 20 : Number(value), z.number().int().min(1).max(100)),
    cursor: z.preprocess((value) => value === '' ? undefined : value, positiveId.optional()),
});
export type NotificationQuery = z.infer<typeof notificationQuery>;
