import { describe, it, expect, beforeAll } from 'vitest';
import alasql from 'alasql';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

describe('SQL Query Engine and Profiler Tests', () => {
  beforeAll(() => {
    const csvPath = path.resolve(__dirname, '../../public/data/preprocessed_delivery_dataset.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse(csvData, { header: true, dynamicTyping: true, skipEmptyLines: true });

    alasql.options.casesensitive = false;
    alasql.tables.preprocessed_delivery_dataset = { data: parsed.data };
    alasql.tables.orders = { data: parsed.data };
  });

  it('Query 1: executes user SP to SP count query and returns exactly 30735', () => {
    const query = `
      SELECT COUNT(*) AS sp_to_sp_count
      FROM preprocessed_delivery_dataset
      WHERE customer_state = 'SP'
        AND seller_state = 'SP';
    `;
    let cleanSql = query.trim();
    if (cleanSql.endsWith(';')) cleanSql = cleanSql.slice(0, -1).trim();

    const result = alasql(cleanSql) as any[];
    expect(result).toHaveLength(1);
    expect(result[0].sp_to_sp_count).toBe(30735);
  });

  it('Query 2: Top 5 slowest states by delivery latency', () => {
    const query = 'SELECT customer_state, AVG(delivery_days) AS avg_days, COUNT(*) AS orders FROM orders GROUP BY customer_state ORDER BY avg_days DESC LIMIT 5';
    const result = alasql(query) as any[];
    expect(result).toHaveLength(5);
    expect(result[0].customer_state).toBe('RR');
    expect(result[0].orders).toBe(41);
  });

  it('Query 3: Cross-state vs Same-state economics', () => {
    const query = 'SELECT same_state, AVG(delivery_days) AS avg_days, AVG(total_freight) AS avg_freight, COUNT(*) AS orders FROM orders GROUP BY same_state ORDER BY same_state DESC';
    const result = alasql(query) as any[];
    expect(result).toHaveLength(2);
    // same_state = 1
    expect(result[0].same_state).toBe(1);
    expect(result[0].orders).toBe(34701);
    // cross_state = 0
    expect(result[1].same_state).toBe(0);
    expect(result[1].orders).toBe(61769);
  });

  it('Query 4: Top 5 seller states by total freight', () => {
    const query = 'SELECT seller_state, COUNT(*) AS total_shipments, ROUND(SUM(total_freight), 2) AS total_freight FROM orders GROUP BY seller_state ORDER BY total_freight DESC LIMIT 5';
    const result = alasql(query) as any[];
    expect(result).toHaveLength(5);
    expect(result[0].seller_state).toBe('SP');
    expect(result[0].total_shipments).toBeGreaterThan(60000);
  });

  it('Query 5: SP to RJ route shipments count and latency', () => {
    const query = "SELECT customer_state, seller_state, COUNT(*) AS route_orders, ROUND(AVG(delivery_days), 2) AS avg_days FROM preprocessed_delivery_dataset WHERE customer_state = 'RJ' AND seller_state = 'SP' GROUP BY customer_state, seller_state";
    const result = alasql(query) as any[];
    expect(result).toHaveLength(1);
    expect(result[0].customer_state).toBe('RJ');
    expect(result[0].seller_state).toBe('SP');
    expect(result[0].route_orders).toBe(8158);
  });

  it('Query 6: Delivery days distribution stats (min, max, avg, est)', () => {
    const query = 'SELECT ROUND(MIN(delivery_days), 2) AS min_days, ROUND(MAX(delivery_days), 2) AS max_days, ROUND(AVG(delivery_days), 2) AS avg_days, ROUND(AVG(estimated_delivery_days), 2) AS avg_est_days FROM preprocessed_delivery_dataset';
    const result = alasql(query) as any[];
    expect(result).toHaveLength(1);
    expect(result[0].min_days).toBeDefined();
    expect(result[0].max_days).toBeGreaterThan(100);
    expect(result[0].avg_days).toBeCloseTo(12.56, 1);
  });

  it('Query 7: High-value orders (> 500) distribution by customer state', () => {
    const query = 'SELECT customer_state, COUNT(*) AS high_value_orders, ROUND(AVG(total_price), 2) AS avg_order_price FROM orders WHERE total_price > 500 GROUP BY customer_state ORDER BY high_value_orders DESC LIMIT 5';
    const result = alasql(query) as any[];
    expect(result).toHaveLength(5);
    expect(result[0].customer_state).toBe('SP');
    expect(result[0].high_value_orders).toBeGreaterThan(1000);
  });
});
