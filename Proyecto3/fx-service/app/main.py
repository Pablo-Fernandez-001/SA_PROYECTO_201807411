"""
FX Service — Main entry point (DeliverEats)
Inicia servidor Flask (REST API) + gRPC en threads separados
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from app.config import Config
from app.utils.logger import logger
from app.grpc_server import serve as grpc_serve
from app.services.fx_service import fx_service
from app.services.cache_service import cache_service
import threading

app = Flask(__name__)
CORS(app)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'fx-service',
        'version': '1.0.0'
    }), 200


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'fx-service',
        'description': 'Servicio de conversión de divisas con caché Redis y fallback',
        'endpoints': {
            'REST': {
                'GET /health': 'Health check',
                'GET /api/fx/rate?from=GTQ&to=USD': 'Obtener tasa de cambio',
                'GET /api/fx/rates?base=GTQ&targets=USD,EUR,MXN': 'Múltiples tasas',
                'POST /api/fx/convert': 'Convertir monto',
                'GET /api/fx/currencies': 'Monedas soportadas',
                'GET /api/fx/cache/stats': 'Estadísticas de caché'
            },
            'gRPC': f'Puerto {Config.GRPC_PORT}'
        }
    }), 200


# ─── REST API Endpoints ──────────────────────────────────────────────────────

@app.route('/api/fx/rate', methods=['GET'])
def get_exchange_rate():
    """Obtener tasa de cambio entre dos monedas"""
    from_currency = request.args.get('from', '').upper()
    to_currency = request.args.get('to', '').upper()

    if not from_currency or not to_currency:
        return jsonify({'error': 'Parámetros from y to son requeridos'}), 400

    result, error = fx_service.get_exchange_rate(from_currency, to_currency)
    if error:
        return jsonify({'error': error}), 404

    return jsonify(result), 200


@app.route('/api/fx/rates', methods=['GET'])
def get_multiple_rates():
    """Obtener múltiples tasas desde una moneda base"""
    base_currency = request.args.get('base', '').upper()
    targets = request.args.get('targets', '')

    if not base_currency or not targets:
        return jsonify({'error': 'Parámetros base y targets son requeridos'}), 400

    target_list = [t.strip().upper() for t in targets.split(',')]
    result, error = fx_service.get_multiple_rates(base_currency, target_list)
    if error:
        return jsonify({'error': error}), 404

    return jsonify(result), 200


@app.route('/api/fx/convert', methods=['POST'])
def convert_amount():
    """Convertir un monto de una moneda a otra"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Body JSON requerido'}), 400

    from_currency = data.get('from_currency', '').upper()
    to_currency = data.get('to_currency', '').upper()
    amount = data.get('amount', 0)

    if not from_currency or not to_currency or amount <= 0:
        return jsonify({'error': 'from_currency, to_currency y amount > 0 son requeridos'}), 400

    result, error = fx_service.convert_amount(from_currency, to_currency, float(amount))
    if error:
        return jsonify({'error': error}), 404

    return jsonify(result), 200


@app.route('/api/fx/currencies', methods=['GET'])
def get_currencies():
    """Obtener lista de monedas soportadas"""
    currencies, error = fx_service.get_supported_currencies()
    if error:
        return jsonify({'error': error}), 500

    return jsonify({
        'currencies': currencies,
        'count': len(currencies)
    }), 200


@app.route('/api/fx/cache/stats', methods=['GET'])
def cache_stats():
    """Obtener estadísticas de Redis caché"""
    stats = cache_service.get_cache_stats()
    return jsonify(stats), 200


# ─── Start Servers ────────────────────────────────────────────────────────────

def start_grpc_server():
    logger.info("Iniciando servidor gRPC en thread separado...")
    grpc_serve()


if __name__ == '__main__':
    # Start gRPC server in background thread
    grpc_thread = threading.Thread(target=start_grpc_server, daemon=True)
    grpc_thread.start()

    # Start Flask REST API
    logger.info(f"🚀 Iniciando FX Service Flask en {Config.FLASK_HOST}:{Config.FLASK_PORT}")
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )
