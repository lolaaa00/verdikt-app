# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from datetime import datetime, timezone
import json


@gl.evm.contract_interface
class _NativeRecipient:
    class View:
        pass

    class Write:
        pass


class VerdiktParimutuel(gl.Contract):
    owner: Address
    market_count: u256
    suggestion_count: u256
    store: TreeMap[u256, str]
    fee_bps: u256
    protocol_fees: u256
    min_stake_wei: u256
    min_side_liquidity_wei: u256

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.market_count = u256(0)
        self.suggestion_count = u256(0)
        self.store = TreeMap[u256, str]()
        self.fee_bps = u256(200)
        self.protocol_fees = u256(0)
        self.min_stake_wei = u256(1)
        self.min_side_liquidity_wei = u256(1)

    def _market_key(self, market_id: u256) -> u256:
        return u256(int(market_id))

    def _suggestion_key(self, suggestion_id: u256) -> u256:
        return u256((1 << 254) + int(suggestion_id))

    def _stake_key(self, market_id: u256, side: str, user: str) -> u256:
        clean_side = side.strip().upper()
        side_bit = 0 if clean_side == "A" else 1
        addr_int = self._address_to_int(user)
        payload = (int(market_id) << 161) + (addr_int << 1) + side_bit
        return u256((2 << 254) + payload)

    def _claimed_key(self, market_id: u256, user: str) -> u256:
        addr_int = self._address_to_int(user)
        payload = (int(market_id) << 160) + addr_int
        return u256((3 << 254) + payload)

    def _address_to_int(self, user: str) -> int:
        clean = user.strip()
        if clean.startswith("0x") or clean.startswith("0X"):
            clean = clean[2:]
        if len(clean) > 40:
            clean = clean[-40:]
        if len(clean) == 0:
            return 0
        return int(clean, 16)

    def _require_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("only_owner")

    def _now(self) -> int:
        return int(datetime.now(timezone.utc).timestamp())

    def _load_market(self, market_id: u256) -> dict:
        key = self._market_key(market_id)
        if key not in self.store:
            raise gl.vm.UserError("market_not_found")
        return json.loads(self.store[key])

    def _save_market(self, market_id: u256, data: dict) -> None:
        self.store[self._market_key(market_id)] = json.dumps(data)

    def _load_suggestion(self, suggestion_id: u256) -> dict:
        key = self._suggestion_key(suggestion_id)
        if key not in self.store:
            raise gl.vm.UserError("suggestion_not_found")
        return json.loads(self.store[key])

    def _save_suggestion(self, suggestion_id: u256, data: dict) -> None:
        self.store[self._suggestion_key(suggestion_id)] = json.dumps(data)

    def _get_stake_int(self, market_id: u256, side: str, user: str) -> int:
        key = self._stake_key(market_id, side, user)
        if key not in self.store:
            return 0
        try:
            return int(self.store[key])
        except Exception:
            return 0

    def _set_stake_int(self, market_id: u256, side: str, user: str, amount: int) -> None:
        self.store[self._stake_key(market_id, side, user)] = str(amount)

    def _is_claimed(self, market_id: u256, user: str) -> bool:
        key = self._claimed_key(market_id, user)
        return key in self.store and self.store[key] == "1"

    def _set_claimed(self, market_id: u256, user: str) -> None:
        self.store[self._claimed_key(market_id, user)] = "1"

    def _send_gen(self, recipient: str, amount: u256) -> None:
        if int(amount) <= 0:
            return
        _NativeRecipient(Address(recipient)).emit_transfer(value=amount)

    def _validate_market_inputs(
        self,
        title: str,
        side_a: str,
        side_b: str,
        resolution_question: str,
        resolution_rule: str,
        close_ts: u256,
        resolution_available_ts: u256,
        void_conditions: str,
        evidence_type: str,
    ) -> None:
        if len(title.strip()) < 5:
            raise gl.vm.UserError("title_too_short")
        if len(side_a.strip()) < 1 or len(side_b.strip()) < 1:
            raise gl.vm.UserError("invalid_sides")
        if side_a.strip() == side_b.strip():
            raise gl.vm.UserError("duplicate_sides")
        if len(resolution_question.strip()) < 10:
            raise gl.vm.UserError("resolution_question_too_short")
        if len(resolution_rule.strip()) < 10:
            raise gl.vm.UserError("resolution_rule_too_short")
        if len(void_conditions.strip()) < 10:
            raise gl.vm.UserError("void_conditions_too_short")
        if len(evidence_type.strip()) < 3:
            raise gl.vm.UserError("evidence_type_too_short")
        if int(close_ts) <= self._now():
            raise gl.vm.UserError("close_time_must_be_future")
        if int(resolution_available_ts) < int(close_ts):
            raise gl.vm.UserError("resolution_available_before_close")

    def _refresh_liquidity_status(self, market: dict) -> dict:
        if market.get("status") not in ["PENDING_LIQUIDITY", "ACTIVE"]:
            return market
        pool_a = int(market.get("pool_a", 0))
        pool_b = int(market.get("pool_b", 0))
        min_side = int(self.min_side_liquidity_wei)
        if pool_a >= min_side and pool_b >= min_side:
            market["status"] = "ACTIVE"
        else:
            market["status"] = "PENDING_LIQUIDITY"
        return market

    def _empty_resolution_details(self) -> dict:
        return {
            "winner": "",
            "confidence": 0,
            "evidence_summary": [],
            "source_urls_checked": [],
            "reasoning": "",
            "void_reason": "",
        }

    def _create_market_internal(
        self,
        title: str,
        side_a: str,
        side_b: str,
        resolution_question: str,
        resolution_rule: str,
        resolution_sources: str,
        close_ts: u256,
        resolution_available_ts: u256,
        void_conditions: str,
        creator: str,
        source_type: str,
        suggestion_id: u256,
        evidence_type: str,
    ) -> u256:
        self._validate_market_inputs(
            title,
            side_a,
            side_b,
            resolution_question,
            resolution_rule,
            close_ts,
            resolution_available_ts,
            void_conditions,
            evidence_type,
        )

        market_id = self.market_count
        market = {
            "id": int(market_id),
            "title": title.strip(),
            "side_a": side_a.strip(),
            "side_b": side_b.strip(),
            "resolution_question": resolution_question.strip(),
            "resolution_rule": resolution_rule.strip(),
            "resolution_sources": resolution_sources,
            "resolution_available_ts": int(resolution_available_ts),
            "void_conditions": void_conditions.strip(),
            "creator": creator,
            "source_type": source_type,
            "suggestion_id": int(suggestion_id),
            "evidence_type": evidence_type.strip(),
            "created_ts": self._now(),
            "close_ts": int(close_ts),
            "status": "PENDING_LIQUIDITY",
            "pool_a": 0,
            "pool_b": 0,
            "total_pool": 0,
            "winner": "",
            "resolved_by": "",
            "resolved_ts": 0,
            "resolution_note": "",
            "resolution_details": self._empty_resolution_details(),
            "fee_bps": int(self.fee_bps),
            "fee_collected": 0,
        }

        self._save_market(market_id, market)
        self.market_count = u256(int(self.market_count) + 1)
        return market_id

    def _parse_source_list(self, raw_sources: str):
        clean = raw_sources.strip()
        if len(clean) == 0:
            return []
        try:
            parsed = json.loads(clean)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if len(str(item).strip()) > 0]
        except Exception:
            pass
        return [line.strip() for line in clean.split("\n") if len(line.strip()) > 0]

    def _normalize_resolution_result(self, result: object, sources) -> dict:
        payload = result
        if isinstance(payload, str):
            text = payload.strip().replace("```json", "").replace("```", "").strip()
            payload = json.loads(text)
        if not isinstance(payload, dict):
            raise gl.vm.UserError("invalid_resolution_payload")

        winner = str(payload.get("winner", "")).strip().upper()
        if winner not in ["A", "B", "VOID", "UNRESOLVED"]:
            raise gl.vm.UserError("invalid_resolution_winner")

        confidence = int(payload.get("confidence", 0))
        if confidence < 0:
            confidence = 0
        if confidence > 100:
            confidence = 100

        evidence_summary = payload.get("evidence_summary", [])
        if not isinstance(evidence_summary, list):
            evidence_summary = []
        evidence_summary = [str(item).strip() for item in evidence_summary if len(str(item).strip()) > 0]

        source_urls_checked = payload.get("source_urls_checked", [])
        if not isinstance(source_urls_checked, list):
            source_urls_checked = []
        source_urls_checked = [str(item).strip() for item in source_urls_checked if len(str(item).strip()) > 0]

        reasoning = str(payload.get("reasoning", "")).strip()
        void_reason = str(payload.get("void_reason", "")).strip()

        if winner in ["A", "B"] and len(evidence_summary) == 0:
            raise gl.vm.UserError("missing_evidence_summary")
        if len(reasoning) == 0:
            raise gl.vm.UserError("missing_reasoning")
        if winner == "VOID" and len(void_reason) == 0:
            raise gl.vm.UserError("missing_void_reason")
        if len(source_urls_checked) == 0:
            source_urls_checked = sources

        return {
            "winner": winner,
            "confidence": confidence,
            "evidence_summary": evidence_summary,
            "source_urls_checked": source_urls_checked,
            "reasoning": reasoning,
            "void_reason": void_reason,
        }

    def _run_consensus_resolution(self, market: dict) -> dict:
        sources = self._parse_source_list(str(market.get("resolution_sources", "")))

        def nondet() -> str:
            collected_sources = []
            for source_url in sources[:5]:
                try:
                    response = gl.nondet.web.get(source_url)

                    status_code = int(getattr(response, "status_code", 0))
                    if status_code >= 400:
                        collected_sources.append({
                            "url": source_url,
                            "content": f"SOURCE_UNAVAILABLE_STATUS_{status_code}",
                        })
                        continue

                    body = getattr(response, "body", "")
                    if isinstance(body, bytes):
                        content = body.decode("utf-8", errors="ignore")
                    else:
                        content = str(body)

                    collected_sources.append({
                        "url": source_url,
                        "content": content[:4000],
                    })

                except Exception:
                    collected_sources.append({
                        "url": source_url,
                        "content": "SOURCE_FETCH_FAILED",
                    })

            if len(collected_sources) == 0:
                collected_sources.append({
                    "url": "NO_VALID_SOURCE",
                    "content": "No resolution source could be fetched. Return VOID or UNRESOLVED.",
                })

            prompt = f"""
You are resolving a prediction market on GenLayer.

Use only the provided public evidence and the market rule.
Do not guess. If the evidence is ambiguous, contradictory, unavailable, or the market is poorly specified, return VOID or UNRESOLVED.

Return JSON only:
{{
  "winner": "A" | "B" | "VOID" | "UNRESOLVED",
  "confidence": 0,
  "evidence_summary": ["short bullet"],
  "source_urls_checked": ["https://..."],
  "reasoning": "why the rule supports this winner",
  "void_reason": ""
}}

Market title: {market.get("title", "")}
Resolution question: {market.get("resolution_question", "")}
Side A: {market.get("side_a", "")}
Side B: {market.get("side_b", "")}
Resolution rule: {market.get("resolution_rule", "")}
Void conditions: {market.get("void_conditions", "")}
Evidence type: {market.get("evidence_type", "")}
Close timestamp: {market.get("close_ts", 0)}
Resolution available timestamp: {market.get("resolution_available_ts", 0)}
Trusted source payloads: {json.dumps(collected_sources)}
"""

            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(self._normalize_resolution_result(result, sources), sort_keys=True)

        return json.loads(
            gl.eq_principle.prompt_non_comparative(
                nondet,
                task="Verify the resolution result for a prediction market.",
                criteria="""
        The result must be a JSON object with:
        - winner: one of "A", "B", "VOID", "UNRESOLVED" (required)
        - confidence: integer 0–100 (required)
        - evidence_summary: non-empty array of strings when winner is A or B (required)
        - source_urls_checked: array of strings (required)
        - reasoning: non-empty string (required)
        - void_reason: non-empty string when winner is VOID (required)
        Accept any result matching this schema regardless of phrasing differences.
        """,
            )
        )

    @gl.public.view
    def get_owner(self) -> Address:
        return self.owner

    @gl.public.view
    def get_market_count(self) -> u256:
        return self.market_count

    @gl.public.view
    def get_suggestion_count(self) -> u256:
        return self.suggestion_count

    @gl.public.view
    def get_market(self, market_id: u256) -> str:
        key = self._market_key(market_id)
        if key not in self.store:
            return json.dumps({"status": "NOT_FOUND"})
        return self.store[key]

    @gl.public.view
    def get_suggestion(self, suggestion_id: u256) -> str:
        key = self._suggestion_key(suggestion_id)
        if key not in self.store:
            return json.dumps({"status": "NOT_FOUND"})
        return self.store[key]

    @gl.public.view
    def get_user_position(self, market_id: u256, user: str) -> str:
        if self._market_key(market_id) not in self.store:
            return json.dumps({"status": "MARKET_NOT_FOUND"})
        return json.dumps({
            "market_id": int(market_id),
            "user": user,
            "stake_a": self._get_stake_int(market_id, "A", user),
            "stake_b": self._get_stake_int(market_id, "B", user),
            "claimed": self._is_claimed(market_id, user),
        })

    @gl.public.view
    def quote_payout(self, market_id: u256, user: str) -> str:
        if self._market_key(market_id) not in self.store:
            return json.dumps({"status": "MARKET_NOT_FOUND"})

        market = json.loads(self.store[self._market_key(market_id)])
        status = market.get("status")
        winner = market.get("winner")
        stake_a = self._get_stake_int(market_id, "A", user)
        stake_b = self._get_stake_int(market_id, "B", user)

        if self._is_claimed(market_id, user):
            return json.dumps({"status": status, "claimable": 0, "reason": "already_claimed"})

        if status == "CANCELLED" or winner == "VOID":
            return json.dumps({"status": status, "claimable": stake_a + stake_b, "reason": "refund"})

        if status != "RESOLVED":
            return json.dumps({"status": status, "claimable": 0, "reason": "not_claimable_yet"})

        pool_a = int(market.get("pool_a", 0))
        pool_b = int(market.get("pool_b", 0))
        fee_bps = int(market.get("fee_bps", 0))

        if winner == "A":
            winning_stake = stake_a
            winning_pool = pool_a
            losing_pool = pool_b
        elif winner == "B":
            winning_stake = stake_b
            winning_pool = pool_b
            losing_pool = pool_a
        else:
            return json.dumps({"status": status, "claimable": 0, "reason": "invalid_winner"})

        if winning_stake <= 0 or winning_pool <= 0:
            return json.dumps({"status": status, "claimable": 0, "reason": "no_winning_position"})

        fee = (losing_pool * fee_bps) // 10000
        distributable_losing_pool = losing_pool - fee
        profit = (winning_stake * distributable_losing_pool) // winning_pool
        payout = winning_stake + profit

        return json.dumps({
            "status": status,
            "claimable": payout,
            "reason": "winner_payout",
            "winning_stake": winning_stake,
            "profit": profit,
            "fee_pool": fee,
        })

    @gl.public.view
    def get_config(self) -> str:
        return json.dumps({
            "owner": str(self.owner),
            "fee_bps": int(self.fee_bps),
            "protocol_fees": int(self.protocol_fees),
            "min_stake_wei": int(self.min_stake_wei),
            "min_side_liquidity_wei": int(self.min_side_liquidity_wei),
        })

    @gl.public.view
    def get_protocol_fees(self) -> u256:
        return self.protocol_fees

    @gl.public.write
    def transfer_ownership(self, new_owner: str) -> None:
        self._require_owner()
        if len(new_owner.strip()) < 10:
            raise gl.vm.UserError("invalid_owner")
        self.owner = Address(new_owner.strip())

    @gl.public.write
    def set_config(self, fee_bps: u256, min_stake_wei: u256, min_side_liquidity_wei: u256) -> None:
        self._require_owner()
        if int(fee_bps) > 1000:
            raise gl.vm.UserError("fee_too_high")
        if int(min_stake_wei) < 1:
            raise gl.vm.UserError("min_stake_too_low")
        if int(min_side_liquidity_wei) < 1:
            raise gl.vm.UserError("min_side_liquidity_too_low")
        self.fee_bps = u256(int(fee_bps))
        self.min_stake_wei = u256(int(min_stake_wei))
        self.min_side_liquidity_wei = u256(int(min_side_liquidity_wei))

    @gl.public.write
    def create_market(
        self,
        title: str,
        side_a: str,
        side_b: str,
        resolution_question: str,
        resolution_rule: str,
        resolution_sources: str,
        close_ts: u256,
        resolution_available_ts: u256,
        void_conditions: str,
        evidence_type: str,
    ) -> u256:
        self._require_owner()
        return self._create_market_internal(
            title,
            side_a,
            side_b,
            resolution_question,
            resolution_rule,
            resolution_sources,
            close_ts,
            resolution_available_ts,
            void_conditions,
            str(gl.message.sender_address),
            "ADMIN",
            u256(0),
            evidence_type,
        )

    @gl.public.write
    def approve_suggestion(self, suggestion_id: u256) -> u256:
        self._require_owner()
        suggestion = self._load_suggestion(suggestion_id)
        if suggestion.get("status") != "SUGGESTED":
            raise gl.vm.UserError("suggestion_not_pending")

        market_id = self._create_market_internal(
            suggestion.get("title", ""),
            suggestion.get("side_a", ""),
            suggestion.get("side_b", ""),
            suggestion.get("resolution_question", ""),
            suggestion.get("resolution_rule", ""),
            suggestion.get("resolution_sources", ""),
            u256(int(suggestion.get("close_ts", 0))),
            u256(int(suggestion.get("resolution_available_ts", 0))),
            suggestion.get("void_conditions", ""),
            suggestion.get("suggested_by", ""),
            "SUGGESTION",
            suggestion_id,
            suggestion.get("evidence_type", "web"),
        )

        suggestion["status"] = "APPROVED"
        suggestion["approved_market_id"] = int(market_id)
        suggestion["reviewed_by"] = str(gl.message.sender_address)
        suggestion["reviewed_ts"] = self._now()
        self._save_suggestion(suggestion_id, suggestion)
        return market_id

    @gl.public.write
    def reject_suggestion(self, suggestion_id: u256, reason: str) -> None:
        self._require_owner()
        suggestion = self._load_suggestion(suggestion_id)
        if suggestion.get("status") != "SUGGESTED":
            raise gl.vm.UserError("suggestion_not_pending")
        suggestion["status"] = "REJECTED"
        suggestion["rejection_reason"] = reason.strip()
        suggestion["reviewed_by"] = str(gl.message.sender_address)
        suggestion["reviewed_ts"] = self._now()
        self._save_suggestion(suggestion_id, suggestion)

    @gl.public.write
    def cancel_market(self, market_id: u256, reason: str) -> None:
        self._require_owner()
        market = self._load_market(market_id)
        if market.get("status") in ["RESOLVED", "CANCELLED"]:
            raise gl.vm.UserError("market_already_final")
        market["status"] = "CANCELLED"
        market["winner"] = "VOID"
        market["resolution_note"] = reason.strip()
        market["resolved_by"] = str(gl.message.sender_address)
        market["resolved_ts"] = self._now()
        market["resolution_details"] = {
            "winner": "VOID",
            "confidence": 100,
            "evidence_summary": ["Admin cancelled the market before final settlement."],
            "source_urls_checked": [],
            "reasoning": reason.strip(),
            "void_reason": reason.strip(),
        }
        self._save_market(market_id, market)

    @gl.public.write
    def withdraw_protocol_fees(self, recipient: str, amount: u256) -> None:
        self._require_owner()
        if int(amount) <= 0:
            raise gl.vm.UserError("invalid_amount")
        if int(amount) > int(self.protocol_fees):
            raise gl.vm.UserError("amount_exceeds_protocol_fees")
        self.protocol_fees = u256(int(self.protocol_fees) - int(amount))
        self._send_gen(recipient.strip(), amount)

    @gl.public.write
    def suggest_market(
        self,
        title: str,
        side_a: str,
        side_b: str,
        resolution_question: str,
        resolution_rule: str,
        resolution_sources: str,
        close_ts: u256,
        resolution_available_ts: u256,
        void_conditions: str,
        evidence_type: str,
    ) -> u256:
        self._validate_market_inputs(
            title,
            side_a,
            side_b,
            resolution_question,
            resolution_rule,
            close_ts,
            resolution_available_ts,
            void_conditions,
            evidence_type,
        )

        suggestion_id = self.suggestion_count
        suggestion = {
            "id": int(suggestion_id),
            "title": title.strip(),
            "side_a": side_a.strip(),
            "side_b": side_b.strip(),
            "resolution_question": resolution_question.strip(),
            "resolution_rule": resolution_rule.strip(),
            "resolution_sources": resolution_sources,
            "close_ts": int(close_ts),
            "resolution_available_ts": int(resolution_available_ts),
            "void_conditions": void_conditions.strip(),
            "evidence_type": evidence_type.strip(),
            "suggested_by": str(gl.message.sender_address),
            "suggested_ts": self._now(),
            "status": "SUGGESTED",
            "approved_market_id": -1,
            "reviewed_by": "",
            "reviewed_ts": 0,
            "rejection_reason": "",
        }
        self._save_suggestion(suggestion_id, suggestion)
        self.suggestion_count = u256(int(self.suggestion_count) + 1)
        return suggestion_id

    @gl.public.write.payable
    def place_bet(self, market_id: u256, side: str) -> None:
        amount = gl.message.value
        if int(amount) < int(self.min_stake_wei):
            raise gl.vm.UserError("stake_below_minimum")

        market = self._load_market(market_id)
        if market.get("status") not in ["PENDING_LIQUIDITY", "ACTIVE"]:
            raise gl.vm.UserError("market_not_open")
        if self._now() >= int(market.get("close_ts", 0)):
            raise gl.vm.UserError("market_closed")

        clean_side = side.strip().upper()
        if clean_side not in ["A", "B"]:
            raise gl.vm.UserError("invalid_side")

        user = str(gl.message.sender_address)
        previous_stake = self._get_stake_int(market_id, clean_side, user)
        self._set_stake_int(market_id, clean_side, user, previous_stake + int(amount))

        if clean_side == "A":
            market["pool_a"] = int(market.get("pool_a", 0)) + int(amount)
        else:
            market["pool_b"] = int(market.get("pool_b", 0)) + int(amount)

        market["total_pool"] = int(market.get("pool_a", 0)) + int(market.get("pool_b", 0))
        self._save_market(market_id, self._refresh_liquidity_status(market))

    @gl.public.write
    def close_market(self, market_id: u256) -> None:
        market = self._load_market(market_id)
        if market.get("status") not in ["PENDING_LIQUIDITY", "ACTIVE"]:
            raise gl.vm.UserError("market_not_open")

        now = self._now()
        if now < int(market.get("close_ts", 0)):
            raise gl.vm.UserError("market_not_closed_yet")

        pool_a = int(market.get("pool_a", 0))
        pool_b = int(market.get("pool_b", 0))
        min_side = int(self.min_side_liquidity_wei)

        if pool_a < min_side or pool_b < min_side:
            market["status"] = "CANCELLED"
            market["winner"] = "VOID"
            market["resolution_note"] = "Cancelled: insufficient two-sided liquidity."
            market["resolved_by"] = str(gl.message.sender_address)
            market["resolved_ts"] = now
            market["resolution_details"] = {
                "winner": "VOID",
                "confidence": 100,
                "evidence_summary": ["The market did not reach the required two-sided liquidity threshold."],
                "source_urls_checked": [],
                "reasoning": "The market never formed a fair adversarial pool on both sides.",
                "void_reason": "insufficient_two_sided_liquidity",
            }
        else:
            market["status"] = "AWAITING_RESOLUTION"

        self._save_market(market_id, market)

    @gl.public.write
    def trigger_resolution(self, market_id: u256) -> None:
        market = self._load_market(market_id)
        if market.get("status") in ["RESOLVED", "CANCELLED", "UNDER_RESOLUTION"]:
            raise gl.vm.UserError("market_already_final")
        if market.get("status") not in ["CLOSED", "AWAITING_RESOLUTION", "UNRESOLVED"]:
            raise gl.vm.UserError("market_not_ready_for_resolution")

        now = self._now()
        if now < int(market.get("close_ts", 0)):
            raise gl.vm.UserError("market_not_closed_yet")
        if now < int(market.get("resolution_available_ts", 0)):
            raise gl.vm.UserError("resolution_evidence_not_ready")

        pool_a = int(market.get("pool_a", 0))
        pool_b = int(market.get("pool_b", 0))
        min_side = int(self.min_side_liquidity_wei)

        if pool_a < min_side or pool_b < min_side:
            market["status"] = "RESOLVED"
            market["winner"] = "VOID"
            market["resolved_by"] = "CONSENSUS"
            market["resolved_ts"] = now
            market["resolution_note"] = "Voided: insufficient two-sided liquidity."
            market["resolution_details"] = {
                "winner": "VOID",
                "confidence": 100,
                "evidence_summary": ["The market did not satisfy the required two-sided liquidity threshold."],
                "source_urls_checked": [],
                "reasoning": "The market could not be settled fairly because one side lacked enough liquidity.",
                "void_reason": "insufficient_two_sided_liquidity",
            }
            self._save_market(market_id, market)
            return

        market["status"] = "UNDER_RESOLUTION"
        self._save_market(market_id, market)

        result = self._run_consensus_resolution(market)
        winner = str(result.get("winner", "")).strip().upper()

        market["winner"] = winner
        market["resolved_by"] = "CONSENSUS"
        market["resolved_ts"] = now
        market["resolution_note"] = str(result.get("reasoning", "")).strip()
        market["resolution_details"] = result
        market["fee_collected"] = 0

        if winner in ["A", "B"]:
            losing_pool = pool_b if winner == "A" else pool_a
            fee = (losing_pool * int(market.get("fee_bps", 0))) // 10000
            market["status"] = "RESOLVED"
            market["fee_collected"] = fee
            self.protocol_fees = u256(int(self.protocol_fees) + fee)
        elif winner == "VOID":
            market["status"] = "RESOLVED"
        else:
            market["status"] = "UNRESOLVED"

        self._save_market(market_id, market)

    @gl.public.write
    def claim(self, market_id: u256) -> u256:
        market = self._load_market(market_id)
        user = str(gl.message.sender_address)
        if self._is_claimed(market_id, user):
            raise gl.vm.UserError("already_claimed")

        stake_a = self._get_stake_int(market_id, "A", user)
        stake_b = self._get_stake_int(market_id, "B", user)
        if stake_a + stake_b <= 0:
            raise gl.vm.UserError("no_position")

        payout = 0
        status = market.get("status")
        winner = market.get("winner")

        if status == "CANCELLED" or winner == "VOID":
            payout = stake_a + stake_b
        elif status == "RESOLVED":
            pool_a = int(market.get("pool_a", 0))
            pool_b = int(market.get("pool_b", 0))
            fee_bps = int(market.get("fee_bps", 0))

            if winner == "A":
                winning_stake = stake_a
                winning_pool = pool_a
                losing_pool = pool_b
            elif winner == "B":
                winning_stake = stake_b
                winning_pool = pool_b
                losing_pool = pool_a
            else:
                raise gl.vm.UserError("invalid_winner")

            if winning_stake <= 0:
                self._set_claimed(market_id, user)
                return u256(0)
            if winning_pool <= 0:
                raise gl.vm.UserError("invalid_winning_pool")

            fee = (losing_pool * fee_bps) // 10000
            distributable_losing_pool = losing_pool - fee
            profit = (winning_stake * distributable_losing_pool) // winning_pool
            payout = winning_stake + profit
        else:
            raise gl.vm.UserError("market_not_claimable")

        self._set_claimed(market_id, user)
        if payout > 0:
            self._send_gen(user, u256(payout))
        return u256(payout)
