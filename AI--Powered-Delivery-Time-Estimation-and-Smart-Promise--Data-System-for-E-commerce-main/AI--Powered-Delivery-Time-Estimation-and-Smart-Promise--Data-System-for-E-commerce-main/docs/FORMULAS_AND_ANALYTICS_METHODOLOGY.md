# Delivery Analytics Platform — Formulas & Business Methodology Guide

**Project**: AI-Powered Delivery Time Estimation & Smart Promise Platform  
**Course**: AI For Business Analytics (5th Semester)  
**Institution**: Dayananda Sagar University (DSU)  
**Dataset**: Brazilian E-Commerce Public Dataset by Olist (96,470 delivered orders, 2017–2018)  
**Files Referenced**: `src/pages/`, `src/workers/dataWorker.ts`, `Untitled0 (1).ipynb`

---

## Quick Navigation
1. [Core Data Pipeline & Derived Columns](#1-core-data-pipeline--derived-columns)
2. [Executive Summary & High-Level KPIs](#2-executive-summary--high-level-kpis)
3. [Delivery SLA Simulator: Mechanics & Base Conditions](#3-delivery-sla-simulator-mechanics--base-conditions)
4. [Statistical Hypothesis Testing Lab](#4-statistical-hypothesis-testing-lab)
5. [Machine Learning Models (Predictive Lab)](#5-machine-learning-models-predictive-lab)
6. [Geospatial & Route Logistics](#6-geospatial--route-logistics)
7. [Temporal, Heatmap & Time Analysis](#7-temporal-heatmap--time-analysis)
8. [SQL Console Queries & Outputs](#8-sql-console-queries--outputs)
9. [Currency & Formatting Standards](#9-currency--formatting-standards)

---

## 1. Core Data Pipeline & Derived Columns

During data cleaning and preprocessing (`Untitled0 (1).ipynb`), multiple raw Olist tables (`orders`, `items`, `products`, `customers`, `sellers`) are merged and filtered to **96,470 delivered orders**. The following key columns are computed for every order:

### 1.1 Actual Delivery Days (`delivery_days`)
The actual transit duration from customer checkout to doorstep delivery.
* **Plain Formula**:  
  `delivery_days = (order_delivered_customer_date - order_purchase_timestamp) in seconds ÷ 86,400`  
  *(where 86,400 = 24 hours × 60 minutes × 60 seconds)*
* **Example**: An order placed on Oct 1 at 10:00 AM and delivered on Oct 8 at 10:00 AM = `7.0 days`.
* **Dataset Average**: **12.6 days** (Median: **10.2 days**).

### 1.2 Estimated / Promised Delivery Days (`estimated_delivery_days`)
The estimated delivery SLA promised to the customer on the website at checkout.
* **Plain Formula**:  
  `estimated_delivery_days = (order_estimated_delivery_date - order_purchase_timestamp) in seconds ÷ 86,400`
* **Dataset Average**: **23.7 days**.

### 1.3 Late Delivery Indicator (`is_late`)
A binary flag (1 or 0) indicating whether carrier delivery violated the checkout promise date.
* **Plain Formula**:  
  `is_late = 1 if (delivery_days > estimated_delivery_days) else 0`
* **Dataset Count**:
  * **On-Time (is_late = 0)**: **88,656 orders (91.9%)**
  * **Late (is_late = 1)**: **7,814 orders (8.1%)**

### 1.4 Delay Gap / Buffer (`delay_gap`)
The difference between actual transit duration and promised delivery date.
* **Plain Formula**:  
  `delay_gap = delivery_days - estimated_delivery_days`
* **Interpretation**:
  * **Negative value (-X days)**: The delivery arrived **X days early** (ahead of estimate).
  * **Positive value (+X days)**: The delivery arrived **X days late** (delayed).
* **Dataset Average**: **-11.2 days**  
  *(Meaning Olist promised an average of 23.7 days for orders that actually arrived in 12.6 days, keeping an ultra-conservative ~11-day safety buffer).*

### 1.5 Same-State / Intra-State Transit (`same_state`)
Identifies whether the customer and seller are located inside the exact same Brazilian state.
* **Plain Formula**:  
  `same_state = 1 if (customer_state == seller_state) else 0`
* **Dataset Distribution**:
  * **Same State (Intra-state)**: **34,701 orders (36.0%)** — Avg transit: **7.95 days**
  * **Cross State (Inter-state)**: **61,769 orders (64.0%)** — Avg transit: **15.15 days**

### 1.6 Weekend Order Flag (`is_weekend`)
* **Plain Formula**:  
  `is_weekend = 1 if purchase day is Saturday or Sunday else 0`
* **Dataset Distribution**: **22,231 weekend orders (23.0%)** vs **74,239 weekday orders (77.0%)**.

### 1.7 Freight Ratio (`freight_ratio`)
* **Plain Formula**:  
  `freight_ratio = (total_freight ÷ total_price) × 100%`
* **Dataset Average**: **16.63%** across all orders.

---

## 2. Executive Summary & High-Level KPIs

These platform-wide summary metrics appear on the Overview, Reports, and About pages:

| Metric Name | How It Is Calculated (Plain Formula) | Real Dataset Value | Business Meaning |
| :--- | :--- | :--- | :--- |
| **Total Orders** | Total count of delivered records | **96,470 orders** | Complete clean dataset volume |
| **Gross Merchandise Value (GMV)** | Sum of all item prices | **$13,220,248.93** | Total platform sales volume |
| **Total Freight Spend** | Sum of all shipping fees | **$2,198,145.90** | Total logistics expenditure |
| **Average Order Value (AOV)** | Total GMV ÷ Total Orders | **$137.04** | Mean spending per customer order |
| **Average Freight Cost** | Total Freight ÷ Total Orders | **$22.79** | Mean shipping fee paid per order |
| **Freight-to-Price Ratio** | (Total Freight ÷ Total GMV) × 100 | **16.63%** | Shipping represents ~16.6% of cart value |
| **Average Delivery Time** | Sum of delivery days ÷ Total Orders | **12.6 days** | National average fulfillment transit |
| **Average Promised SLA** | Sum of estimated days ÷ Total Orders | **23.7 days** | Average checkout promise duration |
| **Average Promise Buffer** | Average Delivery Days - Average Promised | **-11.2 days** | Orders arrive 11.2 days before promise |
| **On-Time SLA Rate** | (On-Time Orders ÷ Total Orders) × 100 | **91.9%** | 88,656 of 96,470 orders met SLA |
| **Late Delivery Rate** | (Late Orders ÷ Total Orders) × 100 | **8.1%** | 7,814 orders arrived past promise |
| **Same-State Share** | (Same-State Orders ÷ Total Orders) × 100 | **36.0%** | Intra-state route volume share |
| **Median Delivery Time (P50)** | 50th percentile of delivery days | **10.2 days** | Half of all orders arrive in under 10.2 days |
| **90th Percentile (P90)** | 90th percentile of delivery days | **23.1 days** | 90% of deliveries arrive within 23.1 days |
| **99th Percentile (P99)** | 99th percentile of delivery days | **46.1 days** | Chart cutoff; filters extreme courier outliers |
| **Revenue at Risk (Baseline)** | Late Orders × Average Order Value | **$1,070,831** | 7,814 late orders × $137.04 at refund/churn risk |

---

## 3. Delivery SLA Simulator: Mechanics & Base Conditions

Found on the **Delivery Performance & SLA Target Simulator** page (`src/pages/DeliveryPerformancePage.tsx`).

### 3.1 Why does the SLA Slider run from 85% to 99%?
The slider's boundary conditions are based on real logistics realities:
* **85% (Lower Floor)**: In the Olist historical dataset, certain underperforming states and long-distance transit corridors experienced on-time delivery rates between **76% and 84%** (for example: Alagoas AL at 76%, Maranhão MA at 82%, Rio de Janeiro RJ at 83.5%). The 85% floor represents a "distressed regional baseline."
* **91.9% (Dataset Baseline)**: The nationwide historical on-time compliance rate across all 96,470 orders.
* **95% (Industry Standard Target)**: The default target for commercial e-commerce platforms.
* **99% (World-Class SLA Ceiling)**: Benchmark for tier-1 automated fulfillment networks (such as Amazon Prime or Mercado Livre Full). Reaching 100% is physically impossible in postal logistics because an irreducible ~12% tail of delays is caused by *force majeure* (extreme weather, floods, address errors, highway strikes).

---

### 3.2 The 3 Interactive Control Levers

1. **Target SLA On-Time Compliance (`slaTargetPercent`: 85% to 99%)**:  
   Sets the strategic management goal for on-time delivery.
2. **Max Delivery Latency Ceiling (`targetMaxDays`: 7 to 30 days)**:  
   Sets the maximum acceptable days in transit (7 days = Express, 15 days = Standard, 30 days = Relaxed).
3. **Bottleneck Intervention Lift (`worstStatesFixPercent`: 10% to 75%)**:  
   Percentage improvement achieved by upgrading courier hubs and fulfillment in the 5 worst-performing states.

---

### 3.3 Simulation Calculation Steps (Plain Formulas)

#### Step 1: Latency Ceiling Compliance (Using Histogram Bins)
The engine checks how many orders naturally fall within the `targetMaxDays` ceiling using the delivery histogram:
* For bins that end before `targetMaxDays`: All orders in the bin count as compliant.
* For the bin that spans `targetMaxDays`: Pro-rate linearly:
  `Fraction = (targetMaxDays - binStart) ÷ (binEnd - binStart)`  
  `Compliant Orders in Bin = Bin Order Count × Fraction`
* `Ceiling Compliance % = (Total Compliant Orders ÷ Total Orders) × 100%`

#### Step 2: Bottleneck Recovery from Worst 5 States
1. Sort all 27 Brazilian states by highest late delivery rate (filtering for states with at least 50 orders).
2. Take the worst 5 states (e.g., AL, MA, SE, BA, PI, RJ) and calculate their total late orders:  
   `Worst 5 Late Total = Sum of (State Late Rate % × State Orders)`
3. Calculate orders saved by targeted infrastructure overhaul:  
   `Saved from States = Worst 5 Late Total × (worstStatesFixPercent ÷ 100)`

#### Step 3: Courier Expedited Rerouting Savings
Enforcing a tighter delivery ceiling forces carriers to expedite slow packages:  
* `Ceiling Efficiency = Maximum of 0 or (26 - targetMaxDays) ÷ 32`  
* `Saved from Ceiling = Total Late Orders × Ceiling Efficiency × (worstStatesFixPercent ÷ 80)`  
*(If ceiling is 26+ days, no expedited savings occur; as ceiling tightens towards 7 days, up to ~59% of late packages are expedited).*

#### Step 4: Strategic Carrier Contract Enforcement
A higher corporate SLA target triggers contractual penalties and stricter dispatch agreements with 3PL couriers:  
* `Strategic Effort = Maximum of 0 or (Target SLA % - Baseline On-Time 91.9%) × 0.055`  
* `Saved from Strategic = Total Late Orders × Strategic Effort`  
*(Each +1% higher SLA target recovers ~5.5% of manageable carrier delays).*

#### Step 5: Total Late Orders Recovered (With Diminishing Returns Cap)
Physical supply chains have an irreducible delay floor (~12% of delays are unavoidable due to weather or lost cargo), so total recoveries are capped at 88%:  
* `Total Recovered = Minimum of:`
  1. `Total Late Orders × 0.88` (the physical limit)
  2. `Saved from States + Saved from Ceiling + Saved from Strategic`

#### Step 6: Projected Outcomes & Financial Savings
* `New Late Orders Count = Total Late Orders - Total Recovered`
* `Simulated On-Time Rate % = ((Total Orders - New Late Orders) ÷ Total Orders) × 100%`  
  *(Capped at a realistic maximum of 99.6%)*
* `On-Time Gain = Simulated On-Time Rate - Baseline 91.9%`
* `Revenue at Risk = New Late Orders Count × $137.04 (Average Order Value)`
* `Recovered Revenue = Total Recovered × $137.04`

---

## 4. Statistical Hypothesis Testing Lab

Found on the **Statistics Lab** page (`src/pages/StatisticsLabPage.tsx`).

### 4.1 Correlation Analysis

* **Pearson Correlation (r)**: Measures straight-line linear relationship (from -1.0 to +1.0).
* **Spearman Rank Correlation (ρ)**: Measures monotonic relationship using ranked order (resilient to extreme outliers).

#### Real Dataset Correlation Values:
* **Freight Cost vs Actual Delivery Days**:
  * **Pearson r = 0.17** (Weak linear relationship: higher shipping costs do not directly cause longer transit; costs depend more on package weight and distance).
  * **Spearman ρ = 0.38** (Moderate rank correlation: heavier/farther items generally rank higher in delivery days).
* **Estimated Days vs Actual Delivery Days**:
  * **Pearson r = 0.38** / **Spearman ρ = 0.52** (Moderate positive correlation: Olist estimates track actual transit rankings, but with a wide conservative safety buffer).
* **Product Price vs Freight Cost**:
  * **Pearson r = 0.41** / **Spearman ρ = 0.47** (Higher-value items tend to have higher freight fees due to insurance and volumetric size).
* **Item Count vs Freight Cost**:
  * **Pearson r = 0.44** (Adding more items directly increases the parcel shipping fee).

---

### 4.2 Hypothesis Tests

#### Test 1: Same-State (Intra) vs Cross-State (Inter) Delivery Latency
* **Test Type**: Welch's Two-Sample t-Test (unequal variances).
* **Intra-State Mean**: **7.95 days** (sample size: 34,701 orders).
* **Cross-State Mean**: **15.15 days** (sample size: 61,769 orders).
* **Formula for t-statistic**:  
  `t = (Mean_Intra - Mean_Cross) ÷ SquareRoot((Variance_Intra ÷ N_Intra) + (Variance_Cross ÷ N_Cross))`
* **Calculated Values**: `t = -86.4`, `p < 0.0001` (Statistically Significant).
* **Standardized Effect Size (Cohen's d)**:
  `d = (Mean_Cross - Mean_Intra) ÷ Pooled_Standard_Deviation = (15.15 - 7.95) ÷ 8.89 = 0.81`
* **Conclusion**: **Large Effect Size (d > 0.8)**. Deliveries within the same state arrive **7.2 days faster** than cross-state deliveries. Same-state fulfillment is the single largest operational driver of speed.

#### Test 2: Weekend vs Weekday Ordering Speed
* **Test Type**: Independent Two-Sample t-Test.
* **Weekend Mean**: **12.63 days** (22,231 orders).
* **Weekday Mean**: **12.54 days** (74,239 orders).
* **Calculated Values**: `t = 1.22`, `p = 0.228` (Not Significant, p > 0.05).
* **Effect Size**: `Cohen's d = 0.01` (Negligible).
* **Conclusion**: **No significant difference**. Carrier dispatch rhythms and batch sorting over Monday morning normalize weekend order placements.

#### Test 3: Regional Geographic Delivery Variance
* **Test Type**: One-Way ANOVA F-Test across Brazilian states.
* **Calculated Values**: `F = 1420.8`, `p < 0.0001`.
* **Effect Size (Eta-Squared, η²)**:
  `η² = Between-Group Sum of Squares ÷ Total Sum of Squares = 0.174 (17.4%)`
* **Conclusion**: **17.4% of all variance in delivery duration** across Brazil is explained purely by geographic destination state.

#### Test 4: Pareto Principle (80/20 Rule) for Product Categories
* **Formula**: Sort categories descending by revenue, compute cumulative percentage:  
  `Cumulative % = (Sum of Top K Category Revenues ÷ Total Marketplace Revenue) × 100%`
* **Result**: The top 20% of product categories account for **78.4% of total marketplace GMV** (conforms to the classic 80/20 rule).

---

## 5. Machine Learning Models (Predictive Lab)

Found on the **Predictive Machine Learning Lab** page (`src/pages/PredictiveLabPage.tsx`) and trained in `Untitled0 (1).ipynb`.

### 5.1 Delivery Time Regressor (Gradient Boosting Regressor)
Predicts the exact number of delivery days for an incoming order based on route, freight, price, destination state, and day of week.

#### Evaluation Metrics on 80/20 Train/Test Split (96,470 orders):
1. **Mean Absolute Error (MAE)**:
   * **Formula**: `MAE = Average of absolute differences |Actual Days - Predicted Days|`
   * **Model Score**: **4.85 days**  
     *(By comparison, a naive baseline that always guesses the average delivery time gives MAE = 6.41 days. The model improves prediction accuracy by 24.3%).*
2. **Root Mean Squared Error (RMSE)**:
   * **Formula**: `RMSE = SquareRoot(Average of (Actual Days - Predicted Days)²)`
   * **Model Score**: **7.65 days**
3. **R² Score (Coefficient of Determination)**:
   * **Formula**: `R² = 1 - (Sum of Squared Model Residuals ÷ Sum of Squared Total Residuals)`
   * **Model Score**: **0.33** (33% of transit duration variance is captured by order-level features).

#### Permutation Feature Importances:
1. **Same-State (Intra vs Inter)**: **38%**
2. **Customer Destination State Hub**: **26%**
3. **Freight Cost**: **14%**
4. **Basket Item Price**: **9%**
5. **Purchase Month / Seasonality**: **6%**
6. **Weekend Order Flag**: **4%**
7. **Seller Count**: **3%**

---

### 5.2 Late Delivery Binary Classifier
Predicts whether an order will breach the promised delivery date (`is_late = 1`).

#### Late Risk Sigmoid Formula:
* `z = (Predicted Days - 15.5) ÷ 4.5 + Price_Risk_Buffer`
* `Late Probability % = (1 ÷ (1 + e^(-z))) × 100%`

#### Why the Threshold Slider Defaults to 0.20 (Not 0.50):
Because only **8.1% of orders are late** (a heavy class imbalance of 7,814 late vs 88,656 on-time), using the standard statistical cutoff of `0.50` flags almost zero late orders (catches only ~1% of late deliveries).  
Lowering the decision threshold to **0.20** creates an operationally useful early warning system:
* **ROC-AUC Score**: **0.75** (Area Under the Receiver Operating Characteristic curve)
* **At Threshold 0.20**:
  * **Recall (Sensitivity)**: **29.0%** — Proactively catches **2,266 late shipments** before they occur.
  * **Precision**: **30.0%** — When the model sounds an alert, ~3 out of 10 times the package would genuinely be late.
  * **F1-Score**: **29.5%** — Harmonic mean of Precision and Recall.

#### Confusion Matrix Formulas:
* `True Positives (TP)`: Late orders correctly flagged as late.
* `False Positives (FP)`: On-time orders wrongly flagged as late.
* `False Negatives (FN)`: Late orders missed by the model.
* `True Negatives (TN)`: On-time orders correctly classified.
* `Precision = TP ÷ (TP + FP)`
* `Recall = TP ÷ (TP + FN)`
* `Accuracy = (TP + TN) ÷ (TP + FP + FN + TN)`
* `F1-Score = (2 × Precision × Recall) ÷ (Precision + Recall)`

---

## 6. Geospatial & Route Logistics

Found on **Geography** (`src/pages/GeographyPage.tsx`) and **Categories & Routes** (`src/pages/CategoriesRoutesPage.tsx`).

### 6.1 State Rankings
* **Formula**: For every destination state:  
  `Average State Days = Sum of Delivery Days in State ÷ State Orders`  
  `State Late Rate % = (State Late Orders ÷ State Orders) × 100%`
* **Fastest Fulfillment State**: **São Paulo (SP)** with **8.3 days average** (30,735 same-state orders).
* **Slowest Fulfillment State**: **Roraima (RR)** with **28.4 days average**, followed by Amapá (AP) at **26.7 days** and Amazonas (AM) at **25.9 days**.

### 6.2 Key Route Analytics
For an origin-destination state pair (`Seller State → Customer State`):
* **Top Intra-State Route (SP → SP)**:
  * Order Count: **30,735 orders**
  * Average Delivery Duration: **5.3 days**
  * Average Freight: **$10.95**
* **Top Inter-State Route (SP → RJ)**:
  * Order Count: **8,158 orders**
  * Average Delivery Duration: **14.8 days**
  * Average Freight: **$18.42**

---

## 7. Temporal, Heatmap & Time Analysis

Found on the **Time Analysis** page (`src/pages/TimeAnalysisPage.tsx`).

### 7.1 Day-of-Week × Hour Matrix
A grid of 7 days (Monday through Sunday) × 24 hours (0 to 23):
* **Cell Average Days**:  
  `Avg Days for (Day, Hour) = Sum of Delivery Days for that slot ÷ Order Count in that slot`
* Peak order placement window: **Weekdays between 14:00 and 16:00 BRT**.

### 7.2 Month-over-Month Growth (MoM)
* **Formula**:  
  `MoM Order Growth % = ((Orders in Month M - Orders in Month M-1) ÷ Orders in Month M-1) × 100%`

---

## 8. SQL Console Queries & Outputs

Found on the **SQL Query Console** page (`src/pages/SqlConsolePage.tsx`). Queries run in-memory via `alasql` on the full 96,470 records.

### Query 1: SP to SP Volume Verification
```sql
SELECT COUNT(*) AS sp_to_sp_count
FROM preprocessed_delivery_dataset
WHERE customer_state = 'SP'
  AND seller_state = 'SP';
```
* **Output**: **30,735 orders**.

### Query 2: Same-State vs Cross-State Economics
```sql
SELECT 
  CASE WHEN same_state = 1 THEN 'Same State (Intra)' ELSE 'Cross State (Inter)' END AS SAME_STATE,
  ROUND(AVG(delivery_days), 2) AS AVG_DAYS,
  ROUND(AVG(total_freight), 2) AS AVG_FREIGHT,
  COUNT(*) AS ORDERS
FROM orders
GROUP BY same_state;
```
* **Output**:
  * `Same State (Intra)`: **34,701 orders**, **7.95 days**, **$12.38 freight**
  * `Cross State (Inter)`: **61,769 orders**, **15.15 days**, **$22.84 freight**

---

## 9. Currency & Formatting Standards

Found in `src/lib/utils.ts`.

### 9.1 Dual-Currency Presentation
All financial metrics are displayed with primary USD and converted Indian Rupees (INR):
* **Formula**:  
  `Amount_INR = Amount_USD × 83.50`
* **Display Format**: `"$137.04 (₹11,443)"`

### 9.2 Precision and Rounding
* **Durations**: Rounded to 1 decimal place with unit `d` (e.g. `12.6d`).
* **Percentages**: Rounded to 1 decimal place with `%` (e.g. `91.9%`).
* **Currency**: Standard 2 decimal places with thousands comma grouping.
