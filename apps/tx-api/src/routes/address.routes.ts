import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { searchRateLimiter } from '../middleware/rate-limit';

export const addressRoutes = Router();
const addressController = new AddressController();

/**
 * @route GET /api/v1/addresses/rankings
 * @description Get top addresses ranked by total volume
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {string} [time_period] - Time period (day, week, month, all)
 * @query {string} [min_volume] - Minimum total volume threshold
 * @query {number} [min_transactions] - Minimum transaction count threshold
 * @query {number} [limit=50] - Number of results to return (max 100)
 * @returns {TopAddressesResponse} Ranked addresses by volume
 */
addressRoutes.get('/rankings', addressController.getTopAddressesByVolume);

/**
 * @route GET /api/v1/addresses/rankings/frequency
 * @description Get top addresses ranked by transaction frequency
 * @query {string} [token] - Filter by token symbol (MSQ, SUT, KWT, P2UC)
 * @query {string} [time_period] - Time period (day, week, month, all)
 * @query {string} [min_volume] - Minimum total volume threshold
 * @query {number} [min_transactions] - Minimum transaction count threshold
 * @query {number} [limit=50] - Number of results to return (max 100)
 * @returns {TopAddressesResponse} Ranked addresses by frequency
 */
addressRoutes.get('/rankings/frequency', addressController.getTopAddressesByFrequency);

/**
 * @route GET /api/v1/addresses/search
 * @description Search addresses with autocomplete functionality
 * @query {string} q - Search query (partial address starting with 0x)
 * @query {number} [limit=10] - Number of results to return (max 20)
 * @returns {AddressSearch[]} Matching addresses with transaction data
 */
addressRoutes.get('/search', searchRateLimiter, addressController.searchAddresses);