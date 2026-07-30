import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  })

  // Parse cookies (refresh-token cookie for the auth flow)
  app.use(cookieParser())

  // Global exception filter for logging errors
  app.useGlobalFilters(new AllExceptionsFilter())

  const isDevelopment = process.env.NODE_ENV === 'development'
  // Enable CORS
  app.enableCors({
    origin: isDevelopment
      ? true
      : [process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL],
    credentials: true,
  })

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  // API prefix
  app.setGlobalPrefix('api/v1')

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Firespot Transfer API')
    .setDescription(
      'API documentation for Firespot Transfer - A mobile payment QR code platform for Nigerian merchants',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('admin-auth', 'Admin authentication endpoints')
    .addTag('admin-qr-kits', 'Admin QRKit management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter Admin JWT token',
        in: 'header',
      },
      'admin-jwt',
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`Backend running on http://localhost:${port}`)
  console.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
  )
}
bootstrap()
