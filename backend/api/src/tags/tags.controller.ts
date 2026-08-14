import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';
import { Public } from '../auth/public.decorator';

@Controller('tags')
export class TagsController {
  constructor(private service: TagsService) {}

  @Public()
  @Get()
  list(@Query('locale') locale?: string) {
    return this.service.list(locale);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.service.create(dto);
  }
}
