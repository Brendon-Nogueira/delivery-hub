import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Prefixo global para rotas REST (não afeta GraphQL nem WebSocket)
  app.setGlobalPrefix('api/v1', {
    exclude: ['graphql'],
  });

  // Validação global com class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Remove campos não decorados no DTO
      forbidNonWhitelisted: true, // Rejeita campos extras com erro 400
      transform: true,            // Transforma payloads em instâncias de DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS para o frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Adapter para Socket.io (WebSockets)
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`REST API rodando em http://localhost:${port}/api/v1`);
  logger.log(`GraphQL Playground em http://localhost:${port}/graphql`);
  logger.log(`WebSocket disponível em http://localhost:${port}`);
}
bootstrap();
