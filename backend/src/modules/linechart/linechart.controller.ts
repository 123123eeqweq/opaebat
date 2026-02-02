/**
 * FLOW LP-2 + R-LINE-3/R-LINE-4: LineChartController
 * 
 * API endpoints для линейного графика:
 * - GET /api/line/snapshot - начальный snapshot (~10 минут данных)
 * - GET /api/line/history - история для infinite scroll
 * 
 * FLOW R-LINE-1: Использует instrumentId напрямую (унифицированный ключ для OTC и REAL)
 * Никаких преобразований symbol, base/quote, replace(_REAL) - только instrumentId
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../bootstrap/database.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { getInstrumentOrDefault } from '../../config/instruments.js';
import { DEFAULT_INSTRUMENT_ID } from '../../config/instruments.js';
import { logger } from '../../shared/logger.js';

export class LineChartController {
  /**
   * GET /api/line/snapshot?symbol=EURUSD_REAL
   * 
   * FLOW R-LINE-3: Возвращает начальный snapshot для линейного графика
   * - последние ~600 точек (10 минут при 1 точке/сек)
   * - текущая цена
   * - server time
   * 
   * Параметр `symbol` на самом деле это `instrumentId` (EURUSD, EURUSD_REAL, и т.д.)
   * Используется напрямую как ключ в БД без преобразований
   */
  async getSnapshot(
    request: FastifyRequest<{
      Querystring: {
        symbol?: string; // На самом деле это instrumentId
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      // FLOW R-LINE-3: Используем instrumentId напрямую (унифицированный ключ)
      const instrumentId = request.query.symbol || DEFAULT_INSTRUMENT_ID;
      const config = getInstrumentOrDefault(instrumentId);

      const prisma = getPrismaClient();

      // Проверяем, что модель доступна
      if (!('pricePoint' in prisma)) {
        logger.warn('[LineChartController] PricePoint model not available. Run "npx prisma generate"');
        // Возвращаем пустой snapshot, если модель недоступна
        const manager = getPriceEngineManager();
        const currentPriceTick = await manager.getCurrentPrice(instrumentId);
        return reply.send({
          points: [],
          currentPrice: currentPriceTick?.price ?? 0,
          serverTime: Date.now(),
        });
      }

      // FLOW R-LINE-3: Используем instrumentId как ключ в БД (без преобразований)
      const pricePoints = await (prisma as any).pricePoint.findMany({
        where: { symbol: instrumentId }, // symbol = instrumentId в БД
        orderBy: { timestamp: 'desc' },
        take: 600,
      }).catch((error: any) => {
        // Если таблицы нет, возвращаем пустой массив
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('does not exist') || errorMessage.includes('table')) {
          logger.debug('[LineChartController] Table price_points does not exist yet. Returning empty snapshot.');
          return [];
        }
        throw error;
      });

      // Переворачиваем для хронологического порядка (старые → новые)
      const points = pricePoints.reverse().map((pp: any) => ({
        time: Number(pp.timestamp),
        price: Number(pp.price),
      }));

      // Получаем текущую цену из PriceEngineManager
      const manager = getPriceEngineManager();
      const currentPriceTick = await manager.getCurrentPrice(instrumentId);
      const currentPrice = currentPriceTick?.price ?? points[points.length - 1]?.price ?? 0;

      return reply.send({
        points,
        currentPrice,
        serverTime: Date.now(),
      });
    } catch (error) {
      logger.error('[LineChartController] Get snapshot error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/line/history?symbol=EURUSD_REAL&to=TIMESTAMP&limit=300
   * 
   * FLOW R-LINE-4: Возвращает исторические точки для infinite scroll
   * - точки до указанного времени (to)
   * - limit точек (по умолчанию 300 = ~5 минут)
   * 
   * Параметр `symbol` на самом деле это `instrumentId` (EURUSD, EURUSD_REAL, и т.д.)
   * Используется напрямую как ключ в БД без преобразований
   */
  async getHistory(
    request: FastifyRequest<{
      Querystring: {
        symbol?: string; // На самом деле это instrumentId
        to?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      // FLOW R-LINE-4: Используем instrumentId напрямую (унифицированный ключ)
      const instrumentId = request.query.symbol || DEFAULT_INSTRUMENT_ID;

      const toTime = request.query.to ? parseInt(request.query.to, 10) : Date.now();
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 300;

      if (isNaN(toTime) || isNaN(limit)) {
        return reply.status(400).send({
          error: 'Invalid parameters: to and limit must be numbers',
        });
      }

      const prisma = getPrismaClient();

      // Проверяем, что модель доступна
      if (!('pricePoint' in prisma)) {
        logger.warn('[LineChartController] PricePoint model not available. Run "npx prisma generate"');
        return reply.send({ points: [] });
      }

      // FLOW R-LINE-4: Используем instrumentId как ключ в БД (без преобразований)
      const pricePoints = await (prisma as any).pricePoint.findMany({
        where: {
          symbol: instrumentId, // symbol = instrumentId в БД
          timestamp: { lt: BigInt(toTime) },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      }).catch((error: any) => {
        // Если таблицы нет, возвращаем пустой массив
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('does not exist') || errorMessage.includes('table')) {
          logger.debug('[LineChartController] Table price_points does not exist yet. Returning empty history.');
          return [];
        }
        throw error;
      });

      // Переворачиваем для хронологического порядка (старые → новые)
      const points = pricePoints.reverse().map((pp: any) => ({
        time: Number(pp.timestamp),
        price: Number(pp.price),
      }));

      return reply.send({ points });
    } catch (error) {
      logger.error('[LineChartController] Get history error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }
}
