-- ============================================================
--  VERDIKT — GenLayer Prediction Market Platform
--  Migration 001: Full Schema + Seed
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id       TEXT UNIQUE NOT NULL,
  wallet_address      TEXT,
  display_name        TEXT,
  avatar_url          TEXT,
  markets_entered     INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  total_staked        NUMERIC DEFAULT 0,
  total_won           NUMERIC DEFAULT 0,
  win_rate            NUMERIC DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Markets
CREATE TABLE IF NOT EXISTS markets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL,
  side_a                TEXT NOT NULL,
  side_b                TEXT NOT NULL,
  resolution_rule       TEXT NOT NULL,
  resolution_sources    TEXT[] NOT NULL DEFAULT '{}',
  resolution_deadline   TIMESTAMPTZ NOT NULL,
  status                TEXT DEFAULT 'open',
  total_staked_a        NUMERIC DEFAULT 0,
  total_staked_b        NUMERIC DEFAULT 0,
  winner_side           TEXT,
  verdict_summary       TEXT,
  verdict_confidence    TEXT,
  verdict_evidence      TEXT,
  verdict_reason_codes  TEXT[],
  genlayer_tx_hash      TEXT,
  genlayer_market_id    TEXT,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id        UUID REFERENCES markets(id) NOT NULL,
  user_id          UUID REFERENCES users(id) NOT NULL,
  wallet_address   TEXT,
  side             TEXT NOT NULL,
  amount           NUMERIC NOT NULL,
  potential_payout NUMERIC,
  claimed          BOOLEAN DEFAULT FALSE,
  claim_tx_hash    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Resolution Logs
CREATE TABLE IF NOT EXISTS resolution_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id        UUID REFERENCES markets(id) NOT NULL,
  sources_read     JSONB,
  genlayer_input   JSONB,
  genlayer_output  JSONB,
  tx_hash          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard Cache
CREATE TABLE IF NOT EXISTS leaderboard (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) NOT NULL,
  period                TEXT NOT NULL,
  correct_predictions   INTEGER DEFAULT 0,
  total_staked          NUMERIC DEFAULT 0,
  total_won             NUMERIC DEFAULT 0,
  win_rate              NUMERIC DEFAULT 0,
  rank                  INTEGER,
  genlayer_verified     BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id        UUID REFERENCES markets(id) NOT NULL,
  raised_by        UUID REFERENCES users(id) NOT NULL,
  reason           TEXT NOT NULL,
  status           TEXT DEFAULT 'pending',
  genlayer_ruling  TEXT,
  ruling_tx_hash   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  Row Level Security
-- ============================================================
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard     ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes        ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "users_read_public"           ON users           FOR SELECT USING (true);
CREATE POLICY "markets_read_all"            ON markets         FOR SELECT USING (true);
CREATE POLICY "positions_read_all"          ON positions       FOR SELECT USING (true);
CREATE POLICY "resolution_logs_read_all"    ON resolution_logs FOR SELECT USING (true);
CREATE POLICY "leaderboard_read_all"        ON leaderboard     FOR SELECT USING (true);
CREATE POLICY "disputes_read_all"           ON disputes        FOR SELECT USING (true);

-- Service role writes (all tables)
CREATE POLICY "users_service_write"         ON users           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "markets_service_write"       ON markets         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "positions_service_write"     ON positions       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "resolution_logs_svc_write"   ON resolution_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "leaderboard_service_write"   ON leaderboard     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "disputes_service_write"      ON disputes        FOR ALL USING (auth.role() = 'service_role');

-- Users can update their own profile
CREATE POLICY "users_update_own"  ON users  FOR UPDATE USING (auth.uid()::text = privy_user_id);

-- ============================================================
--  Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE resolution_logs;

