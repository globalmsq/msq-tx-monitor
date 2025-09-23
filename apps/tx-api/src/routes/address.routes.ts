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
addressRoutes.get(
  '/rankings/frequency',
  addressController.getTopAddressesByFrequency
);

/**
 * @route GET /api/v1/addresses/stats/:address
 * @description Get detailed statistics for a specific address
 * @param {string} address - Ethereum address (0x prefixed 40-char hex)
 * @returns {AddressStatistics} Detailed address statistics and analytics
 */
addressRoutes.get('/stats/:address', addressController.getAddressStatistics);

/**
 * @route GET /api/v1/addresses/search
 * @description Search addresses with autocomplete functionality
 * @query {string} q - Search query (partial address starting with 0x)
 * @query {number} [limit=10] - Number of results to return (max 20)
 * @returns {AddressSearch[]} Matching addresses with transaction data
 */
addressRoutes.get(
  '/search',
  searchRateLimiter,
  addressController.searchAddresses
);

/**
 * @route GET /api/v1/addresses/:address/profile
 * @description Get detailed behavioral profile for a specific address
 * @param {string} address - Ethereum address (0x prefixed 40-char hex)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @returns {AddressProfile} Detailed behavioral profile with ranking and scores
 */
addressRoutes.get('/:address/profile', addressController.getAddressProfile);

/**
 * @route GET /api/v1/addresses/whales
 * @description Get whale addresses (top 1% by volume)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=50] - Number of results to return (max 100)
 * @returns {AddressListResponse<AddressProfile>} List of whale addresses
 */
addressRoutes.get('/whales', addressController.getWhaleAddresses);

/**
 * @route GET /api/v1/addresses/active-traders
 * @description Get active trader addresses (high frequency)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=50] - Number of results to return (max 100)
 * @query {number} [minTransactions=50] - Minimum transaction count
 * @returns {AddressListResponse<AddressProfile>} List of active trader addresses
 */
addressRoutes.get('/active-traders', addressController.getActiveTraders);

/**
 * @route GET /api/v1/addresses/suspicious
 * @description Get suspicious addresses (high risk score)
 * @query {string} [tokenAddress] - Filter by specific token address
 * @query {number} [limit=50] - Number of results to return (max 100)
 * @query {number} [minRiskScore=0.7] - Minimum risk score threshold
 * @returns {AddressListResponse<AddressProfile>} List of suspicious addresses
 */
addressRoutes.get('/suspicious', addressController.getSuspiciousAddresses);
