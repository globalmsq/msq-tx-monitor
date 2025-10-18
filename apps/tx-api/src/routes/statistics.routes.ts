import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller';

export const statisticsRoutes = Router();
const statisticsController = new StatisticsController();

// Realtime stats
statisticsRoutes.get('/realtime', statisticsController.getRealtimeStats);

// Volume endpoints
statisticsRoutes.get(
  '/volume/hourly',
  statisticsController.getHourlyVolumeStats
);
statisticsRoutes.get(
  '/volume/minutes',
  statisticsController.getMinuteVolumeStats
);
statisticsRoutes.get('/volume/daily', statisticsController.getDailyVolumeStats);
statisticsRoutes.get(
  '/volume/weekly',
  statisticsController.getWeeklyVolumeStats
);

// Token stats
statisticsRoutes.get('/tokens', statisticsController.getTokenStats);

// Address endpoints
statisticsRoutes.get('/addresses/top', statisticsController.getTopAddresses);
statisticsRoutes.get(
  '/addresses/receivers',
  statisticsController.getTopReceivers
);
statisticsRoutes.get('/addresses/senders', statisticsController.getTopSenders);

// Anomaly endpoints
statisticsRoutes.get('/anomalies', statisticsController.getAnomalyStats);
statisticsRoutes.get(
  '/anomalies/timeseries/minutes',
  statisticsController.getAnomalyTimeSeriesMinutes
);
statisticsRoutes.get(
  '/anomalies/timeseries/hourly',
  statisticsController.getAnomalyTimeSeries
);
statisticsRoutes.get(
  '/anomalies/timeseries/daily',
  statisticsController.getAnomalyTimeSeriesDaily
);
statisticsRoutes.get(
  '/anomalies/timeseries/weekly',
  statisticsController.getAnomalyTimeSeriesWeekly
);

// Network stats
statisticsRoutes.get('/network', statisticsController.getNetworkStats);

// Token distribution
statisticsRoutes.get(
  '/distribution/token',
  statisticsController.getTokenDistribution
);
