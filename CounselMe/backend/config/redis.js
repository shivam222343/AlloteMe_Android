const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_URL
});

client.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
    try {
        await client.connect();
        console.log('Redis Connected');
    } catch (error) {
        console.error(`Redis Conn Error: ${error.message}`);
    }
};

module.exports = { client, connectRedis };
