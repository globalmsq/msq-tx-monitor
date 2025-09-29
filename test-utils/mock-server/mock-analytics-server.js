const http = require('http');
const url = require('url');

const PORT = 8000;

// Token configuration matching the frontend
const TOKENS = ['MSQ', 'SUT', 'KWT', 'P2UC'];
const TOKEN_COLORS = {
  MSQ: '#8b5cf6',
  SUT: '#06b6d4',
  KWT: '#10b981',
  P2UC: '#f59e0b'
};
const TOKEN_DECIMALS = {
  MSQ: 18,
  SUT: 18,
  KWT: 6,
  P2UC: 18
};

// Set CORS headers
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Send JSON response
function sendJSON(res, statusCode, data) {
  setCORSHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Generate realistic mock data based on time range
function generateMockData(hours, token) {
  const now = new Date();
  const data = {
    hourlyVolume: [],
    realtime: {},
    tokenDistribution: [],
    topAddresses: [],
    anomalyStats: {},
    networkStats: {}
  };

  // Generate hourly volume data with proper granularity
  let dataPoints, intervalMinutes, timeFormat;

  if (hours <= 1) {
    // For 1 hour or less: 5-minute intervals (12 data points)
    dataPoints = 12;
    intervalMinutes = 5;
    timeFormat = (ts) => ts.toISOString().slice(0, 16) + ':00';
  } else if (hours <= 6) {
    // For up to 6 hours: 15-minute intervals (24 data points)
    dataPoints = hours * 4;
    intervalMinutes = 15;
    timeFormat = (ts) => ts.toISOString().slice(0, 16) + ':00';
  } else if (hours <= 24) {
    // For up to 24 hours: hourly intervals
    dataPoints = hours;
    intervalMinutes = 60;
    timeFormat = (ts) => ts.toISOString().slice(0, 13) + ':00:00';
  } else {
    // For longer periods: hourly intervals for the full requested period
    dataPoints = hours;
    intervalMinutes = 60;
    timeFormat = (ts) => ts.toISOString().slice(0, 13) + ':00:00';
  }

  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * intervalMinutes * 60 * 1000);
    const hourStr = timeFormat(timestamp);

    // Create realistic volume patterns
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHour = hour >= 9 && hour <= 17;

    let volumeMultiplier = 1;
    if (isWeekend) volumeMultiplier *= 0.6;
    if (isBusinessHour) volumeMultiplier *= 1.8;

    // Generate appropriate volume based on token decimals
    const decimals = TOKEN_DECIMALS[token] || 18;
    const baseTokenAmount = Math.random() * 500 + 100; // 100-600 tokens
    const volumeInTokens = baseTokenAmount * volumeMultiplier;
    const volume = (volumeInTokens * Math.pow(10, decimals)).toString();
    const txCount = Math.floor(Math.random() * 100) + 20;

    data.hourlyVolume.push({
      hour: hourStr,
      tokenSymbol: token,
      totalVolume: volume,
      transactionCount: txCount,
      averageVolume: (volume / txCount).toFixed(0)
    });
  }

  // Generate realtime stats
  const totalVolume = data.hourlyVolume.reduce((sum, item) => sum + parseInt(item.totalVolume), 0);
  const totalTx = data.hourlyVolume.reduce((sum, item) => sum + item.transactionCount, 0);

  data.realtime = {
    totalTransactions: Math.floor(totalTx * 1.2),
    totalVolume: totalVolume.toString(),
    activeAddresses: Math.floor(Math.random() * 500) + 100,
    transactionsLast24h: Math.floor(totalTx * 0.8),
    volumeLast24h: Math.floor(totalVolume * 0.8).toString(),
    activeTokens: token ? 1 : TOKENS.length,
    tokenStats: token ? [{
      tokenSymbol: token,
      totalVolume: totalVolume.toString(),
      transactionCount: totalTx,
      uniqueAddresses24h: Math.floor(Math.random() * 200) + 50,
      volume24h: Math.floor(totalVolume * 0.8).toString()
    }] : TOKENS.map(t => {
      // Generate time-range appropriate volume for each token
      const decimals = TOKEN_DECIMALS[t] || 18;
      const baseTokenAmountPerDataPoint = Math.random() * 500 + 100; // 100-600 tokens per data point
      const tokenTotalVolume = Math.floor(baseTokenAmountPerDataPoint * dataPoints * Math.pow(10, decimals));
      const tokenTotalTx = Math.floor((Math.random() * 100 + 20) * dataPoints);

      return {
        tokenSymbol: t,
        totalVolume: tokenTotalVolume.toString(),
        transactionCount: tokenTotalTx,
        uniqueAddresses24h: Math.floor(Math.random() * 200) + 50,
        volume24h: Math.floor(tokenTotalVolume * 0.8).toString()
      };
    })
  };

  // Generate token distribution
  if (token) {
    data.tokenDistribution = [{
      tokenSymbol: token,
      transactionCount: totalTx,
      volume: totalVolume.toString(),
      percentage: 100,
      color: TOKEN_COLORS[token]
    }];
  } else {
    let totalDistVolume = 0;
    data.tokenDistribution = TOKENS.map(t => {
      // Generate time-range appropriate volume for each token distribution
      const decimals = TOKEN_DECIMALS[t] || 18;
      const baseTokenAmountPerDataPoint = Math.random() * 500 + 100; // 100-600 tokens per data point
      const vol = baseTokenAmountPerDataPoint * dataPoints * Math.pow(10, decimals);
      totalDistVolume += vol;
      return {
        tokenSymbol: t,
        transactionCount: Math.floor((Math.random() * 100 + 20) * dataPoints),
        volume: vol.toFixed(0),
        color: TOKEN_COLORS[t]
      };
    });

    data.tokenDistribution = data.tokenDistribution.map(item => ({
      ...item,
      percentage: parseFloat(((parseFloat(item.volume) / totalDistVolume) * 100).toFixed(2))
    }));
  }

  // Generate top addresses
  data.topAddresses = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    totalVolume: (Math.random() * 50000 + 10000).toFixed(0),
    transactionCount: Math.floor(Math.random() * 100) + 20,
    metric: (Math.random() * 50000 + 10000).toFixed(0)
  }));

  // Generate anomaly stats
  data.anomalyStats = {
    totalTransactions: totalTx,
    anomalyCount: Math.floor(totalTx * 0.05),
    anomalyRate: 5 + Math.random() * 3,
    averageAnomalyScore: 0.2 + Math.random() * 0.3,
    maxAnomalyScore: 0.8 + Math.random() * 0.2,
    highRiskCount: Math.floor(totalTx * 0.01),
    mediumRiskCount: Math.floor(totalTx * 0.02),
    lowRiskCount: Math.floor(totalTx * 0.02)
  };

  // Generate network stats
  data.networkStats = {
    avgGasUsed: 21000 + Math.random() * 50000,
    avgGasPrice: 20 + Math.random() * 100,
    maxGasUsed: 100000 + Math.random() * 200000,
    maxGasPrice: 200 + Math.random() * 500,
    totalBlocks: Math.floor(hours / 2) + Math.floor(Math.random() * 100),
    networkUtilization: 50 + Math.random() * 40
  };

  return data;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCORSHeaders(res);
    res.statusCode = 200;
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`${req.method} ${pathname} - Query:`, query);

  // Route handlers
  if (pathname === '/health') {
    sendJSON(res, 200, { status: 'OK', message: 'Mock Analytics Server is running' });
  }
  else if (pathname === '/api/v1/') {
    sendJSON(res, 200, {
      name: 'Mock MSQ Transaction Monitor API',
      version: '1.0.0-mock',
      description: 'Mock REST API for testing time range functionality',
      endpoints: {
        realtime: '/api/v1/analytics/realtime',
        hourlyVolume: '/api/v1/analytics/volume/hourly',
        tokenDistribution: '/api/v1/analytics/distribution/token',
        topAddresses: '/api/v1/analytics/addresses/top',
        anomalies: '/api/v1/analytics/anomalies',
        network: '/api/v1/analytics/network'
      },
      timeRanges: ['1h', '24h', '7d', '30d'],
      supportedTokens: TOKENS,
      timestamp: new Date().toISOString()
    });
  }
  else if (pathname === '/api/v1/analytics/realtime') {
    const { token, hours = 24 } = query;
    const hoursNum = parseInt(hours);
    console.log(`📊 Realtime stats - Token: ${token || 'ALL'}, Hours: ${hoursNum}`);
    const mockData = generateMockData(hoursNum, token?.toUpperCase());
    sendJSON(res, 200, { success: true, data: mockData.realtime });
  }
  else if (pathname === '/api/v1/analytics/volume/hourly') {
    const { token, hours = 24, limit = 24 } = query;
    const hoursNum = parseInt(hours);
    const limitNum = parseInt(limit);
    console.log(`📈 Hourly volume - Token: ${token || 'ALL'}, Hours: ${hoursNum}, Limit: ${limitNum}`);
    const mockData = generateMockData(hoursNum, token?.toUpperCase());
    sendJSON(res, 200, { success: true, data: mockData.hourlyVolume.slice(0, limitNum) });
  }
  else if (pathname === '/api/v1/analytics/distribution/token') {
    const { token, hours = 24 } = query;
    const hoursNum = parseInt(hours);
    console.log(`🪙 Token distribution - Token: ${token || 'ALL'}, Hours: ${hoursNum}`);
    const mockData = generateMockData(hoursNum, token?.toUpperCase());
    sendJSON(res, 200, { success: true, data: mockData.tokenDistribution });
  }
  else if (pathname === '/api/v1/analytics/addresses/top') {
    const { token, hours = 24, metric = 'volume', limit = 10 } = query;
    const hoursNum = parseInt(hours);
    const limitNum = parseInt(limit);
    console.log(`🏆 Top addresses - Token: ${token || 'ALL'}, Hours: ${hoursNum}, Metric: ${metric}, Limit: ${limitNum}`);
    const mockData = generateMockData(hoursNum, token?.toUpperCase());
    sendJSON(res, 200, {
      success: true,
      data: mockData.topAddresses.slice(0, limitNum),
      metadata: {
        metric,
        limit: limitNum,
        tokenSymbol: token?.toUpperCase(),
        count: Math.min(mockData.topAddresses.length, limitNum)
      }
    });
  }
  else if (pathname === '/api/v1/analytics/anomalies') {
    const { token, hours = 24 } = query;
    const hoursNum = parseInt(hours);
    console.log(`⚠️ Anomaly stats - Token: ${token || 'ALL'}, Hours: ${hoursNum}`);
    const mockData = generateMockData(hoursNum, token?.toUpperCase());
    sendJSON(res, 200, { success: true, data: mockData.anomalyStats });
  }
  else if (pathname === '/api/v1/analytics/network') {
    const { token, hours = 24 } = query;
    const hoursNum = parseInt(hours);
    console.log(`🌐 Network stats - Token: ${token || 'ALL'}, Hours: ${hoursNum}`);
    const mockData = generateMockData(hoursNum, token?.toUpperCase());
    sendJSON(res, 200, { success: true, data: mockData.networkStats });
  }
  else {
    sendJSON(res, 404, { error: 'Not found' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 Mock Analytics Server Started!');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1/analytics`);
  console.log(`📋 API Info: http://localhost:${PORT}/api/v1/`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
  console.log('\n📊 Supported Time Ranges:');
  console.log('  • 1h  - Last 1 hour');
  console.log('  • 24h - Last 24 hours');
  console.log('  • 7d  - Last 7 days');
  console.log('  • 30d - Last 30 days');
  console.log('\n🪙 Supported Tokens: MSQ, SUT, KWT, P2UC');
  console.log('\n💡 Usage:');
  console.log('  1. Keep this server running');
  console.log('  2. Open Analytics Dashboard in browser');
  console.log('  3. Test different time ranges');
  console.log('  4. Press Ctrl+C to stop when done');
  console.log('\n' + '='.repeat(50));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Mock Analytics Server...');
  console.log('✅ Server stopped. You can now restart your original tx-api');
  process.exit(0);
});