-- ============================================================
--  Demo User (for position staking without auth)
-- ============================================================
INSERT INTO users (id, privy_user_id, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo_user', 'Demo User')
ON CONFLICT DO NOTHING;

-- ============================================================
--  Seed Markets — Open
-- ============================================================
INSERT INTO markets (title, description, category, side_a, side_b, resolution_rule, resolution_sources, resolution_deadline, status, total_staked_a, total_staked_b)
VALUES
(
  'Arsenal vs Chelsea — Premier League',
  'Will Arsenal win or draw their match against Chelsea?',
  'sports',
  'Arsenal Win or Draw',
  'Chelsea Win',
  'Check the official Premier League website, BBC Sport, and ESPN. If the final score shows Arsenal won or drew, side_a wins. If Chelsea won outright, side_b wins.',
  ARRAY['https://www.premierleague.com/results','https://www.bbc.com/sport/football','https://www.espn.com/soccer'],
  NOW() + INTERVAL '3 days', 'open', 4200, 2800
),
(
  'Will ETH reach $4,000 this week?',
  'Will Ethereum hit or exceed $4,000 USD at any point in the next 7 days?',
  'crypto',
  'Yes — ETH reaches $4,000 or above',
  'No — ETH stays below $4,000',
  'Check CoinGecko and CoinMarketCap. If any source shows ETH at or above $4,000 during the resolution window, side_a wins.',
  ARRAY['https://www.coingecko.com/en/coins/ethereum','https://coinmarketcap.com/currencies/ethereum/','https://www.reuters.com/technology/'],
  NOW() + INTERVAL '7 days', 'open', 6100, 3900
),
(
  'GenLayer Mainnet Launch — Q3 2025?',
  'Will GenLayer confirm a mainnet launch within Q3 2025?',
  'crypto',
  'Yes — mainnet announced in Q3 2025',
  'No announcement in Q3 2025',
  'Check genlayer.com, @genlayer on X, and The Block for mainnet announcement.',
  ARRAY['https://www.genlayer.com','https://twitter.com/genlayer','https://www.theblock.co'],
  NOW() + INTERVAL '14 days', 'open', 3300, 1700
),
(
  'T1 wins Worlds 2025?',
  'Will T1 win the League of Legends World Championship 2025?',
  'esports',
  'T1 Wins Worlds 2025',
  'T1 Does Not Win',
  'Check Riot Games official results and ESPN Esports.',
  ARRAY['https://lolesports.com','https://www.espn.com/esports/'],
  NOW() + INTERVAL '21 days', 'open', 5200, 2100
),
(
  'Lakers vs Warriors — NBA',
  'Who wins the Lakers vs Warriors game this week?',
  'sports',
  'Lakers Win',
  'Warriors Win',
  'Check ESPN NBA and the official NBA website for the final score.',
  ARRAY['https://www.nba.com/game/','https://www.espn.com/nba/'],
  NOW() + INTERVAL '2 days', 'open', 1800, 2400
),
(
  'BTC above $100k by end of month?',
  'Will Bitcoin close above $100,000 USD by the last day of this month?',
  'crypto',
  'Yes — BTC closes above $100K',
  'No — BTC stays below $100K',
  'Check CoinGecko and CoinMarketCap closing price on the final day of the month.',
  ARRAY['https://www.coingecko.com/en/coins/bitcoin','https://coinmarketcap.com/currencies/bitcoin/'],
  NOW() + INTERVAL '18 days', 'open', 9400, 5600
);

-- ============================================================
--  Seed Markets — Locked (awaiting resolution trigger)
-- ============================================================
INSERT INTO markets (title, description, category, side_a, side_b, resolution_rule, resolution_sources, resolution_deadline, status, total_staked_a, total_staked_b)
VALUES
(
  'US CPI drops below 3% in June 2025?',
  'Will the official US Consumer Price Index drop below 3% annual rate in the June 2025 reading?',
  'culture',
  'Yes — CPI below 3%',
  'No — CPI stays at 3% or above',
  'Check the official US Bureau of Labor Statistics release and Reuters for the June CPI reading.',
  ARRAY['https://www.bls.gov/cpi/','https://www.reuters.com/markets/'],
  NOW() + INTERVAL '1 day', 'locked', 2200, 1800
);

-- ============================================================
--  Seed Markets — Settled (full verdict + GenLayer hash)
-- ============================================================
INSERT INTO markets (
  title, description, category, side_a, side_b,
  resolution_rule, resolution_sources, resolution_deadline,
  status, total_staked_a, total_staked_b,
  winner_side, verdict_summary, verdict_confidence, verdict_evidence,
  verdict_reason_codes, genlayer_tx_hash
)
VALUES
(
  'Man City vs Real Madrid — UCL',
  'Will Manchester City beat Real Madrid in the UCL Quarter Final?',
  'sports',
  'Man City Win',
  'Real Madrid Win',
  'Check UEFA.com and BBC Sport for the full-time result.',
  ARRAY['https://www.uefa.com/uefachampionsleague/','https://www.bbc.com/sport/football'],
  NOW() - INTERVAL '2 days', 'settled',
  5500, 4500,
  'side_a',
  'Manchester City defeated Real Madrid 3-1. Contract read BBC Sport, UEFA official site, and ESPN. All three sources confirmed the result unambiguously.',
  'HIGH',
  'BBC Sport: Manchester City 3-1 Real Madrid (Full Time). UEFA official match centre confirmed identical scoreline.',
  ARRAY['CLEAR_WINNER','MULTI_SOURCE_CONFIRMED'],
  '0xa3f7d9c2b1e4f8901234567890abcdef1234567890abcdef1234567890abcdef12'
),
(
  'Solana $300 milestone',
  'Will SOL reach $300 USD this week?',
  'crypto',
  'Yes — SOL reaches $300+',
  'No — SOL stays below $300',
  'Check CoinGecko and CoinMarketCap for SOL price data.',
  ARRAY['https://www.coingecko.com/en/coins/solana','https://coinmarketcap.com/currencies/solana/'],
  NOW() - INTERVAL '4 days', 'settled',
  3100, 6900,
  'side_b',
  'SOL did not reach $300 during the resolution window. Contract read CoinGecko and CoinMarketCap. Both sources confirmed SOL peaked at $268 during the week.',
  'HIGH',
  'CoinGecko: SOL 7-day high was $268.40. CoinMarketCap confirmed peak of $267.92.',
  ARRAY['CLEAR_WINNER','MULTI_SOURCE_CONFIRMED'],
  '0xb9e2c4a1f5d7830198765432abcdef0987654321abcdef0987654321abcdef0987'
),
(
  'Apple WWDC — AI features announced?',
  'Will Apple announce major on-device AI features at WWDC 2025?',
  'culture',
  'Yes — Major AI announcement',
  'No — No significant AI reveal',
  'Check Apple Newsroom, The Verge, and 9to5Mac for WWDC coverage.',
  ARRAY['https://www.apple.com/newsroom/','https://www.theverge.com','https://9to5mac.com'],
  NOW() - INTERVAL '7 days', 'settled',
  7200, 800,
  'side_a',
  'Apple announced Apple Intelligence at WWDC 2025. Contract read Apple Newsroom, The Verge, and 9to5Mac. All sources confirmed major on-device AI feature reveal.',
  'HIGH',
  'Apple Newsroom: Apple introduces Apple Intelligence. The Verge headline: "Apple''s AI is here." 9to5Mac confirmed full feature set.',
  ARRAY['CLEAR_WINNER','MULTI_SOURCE_CONFIRMED'],
  '0xd4c8b2e9a1f376210987654321fedcba9876543210fedcba9876543210fedcba98'
);
