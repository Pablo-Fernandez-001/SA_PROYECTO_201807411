/**
 * Catalog gRPC Client — DeliverEats
 *
 * Used by Order-Service to validate order items against the
 * Restaurant-Catalog-Service BEFORE persisting any order.
 *
 * Validates: existence, belongingness, price consistency, availability.
 */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

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

// ─── Singleton client ────────────────────────────────────────────────────────
const CATALOG_GRPC_URL = process.env.CATALOG_GRPC_URL || 'catalog-service:50052';

const client = new catalogProto.CatalogService(
  CATALOG_GRPC_URL,
  grpc.credentials.createInsecure()
);

logger.info(`[gRPC-client] Catalog client targeting ${CATALOG_GRPC_URL}`);

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Calls CatalogService.ValidateOrderItems via gRPC.
 *
 * @param {number} restaurantId
 * @param {Array<{menu_item_id: number, requested_price: number, quantity: number}>} items
 * @returns {Promise<Object>} ValidationResponse
 */
function validateOrderItems(restaurantId, items) {
  return new Promise((resolve, reject) => {
    const request = {
      restaurant_id: restaurantId,
      items: items.map(i => ({
        menu_item_id: i.menu_item_id,
        requested_price: i.requested_price,
        quantity: i.quantity
      }))
    };

    logger.info(`[gRPC-client] Sending ValidateOrderItems — restaurant=${restaurantId}, items=${items.length}`);

    client.ValidateOrderItems(request, { deadline: new Date(Date.now() + 10000) }, (error, response) => {
      if (error) {
        logger.error(`[gRPC-client] ValidateOrderItems error: ${error.message}`);
        return reject(error);
      }
      logger.info(`[gRPC-client] ValidateOrderItems response — valid=${response.valid}, message=${response.message}`);
      resolve(response);
    });
  });
}

module.exports = { validateOrderItems };
