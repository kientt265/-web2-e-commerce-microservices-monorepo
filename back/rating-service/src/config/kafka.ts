import { Kafka, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'rating-service',
  brokers: [
    process.env.KAFKA_BROKER_1 || 'kafka-1:9092',
    process.env.KAFKA_BROKER_2 || 'kafka-2:9092',
  ],
});

export const consumer: Consumer = kafka.consumer({
  groupId: 'rating-service-outbox-delivery-group',
});

export async function connectConsumer(): Promise<void> {
  await consumer.connect();
  console.log('[kafka] Rating consumer connected');
}

export async function disconnectConsumer(): Promise<void> {
  await consumer.disconnect();
  console.log('[kafka] Rating consumer disconnected');
}

export async function subscribeToDeliveryOutbox(): Promise<void> {
  await consumer.subscribe({ topic: 'outbox.delivery', fromBeginning: false });
  console.log('[kafka] Subscribed to outbox.delivery');
}
