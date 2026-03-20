"""
Tests for FX Service — DeliverEats
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.fx_service import FXService


class TestFXService:
    @pytest.fixture
    def fx(self):
        return FXService()

    @patch('app.services.fx_service.requests.get')
    @patch('app.services.fx_service.cache_service')
    def test_get_exchange_rate_from_api(self, mock_cache, mock_requests, fx):
        """Test: obtener tasa desde API cuando no hay caché"""
        mock_cache.get_rate.return_value = None
        mock_response = Mock()
        mock_response.json.return_value = {
            'result': 'success',
            'rates': {'USD': 0.13},
            'time_last_update_unix': 1234567890
        }
        mock_response.raise_for_status = Mock()
        mock_requests.return_value = mock_response

        result, error = fx.get_exchange_rate('GTQ', 'USD')

        assert error is None
        assert result['from_currency'] == 'GTQ'
        assert result['to_currency'] == 'USD'
        assert result['rate'] == 0.13
        assert result['from_cache'] is False
        assert result['is_fallback'] is False

    @patch('app.services.fx_service.cache_service')
    def test_get_exchange_rate_from_cache(self, mock_cache, fx):
        """Test: obtener tasa desde caché Redis"""
        cached_data = {
            'from_currency': 'GTQ',
            'to_currency': 'USD',
            'rate': 0.13,
            'timestamp': 1234567890,
            'from_cache': True
        }
        mock_cache.get_rate.return_value = cached_data

        result, error = fx.get_exchange_rate('GTQ', 'USD')

        assert error is None
        assert result['from_cache'] is True
        assert result['rate'] == 0.13

    @patch('app.services.fx_service.requests.get')
    @patch('app.services.fx_service.cache_service')
    def test_fallback_on_api_error(self, mock_cache, mock_requests, fx):
        """Test: usar fallback cuando la API falla"""
        mock_cache.get_rate.return_value = None
        mock_requests.side_effect = Exception("API Error")
        mock_cache.get_fallback_rate.return_value = {
            'from_currency': 'GTQ',
            'to_currency': 'USD',
            'rate': 0.12,
            'timestamp': 1234567800,
            'from_cache': True,
            'is_fallback': True
        }

        result, error = fx.get_exchange_rate('GTQ', 'USD')

        assert error is None
        assert result['is_fallback'] is True
        assert result['rate'] == 0.12

    @patch('app.services.fx_service.requests.get')
    @patch('app.services.fx_service.cache_service')
    def test_error_when_no_fallback(self, mock_cache, mock_requests, fx):
        """Test: error cuando no hay caché ni fallback"""
        mock_cache.get_rate.return_value = None
        mock_requests.side_effect = Exception("API Error")
        mock_cache.get_fallback_rate.return_value = None

        result, error = fx.get_exchange_rate('GTQ', 'USD')

        assert result is None
        assert error is not None

    @patch('app.services.fx_service.cache_service')
    def test_convert_amount(self, mock_cache, fx):
        """Test: conversión de monto"""
        mock_cache.get_rate.return_value = {
            'from_currency': 'GTQ',
            'to_currency': 'USD',
            'rate': 0.13,
            'timestamp': 1234567890,
            'from_cache': True
        }

        result, error = fx.convert_amount('GTQ', 'USD', 100.0)

        assert error is None
        assert result['original_amount'] == 100.0
        assert result['converted_amount'] == 13.0
        assert result['rate'] == 0.13
