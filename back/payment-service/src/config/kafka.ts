import { Kafka, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: [process.env.KAFKA_BROKER_1 || 'kafka-1:9092', process.env.KAFKA_BROKER_2 || 'kafka-2:9092'],
});

export const consumer: Consumer = kafka.consumer({ groupId: 'payment-service-group' });

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

export const subscribeToOrderEvents = async () => {
  try {
    // Debezium outbox connector routes outbox writes from order-service by aggregatetype -> outbox.order
    await consumer.subscribe({ topic: 'outbox.order', fromBeginning: false });
    console.log('Subscribed to outbox.order topic');
  } catch (error) {
    console.error('Error subscribing to outbox.order topic:', error);
    throw error;
  }
};

