import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Activity, BarChart3, Settings, Wallet, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { TransactionProvider, useConnectionState, useTransactionData, useTransactionFilters } from '../contexts/TransactionContext';

function ConnectionStatus() {
  const { isConnected, connectionState } = useConnectionState();

  return (
    <div className="flex items-center space-x-2 text-sm">
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="text-green-400">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-red-400 capitalize">{connectionState}</span>
        </>
      )}
    </div>
  );
}

function TokenFilter() {
  const { selectedTokens, toggleTokenFilter } = useTransactionFilters();
  const tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-white/70 mb-4">Token Filters</h3>
      <div className="space-y-2">
        {tokens.map((token) => (
          <label key={token} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTokens.includes(token)}
              onChange={() => toggleTokenFilter(token)}
              className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
            />
            <span className="text-white/80 text-sm">{token}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StatsCards() {
  const { stats } = useTransactionData();

  const statItems = [
    { label: 'Total Transactions', value: stats.totalTransactions.toLocaleString(), change: '+12%' },
    { label: 'Active Addresses', value: stats.activeAddresses.toLocaleString(), change: '+5%' },
    { label: 'Volume (24h)', value: stats.volume24h, change: '+18%' },
    { label: 'Avg. Tx Size', value: stats.avgTxSize, change: '-3%' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {statItems.map((stat, index) => (
        <div key={index} className="glass rounded-2xl p-6 animate-fade-in">
          <h3 className="text-white/70 text-sm font-medium">{stat.label}</h3>
          <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
          <p className={cn(
            "text-sm mt-1",
            stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
          )}>
            {stat.change} from last 24h
          </p>
        </div>
      ))}
    </div>
  );
}

function TransactionFeed() {
  const { recentTransactions } = useTransactionData();

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">Live Transaction Feed</h2>
      <div className="space-y-4">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => (
            <div key={tx.id} className="glass-dark rounded-lg p-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary-400 font-mono text-sm">{tx.token}</span>
                  </div>
                  <div>
                    <p className="text-white font-mono text-sm">
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)} → {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </p>
                    <p className="text-white/60 text-xs">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{tx.value} {tx.token}</p>
                  <p className="text-white/60 text-sm">{tx.status}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Placeholder transactions while waiting for real data
          [1, 2, 3, 4, 5].map((tx) => (
            <div key={tx} className="glass-dark rounded-lg p-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary-400 font-mono text-sm">MSQ</span>
                  </div>
                  <div>
                    <p className="text-white font-mono text-sm">
                      0x1234...5678 → 0x9abc...def0
                    </p>
                    <p className="text-white/60 text-xs">2 seconds ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">1,000 MSQ</p>
                  <p className="text-white/60 text-sm">$142.50</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      {/* Header */}
      <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">
                MSQ Transaction Monitor
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              <button className="p-2 text-white/70 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen glass-dark border-r border-white/10">
          <div className="p-6">
            <nav className="space-y-2">
              <a
                href="/"
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                  "text-white bg-white/10 shadow-glow"
                )}
              >
                <Activity className="w-5 h-5" />
                <span>Live Transactions</span>
              </a>
              <a
                href="/analytics"
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                  "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Analytics</span>
              </a>
              <a
                href="/addresses"
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                  "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                <Wallet className="w-5 h-5" />
                <span>Addresses</span>
              </a>
            </nav>

            <TokenFilter />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-6">
                  <StatsCards />
                  <TransactionFeed />
                </div>
              }
            />
            <Route
              path="/analytics"
              element={
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
                  <p className="text-white/70 mt-2">Coming soon...</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <TransactionProvider>
      <DashboardContent />
    </TransactionProvider>
  );
}

export default App;
