import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NodeEnv } from './utils/enums/node-env.enum';
import type { Env } from './utils/types/env.type';
import { collectEnv } from './utils/config/env.util';
import { AppLogger } from './utils/log.util';

/**
 * Initialize the NestJS HTTP application and start listening for incoming requests.
 *
 * @returns Promise that resolves when the HTTP server begins listening.
 */
async function bootstrap(): Promise<void> {
  // create logger
  const logger = new AppLogger(bootstrap.name);

  // initialize nestjs modules
  const app = await NestFactory.create(AppModule, {
    logger: ['debug', 'log', 'warn', 'error', 'fatal'],
  });

  // get config env
  const configService = app.get<ConfigService<Env>>(ConfigService);
  const { PORT, NODE_ENV }: Env = collectEnv(configService);

  // enable swagger when is not production mode
  if (NODE_ENV !== NodeEnv.Production) {
    const config = new DocumentBuilder()
      .setTitle('Cats example')
      .setDescription('The cats API description')
      .setVersion('1.0')
      .build();
    const documentFactory = (): OpenAPIObject => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, documentFactory);
  }

  // enable CORS using Nest defaults; pass options for custom origins or credentials
  app.enableCors();

  // apply Helmet hardening with default middleware config; supply options to tighten policies
  app.use(helmet());

  // app listen
  await app.listen(PORT);

  // log the public URLs once the server is ready
  const local = `http://localhost:${PORT}`;
  logger.info(`Application listening at ${local}`);
  if (NODE_ENV !== NodeEnv.Production) {
    logger.info(`Swagger UI available at ${local}/swagger`);
  }
}

void bootstrap();
