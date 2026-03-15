from __future__ import annotations

import asyncio
import importlib.util
import os
from pathlib import Path
from typing import Any


_DPD_MODULE = None
_PROFILE_CACHE: dict[str, dict[str, Any] | None] = {}


def _enabled() -> bool:
    return os.getenv("PHARMACY_MCP_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}


def _load_dpd_server_module():
    global _DPD_MODULE
    if _DPD_MODULE is not None:
        return _DPD_MODULE

    repo_src = Path(__file__).resolve().parent / "PharmacyMCP" / "src" / "dpd_server.py"
    if not repo_src.exists() or not _enabled():
        return None

    spec = importlib.util.spec_from_file_location("pharmacy_dpd_server", repo_src)
    if not spec or not spec.loader:
        return None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _DPD_MODULE = module
    return _DPD_MODULE


def _timeout_seconds() -> float:
    raw = os.getenv("PHARMACY_MCP_TIMEOUT_SECONDS", "1.8")
    try:
        return max(0.5, float(raw))
    except Exception:
        return 1.8


def _first(items: Any) -> dict[str, Any] | None:
    if isinstance(items, list) and items:
        first = items[0]
        if isinstance(first, dict):
            return first
    if isinstance(items, dict):
        return items
    return None


def _pick_int(record: dict[str, Any], *keys: str) -> int | None:
    for k in keys:
        value = record.get(k)
        if value is None:
            continue
        try:
            return int(str(value).strip())
        except Exception:
            continue
    return None


def _pick_str(record: dict[str, Any], *keys: str) -> str | None:
    for k in keys:
        value = record.get(k)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


async def _lookup_medication_profile_async(medication_name: str) -> dict[str, Any] | None:
    dpd_server = _load_dpd_server_module()
    if not dpd_server:
        return None

    try:
        search_results = await asyncio.wait_for(
            dpd_server.search_drug_by_brand_name(
                brand_name=medication_name,
                status=2,
                lang="en",
                type="json",
            ),
            timeout=_timeout_seconds(),
        )
        first_result = _first(search_results)
        if not first_result:
            return None

        drug_code = _pick_int(first_result, "drug_code", "DRUG_CODE")
        if not drug_code:
            return None

        schedule_data, route_data, ingredients_data = await asyncio.wait_for(
            asyncio.gather(
                dpd_server.get_schedule(drug_code=drug_code, active_only=True, lang="en", type="json"),
                dpd_server.get_route_of_administration(drug_code=drug_code, active_only=True, lang="en", type="json"),
                dpd_server.get_active_ingredients(drug_code=drug_code, lang="en", type="json"),
                return_exceptions=True,
            ),
            timeout=_timeout_seconds(),
        )

        dosage = (
            _pick_str(first_result, "strength", "STRENGTH")
            or _pick_str(first_result, "dosage_form", "DOSAGE_FORM")
            or "Unknown"
        )

        schedule_label = "Unknown"
        schedule_first = _first(schedule_data)
        if isinstance(schedule_first, dict):
            schedule_label = (
                _pick_str(schedule_first, "schedule", "SCHEDULE", "schedule_name", "SCHEDULE_NAME")
                or "Unknown"
            )

        route_first = _first(route_data)
        route_label = "Unknown"
        if isinstance(route_first, dict):
            route_label = (
                _pick_str(route_first, "route_of_administration", "ROUTE_OF_ADMINISTRATION")
                or "Unknown"
            )

        ingredients: list[str] = []
        if isinstance(ingredients_data, list):
            for item in ingredients_data[:5]:
                if isinstance(item, dict):
                    value = _pick_str(item, "ingredient_name", "INGREDIENT_NAME")
                    if value:
                        ingredients.append(value)

        return {
            "dosage": dosage,
            "schedule": schedule_label,
            "side_effect_windows": {
                "unknown": "DPD connected. Side-effect timing is not provided by DPD directly."
            },
            "common_side_effects": ingredients or [f"Route: {route_label}"] if route_label != "Unknown" else [],
        }
    except Exception:
        return None


def lookup_medication_profile(medication_name: str) -> dict[str, Any] | None:
    key = medication_name.strip().lower()
    if key in _PROFILE_CACHE:
        return _PROFILE_CACHE[key]

    try:
        result = asyncio.run(_lookup_medication_profile_async(medication_name))
        _PROFILE_CACHE[key] = result
        return result
    except Exception:
        _PROFILE_CACHE[key] = None
        return None
