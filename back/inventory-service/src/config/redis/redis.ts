import {Redis} from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const reserveStockScript = `
  local key = KEYS[1]
  local quantity = tonumber(ARGV[1])
  local current = tonumber(redis.call('get', key) or 0)
  
  if current >= quantity then
    redis.call('decrby', key, quantity)
    return current - quantity
  else
    return -1
  end
`;
 
redis.defineCommand('reserveStock', {
  numberOfKeys: 1,
  lua: reserveStockScript,
});

export default redis;