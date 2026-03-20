/**
 * Catalog gRPC Server — DeliverEats
 *
 * Exposes ValidateOrderItems RPC used by Order-Service
 * to validate existence, belongingness, price consistency
 * and availability of menu items BEFORE order persistence.
 */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getPool } = require('../config/database');

// ─── Load .proto ─────────────────────────────────────────────────────────────
let PROTO_PATH = path.join(__dirname, '../../protos/catalog.proto');
if (!fs.existsSync(PROTO_PATH)) {
  PROTO_PATH = path.join(__dirname, '../../../protos/catalog.proto');
}

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const catalogProto = grpc.loadPackageDefinition(packageDefinition).catalog;

// ─── ValidateOrderItems implementation ───────────────────────────────────────
async function ValidateOrderItems(call, callback) {
  const { restaurant_id, items } = call.request;
  const db = getPool();

  logger.info(`[gRPC] ValidateOrderItems called — restaurant_id=${restaurant_id}, items=${items.length}`);

  try {
    // 1. Verify restaurant exists and is active
    const [restaurants] = await db.execute(
      'SELECT id, name, address, is_active FROM restaurants WHERE id = ?',
      [restaurant_id]
    );

    if (restaurants.length === 0) {
      const msg = `El restaurante con ID ${restaurant_id} no existe en el catálogo.`;
      logger.warn(`[gRPC] VALIDATION FAILED — ${msg}`);
      return callback(null, {
        valid: false,
        message: msg,
        item_results: [],
        total_calculated: 0,
        restaurant_name: '',
        restaurant_address: ''
      });
    }

    if (!restaurants[0].is_active) {
      const msg = `El restaurante "${restaurants[0].name}" no está disponible actualmente.`;
      logger.warn(`[gRPC] VALIDATION FAILED — ${msg}`);
      return callback(null, {
        valid: false,
        message: msg,
        item_results: [],
        total_calculated: 0,
        restaurant_name: restaurants[0].name || '',
        restaurant_address: restaurants[0].address || ''
      });
    }

    // 2. Validate each item
    const itemResults = [];
    let allValid = true;
    let totalCalculated = 0;
    const errors = [];

    for (const reqItem of items) {
      const [rows] = await db.execute(
        'SELECT id, restaurant_id, name, price, is_available FROM menu_items WHERE id = ?',
        [reqItem.menu_item_id]
      );

      const result = {
        menu_item_id: reqItem.menu_item_id,
        item_name: '',
        exists: false,
        belongs_to_restaurant: false,
        price_matches: false,
        is_available: false,
        current_price: 0,
        requested_price: reqItem.requested_price,
        error_message: ''
      };

      // 2a. Existence check
      if (rows.length === 0) {
        result.error_message = `El producto con ID ${reqItem.menu_item_id} no existe en el catálogo.`;
        errors.push(result.error_message);
        allValid = false;
        itemResults.push(result);
        logger.warn(`[gRPC] Item ${reqItem.menu_item_id}: NO EXISTE`);
        continue;
      }

      const dbItem = rows[0];
      result.exists = true;
      result.item_name = dbItem.name;
      result.current_price = parseFloat(dbItem.price);

      // 2b. Belongingness check
      if (dbItem.restaurant_id !== restaurant_id) {
        result.error_message = `El producto "${dbItem.name}" (ID ${dbItem.id}) no pertenece al restaurante seleccionado (ID ${restaurant_id}).`;
        errors.push(result.error_message);
        allValid = false;
        itemResults.push(result);
        logger.warn(`[gRPC] Item ${reqItem.menu_item_id}: NO PERTENECE al restaurante ${restaurant_id}`);
        continue;
      }
      result.belongs_to_restaurant = true;

      // 2c. Price consistency check
      const currentPrice = parseFloat(dbItem.price);
      const requestedPrice = parseFloat(reqItem.requested_price);
      if (Math.abs(currentPrice - requestedPrice) > 0.01) {
        result.error_message = `El precio del producto "${dbItem.name}" ha cambiado. Precio solicitado: Q${requestedPrice.toFixed(2)}, Precio actual: Q${currentPrice.toFixed(2)}.`;
        errors.push(result.error_message);
        allValid = false;
        itemResults.push(result);
        logger.warn(`[gRPC] Item ${reqItem.menu_item_id}: PRECIO INCORRECTO (solicitado=${requestedPrice}, actual=${currentPrice})`);
        continue;
      }
      result.price_matches = true;

      // 2d. Availability check
      if (!dbItem.is_available) {
        result.error_message = `El producto "${dbItem.name}" no está disponible actualmente.`;
        errors.push(result.error_message);
        allValid = false;
        itemResults.push(result);
        logger.warn(`[gRPC] Item ${reqItem.menu_item_id}: NO DISPONIBLE`);
        continue;
      }
      result.is_available = true;
      result.error_message = '';

      // Accumulate total
      totalCalculated += currentPrice * (reqItem.quantity || 1);
      itemResults.push(result);
    }

    // 3. Build response
    const response = {
      valid: allValid,
      message: allValid
        ? `Validación exitosa. ${items.length} producto(s) verificados para el restaurante "${restaurants[0].name}". Total: Q${totalCalculated.toFixed(2)}`
        : `Validación fallida: ${errors.join(' | ')}`,
      item_results: itemResults,
      total_calculated: totalCalculated,
      restaurant_name: restaurants[0].name || '',
      restaurant_address: restaurants[0].address || ''
    };

    if (allValid) {
      logger.info(`[gRPC] VALIDATION SUCCESS - restaurant="${restaurants[0].name}", items=${items.length}, total=Q${totalCalculated.toFixed(2)}`);
    } else {
      logger.warn(`[gRPC] VALIDATION FAILED - restaurant="${restaurants[0].name}", errors=${errors.length}: ${errors.join(' | ')}`);
    }

    callback(null, response);
  } catch (error) {
    logger.error('[gRPC] Internal error during validation:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Error interno del servidor al validar la orden.'
    });
  }
}

// ─── Start gRPC server ──────────────────────────────────────────────────────
function startGrpcServer() {
  const GRPC_PORT = process.env.GRPC_PORT || 50052;
  const server = new grpc.Server();

  server.addService(catalogProto.CatalogService.service, {
    ValidateOrderItems
  });

  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        logger.error('[gRPC] Failed to start catalog gRPC server:', err);
        return;
      }
      logger.info(`[gRPC] Catalog gRPC server listening on port ${port}`);
    }
  );

  return server;
}

module.exports = { startGrpcServer };
