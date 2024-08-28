import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { UpdateBot } from './bot.update';


@Module({
  controllers: [],
  providers: [BotService, UpdateBot],
})
export class BotModule {}
