"""
FX Service — Servicio de tasas de cambio (DeliverEats)

Flujo de resiliencia:
1. Consultar Redis caché (TTL: 6 min)
2. Si MISS → Consultar API externa (ExchangeRate-API)
3. Si API OK → Guardar en caché + fallback → Retornar
4. Si API FALLA → Consultar fallback (TTL: 24h)
5. Si fallback disponible → Retornar con is_fallback=true
6. Si no hay fallback → Retornar error
"""

import requests
import time
from typing import Optional, Dict, Tuple
from app.config import Config
from app.utils.logger import logger
from app.services.cache_service import cache_service


class FXService:
    def __init__(self):
        self.api_base_url = Config.FX_API_BASE_URL
        self.timeout = Config.FX_API_TIMEOUT

    def get_exchange_rate(self, from_currency: str, to_currency: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Obtener tasa de cambio con estrategia: Cache → API → Fallback
        """
        # 1. Consultar caché primero
        cached_rate = cache_service.get_rate(from_currency, to_currency)
        if cached_rate:
            return cached_rate, None

        # 2. Si no está en caché, llamar a la API externa
        try:
            logger.info(f"🌐 Llamando API externa: {from_currency} → {to_currency}")
            response = requests.get(
                f"{self.api_base_url}/{from_currency}",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            # Validar respuesta
            if data.get('result') != 'success':
                raise Exception(f"API retornó error: {data.get('error-type', 'unknown')}")

            rates = data.get('rates', {})
            if to_currency not in rates:
                raise Exception(f"Moneda {to_currency} no encontrada en la respuesta")

            rate = rates[to_currency]
            timestamp = data.get('time_last_update_unix', int(time.time()))

            # 3. Guardar en caché (principal + fallback)
            cache_service.set_rate(from_currency, to_currency, rate, timestamp)

            return {
                'from_currency': from_currency,
                'to_currency': to_currency,
                'rate': rate,
                'timestamp': timestamp,
                'from_cache': False,
                'is_fallback': False
            }, None

        except requests.exceptions.Timeout:
            logger.error("⏱️ Timeout llamando a la API externa")
            return self._try_fallback(from_currency, to_currency)

        except requests.exceptions.RequestException as e:
            logger.error(f"🌐 Error en solicitud HTTP: {e}")
            return self._try_fallback(from_currency, to_currency)

        except Exception as e:
            logger.error(f"❌ Error inesperado: {e}")
            return self._try_fallback(from_currency, to_currency)

    def _try_fallback(self, from_currency: str, to_currency: str) -> Tuple[Optional[Dict], Optional[str]]:
        """Intentar obtener tasa de fallback cuando la API falla"""
        fallback_rate = cache_service.get_fallback_rate(from_currency, to_currency)
        if fallback_rate:
            logger.warning(f"⚠️ Usando tasa fallback: {from_currency} → {to_currency}")
            return fallback_rate, None

        error_msg = f"No se pudo obtener tasa de cambio {from_currency} → {to_currency} y no hay fallback disponible"
        logger.error(f"❌ {error_msg}")
        return None, error_msg

    def get_multiple_rates(self, base_currency: str, target_currencies: list) -> Tuple[Optional[Dict], Optional[str]]:
        """Obtener múltiples tasas desde una moneda base"""
        try:
            logger.info(f"🌐 Obteniendo múltiples tasas desde {base_currency}")

            response = requests.get(
                f"{self.api_base_url}/{base_currency}",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            if data.get('result') != 'success':
                raise Exception(f"API retornó error: {data.get('error-type', 'unknown')}")

            all_rates = data.get('rates', {})
            timestamp = data.get('time_last_update_unix', int(time.time()))

            # Filtrar solo las monedas solicitadas
            filtered_rates = {
                currency: all_rates[currency]
                for currency in target_currencies
                if currency in all_rates
            }

            if not filtered_rates:
                raise Exception("Ninguna de las monedas solicitadas fue encontrada")

            # Guardar en caché
            cache_service.set_multiple_rates(base_currency, filtered_rates, timestamp)

            return {
                'base_currency': base_currency,
                'rates': filtered_rates,
                'timestamp': timestamp,
                'from_cache': False
            }, None

        except Exception as e:
            logger.error(f"❌ Error obteniendo múltiples tasas: {e}")
            return None, str(e)

    def convert_amount(self, from_currency: str, to_currency: str, amount: float) -> Tuple[Optional[Dict], Optional[str]]:
        """Convertir un monto de una moneda a otra"""
        result, error = self.get_exchange_rate(from_currency, to_currency)
        if error:
            return None, error

        converted = round(amount * result['rate'], 4)
        return {
            'from_currency': from_currency,
            'to_currency': to_currency,
            'original_amount': amount,
            'converted_amount': converted,
            'rate': result['rate'],
            'timestamp': result['timestamp'],
            'from_cache': result.get('from_cache', False),
            'is_fallback': result.get('is_fallback', False)
        }, None

    def get_supported_currencies(self) -> Tuple[Optional[list], Optional[str]]:
        """Obtener lista de monedas soportadas"""
        try:
            response = requests.get(
                f"{self.api_base_url}/USD",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            currencies = list(data.get('rates', {}).keys())
            return sorted(currencies), None
        except Exception as e:
            logger.error(f"Error obteniendo monedas soportadas: {e}")
            return None, str(e)


# Instancia singleton
fx_service = FXService()
