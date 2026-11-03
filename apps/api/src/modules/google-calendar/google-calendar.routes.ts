import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import * as controller from './google-calendar.controller.js';

export const googleCalendarRouter = Router();
googleCalendarRouter.get('/callback', controller.callback);
googleCalendarRouter.use(authenticate);
googleCalendarRouter.get('/status', controller.status);
googleCalendarRouter.post('/connect', controller.connect);
googleCalendarRouter.delete('/connection', controller.disconnect);
googleCalendarRouter.post('/sync', controller.sync);
