import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotModule } from './bot/bot.module';
import { BOT_NAME } from './app.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),

    TelegrafModule.forRootAsync({
      botName: BOT_NAME,
      useFactory: () => ({
        token: process.env.BOT_TOKEN, 
        middlewares: [], // Array for custom middlewares if needed
        include: [BotModule], // Modules that should be included
        session: true, // Enable session management
        telegram: {
          retryAfter: 10, // Retry interval for failed requests
        },
      }),
    }),

    // Set up TypeORM with PostgreSQL connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST, // Database host
      port: parseInt(process.env.DB_PORT, 10), // Database port
      username: process.env.DB_USERNAME, // Database username
      password: process.env.DB_PASSWORD, // Database password
      database: process.env.DB_NAME, // Database name
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // Path to entity files
      synchronize: true, // Automatically sync the database schema (use false in production)
    }),

    // Import the BotModule which contains bot-related logic
    BotModule,
  ],
  controllers: [], // Define controllers here if needed
  providers: [], // Define providers here if needed
})
export class AppModule {}
