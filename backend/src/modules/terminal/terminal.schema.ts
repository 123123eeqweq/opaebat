/**
 * Terminal snapshot request/response schemas for Fastify
 */

export const getSnapshotSchema = {
  querystring: {
    type: 'object',
    properties: {
      instrument: {
        type: 'string',
        default: 'BTCUSD',
        description: 'Instrument id: BTCUSD, EURUSD, AUDCAD',
      },
      timeframe: {
        type: 'string',
        enum: ['5s', '10s', '15s', '30s', '1m'],
        default: '5s',
      },
    },
  },
} as const;
