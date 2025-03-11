const amqp = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = "post_events";

async function connectToRabbitMQ() {
    try{
        console.log(process.env.RABBITMQ_URL);
        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'topic', {durable:false});
        logger.info("Connected to RabbitMQ successfully");

        return channel;
    }catch(e){
        logger.error("Error connecting to RabbitMQ", e);
    }
}

async function publishEvent(routingKey, message) {

    if(!channel){
        await connectToRabbitMQ();
    }

    channel.publish(EXCHANGE_NAME, routingKey, 
        Buffer.from(JSON.stringify(message)));

    logger.info(`Event Published routingKey: ${routingKey}: ${JSON.stringify(message)}`);

}

module.exports = {connectToRabbitMQ, publishEvent};