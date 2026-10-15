import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EntityTypeDefinitionController } from './entity-type-definition.controller';
import { UpdateArchiveCardDto } from './dto/entity-type-definition.dto';

describe('Archive card permissions and validation', () => {
  it.each([
    ['ADMIN', true],
    ['USER', false],
    [undefined, false],
  ])('checks the server role %s', (role, allowed) => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => EntityTypeDefinitionController.prototype.updateArchiveCard,
      getClass: () => EntityTypeDefinitionController,
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    };
    expect(guard.canActivate(context as never)).toBe(allowed);
  });
  it('rejects missing fields and overly long editorial text', async () => {
    expect((await validate(new UpdateArchiveCardDto())).length).toBe(4);
    const dto = Object.assign(new UpdateArchiveCardDto(), {
      archiveTitleEs: 'x'.repeat(81),
      archiveTitleEn: '',
      archiveDescriptionEs: '',
      archiveDescriptionEn: 'x'.repeat(281),
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual([
      'archiveTitleEs',
      'archiveDescriptionEn',
    ]);
  });
});
