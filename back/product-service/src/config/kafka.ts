import { Kafka, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [process.env.KAFKA_BROKER_1 || 'kafka-1:9092', process.env.KAFKA_BROKER_2 || 'kafka-2:9092'],
});

export const consumer: Consumer = kafka.consumer({ groupId: 'product-service-group' });

export const connectConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected successfully');
  } catch (error) {
    console.error('Error connecting Kafka consumer:', error);
    throw error;
  }
};

export const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka consumer:', error);
  }
};

export const subscribeToInventoryEvents = async () => {
  try {
    await consumer.subscribe({ topic: 'outbox.inventory', fromBeginning: false });
    console.log('Subscribed to outbox.inventory topic');
  } catch (error) {
    console.error('Error subscribing to outbox.inventory topic:', error);
    throw error;
  }
};
