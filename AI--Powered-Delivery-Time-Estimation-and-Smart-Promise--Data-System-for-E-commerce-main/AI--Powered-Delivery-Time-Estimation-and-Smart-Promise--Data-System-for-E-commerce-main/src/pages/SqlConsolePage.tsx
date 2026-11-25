// src/pages/SqlConsolePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '../store/useDataStore';
import {
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  Download,
  Database,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const SqlConsolePage: React.FC = () => {
  const { runSqlQuery, totalDatasetRows, status: dataStatus } = useDataStore();

  const sampleQueries = [
    {
      id: 'q1',
      title: 'Top 5 Slowest States by Delivery Latency',
      sql: 'SELECT customer_state, AVG(delivery_days) AS avg_days, COUNT(*) AS orders FROM orders GROUP BY customer_state ORDER BY avg_days DESC LIMIT 5;',
    },
    {
      id: 'q2',
      title: 'SP Intra-State Orders Count',
      sql: "SELECT COUNT(*) AS sp_to_sp_count FROM preprocessed_delivery_dataset WHERE customer_state = 'SP' AND seller_state = 'SP';",
    },
    {
      id: 'q3',
      title: 'Categories with Highest Shipping Freight Ratio',
      sql: 'SELECT category, AVG(total_freight / total_price) * 100 AS freight_ratio FROM orders GROUP BY category ORDER BY freight_ratio DESC LIMIT 5;',
    },
    {
      id: 'q4',
      title: 'Cross-State vs Same-State Shipping Economics',
      sql: 'SELECT same_state, AVG(delivery_days) AS avg_days, AVG(total_freight) AS avg_freight, COUNT(*) AS orders FROM orders GROUP BY same_state;',
    },
    {
      id: 'q5',
      title: 'Top 5 Seller States by Total Freight',
      sql: 'SELECT seller_state, COUNT(*) AS total_shipments, ROUND(SUM(total_freight), 2) AS total_freight FROM orders GROUP BY seller_state ORDER BY total_freight DESC LIMIT 5;',
    },
  ];

  const [currentSql, setCurrentSql] = useState(sampleQueries[0].sql);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState<boolean>(true);

  const executeCurrentSql = useCallback(
    async (sqlToRun: string) => {
      const sql = sqlToRun.trim();
      if (!sql) return;

      setIsExecuting(true);
      setQueryError(null);

      try {
        const res = await runSqlQuery(sql);
        if (res.success) {
          setQueryResult(res.data || []);
          setExecutionTime(res.executionTime || 1);
          setQueryError(null);
        } else {
          setQueryError(res.error || 'SQL execution failed.');
          setQueryResult([]);
          setExecutionTime(res.executionTime || 0);
        }
      } catch (err: any) {
        setQueryError(err?.message || 'Unexpected error running query.');
        setQueryResult([]);
      } finally {
        setIsExecuting(false);
      }
    },
    [runSqlQuery]
  );

  // Initial execution of the first sample query
  useEffect(() => {
    executeCurrentSql(currentSql);
  }, [executeCurrentSql]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeCurrentSql(currentSql);
    }
  };

  const handleExportCsv = () => {
    if (!queryResult.length) return;
    const cols = Object.keys(queryResult[0]);
    const csvContent = [
      cols.join(','),
      ...queryResult.map((row) =>
        cols
          .map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val);
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sql_results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = queryResult.length > 0 ? Object.keys(queryResult[0]) : [];
  const xKey = columns[0] || '';
  const yKey = columns.slice(1).find((c) => typeof queryResult[0]?.[c] === 'number') || columns[1] || columns[0] || '';
  const isSingleMetric = queryResult.length === 1 && columns.length === 1;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-card">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <h1 className="text-lg font-bold text-white tracking-tight">
            Client-Side SQL Query Console &amp; Profiler
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Query the entire 96,470 orders table <code className="text-indigo-300">orders</code> or{' '}
          <code className="text-indigo-300">preprocessed_delivery_dataset</code> with zero latency in-browser execution.
        </p>
      </div>

      {/* Editor & Sample Queries Strip */}
      <div className="p-6 rounded-2xl glass-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Example Queries:
            </span>
            {sampleQueries.map((sq) => (
              <button
                key={sq.id}
                onClick={() => {
                  setCurrentSql(sq.sql);
                  executeCurrentSql(sq.sql);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-slate-300 hover:text-white transition"
              >
                {sq.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {queryResult.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition"
                title="Export results to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={() => setShowChart(!showChart)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                showChart
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart ? 'Hide Chart' : 'Auto Chart'}</span>
            </button>
            <button
              onClick={() => executeCurrentSql(currentSql)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition shadow-sm"
            >
              {isExecuting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isExecuting ? 'Executing...' : 'Execute SQL'}</span>
            </button>
          </div>
        </div>

        {/* SQL Input Area */}
        <div className="relative">
          <textarea
            value={currentSql}
            onChange={(e) => setCurrentSql(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Enter SQL query here... (Press Ctrl+Enter to execute)"
            className="w-full font-mono text-xs p-4 rounded-xl bg-black/60 border border-white/[0.08] text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          />
        </div>

        {/* Error Notification */}
        {queryError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-rose-200">Query Execution Error:</span>
              <p className="text-rose-300/90">{queryError}</p>
            </div>
          </div>
        )}

        {/* Execution Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>
            Table: <code className="text-white">orders</code> /{' '}
            <code className="text-white">preprocessed_delivery_dataset</code> ({formatNumber(totalDatasetRows || 96470)} records in memory)
          </span>
          <span className="text-emerald-400 font-medium">
            {isExecuting ? (
              <span className="text-indigo-400 animate-pulse">Running in background worker...</span>
            ) : (
              `Executed in ${executionTime}ms • ${queryResult.length} ${queryResult.length === 1 ? 'row' : 'rows'} returned`
            )}
          </span>
        </div>
      </div>

      {/* Auto Chart / Visual Result */}
      {showChart && queryResult.length > 0 && (
        <div className="p-6 rounded-2xl glass-card">
          <h3 className="font-semibold text-white text-sm mb-4">
            Visual Query Representation (Auto Generated)
          </h3>
          {isSingleMetric ? (
            <div className="flex flex-col items-center justify-center p-8 bg-indigo-950/20 border border-indigo-500/20 rounded-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
                {columns[0]}
              </span>
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {typeof queryResult[0][columns[0]] === 'number'
                  ? formatNumber(queryResult[0][columns[0]])
                  : String(queryResult[0][columns[0]])}
              </span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queryResult} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey={xKey} stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0f1d',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey={yKey} fill="#818cf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="p-6 rounded-2xl glass-card space-y-3">
        <h3 className="font-semibold text-white text-sm">Query Results</h3>
        {queryResult.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-white/[0.08] rounded-xl">
            {isExecuting ? 'Executing query...' : queryError ? 'No results due to query error.' : 'No rows returned.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/[0.08] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-slate-400 border-b border-white/[0.08]">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="p-3 font-semibold uppercase text-[10px]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {queryResult.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    {columns.map((c) => (
                      <td key={c} className="p-3 text-slate-200 font-mono">
                        {typeof (row as any)[c] === 'number'
                          ? formatNumber((row as any)[c])
                          : String((row as any)[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
