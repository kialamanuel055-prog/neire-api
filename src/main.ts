import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // ANCHOR:main-bootstrap
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
