from __future__ import annotations

import asyncio
import importlib.util
import os
from pathlib import Path
from typing import Any

import httpx


_DPD_MODULE = None
_PROFILE_CACHE: dict[str, dict[str, Any] | None] = {}
_DPD_BASE_URL = "https://health-products.canada.ca/api/drug"


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
    try:
        spec.loader.exec_module(module)
    except Exception:
        # If FastMCP isn't installed, fall back to direct DPD HTTP calls.
        return None
    _DPD_MODULE = module
    return _DPD_MODULE


async def _dpd_request(endpoint: str, params: dict[str, Any]) -> dict | list | None:
    params = {k: v for k, v in params.items() if v is not None}
    timeout = httpx.Timeout(30.0, connect=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            response = await client.get(f"{_DPD_BASE_URL}/{endpoint}/", params=params)
            response.raise_for_status()
            return response.json()
    except Exception:
        return None


def _timeout_seconds() -> float:
    raw = os.getenv("PHARMACY_MCP_TIMEOUT_SECONDS", "12")
    try:
        return max(0.5, float(raw))
    except Exception:
        return 12.0


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
    use_http_fallback = dpd_server is None

    async def _search_brand(name: str) -> dict | list | None:
        if not use_http_fallback:
            return await dpd_server.search_drug_by_brand_name(
                brand_name=name,
                status=2,
                lang="en",
                type="json",
            )
        return await _dpd_request("drugproduct", {"brandname": name, "status": 2, "lang": "en", "type": "json"})

    async def _search_ingredient(name: str) -> dict | list | None:
        if not use_http_fallback:
            return await dpd_server.search_active_ingredients(
                ingredient_name=name,
                lang="en",
                type="json",
            )
        return await _dpd_request("activeingredient", {"ingredientname": name, "lang": "en", "type": "json"})

    async def _get_schedule(drug_code: int) -> dict | list | None:
        if not use_http_fallback:
            return await dpd_server.get_schedule(drug_code=drug_code, active_only=True, lang="en", type="json")
        return await _dpd_request("schedule", {"id": drug_code, "active": "yes", "lang": "en", "type": "json"})

    async def _get_route(drug_code: int) -> dict | list | None:
        if not use_http_fallback:
            return await dpd_server.get_route_of_administration(drug_code=drug_code, active_only=True, lang="en", type="json")
        return await _dpd_request("route", {"id": drug_code, "active": "yes", "lang": "en", "type": "json"})

    async def _get_ingredients(drug_code: int) -> dict | list | None:
        if not use_http_fallback:
            return await dpd_server.get_active_ingredients(drug_code=drug_code, lang="en", type="json")
        return await _dpd_request("activeingredient", {"id": drug_code, "lang": "en", "type": "json"})

    async def _get_therapeutic(drug_code: int) -> dict | list | None:
        if not use_http_fallback:
            return await dpd_server.get_therapeutic_class(drug_code=drug_code, lang="en", type="json")
        return await _dpd_request("therapeuticclass", {"id": drug_code, "lang": "en", "type": "json"})

    try:
        ingredient_results = await asyncio.wait_for(_search_ingredient(medication_name), timeout=_timeout_seconds())
        first_result = _first(ingredient_results)
        if not first_result:
            search_results = await asyncio.wait_for(_search_brand(medication_name), timeout=_timeout_seconds())
            first_result = _first(search_results)
        if not first_result:
            return None

        drug_code = _pick_int(first_result, "drug_code", "DRUG_CODE")
        if not drug_code:
            return None

        schedule_data, route_data, ingredients_data, therapeutic_data = await asyncio.wait_for(
            asyncio.gather(
                _get_schedule(drug_code),
                _get_route(drug_code),
                _get_ingredients(drug_code),
                _get_therapeutic(drug_code),
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

        therapeutic_classes: list[str] = []
        if isinstance(therapeutic_data, list):
            for item in therapeutic_data[:5]:
                if isinstance(item, dict):
                    value = _pick_str(item, "tc_atc", "TC_ATC", "tc_atc_number", "TC_ATC_NUMBER")
                    if value:
                        therapeutic_classes.append(value)

        return {
            "dosage": dosage,
            "schedule": schedule_label,
            "side_effect_windows": {
                "unknown": "DPD connected. Side-effect timing is not provided by DPD directly."
            },
            "common_side_effects": ingredients or [f"Route: {route_label}"] if route_label != "Unknown" else [],
            "active_ingredients": ingredients,
            "therapeutic_classes": therapeutic_classes,
            "route": route_label,
        }
    except Exception:
        return None


def lookup_medication_profile(medication_name: str) -> dict[str, Any] | None:
    key = medication_name.strip().lower()
    if key in _PROFILE_CACHE:
        return _PROFILE_CACHE[key]

    try:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(asyncio.run, _lookup_medication_profile_async(medication_name))
            result = future.result(timeout=_timeout_seconds() + 1)
        _PROFILE_CACHE[key] = result
        return result
    except Exception:
        _PROFILE_CACHE[key] = None
        return None
